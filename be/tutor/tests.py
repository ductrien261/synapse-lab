"""Kiểm thử không cần DB: khóa cache câu hỏi, đọc luồng SSE từ service AI."""

from django.test import SimpleTestCase

from ai_gateway.services import iter_sse

from .services import cache_key, normalize
from .models import TutorMessage
from .views import message_data


class FakeStream:
    def __init__(self, text: str):
        self.lines = text.split('\n')

    def iter_lines(self, decode_unicode=True):
        yield from self.lines


class TutorHelperTests(SimpleTestCase):
    def test_unanswered_action_hides_solution(self):
        message = TutorMessage(
            id=1, role='assistant', content='Câu hỏi', status='ok', action_kind='scenario',
            action_data={'question': 'Câu hỏi', 'options': ['A', 'B', 'C', 'D'],
                         'correct_index': 2, 'explanation': 'Đáp án [1]'},
        )
        public = message_data(message)['action_data']
        self.assertNotIn('correct_index', public)
        self.assertNotIn('explanation', public)
        message.action_data['answered_index'] = 2
        self.assertEqual(message_data(message)['action_data']['correct_index'], 2)

    def test_quiz_hides_each_unanswered_solution(self):
        question = {'question': 'Xoang vành đổ vào đâu?', 'options': ['A', 'B', 'C', 'D'],
                    'correct_index': 2, 'explanation': 'Nguồn [1]'}
        message = TutorMessage(id=2, role='assistant', action_kind='quiz',
                               action_data={'questions': [question.copy(), {**question, 'answered_index': 2, 'correct': True}]})
        public = message_data(message)['action_data']['questions']
        self.assertNotIn('correct_index', public[0])
        self.assertNotIn('explanation', public[0])
        self.assertEqual(public[1]['correct_index'], 2)
        self.assertIn('correct_index', message.action_data['questions'][0])

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
