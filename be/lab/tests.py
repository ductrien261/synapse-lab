import importlib.util
from pathlib import Path
from unittest import skipUnless

from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from users.models import User

from . import services
from .models import Lesson
from .validators import ExprError, evaluate, parts_index, validate_package

BASE = '/api/lab/lessons/'


def make_package(slug='demo-motor', title='Motor chạy bằng pin', answer='speed * 2'):
    def part(id, part_id, at):
        return {'id': id, 'partId': part_id, 'name': id, 'role': 'vai trò', 'color': '#336699', 'goal': 'mục tiêu', 'hint': 'gợi ý',
                'facts': [{'k': 'a', 'v': 'b'}], 'details': ['chi tiết'], 'at': at, 'node': [at[0], 0.02, at[2]]}

    def term(id, part, pin, net):
        return {'id': id, 'part': part, 'pin': pin, 'label': id, 'desc': 'mô tả', 'net': net}

    cam = {'pos': [0.2, 0.2, 0.2], 'target': [0, 0, 0]}
    return {
        'schemaVersion': 1, 'slug': slug, 'title': title, 'subtitle': 'Phụ đề',
        'overview': {'title': 't', 'what': 'w', 'steps': ['một', 'hai']},
        'scene': {'camera': cam, 'wireCamera': cam, 'grid': 0.5, 'ground': '#eeeeee', 'decor': []},
        'parts': [part('bat', 'battery', [0, 0, 0]), part('drv', 'driver', [0.05, 0, 0])],
        'links': [['bat', 'drv']],
        'buildOrder': [1, 0],
        'wiring': {
            'exercise': 'Đi dây',
            'nets': [{'id': 'vm', 'name': 'Nguồn', 'color': '#dc2626', 'done': 'xong'}, {'id': 'gnd', 'name': 'Đất', 'color': '#111111', 'done': 'xong'}],
            'terminals': [term('b-pos', 'bat', 'pos', 'vm'), term('d-vm', 'drv', 'vm', 'vm'), term('b-neg', 'bat', 'neg', 'gnd'), term('d-gnd', 'drv', 'gnd', 'gnd')],
            'rules': [{'nets': ['gnd', '*'], 'message': 'Chập mạch'}],
            'fallback': 'Không nối được', 'doneText': 'Xong',
        },
        'exercises': [{
            'title': 'Bài 1', 'prompt': 'Tốc độ {speed}, gấp đôi là?', 'inputs': [{'name': 'speed', 'label': 'Tốc độ', 'unit': 'm/s', 'min': 1, 'max': 10, 'step': 1, 'default': 3}],
            'constants': {}, 'answer': answer, 'tolerance': {'rel': 0.1}, 'placeholder': 'm/s', 'okText': 'Đúng {answer:1}', 'failText': 'Sai', 'focus': 'bat',
        }],
        'tune': {'template': 'vehicle-arena', 'title': 'Thử', 'intro': 'Chạy thử'},
        'texts': {'buildDone': 'Đã lắp', 'buildDoneLabel': 'Đi dây'},
    }


class ValidatorTests(SimpleTestCase):
    def test_valid_package(self):
        self.assertEqual(validate_package(make_package()), [])

    def test_unknown_part_pin_and_bad_formula(self):
        pkg = make_package()
        pkg['parts'][0]['partId'] = 'khong-co'
        pkg['wiring']['terminals'][1]['pin'] = 'khong-co'
        pkg['exercises'][0]['answer'] = 'speed / 0'
        errors = ' | '.join(validate_package(pkg))
        self.assertIn('không có trong thư viện', errors)
        self.assertIn('không có chân', errors)
        self.assertIn('công thức lỗi', errors)

    def test_structure_rules(self):
        pkg = make_package()
        pkg['buildOrder'] = [0, 0]
        pkg['links'] = [['bat', 'ghost']]
        pkg['wiring']['rules'] = [{'nets': ['vm', 'ghost'], 'message': 'x'}]
        pkg['exercises'][0]['okText'] = 'dùng {khong_co}'
        pkg['tune'] = {'template': 'tu-che'}
        errors = ' | '.join(validate_package(pkg))
        for part in ('buildOrder', 'links #1', 'Luật #1', '{khong_co}', 'tune.template'):
            self.assertIn(part, errors)

    def test_too_large_and_not_object(self):
        self.assertEqual(len(validate_package([])), 1)
        pkg = make_package()
        pkg['overview']['what'] = 'x' * 250_000
        self.assertIn('quá lớn', validate_package(pkg)[0])

    def test_formula_template(self):
        pkg = make_package()
        pkg['tune'] = {
            'template': 'formula', 'title': 't', 'intro': 'i',
            'inputs': [{'name': 'duty', 'label': 'Duty', 'unit': '%', 'min': 10, 'max': 100, 'step': 5, 'default': 50}],
            'constants': {'cap': 2600},
            'outputs': [{'id': 'hours', 'label': 'Giờ', 'expr': 'cap / duty', 'unit': 'giờ', 'digits': 1}],
            'chart': {'xInput': 'duty', 'yOutput': 'hours', 'xLabel': 'x', 'yLabel': 'y'}, 'limits': [{'output': 'hours', 'min': 1, 'text': 'ít'}],
        }
        self.assertEqual(validate_package(pkg), [])
        pkg['tune']['chart']['yOutput'] = 'khong-co'
        self.assertTrue(validate_package(pkg))

    def test_evaluator_is_safe(self):
        self.assertAlmostEqual(evaluate('max(a, 2) * 3 + sqrt(16)', {'a': 5}), 19)
        for bad in ('__import__("os")', 'a ** 2', 'open("x")', '(1).real', 'a if a else 1', '1/0'):
            with self.assertRaises(ExprError):
                evaluate(bad, {'a': 1})


class ServiceTests(SimpleTestCase):
    def test_hash_ignores_name_but_not_content(self):
        a = make_package('mot-a', 'Tên A')
        b = make_package('mot-b', 'Tên B')
        self.assertEqual(services.content_hash(a), services.content_hash(b))
        self.assertNotEqual(services.content_hash(a), services.content_hash(make_package(answer='speed * 3')))


class LabApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.me = User.objects.create_user(email='me@example.test', password='pw-12345678')
        self.other = User.objects.create_user(email='other@example.test', password='pw-12345678')
        self.admin = User.objects.create_user(email='admin@example.test', password='pw-12345678', role='admin')
        self.client.force_authenticate(self.me)

    def create(self, **kw):
        return self.client.post(BASE, {'spec': make_package(**kw)}, format='json')

    def test_requires_login(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(BASE).status_code, 401)

    def test_create_list_and_detail(self):
        res = self.create()
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['visibility'], 'private')
        self.assertTrue(res.data['is_mine'])
        listed = self.client.get(BASE).data
        self.assertEqual([x['slug'] for x in listed], ['demo-motor'])
        self.assertNotIn('spec', listed[0])
        self.assertEqual(self.client.get(BASE + 'demo-motor/').data['spec']['slug'], 'demo-motor')

    def test_invalid_package_rejected_with_reasons(self):
        pkg = make_package()
        pkg['parts'][0]['partId'] = 'khong-co'
        res = self.client.post(BASE, {'spec': pkg}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('spec', res.data)
        self.assertEqual(Lesson.objects.count(), 0)

    def test_duplicate_slug_and_content(self):
        self.create()
        self.assertEqual(self.create(slug='demo-motor', answer='speed * 3').status_code, 409)  # trùng slug
        self.assertEqual(self.create(slug='mot-khac', title='Tên khác').status_code, 409)  # trùng nội dung của chính mình

    def test_private_lessons_are_hidden_from_others(self):
        self.create()
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(BASE + 'demo-motor/').status_code, 404)
        self.assertEqual(self.client.get(BASE).data, [])
        self.assertEqual(self.client.patch(BASE + 'demo-motor/', {'spec': make_package(answer='speed * 5')}, format='json').status_code, 404)
        self.assertEqual(self.client.delete(BASE + 'demo-motor/').status_code, 404)
        self.assertTrue(Lesson.objects.filter(slug='demo-motor', is_deleted=False).exists())

    def test_soft_delete_and_restore(self):
        self.create()
        self.assertEqual(self.client.delete(BASE + 'demo-motor/').status_code, 204)
        lesson = Lesson.objects.get(slug='demo-motor')  # dòng vẫn còn trong DB
        self.assertTrue(lesson.is_deleted)
        self.assertEqual(lesson.deleted_by, self.me)
        self.assertEqual(self.client.get(BASE).data, [])
        self.assertEqual([x['slug'] for x in self.client.get(BASE + '?scope=trash').data], ['demo-motor'])
        self.assertEqual(self.create(slug='demo-motor').status_code, 409)  # slug vẫn được giữ
        self.assertEqual(self.client.post(BASE + 'demo-motor/restore/').status_code, 200)
        self.assertFalse(Lesson.objects.get(slug='demo-motor').is_deleted)

    def test_edit_resets_public_to_private_and_keeps_slug(self):
        self.create()
        Lesson.objects.filter(slug='demo-motor').update(visibility='public')
        res = self.client.patch(BASE + 'demo-motor/', {'spec': make_package(title='Tên mới', answer='speed * 4')}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['visibility'], 'private')
        self.assertEqual(res.data['title'], 'Tên mới')
        bad = self.client.patch(BASE + 'demo-motor/', {'spec': make_package(slug='slug-khac')}, format='json')
        self.assertEqual(bad.status_code, 400)

    def test_submit_review_flow_and_public_visibility(self):
        self.create()
        res = self.client.post(BASE + 'demo-motor/submit/')
        self.assertEqual(res.data['visibility'], 'pending')
        self.assertEqual(self.client.post(BASE + 'demo-motor/submit/').status_code, 409)  # không gửi hai lần
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(BASE + '?scope=public').data, [])  # chưa duyệt thì chưa công khai
        self.assertEqual(self.client.post('/api/lab/admin/lessons/demo-motor/review/', {'action': 'approve'}, format='json').status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual([x['slug'] for x in self.client.get('/api/lab/admin/lessons/').data], ['demo-motor'])
        self.assertEqual(self.client.post('/api/lab/admin/lessons/demo-motor/review/', {'action': 'approve'}, format='json').data['visibility'], 'public')
        self.client.force_authenticate(self.other)
        self.assertEqual([x['slug'] for x in self.client.get(BASE + '?scope=public').data], ['demo-motor'])
        self.assertEqual(self.client.get(BASE + 'demo-motor/').status_code, 200)
        self.assertFalse(self.client.get(BASE + 'demo-motor/').data['is_mine'])

    def test_reject_needs_reason_and_returns_to_private(self):
        self.create()
        self.client.post(BASE + 'demo-motor/submit/')
        self.client.force_authenticate(self.admin)
        url = '/api/lab/admin/lessons/demo-motor/review/'
        self.assertEqual(self.client.post(url, {'action': 'reject'}, format='json').status_code, 400)
        res = self.client.post(url, {'action': 'reject', 'note': 'Thiếu bài tính'}, format='json')
        self.assertEqual(res.data['visibility'], 'private')
        self.client.force_authenticate(self.me)
        self.assertEqual(self.client.get(BASE + 'demo-motor/').data['review_note'], 'Thiếu bài tính')

    def test_create_blocks_duplicate_of_public(self):
        self.create()
        Lesson.objects.filter(slug='demo-motor').update(visibility='public', created_by=self.other)
        res = self.client.post(BASE, {'spec': make_package(slug='ban-sao', title='Khác hẳn')}, format='json')
        self.assertEqual(res.status_code, 409)  # trùng nội dung với bài công khai

    def test_submit_blocks_similar_title(self):
        self.create()
        Lesson.objects.filter(slug='demo-motor').update(visibility='public', created_by=self.other)
        self.assertEqual(self.create(slug='mot-moi', title='Motor chạy bằng pin!', answer='speed * 9').status_code, 201)
        self.assertEqual(self.client.post(BASE + 'mot-moi/submit/').status_code, 409)

    def test_withdraw_pending(self):
        self.create()
        self.client.post(BASE + 'demo-motor/submit/')
        self.assertEqual(self.client.post(BASE + 'demo-motor/withdraw/').data['visibility'], 'private')
        self.assertEqual(self.client.post(BASE + 'demo-motor/withdraw/').status_code, 409)

    def test_deleted_pending_leaves_queue(self):
        self.create()
        self.client.post(BASE + 'demo-motor/submit/')
        self.client.delete(BASE + 'demo-motor/')
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get('/api/lab/admin/lessons/').data, [])
        self.assertEqual(self.client.post('/api/lab/admin/lessons/demo-motor/review/', {'action': 'approve'}, format='json').status_code, 409)

    def test_deleted_public_is_not_visible(self):
        self.create()
        Lesson.objects.filter(slug='demo-motor').update(visibility='public')
        self.client.delete(BASE + 'demo-motor/')
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(BASE + '?scope=public').data, [])
        self.assertEqual(self.client.get(BASE + 'demo-motor/').status_code, 404)


DATA = Path(__file__).resolve().parent / 'data'
CATALOG = DATA.parents[1].parent / 'fe' / 'src' / 'lib' / 'lab' / 'parts' / 'catalog.ts'


@skipUnless(CATALOG.exists(), 'Không có mã frontend trong môi trường này (ví dụ container backend)')
class PartsIndexTests(SimpleTestCase):
    def test_index_matches_frontend_catalog(self):
        spec = importlib.util.spec_from_file_location('export_parts_index', DATA / 'export_parts_index.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.assertEqual(
            module.build_index(CATALOG.read_text(encoding='utf-8')), parts_index(),
            'Thư viện linh kiện ở frontend đã đổi: chạy python lab/data/export_parts_index.py rồi commit parts_index.json.',
        )
