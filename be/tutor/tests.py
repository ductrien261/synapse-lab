"""Kiểm thử không cần DB: khóa cache câu hỏi, đọc luồng SSE từ service AI."""

from django.test import SimpleTestCase

from ai_gateway.services import iter_sse

from .services import cache_key, normalize


class FakeStream:
    def __init__(self, text: str):
        self.lines = text.split('\n')

    def iter_lines(self, decode_unicode=True):
        yield from self.lines


class TutorHelperTests(SimpleTestCase):
    def test_normalize_and_cache_key(self):
        self.assertEqual(normalize('  Tâm thất  trái có chức năng gì?? '), 'tâm thất trái có chức năng gì')
        a = cache_key('Tâm thất trái có chức năng gì?', 'uid1', 3, 'Y khoa')
        self.assertEqual(a, cache_key('tâm thất trái có chức năng gì', 'uid1', 3, 'Y khoa'))
        self.assertNotEqual(a, cache_key('Tâm thất trái có chức năng gì?', 'uid1', 4, 'Y khoa'))

    def test_iter_sse(self):
        raw = 'event: token\ndata: {"text": "Xin "}\n\nevent: token\ndata: {"text": "chào"}\n\nevent: done\ndata: {"answer": "Xin chào"}\n\n'
        events = list(iter_sse(FakeStream(raw)))
        self.assertEqual([e for e, _ in events], ['token', 'token', 'done'])
        self.assertEqual(events[-1][1]['answer'], 'Xin chào')
