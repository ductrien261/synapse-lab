"""Luồng sinh bài: từng bước ghi vào `Generation` để xem tiến trình và chạy tiếp được sau khi bị bỏ dở.

Điều phối là mã thuần: gọi agent, kiểm tra bằng `validate_package`, định tuyến lỗi về đúng agent phụ trách,
đếm vòng sửa và token. Xem docs/lab/AGENTS.md.
"""

import re
from collections import defaultdict

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from .. import services
from ..models import Generation, Lesson
from ..validators import TEMPLATES, parts_index, validate_package
from .agents import AgentClient, get_agents
from .layout import layout_parts

STAGES = ['plan', 'parts', 'layout', 'content', 'wiring', 'exercises', 'validate', 'review', 'repair', 'finalize']
LABELS = {
    'plan': 'Lập kế hoạch', 'parts': 'Chọn linh kiện', 'layout': 'Xếp vị trí linh kiện', 'content': 'Soạn nội dung',
    'wiring': 'Thiết kế đi dây', 'exercises': 'Ra đề tính và mô phỏng', 'validate': 'Kiểm tra gói bài',
    'review': 'Đánh giá như người học', 'repair': 'Sửa lỗi', 'finalize': 'Lưu bài',
}
AI_STAGES = {'plan', 'parts', 'content', 'wiring', 'exercises', 'review'}
REPAIR_ORDER = ['content', 'wiring', 'exercises']
OWNER_ALIASES = {'exercise': 'exercises', 'parts': 'parts', 'content': 'content', 'wiring': 'wiring', 'exercises': 'exercises'}


def cfg(name: str, default):
    return getattr(settings, name, default)


def route_error(message: str) -> str:
    """Lỗi nằm ở phần nào thì agent phụ trách phần đó sửa."""
    if message.startswith('Bộ phận') and 'thư viện' in message:
        return 'parts'
    if message.startswith(('Chân', 'Mạch', 'Luật', 'wiring')):
        return 'wiring'
    if message.startswith(('Bài tính', 'tune')):
        return 'exercises'
    return 'content'


def assemble(state: dict) -> dict:
    plan, parts_out, content = state['plan'], state['parts'], state['content']
    positions = state['layout']['positions']
    by_id = {p.get('id'): p for p in content.get('parts', [])}
    parts = []
    for p in parts_out['parts']:
        c = by_id.get(p['id'], {})
        pos = positions.get(p['id'], {})
        parts.append({**c, 'id': p['id'], 'partId': p['partId'], 'at': pos.get('at'), 'node': pos.get('node')})
    n = len(parts)
    return {
        'schemaVersion': 1, 'slug': plan['slug'], 'title': plan['title'], 'subtitle': plan.get('subtitle', ''),
        'overview': content.get('overview'), 'scene': state['layout']['scene'], 'parts': parts, 'links': content.get('links', []),
        'buildOrder': list(range(n))[::-1], 'wiring': state['wiring'], 'exercises': state['exercises'].get('exercises', []),
        'tune': state['exercises'].get('tune'), 'texts': content.get('texts'),
    }


class Stop(Exception):
    """Kết thúc lần sinh với trạng thái cho trước (không phải lỗi chương trình)."""

    def __init__(self, status: str, message: str, errors: list[str] | None = None):
        super().__init__(message)
        self.status, self.message, self.errors = status, message, errors or []


class Pipeline:
    def __init__(self, gen: Generation, agents: AgentClient | None = None):
        self.gen = gen
        self.agents = agents or get_agents()
        self.max_rounds = cfg('LAB_GEN_MAX_REPAIRS', 3)
        self.token_cap = cfg('LAB_GEN_TOKEN_CAP', 60000)
        self.call_cap = cfg('LAB_GEN_MAX_CALLS', 14)

    # ---------- ghi nhật ký
    def _save(self, *fields):
        self.gen.heartbeat_at = timezone.now()
        self.gen.save(update_fields=['heartbeat_at', 'updated_at', *fields])

    def _begin(self, key: str, label: str | None = None, **extra) -> dict:
        entry = {'n': len(self.gen.steps) + 1, 'key': key, 'label': label or LABELS[key], 'kind': 'ai' if key in AI_STAGES else 'code',
                 'status': 'running', 'started_at': timezone.now().isoformat(), 'summary': '', 'tokens': 0, **extra}
        self.gen.steps.append(entry)
        self._save('steps')
        return entry

    def _end(self, entry: dict, summary: str, status: str = 'done', tokens: int = 0, detail: dict | None = None):
        entry.update(status=status, summary=summary, tokens=tokens, finished_at=timezone.now().isoformat())
        if detail:
            entry['detail'] = detail
        self.gen.tokens_used += tokens
        self._save('steps', 'tokens_used')

    def _check_cancel(self):
        if Generation.objects.filter(pk=self.gen.pk, cancel_requested=True).exists():
            raise Stop(Generation.Status.CANCELLED, 'Bạn đã hủy lần sinh này.')

    def _call(self, agent: str, payload: dict, label: str | None = None, **extra):
        self._check_cancel()
        calls = self.gen.state.get('calls', 0)
        if self.gen.tokens_used >= self.token_cap or calls >= self.call_cap:
            raise Stop(Generation.Status.NEEDS_WORK, 'Hết ngân sách token cho lần sinh này.', self.gen.state.get('last_errors', []))
        entry = self._begin(agent, label, **extra)
        try:
            result = self.agents.run(agent, {'request': self.gen.request, **payload})
        except Exception as exc:
            self._end(entry, f'Lỗi: {exc}', status='failed')
            raise
        self.gen.state['calls'] = calls + 1
        return entry, result

    # ---------- chạy
    def run(self) -> Generation:
        for e in self.gen.steps:  # bước đang chạy dở từ lần trước
            if e['status'] == 'running':
                e['status'] = 'interrupted'
        self.gen.stage = self.gen.stage or 'plan'
        try:
            while self.gen.stage != 'done':
                self._check_cancel()
                getattr(self, f'_stage_{self.gen.stage}')()
                self._save('state', 'stage', 'repair_rounds')
        except Stop as stop:
            self.gen.status, self.gen.message, self.gen.errors = stop.status, stop.message, stop.errors
            self._save('status', 'message', 'errors', 'state', 'stage')
        except Exception as exc:  # noqa: BLE001 - mọi lỗi bất ngờ phải để lại dấu vết cho người dùng
            self.gen.status, self.gen.message = Generation.Status.FAILED, f'Lỗi khi sinh bài: {exc}'
            self._save('status', 'message', 'state', 'stage')
        return self.gen

    def _next(self, stage: str):
        self.gen.stage = stage

    # ---------- các bước
    def _stage_plan(self):
        entry, res = self._call('plan', {})
        plan = res.output
        self.gen.state['plan'] = plan
        if plan.get('unsafe') or not plan.get('feasible'):
            missing = plan.get('missing') or {}
            detail = {'missing': missing}
            self._end(entry, plan.get('reason_if_not') or 'Không soạn được bài này.', status='stopped', tokens=res.tokens, detail=detail)
            parts = ', '.join(missing.get('parts', [])) or '—'
            templates = ', '.join(missing.get('templates', [])) or '—'
            msg = plan.get('reason_if_not') or 'Không soạn được bài này.'
            if not plan.get('unsafe'):
                msg += f' Thiếu linh kiện: {parts}. Thiếu mẫu mô phỏng: {templates}.'
            raise Stop(Generation.Status.STOPPED, msg)
        bad = [k for k in ('title', 'slug', 'tune_template') if not plan.get(k)]
        if bad or plan['tune_template'] not in TEMPLATES:
            self._end(entry, 'Kế hoạch thiếu thông tin.', status='failed', tokens=res.tokens)
            raise ValueError(f'Kế hoạch thiếu hoặc sai: {", ".join(bad) or "tune_template"}')
        self._end(entry, f'{plan["title"]}: {len(plan.get("learning_goals", []))} mục tiêu, mẫu "{plan["tune_template"]}".', tokens=res.tokens,
                  detail={'title': plan['title'], 'goals': plan.get('learning_goals', []), 'template': plan['tune_template']})
        self._next('parts')

    def _stage_parts(self):
        index = parts_index()
        errors: list[str] = self.gen.state.pop('parts_errors', [])
        for attempt in (1, 2):
            entry, res = self._call('parts', {'plan': self.gen.state['plan'], 'errors': errors}, attempt=attempt)
            parts = res.output.get('parts', [])
            errors = [f'Linh kiện "{p.get("partId")}" không có trong kho.' for p in parts if p.get('partId') not in index]
            if not 3 <= len(parts) <= 8:
                errors.append('Cần 3 đến 8 bộ phận.')
            ids = [p.get('id') for p in parts]
            if len(set(ids)) != len(ids):
                errors.append('Mã bộ phận bị trùng.')
            if not errors:
                self.gen.state['parts'] = res.output
                self._end(entry, f'Chọn {len(parts)} linh kiện.', tokens=res.tokens,
                          detail={'parts': [{'id': p['id'], 'partId': p['partId'], 'why': p.get('why', '')} for p in parts]})
                self._next('layout')
                return
            self._end(entry, 'Lựa chọn chưa hợp lệ: ' + '; '.join(errors), status='failed', tokens=res.tokens)
        raise Stop(Generation.Status.NEEDS_WORK, 'Không chọn được bộ linh kiện hợp lệ.', errors)

    def _stage_layout(self):
        entry = self._begin('layout')
        out = layout_parts(self.gen.state['parts']['parts'], self.gen.state['parts'].get('near'))
        self.gen.state['layout'] = out
        self._end(entry, 'Đã xếp các linh kiện lên khung nền.' + (' ' + ' '.join(out['warnings']) if out['warnings'] else ''))
        self._next('content')

    def _agent_stage(self, key: str, summary_fn, nxt: str, extra: dict | None = None):
        entry, res = self._call(key, {'plan': self.gen.state['plan'], 'parts': self.gen.state['parts']['parts'], **(extra or {})})
        self.gen.state[key] = res.output
        self._end(entry, summary_fn(res.output), tokens=res.tokens)
        self._next(nxt)

    def _stage_content(self):
        self._agent_stage('content', lambda o: f'Viết nội dung cho {len(o.get("parts", []))} bộ phận.', 'wiring')

    def _stage_wiring(self):
        self._agent_stage('wiring', lambda o: f'{len(o.get("nets", []))} mạch, {len(o.get("terminals", []))} chân, {len(o.get("rules", []))} luật báo nối sai.', 'exercises')

    def _stage_exercises(self):
        self._agent_stage('exercises', lambda o: f'{len(o.get("exercises", []))} bài tính, mẫu mô phỏng "{(o.get("tune") or {}).get("template")}".', 'validate')

    def _stage_validate(self):
        entry = self._begin('validate')
        package = assemble(self.gen.state)
        errors = validate_package(package)
        self.gen.state['package'] = package
        if not errors:
            self._end(entry, 'Gói bài hợp lệ.')
            self.gen.state['last_errors'] = []
            self._next('review')
            return
        self.gen.state['last_errors'] = errors[:20]
        self._end(entry, f'Tìm thấy {len(errors)} lỗi.', status='failed', detail={'errors': errors[:20]})
        self._begin_repair(errors[:20], {route_error(e) for e in errors})

    def _stage_review(self):
        retry = self.gen.state.get('review_issues') or []
        entry, res = self._call('review', {'package': self.gen.state['package'], 'errors': retry})
        issues = [i for i in res.output.get('issues', []) if i.get('severity', 'must') == 'must']
        if res.output.get('pass') or not issues:
            self._end(entry, 'Đạt.', tokens=res.tokens)
            self.gen.state['review_issues'] = []
            self._next('finalize')
            return
        self._end(entry, f'Có {len(issues)} vấn đề cần sửa.', status='failed', tokens=res.tokens, detail={'issues': issues})
        self.gen.state['review_issues'] = [f'{i.get("where")}: {i.get("problem")}' for i in issues]
        owners = {OWNER_ALIASES.get(i.get('owner'), 'content') for i in issues}
        self._begin_repair(self.gen.state['review_issues'], owners)

    def _begin_repair(self, errors: list[str], owners: set[str]):
        if self.gen.repair_rounds >= self.max_rounds:
            raise Stop(Generation.Status.NEEDS_WORK, f'Đã sửa {self.max_rounds} vòng mà bài vẫn chưa đạt.', errors)
        self.gen.repair_rounds += 1
        self.gen.state['repair'] = {'errors': errors, 'owners': sorted(owners, key=lambda o: (['parts'] + REPAIR_ORDER).index(o)), 'done': []}
        self._next('repair')

    def _stage_repair(self):
        rep = self.gen.state['repair']
        for owner in rep['owners']:
            if owner in rep['done']:
                continue
            if owner == 'parts':  # đổi linh kiện kéo theo mọi phần sau: làm lại từ bước chọn linh kiện
                self.gen.state['parts_errors'] = rep['errors']
                rep['done'].append(owner)
                self._next('parts')
                return
            entry, res = self._call(owner, {'plan': self.gen.state['plan'], 'parts': self.gen.state['parts']['parts'], 'errors': rep['errors'],
                                            'previous': self.gen.state.get(owner)}, label=f'Sửa: {LABELS[owner].lower()}', attempt=self.gen.repair_rounds)
            self.gen.state[owner] = res.output
            rep['done'].append(owner)
            self._end(entry, f'Đã sửa lại phần {LABELS[owner].lower()}.', tokens=res.tokens)
            self._save('state')
        self._next('validate')

    def _stage_finalize(self):
        entry = self._begin('finalize')
        spec = self.gen.state['package']
        errors = validate_package(spec)
        if errors:
            self._end(entry, 'Gói bài không hợp lệ khi lưu.', status='failed', detail={'errors': errors[:20]})
            raise Stop(Generation.Status.NEEDS_WORK, 'Gói bài không hợp lệ khi lưu.', errors[:20])
        digest = services.content_hash(spec)
        existing = Lesson.objects.alive().filter(content_hash=digest, created_by=self.gen.user).first() or services.find_duplicate(spec, public_only=True)
        if existing:
            self.gen.lesson = existing
            self.gen.message = f'Đã có bài giống hệt: "{existing.title}".'
        else:
            lesson = self._create_lesson(spec, digest)
            self.gen.lesson = lesson
        self.gen.status = Generation.Status.SUCCEEDED
        self.gen.message = self.gen.message or 'Đã tạo bài ở chế độ riêng tư.'
        self._end(entry, f'Bài "{self.gen.lesson.title}" đã sẵn sàng.', detail={'slug': self.gen.lesson.slug})
        self._save('status', 'message', 'lesson')
        self._next('done')

    def _create_lesson(self, spec: dict, digest: str) -> Lesson:
        base = spec['slug']
        for i in range(0, 50):
            slug = base if i == 0 else f'{base[:55]}-{i + 1}'
            spec['slug'] = slug
            try:
                with transaction.atomic():
                    return Lesson.objects.create(slug=slug, title=spec['title'], subtitle=spec['subtitle'], schema_version=spec['schemaVersion'],
                                                 spec=spec, content_hash=digest, created_by=self.gen.user)
            except IntegrityError:
                continue
        raise ValueError('Không tạo được mã bài duy nhất.')
