"""
Logic hồ sơ học tập + ôn tập thích ứng. Phần lớn là quy tắc (không tốn AI):
- Lịch ôn ngắt quãng (Leitner): đúng -> lên hộp, lâu mới ôn lại; sai -> xuống hộp, ôn lại sớm
- Chọn khái niệm: đến hạn ôn > chưa học > còn yếu
- Chọn dạng câu theo mức nắm vững: nhận diện 3D -> trắc nghiệm/tình huống -> tự luận
- Chỉ gọi AI khi kho chưa có câu phù hợp (ra đề) hoặc khi chấm tự luận
"""

import hashlib
import random
import re
from datetime import timedelta

from django.utils import timezone

from ai_gateway.services import AIError, call_ai
from anatomy.models import AnatomyModel, ModelAnnotation, Structure
from core.models import ContentStatus
from learning.models import StudyDay

from .models import ConceptMastery, LearnerProfile, Misconception, QuizAttempt, QuizItem, ReviewSession

INTERVALS = [timedelta(minutes=10), timedelta(days=1), timedelta(days=2), timedelta(days=4), timedelta(days=7), timedelta(days=16)]
PASS_SCORE = 0.7
SESSION_SIZE = 5


class ReviewError(Exception):
    pass


# ------------------------------------------------------------
# Hồ sơ
# ------------------------------------------------------------

def profile_of(user) -> LearnerProfile:
    profile, _ = LearnerProfile.objects.get_or_create(user=user)
    return profile


def structure_name(s: Structure) -> str:
    return s.name_vi or s.name_en


def record_result(user, structure: Structure, score: float) -> ConceptMastery:
    """Cập nhật mức nắm vững + lịch ôn lại sau mỗi câu trả lời."""
    now = timezone.now()
    m, _ = ConceptMastery.objects.get_or_create(user=user, structure=structure)
    passed = score >= PASS_SCORE
    m.attempts += 1
    if passed:
        m.correct += 1
        m.box = min(5, m.box + 1)
    else:
        m.box = 0 if m.box <= 2 else m.box - 2
    m.score = round(score if m.attempts == 1 else m.score * 0.6 + score * 0.4, 3)
    m.last_seen_at = now
    m.next_review_at = now + INTERVALS[m.box]
    m.save()
    # Nắm vững trở lại (hộp >= 3) -> các hiểu nhầm cũ về cấu trúc này coi như đã khắc phục
    if m.box >= 3:
        Misconception.objects.filter(user=user, structure=structure, status=Misconception.Status.ACTIVE).update(
            status=Misconception.Status.RESOLVED, updated_at=now
        )
    StudyDay.objects.get_or_create(user=user, date=timezone.localdate())
    return m


def _mis_key(structure_id, text: str) -> str:
    norm = re.sub(r'\s+', ' ', text.strip().lower())
    return hashlib.sha256(f'{structure_id}|{norm}'.encode('utf-8')).hexdigest()


def add_misconception(user, structure: Structure | None, text: str, source: str) -> Misconception | None:
    text = (text or '').strip()[:300]
    if len(text) < 6:
        return None
    key = _mis_key(structure.pk if structure else '', text)
    mis, created = Misconception.objects.get_or_create(
        user=user, key=key, defaults={'structure': structure, 'text': text, 'source': source}
    )
    if not created:
        mis.evidence += 1
        mis.status = Misconception.Status.ACTIVE
        mis.save(update_fields=['evidence', 'status', 'updated_at'])
    return mis


def learner_context(user, model: AnatomyModel | None = None) -> dict:
    """Những gì gia sư cần biết về người học (đưa vào prompt)."""
    profile = profile_of(user)
    ctx = {
        'level': profile.get_level_display(),
        'style': profile.get_style_display(),
        'goals': profile.goals,
    }
    model_structs = set(model.annotations.values_list('structure_id', flat=True)) if model else set()
    mis = list(Misconception.objects.filter(user=user, status=Misconception.Status.ACTIVE).select_related('structure')[:20])
    mis.sort(key=lambda m: (m.structure_id not in model_structs, -m.evidence))
    ctx['notes'] = [m.text for m in mis[:5]]
    weak = (
        ConceptMastery.objects.filter(user=user, attempts__gt=0, score__lt=0.5)
        .select_related('structure').order_by('score')[:6]
    )
    ctx['weak'] = [structure_name(w.structure) for w in weak]
    return ctx


# ------------------------------------------------------------
# Lập kế hoạch phiên ôn tập
# ------------------------------------------------------------

def reviewable_structures(model: AnatomyModel) -> dict[int, tuple[Structure, int]]:
    """{structure_id: (structure, annotation index)} — chỉ cấu trúc đã duyệt, có nội dung."""
    out = {}
    for a in model.annotations.select_related('structure').filter(structure__status=ContentStatus.PUBLISHED):
        s = a.structure
        if s and (s.definition or s.function) and s.pk not in out:
            out[s.pk] = (s, a.index)
    return out


def choose_kind(box: int, has_model: bool, structure: Structure, attempts: int) -> str:
    if box <= 1:
        if has_model and (attempts == 0 or random.random() < 0.5):
            return QuizItem.Kind.IDENTIFY
        return QuizItem.Kind.MCQ
    if box <= 3:
        return QuizItem.Kind.CASE if structure.clinical_note and random.random() < 0.4 else QuizItem.Kind.MCQ
    return QuizItem.Kind.SHORT


def plan_session(user, model: AnatomyModel, size: int = SESSION_SIZE) -> ReviewSession:
    candidates = reviewable_structures(model)
    if not candidates:
        raise ReviewError('Mô hình này chưa có bộ phận nào được duyệt nội dung để ôn tập.')
    mastery = {m.structure_id: m for m in ConceptMastery.objects.filter(user=user, structure_id__in=candidates)}
    now = timezone.now()

    due = sorted((sid for sid, m in mastery.items() if m.next_review_at and m.next_review_at <= now),
                 key=lambda sid: mastery[sid].next_review_at)
    unseen = [sid for sid in candidates if sid not in mastery]
    random.shuffle(unseen)
    rest = sorted((sid for sid in mastery if sid not in due), key=lambda sid: mastery[sid].score)
    order = list(dict.fromkeys(due + unseen + rest))[:size]

    plan = []
    for sid in order:
        s, _index = candidates[sid]
        m = mastery.get(sid)
        box = m.box if m else 0
        reason = 'Đến hạn ôn lại' if sid in due else 'Bộ phận mới' if m is None else 'Còn yếu' if m.score < 0.5 else 'Củng cố'
        plan.append({
            'structure_id': sid, 'name': structure_name(s), 'kind': choose_kind(box, True, s, m.attempts if m else 0),
            'difficulty': 1 if box <= 1 else 2 if box <= 3 else 3, 'reason': reason,
        })
    return ReviewSession.objects.create(user=user, anatomy_model=model, plan=plan)


# ------------------------------------------------------------
# Lấy / tạo câu hỏi
# ------------------------------------------------------------

def sources_for(structure: Structure) -> list[dict]:
    refs = list(structure.references.select_related('document').all()[:5])
    if refs:
        return [
            {'n': i, 'heading': r.heading or r.document.title, 'excerpt': r.excerpt[:1200], 'url': r.url,
             'document_title': r.document.title, 'page_label': f'tr. {r.page_start}' if r.page_start else ''}
            for i, r in enumerate(refs, start=1)
        ]
    text = '\n'.join(filter(None, [structure.definition, structure.function, structure.clinical_note]))
    return [{'n': 1, 'heading': f'Nội dung đã duyệt: {structure_name(structure)}', 'excerpt': text[:2000], 'url': '',
             'document_title': 'SYNAPSE-LAB', 'page_label': ''}]


def _identify_item(structure: Structure, model: AnatomyModel, index: int) -> QuizItem:
    item, _ = QuizItem.objects.get_or_create(
        structure=structure, anatomy_model=model, kind=QuizItem.Kind.IDENTIFY,
        defaults={
            'question': f'Bấm vào “{structure_name(structure)}” trên mô hình 3D', 'correct_index': index,
            'explanation': structure.definition[:400], 'source': 'template', 'citations': sources_for(structure)[:1],
        },
    )
    if item.correct_index != index:
        item.correct_index = index
        item.save(update_fields=['correct_index'])
    return item


def get_item(user, session: ReviewSession, entry: dict) -> QuizItem:
    structure = Structure.objects.get(pk=entry['structure_id'])
    model = session.anatomy_model
    candidates = reviewable_structures(model) if model else {}
    index = candidates.get(structure.pk, (None, None))[1]

    if entry['kind'] == QuizItem.Kind.IDENTIFY and index is not None:
        return _identify_item(structure, model, index)

    kind = entry['kind'] if entry['kind'] != QuizItem.Kind.IDENTIFY else QuizItem.Kind.MCQ
    recent = QuizAttempt.objects.filter(user=user, created_at__gte=timezone.now() - timedelta(days=30)).values('item_id')
    bank = (
        QuizItem.objects.filter(structure=structure, kind=kind, status=QuizItem.Status.ACTIVE)
        .exclude(pk__in=recent).order_by('served', '?').first()
    )
    if bank:
        return bank

    # Kho chưa có câu phù hợp -> AI ra câu mới (nhắm vào hiểu nhầm của chính người này), rồi đưa vào kho
    sources = sources_for(structure)
    misconceptions = list(
        Misconception.objects.filter(user=user, structure=structure, status=Misconception.Status.ACTIVE).values_list('text', flat=True)[:4]
    )
    avoid = list(QuizItem.objects.filter(structure=structure, kind=kind).values_list('question', flat=True)[:6])
    try:
        data = call_ai('/v1/quiz/generate', {
            'kind': kind, 'difficulty': entry.get('difficulty', 1),
            'structure': {'name_en': structure.name_en, 'name_vi': structure.name_vi, 'latin_name': structure.latin_name},
            'sources': [{'heading': s['heading'], 'excerpt': s['excerpt']} for s in sources],
            'misconceptions': misconceptions, 'avoid': avoid,
        }, user=user, feature='quiz')
    except AIError:
        data = {'status': 'failed'}
    if data.get('status') != 'ok':
        if index is not None:  # AI lỗi / hết lượt -> vẫn ôn được bằng câu nhận diện 3D
            return _identify_item(structure, model, index)
        raise ReviewError(data.get('error') or 'Chưa tạo được câu hỏi.')
    return QuizItem.objects.create(
        structure=structure, anatomy_model=model, kind=kind, difficulty=entry.get('difficulty', 1),
        question=data['question'], options=data.get('options', []), correct_index=data.get('correct_index'),
        distractor_notes=data.get('distractor_notes', []), rubric=data.get('rubric', []),
        explanation=data.get('explanation', ''), citations=sources, source='ai',
        prompt_version=data.get('prompt_version', ''), created_by=user,
    )


def public_item(item: QuizItem) -> dict:
    """Câu hỏi gửi cho người học (không lộ đáp án)."""
    return {
        'id': item.id, 'kind': item.kind, 'difficulty': item.difficulty, 'question': item.question,
        'options': item.options if item.kind in (QuizItem.Kind.MCQ, QuizItem.Kind.CASE) else [],
        'structure': {'id': item.structure_id, 'name_vi': item.structure.name_vi, 'name_en': item.structure.name_en},
        'source': item.source,
    }


# ------------------------------------------------------------
# Chấm
# ------------------------------------------------------------

def grade(user, session: ReviewSession | None, item: QuizItem, answer: dict) -> dict:
    structure = item.structure
    score, feedback, misconception, hits = 0.0, '', '', []

    if item.kind == QuizItem.Kind.IDENTIFY:
        picked = answer.get('picked_index')
        score = 1.0 if picked == item.correct_index else 0.0
        if score == 0 and picked is not None and item.anatomy_model_id:
            other = ModelAnnotation.objects.filter(model_id=item.anatomy_model_id, index=picked).select_related('structure').first()
            if other and other.structure_id and other.structure_id != structure.pk:
                misconception = f'Nhầm vị trí “{structure_name(other.structure)}” với “{structure_name(structure)}”'
    elif item.kind in (QuizItem.Kind.MCQ, QuizItem.Kind.CASE):
        choice = answer.get('choice')
        score = 1.0 if choice == item.correct_index else 0.0
        if score == 0 and isinstance(choice, int) and 0 <= choice < len(item.distractor_notes):
            misconception = item.distractor_notes[choice]
    else:
        text = str(answer.get('text') or '')[:3000]
        data = call_ai('/v1/quiz/grade', {
            'question': item.question, 'rubric': item.rubric,
            'sources': [{'heading': c.get('heading', ''), 'excerpt': c.get('excerpt', '')} for c in item.citations],
            'answer': text,
        }, user=user, feature='grade')
        if data.get('status') != 'ok':
            raise ReviewError(data.get('error') or 'Chưa chấm được, thử lại sau.')
        score, feedback, misconception, hits = data['score'], data['feedback'], data.get('misconception', ''), data.get('hits', [])

    correct = score >= PASS_SCORE
    QuizAttempt.objects.create(user=user, session=session, item=item, answer=answer, correct=correct, score=score,
                               feedback=feedback, misconception=misconception)
    QuizItem.objects.filter(pk=item.pk).update(served=item.served + 1, correct_count=item.correct_count + (1 if correct else 0))
    mastery = record_result(user, structure, score)
    if misconception and (not correct or item.kind == QuizItem.Kind.SHORT):
        add_misconception(user, structure, misconception, 'grade' if item.kind == QuizItem.Kind.SHORT else 'quiz')

    if session is not None:
        session.position += 1
        session.correct += 1 if correct else 0
        if session.position >= len(session.plan):
            session.finished_at = timezone.now()
        session.save(update_fields=['position', 'correct', 'finished_at'])

    return {
        'correct': correct, 'score': score, 'correct_index': item.correct_index, 'explanation': item.explanation,
        'feedback': feedback, 'rubric': item.rubric, 'hits': hits, 'misconception': misconception,
        'citations': item.citations,
        'mastery': {'box': mastery.box, 'score': mastery.score, 'next_review_at': mastery.next_review_at},
        'finished': bool(session and session.finished_at),
    }


def due_count(user) -> int:
    return ConceptMastery.objects.filter(user=user, next_review_at__lte=timezone.now()).count()


def reset_profile(user):
    ConceptMastery.objects.filter(user=user).delete()
    Misconception.objects.filter(user=user).delete()
    QuizAttempt.objects.filter(user=user).delete()
    ReviewSession.objects.filter(user=user).delete()
    LearnerProfile.objects.filter(user=user).delete()


def mastery_rows(user) -> list[dict]:
    rows = ConceptMastery.objects.filter(user=user).select_related('structure').order_by('score')
    models_by_structure: dict[int, list[str]] = {}
    for a in ModelAnnotation.objects.filter(structure_id__in=[r.structure_id for r in rows]).select_related('model'):
        models_by_structure.setdefault(a.structure_id, [])
        title = a.model.title_vi or a.model.title
        if title not in models_by_structure[a.structure_id]:
            models_by_structure[a.structure_id].append(title)
    return [
        {
            'structure_id': r.structure_id, 'name_vi': r.structure.name_vi, 'name_en': r.structure.name_en,
            'box': r.box, 'score': r.score, 'attempts': r.attempts, 'correct': r.correct,
            'last_seen_at': r.last_seen_at, 'next_review_at': r.next_review_at,
            'models': models_by_structure.get(r.structure_id, [])[:3],
        }
        for r in rows
    ]

