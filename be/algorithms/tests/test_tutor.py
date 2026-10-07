from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from algorithms.models import Algorithm, AlgorithmCategory, AlgorithmContent
from users.models import User


class AlgorithmTutorViewTests(TestCase):
    def setUp(self):
        category = AlgorithmCategory.objects.create(key='backtracking', name_en='Backtracking')
        self.algorithm = Algorithm.objects.create(category=category, key='n-queens-problem', name='N Queens')
        self.content = AlgorithmContent.objects.create(
            algorithm=self.algorithm, status='published',
            lesson_blocks=[{'kind': 'theory', 'title': 'Bài toán', 'text': 'Đặt N quân hậu không tấn công nhau.'}],
            lesson_fields={'pseudocode': 'solve(row)'},
            code_lesson={'source': 'int n;\nbool safe(int row) {\n  return row < n;\n}', 'steps': []},
            simulation={'samples': {'sample': {'code': {'language': 'cpp', 'source': 'int row = 0;\nrow++;'}}}},
        )
        self.client = APIClient()
        self.url = '/api/algorithms/backtracking/n-queens-problem/tutor/'
        self.user = User.objects.create_user(email='algorithm-tutor@example.test', password='test-password')

    @patch('algorithms.api.tutor.call_ai')
    def test_uses_published_database_lesson_and_current_step(self, call_ai):
        call_ai.return_value = {'action': 'hint', 'title': 'Gợi ý', 'content': 'Xét đường chéo.', 'meta': {'usage': []}}
        self.client.force_authenticate(self.user)
        response = self.client.post(self.url, {
            'action': 'hint', 'question': 'Hàng tiếp theo?',
            'frame': {'message': 'Thử cột 2', 'code_line': 15, 'values': 'row: 1', 'lesson': 'fake'},
            'lesson': {'name': 'Fake algorithm'},
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('meta', response.data)
        payload = call_ai.call_args.args[1]
        self.assertEqual(payload['lesson']['name'], 'N Queens')
        self.assertEqual(payload['lesson']['theory'][0]['text'], 'Đặt N quân hậu không tấn công nhau.')
        self.assertNotIn('lesson', payload['frame'])
        self.assertEqual(payload['frame']['code_line'], '15')
        self.assertEqual(call_ai.call_args.kwargs['user'], self.user)

    @patch('algorithms.api.tutor.call_ai')
    def test_auth_draft_and_empty_theory_do_not_call_ai(self, call_ai):
        self.assertEqual(self.client.post(self.url, {'action': 'summary'}, format='json').status_code, 401)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post(self.url, {'action': 'unknown'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(self.url, {'action': 'ask', 'question': ''}, format='json').status_code, 400)
        self.assertEqual(self.client.post(self.url, {'action': 'hint'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(self.url, {'action': 'quiz'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(self.url, {'action': 'scenario'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(self.url, {'action': 'flashcards'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(self.url, {'action': 'quiz', 'quiz_options': {
            'count': 6, 'difficulty': 'medium', 'focus': 'mixed', 'topic': '',
        }}, format='json').status_code, 400)
        self.content.status = 'draft'
        self.content.save(update_fields=['status'])
        self.assertEqual(self.client.post(self.url, {'action': 'summary'}, format='json').status_code, 404)
        self.content.status = 'published'
        self.content.lesson_blocks = []
        self.content.save(update_fields=['status', 'lesson_blocks'])
        self.assertEqual(self.client.post(self.url, {'action': 'summary'}, format='json').status_code, 409)
        call_ai.assert_not_called()

    @patch('algorithms.api.tutor.call_ai')
    def test_quiz_configuration_reaches_ai_service(self, call_ai):
        call_ai.return_value = {'action': 'quiz', 'title': 'Ôn tập', 'content': 'Hai câu', 'questions': [], 'meta': {}}
        self.client.force_authenticate(self.user)
        options = {'count': 2, 'difficulty': 'hard', 'focus': 'trace', 'topic': 'đường chéo'}
        response = self.client.post(self.url, {'action': 'quiz', 'quiz_options': options}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(call_ai.call_args.args[1]['quiz_options'], options)

    @patch('algorithms.api.tutor.call_ai')
    def test_flashcards_use_published_lesson_and_requested_configuration(self, call_ai):
        call_ai.return_value = {'action': 'flashcards', 'title': 'Ôn tập', 'content': 'Lật thẻ', 'cards': [], 'meta': {}}
        self.client.force_authenticate(self.user)
        options = {'topic': 'N Queens', 'count': 4, 'focus': 'điều kiện hợp lệ'}
        response = self.client.post(self.url, {'action': 'flashcards', 'flashcard_options': options,
                                               'frame': {'message': 'Bước hiện tại'}}, format='json')
        self.assertEqual(response.status_code, 200)
        sent = call_ai.call_args.args[1]
        self.assertEqual(sent['action'], 'flashcards')
        self.assertEqual(sent['lesson']['name'], 'N Queens')
        self.assertIsNone(sent['quiz_options'])
        self.assertIsNone(sent['frame'])
        self.assertEqual(sent['flashcard_options'], options)
        self.assertEqual(sent['lesson']['sources'][0]['text'], 'Đặt N quân hậu không tấn công nhau.')

    @patch('algorithms.api.tutor.call_ai')
    def test_scenario_configuration_reaches_ai_service(self, call_ai):
        call_ai.return_value = {'action': 'scenario', 'title': 'Tình huống', 'content': 'Thử bước tiếp theo.', 'meta': {}}
        self.client.force_authenticate(self.user)
        options = {'topic': 'N Queens', 'style': 'trace'}
        response = self.client.post(self.url, {'action': 'scenario', 'scenario_options': options}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(call_ai.call_args.args[1]['scenario_options'], options)

    @patch('algorithms.api.tutor.call_ai')
    def test_explain_code_uses_server_lines_and_rejects_invalid_range(self, call_ai):
        call_ai.return_value = {'action': 'explain_code', 'title': 'Giải thích', 'content': 'Kiểm tra hàng.', 'meta': {}}
        self.client.force_authenticate(self.user)
        selection = {'start_line': 2, 'end_line': 3, 'code': 'forged code'}
        response = self.client.post(self.url, {'action': 'explain_code', 'code_selection': selection}, format='json')
        self.assertEqual(response.status_code, 200)
        sent = call_ai.call_args.args[1]['code_selection']
        self.assertEqual(sent['code'], '2: bool safe(int row) {\n3:   return row < n;')
        self.assertNotIn('forged', str(sent))
        alternate = self.client.post(self.url, {'action': 'explain_code', 'code_selection': {
            'start_line': 2, 'end_line': 2, 'source': 'int row = 0;\nrow++;',
        }}, format='json')
        self.assertEqual(alternate.status_code, 200)
        self.assertEqual(call_ai.call_args.args[1]['code_selection']['code'], '2: row++;')
        call_ai.reset_mock()
        for start, end in ((0, 2), (3, 2), (1, 99)):
            bad = self.client.post(self.url, {'action': 'explain_code', 'code_selection': {
                'start_line': start, 'end_line': end,
            }}, format='json')
            self.assertEqual(bad.status_code, 400)
        forged = self.client.post(self.url, {'action': 'explain_code', 'code_selection': {
            'start_line': 1, 'end_line': 1, 'source': 'malicious code',
        }}, format='json')
        self.assertEqual(forged.status_code, 400)
        call_ai.assert_not_called()
