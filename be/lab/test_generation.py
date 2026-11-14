from datetime import timedelta
from unittest.mock import patch

from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from users.models import User

from .generation import runner
from .generation.agents import FakeAgents
from .generation.layout import MARGIN, footprint, layout_parts
from .generation.pipeline import route_error
from .models import Generation, Lesson
from .validators import validate_package

URL = '/api/lab/generations/'
KEYS_OK = ['plan', 'parts', 'layout', 'content', 'wiring', 'exercises', 'validate', 'review', 'finalize']


class LayoutTests(SimpleTestCase):
    PARTS = [{'id': 'c', 'partId': 'chassis'}, {'id': 'b', 'partId': 'battery'}, {'id': 'e', 'partId': 'esp32'},
             {'id': 'd', 'partId': 'driver'}, {'id': 't', 'partId': 'tt-motor'}, {'id': 's', 'partId': 'hc-sr04'}]

    def test_no_overlap_and_deterministic(self):
        out = layout_parts(self.PARTS, [['s', 'e']])
        self.assertEqual(out, layout_parts(self.PARTS, [['s', 'e']]))
        boxes = []
        for p in self.PARTS[1:]:
            (x, _, z) = out['positions'][p['id']]['at']
            w, d = footprint(p['partId'])
            w, d = w - MARGIN, d - MARGIN  # kích thước thật của linh kiện, phần đệm giữa các ô là khoảng hở
            boxes.append((x - w / 2, x + w / 2, z - d / 2, z + d / 2))
        for i, a in enumerate(boxes):
            for b in boxes[i + 1:]:
                self.assertTrue(a[1] <= b[0] + 1e-9 or b[1] <= a[0] + 1e-9 or a[3] <= b[2] + 1e-9 or b[3] <= a[2] + 1e-9, 'hai linh kiện chồng nhau')
        self.assertEqual(out['positions']['c']['at'], [0.0, 0.0, 0.0])
        self.assertEqual(out['positions']['b']['at'][1], 0.003)  # đặt lên mặt khung

    def test_without_chassis_sits_on_ground(self):
        out = layout_parts([{'id': 'a', 'partId': 'esp32'}, {'id': 'b', 'partId': 'relay'}])
        self.assertEqual(out['positions']['a']['at'][1], 0.0)
        self.assertGreater(out['scene']['grid'], 0.5)

    def test_too_many_parts_warns(self):
        many = [{'id': 'c', 'partId': 'chassis'}] + [{'id': f'm{i}', 'partId': 'tt-motor'} for i in range(8)]
        self.assertTrue(layout_parts(many)['warnings'])


class RouteTests(SimpleTestCase):
    def test_route_error(self):
        self.assertEqual(route_error('Bộ phận #1: linh kiện "x" không có trong thư viện'), 'parts')
        self.assertEqual(route_error('Bộ phận #1: thiếu name'), 'content')
        self.assertEqual(route_error('Chân #4: linh kiện "esp32" không có chân "x"'), 'wiring')
        self.assertEqual(route_error('Mạch "vm" cần ít nhất 2 chân'), 'wiring')
        self.assertEqual(route_error('Bài tính #1: công thức lỗi'), 'exercises')
        self.assertEqual(route_error('tune (công thức): thiếu constants'), 'exercises')
        self.assertEqual(route_error('overview cần title'), 'content')


@override_settings(LAB_GEN_AGENTS='fake', LAB_GEN_INLINE=True)
class GenerationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.me = User.objects.create_user(email='gen-me@example.test', password='pw-12345678')
        self.other = User.objects.create_user(email='gen-other@example.test', password='pw-12345678')
        self.admin = User.objects.create_user(email='gen-admin@example.test', password='pw-12345678', role='admin')
        self.client.force_authenticate(self.me)

    def create(self, text='Motor chạy bằng pin'):
        return self.client.post(URL, {'request': text}, format='json')

    def keys(self, data):
        return [s['key'] for s in data['steps']]

    def test_disabled_by_default(self):
        with override_settings(LAB_GEN_AGENTS='off'):
            self.assertEqual(self.create().status_code, 503)

    def test_requires_login_and_valid_request(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.create().status_code, 401)
        self.client.force_authenticate(self.me)
        self.assertEqual(self.create('ab').status_code, 400)
        self.assertEqual(self.create('x' * 501).status_code, 400)

    def test_happy_path_creates_private_valid_lesson(self):
        res = self.create()
        self.assertEqual(res.status_code, 201)
        d = res.data
        self.assertEqual(d['status'], 'succeeded')
        self.assertEqual(self.keys(d), KEYS_OK)
        self.assertTrue(all(s['status'] == 'done' for s in d['steps']))
        self.assertGreater(d['tokens_used'], 0)
        lesson = Lesson.objects.get(slug=d['lesson_slug'])
        self.assertEqual(lesson.visibility, 'private')
        self.assertEqual(lesson.created_by, self.me)
        self.assertEqual(validate_package(lesson.spec), [])
        self.assertIn('Motor chạy bằng pin', lesson.spec['overview']['what'])
        self.assertEqual(lesson.slug, 'motor-chay-bang-pin')
        self.assertTrue(d['preview']['layout'] and d['preview']['package'])

    def test_fix_loop_routes_error_to_wiring_only(self):
        d = self.create('Motor [test-fix]').data
        self.assertEqual(d['status'], 'succeeded')
        self.assertEqual(d['repair_rounds'], 1)
        keys = self.keys(d)
        self.assertEqual(keys.count('wiring'), 2)  # lần đầu sai, rồi sửa
        self.assertEqual(keys.count('content'), 1)  # phần đã đúng không bị sinh lại
        self.assertEqual(keys.count('exercises'), 1)
        failed = [s for s in d['steps'] if s['status'] == 'failed']
        self.assertEqual(failed[0]['key'], 'validate')
        self.assertTrue(any('không có chân' in e for e in failed[0]['detail']['errors']))

    def test_review_issue_routes_to_content(self):
        d = self.create('Motor [test-review]').data
        self.assertEqual(d['status'], 'succeeded')
        self.assertEqual(d['repair_rounds'], 1)
        self.assertEqual(self.keys(d).count('content'), 2)
        self.assertEqual(self.keys(d).count('wiring'), 1)

    def test_stuck_runs_out_of_rounds_and_keeps_no_lesson(self):
        d = self.create('Motor [test-stuck]').data
        self.assertEqual(d['status'], 'needs_work')
        self.assertEqual(d['repair_rounds'], 3)
        self.assertTrue(d['errors'])
        self.assertIsNone(d['lesson_slug'])
        self.assertEqual(Lesson.objects.count(), 0)

    def test_stops_early_when_missing_or_unsafe(self):
        d = self.create('Cánh tay [test-missing]').data
        self.assertEqual(d['status'], 'stopped')
        self.assertIn('servo-3-khop', d['message'])
        self.assertEqual(self.keys(d), ['plan'])
        self.assertEqual(self.create('Nguy hiểm [test-unsafe]').data['status'], 'stopped')
        self.assertEqual(Lesson.objects.count(), 0)

    @override_settings(LAB_GEN_TOKEN_CAP=2000)
    def test_token_budget_stops_generation(self):
        d = self.create().data
        self.assertEqual(d['status'], 'needs_work')
        self.assertIn('ngân sách', d['message'])

    @override_settings(LAB_GEN_DAILY_LIMIT=2)
    def test_daily_limit_same_request_reuse_and_admin_exempt(self):
        self.assertEqual(self.create('Bài một').status_code, 201)
        again = self.create('  bài   MỘT ')  # giống hệt sau khi chuẩn hóa: dùng lại, không tốn lượt
        self.assertEqual(again.status_code, 200)
        self.assertEqual(Generation.objects.filter(user=self.me).count(), 1)
        self.assertEqual(self.create('Bài hai').status_code, 201)
        self.assertEqual(self.create('Bài ba').status_code, 429)
        self.client.force_authenticate(self.admin)
        for i in range(3):
            self.assertEqual(self.create(f'Bài admin {i}').status_code, 201)

    def test_one_active_generation_at_a_time(self):
        Generation.objects.create(user=self.me, request='Đang chạy', request_hash='x', status='running', heartbeat_at=timezone.now())
        res = self.create('Yêu cầu khác')
        self.assertEqual(res.status_code, 409)
        self.assertIn('generation_id', res.data)

    def test_privacy(self):
        gid = self.create().data['id']
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f'{URL}{gid}/').status_code, 404)
        self.assertEqual(self.client.get(URL).data, [])
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(f'{URL}{gid}/').status_code, 200)

    def test_cancel_idle_and_cancel_mid_run(self):
        gen = Generation.objects.create(user=self.me, request='Chờ', request_hash='y', stage='plan')
        res = self.client.post(f'{URL}{gen.id}/cancel/')
        self.assertEqual(res.data['status'], 'cancelled')
        self.assertEqual(self.client.post(f'{URL}{gen.id}/cancel/').status_code, 409)

        class Canceller(FakeAgents):
            def _parts(inner, p):
                Generation.objects.filter(user=self.me, status='running').update(cancel_requested=True)
                return super()._parts(p)

        with patch('lab.generation.pipeline.get_agents', return_value=Canceller()):
            d = self.create('Sẽ bị hủy').data
        self.assertEqual(d['status'], 'cancelled')
        self.assertNotIn('layout', self.keys(d))

    def test_resume_after_interruption_does_not_redo_finished_steps(self):
        class Interrupt(BaseException):
            pass

        calls = []

        class Flaky(FakeAgents):
            blow = True

            def run(inner, agent, payload):
                calls.append(agent)
                if agent == 'exercises' and inner.blow:
                    inner.blow = False
                    raise Interrupt()
                return super().run(agent, payload)

        flaky = Flaky()
        with patch('lab.generation.pipeline.get_agents', return_value=flaky):
            with self.assertRaises(Interrupt):
                self.create('Bị bỏ dở')
            gen = Generation.objects.get()
            self.assertEqual(gen.status, 'running')
            self.assertEqual(gen.stage, 'exercises')
            runner.run_now(gen.id)  # chưa quá hạn heartbeat: không ai được giành chạy chung
            self.assertEqual(Generation.objects.get().status, 'running')
            Generation.objects.filter(pk=gen.id).update(heartbeat_at=timezone.now() - timedelta(hours=1))
            d = self.client.get(f'{URL}{gen.id}/').data  # có người hỏi trạng thái: chạy tiếp
        self.assertEqual(d['status'], 'succeeded')
        self.assertEqual(calls.count('plan'), 1)
        self.assertEqual(calls.count('content'), 1)
        self.assertEqual(calls.count('exercises'), 2)
        self.assertIn('interrupted', [s['status'] for s in d['steps']])

    def test_claim_is_exclusive(self):
        gen = Generation.objects.create(user=self.me, request='Giành', request_hash='z', stage='plan')
        self.assertTrue(runner.claim(gen.id))
        self.assertFalse(runner.claim(gen.id))

    def test_existing_identical_lesson_is_reused(self):
        first = self.create('Lần một').data
        spec = Lesson.objects.get().spec
        # Cùng nội dung, khác yêu cầu: hai yêu cầu cho ra bài giống hệt thì dùng lại bài cũ
        with patch('lab.generation.pipeline.services.content_hash', return_value=Lesson.objects.get().content_hash):
            second = self.create('Lần hai').data
        self.assertEqual(second['status'], 'succeeded')
        self.assertEqual(second['lesson_slug'], first['lesson_slug'])
        self.assertEqual(Lesson.objects.count(), 1)
        self.assertIn('giống hệt', second['message'])
        self.assertTrue(spec)

    def test_slug_collision_gets_suffix(self):
        a = self.create('Cùng tên').data
        Generation.objects.all().update(created_at=timezone.now() - timedelta(days=2))
        self.client.force_authenticate(self.other)
        b = self.create('Cùng tên').data
        self.assertNotEqual(a['lesson_slug'], b['lesson_slug'])
