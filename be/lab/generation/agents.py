"""Các agent sinh bài. Pipeline chỉ gọi giao diện `AgentClient.run`, nên đổi từ agent giả sang agent AI thật
không phải sửa pipeline.

`FakeAgents` không gọi model: tạo bài mẫu cố định (mạch motor chạy bằng pin) và có vài "công tắc lỗi" viết ngay trong
yêu cầu để thử luồng sửa lỗi, dừng sớm... Chỉ dùng khi phát triển và trong test.
"""

import re
import unicodedata
from dataclasses import dataclass, field

from django.conf import settings


@dataclass
class AgentResult:
    output: dict
    tokens: int = 0
    notes: list[str] = field(default_factory=list)


class AgentClient:
    def run(self, agent: str, payload: dict) -> AgentResult:  # pragma: no cover - giao diện
        raise NotImplementedError


class AIAgents(AgentClient):
    """Agent gọi model thật qua service AI. Làm ở bước sau."""

    def run(self, agent: str, payload: dict) -> AgentResult:
        raise NotImplementedError('Agent AI thật chưa được nối. Đặt LAB_GEN_AGENTS=fake để thử luồng.')


def _slug(text: str) -> str:
    plain = ''.join(c for c in unicodedata.normalize('NFD', text.lower().replace('đ', 'd')) if not unicodedata.combining(c))
    base = re.sub(r'[^a-z0-9]+', '-', plain).strip('-')
    return (base[:40].strip('-') or 'bai-thuc-hanh')


class FakeAgents(AgentClient):
    TOKENS = 1200

    def run(self, agent: str, payload: dict) -> AgentResult:
        return getattr(self, f'_{agent}')(payload)

    # --- kế hoạch
    def _plan(self, p):
        req = p['request']
        clean = re.sub(r'\[test-[a-z]+\]', '', req).strip() or 'Bài thực hành'
        if '[test-unsafe]' in req:
            return AgentResult({'feasible': False, 'unsafe': True, 'reason_if_not': 'Yêu cầu có thể gây nguy hiểm.', 'missing': {'parts': [], 'templates': []}}, self.TOKENS)
        if '[test-missing]' in req:
            return AgentResult({'feasible': False, 'unsafe': False, 'reason_if_not': 'Chưa có mẫu mô phỏng phù hợp.',
                                'missing': {'parts': ['servo-3-khop'], 'templates': ['canh-tay-nhieu-khop']}}, self.TOKENS)
        return AgentResult({
            'feasible': True, 'unsafe': False, 'missing': {'parts': [], 'templates': []},
            'title': clean[:80].capitalize(), 'slug': _slug(clean), 'subtitle': 'Bài thực hành tạo thử, nội dung mẫu.',
            'learning_goals': ['Hiểu vai trò từng linh kiện', 'Đi dây đúng', 'Tính dòng điện và thời gian chạy'], 'level': 'co_ban',
            'tune_template': 'formula', 'key_quantities': ['duty (%)', 'số cell (cell)'], 'request': clean,
        }, self.TOKENS)

    # --- chọn linh kiện
    def _parts(self, p):
        return AgentResult({
            'parts': [
                {'id': 'battery', 'partId': 'battery', 'why': 'Cấp năng lượng'},
                {'id': 'mcu', 'partId': 'esp32', 'why': 'Ra lệnh điều khiển'},
                {'id': 'driver', 'partId': 'driver', 'why': 'Đóng cắt dòng lớn cho motor'},
                {'id': 'motor', 'partId': 'tt-motor', 'why': 'Tạo chuyển động'},
            ],
            'near': [['battery', 'driver'], ['driver', 'motor']],
        }, self.TOKENS)

    # --- nội dung
    def _content(self, p):
        plan, req = p['plan'], p['plan'].get('request', '')

        def part(id, name, role, color, goal, hint):
            return {'id': id, 'name': name, 'role': role, 'color': color, 'goal': goal, 'hint': hint,
                    'facts': [{'k': 'Vai trò', 'v': role}], 'details': [f'{name} là một phần của bài "{plan["title"]}".']}

        return AgentResult({
            'overview': {'title': plan['title'], 'what': f'Bài thực hành tạo từ yêu cầu: {req}', 'steps': ['ESP32 xuất tín hiệu PWM.', 'Mạch điều khiển đóng cắt dòng lớn từ pin.', 'Motor quay theo dòng trung bình.']},
            'parts': [
                part('battery', 'Pin', 'Cấp năng lượng', '#B45309', 'Gắn nguồn năng lượng cho hệ thống.', 'Khối dài có hai cực.'),
                part('mcu', 'Vi điều khiển ESP32', 'Ra lệnh điều khiển', '#1E3F82', 'Gắn bộ não đưa ra quyết định.', 'Tấm mạch có chip.'),
                part('driver', 'Mạch điều khiển motor', 'Đóng cắt dòng lớn', '#7C3AED', 'Gắn mạch trung gian giữa bộ não và motor.', 'Tấm mạch nhỏ.'),
                part('motor', 'Motor giảm tốc', 'Tạo chuyển động', '#0F8A6B', 'Gắn bộ phận biến điện thành chuyển động.', 'Hộp số vàng.'),
            ],
            'links': [['mcu', 'driver'], ['battery', 'driver'], ['driver', 'motor']],
            'texts': {'buildDone': 'Đã lắp đủ các bộ phận. Giờ bạn đi dây.', 'buildDoneLabel': 'Sang bước đi dây'},
        }, self.TOKENS)

    # --- đi dây
    def _wiring(self, p):
        req, errors = p['request'], p.get('errors') or []
        bad = ('[test-stuck]' in req) or ('[test-fix]' in req and not errors)

        def term(id, part, pin, net, label):
            return {'id': id, 'part': part, 'pin': pin, 'label': label, 'desc': f'Chân {label}', 'net': net}

        return AgentResult({
            'exercise': 'Đi dây cho motor chạy bằng pin',
            'nets': [
                {'id': 'vm', 'name': 'Nguồn pin cho motor', 'color': '#DC2626', 'done': 'Pin cấp điện cho mạch điều khiển motor.'},
                {'id': 'gnd', 'name': 'Đường nối đất chung', 'color': '#1F2937', 'done': 'Mọi linh kiện dùng chung mức 0 V.'},
                {'id': 'pwm', 'name': 'Lệnh PWM', 'color': '#7C3AED', 'done': 'ESP32 gửi tín hiệu PWM tới mạch điều khiển.'},
                {'id': 'mot', 'name': 'Dây tới motor', 'color': '#DB2777', 'done': 'Mạch điều khiển cấp điện cho motor.'}],
            'terminals': [
                term('bat-pos', 'battery', 'pos', 'vm', 'Cực dương'), term('bat-neg', 'battery', 'neg', 'gnd', 'Cực âm'),
                term('esp-gnd', 'mcu', 'gnd', 'gnd', 'GND'),
                term('esp-pwm', 'mcu', 'khong-co' if bad else 'gpio-out', 'pwm', 'PWM'),
                term('drv-vm', 'driver', 'vm', 'vm', 'VM'), term('drv-gnd', 'driver', 'gnd', 'gnd', 'GND'), term('drv-in', 'driver', 'in', 'pwm', 'IN'),
                term('drv-out', 'driver', 'out', 'mot', 'OUT'), term('mot-a', 'motor', 'a', 'mot', 'Dây A'), term('mot-b', 'motor', 'b', 'mot', 'Dây B')],
            'rules': [
                {'nets': ['pwm', 'mot'], 'message': 'Chân PWM không đủ dòng nuôi motor trực tiếp.'},
                {'nets': ['pwm', 'vm'], 'message': 'Điện áp pin vượt mức chịu của chân PWM.'},
                {'nets': ['gnd', '*'], 'message': 'Nối với GND là chập mạch.'}],
            'fallback': 'Hai chân này thuộc hai mạch khác nhau.', 'doneText': 'Mạch đã đủ nguồn, lệnh điều khiển và dây motor.',
        }, self.TOKENS)

    # --- đề tính và mô phỏng
    def _exercises(self, p):
        return AgentResult({
            'exercises': [
                {'title': 'Dòng trung bình theo duty', 'prompt': 'Motor chạy hết cỡ cần {full} A. Với duty {duty}%, dòng trung bình là bao nhiêu A?',
                 'inputs': [{'name': 'duty', 'label': 'Duty PWM', 'unit': '%', 'min': 10, 'max': 100, 'step': 5, 'default': 60}], 'constants': {'full': 0.35},
                 'answer': 'full * duty / 100', 'tolerance': {'rel': 0.1}, 'placeholder': 'Dòng (A)', 'okText': 'Đúng. Kết quả ≈ {answer:3} A.',
                 'failText': 'Nhân dòng hết cỡ với tỉ lệ duty.', 'focus': 'driver'}],
            'tune': {'template': 'formula', 'title': 'Chỉnh duty và số cell pin', 'intro': 'Kéo thanh để xem dòng và thời gian chạy.',
                     'inputs': [{'name': 'duty', 'label': 'Duty PWM', 'unit': '%', 'min': 10, 'max': 100, 'step': 5, 'default': 60}],
                     'constants': {'full': 0.35, 'cap': 2600},
                     'outputs': [{'id': 'amp', 'label': 'Dòng trung bình', 'expr': 'full * duty / 100', 'unit': 'A', 'digits': 2},
                                 {'id': 'hours', 'label': 'Thời gian chạy', 'expr': 'cap / 1000 / amp', 'unit': 'giờ', 'digits': 1}],
                     'chart': {'xInput': 'duty', 'yOutput': 'hours', 'xLabel': 'Duty PWM (%)', 'yLabel': 'Thời gian chạy (giờ)'}, 'limits': []},
        }, self.TOKENS)

    # --- đánh giá
    def _review(self, p):
        if '[test-review]' in p['request'] and not p.get('errors'):
            return AgentResult({'pass': False, 'issues': [{'owner': 'content', 'where': 'overview', 'problem': 'Phần tổng quan quá ngắn.', 'severity': 'must'}]}, self.TOKENS // 2)
        return AgentResult({'pass': True, 'issues': []}, self.TOKENS // 2)


def get_agents() -> AgentClient:
    mode = getattr(settings, 'LAB_GEN_AGENTS', 'off')
    if mode == 'fake':
        return FakeAgents()
    if mode == 'ai':
        return AIAgents()
    raise RuntimeError('Tính năng sinh bài chưa được bật (LAB_GEN_AGENTS).')
