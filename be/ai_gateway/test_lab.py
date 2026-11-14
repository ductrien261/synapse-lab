from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from users.models import User

URL = '/api/ai/lab/explain/'
STATE = {'torque_nm': {'shoulder_lift': 1.4}, 'stall_limit_nm': 1.91}


class LabExplainViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email='lab-explain@example.test', password='test-password')

    @patch('ai_gateway.lab.call_ai')
    def test_forwards_state_and_hides_meta(self, call_ai):
        call_ai.return_value = {'mode': 'explain', 'title': 'Giải thích', 'content': 'Vai chịu 1,4 N·m.', 'meta': {'usage': []}}
        self.client.force_authenticate(self.user)
        response = self.client.post(URL, {'lab': 'arm', 'mode': 'explain', 'stage': 'tune', 'state': STATE}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('meta', response.data)
        payload = call_ai.call_args.args[1]
        self.assertEqual(payload['state'], STATE)
        self.assertEqual(call_ai.call_args.kwargs['feature'], 'lab_explain')

    @patch('ai_gateway.lab.call_ai')
    def test_requires_login_and_valid_input(self, call_ai):
        self.assertEqual(self.client.post(URL, {'lab': 'arm', 'mode': 'explain', 'state': STATE}, format='json').status_code, 401)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post(URL, {'lab': 'x', 'mode': 'explain', 'state': STATE}, format='json').status_code, 400)
        self.assertEqual(self.client.post(URL, {'lab': 'arm', 'mode': 'ask', 'state': STATE}, format='json').status_code, 400)
        big = {'lab': 'arm', 'mode': 'explain', 'state': {'x': 'a' * 5000}}
        self.assertEqual(self.client.post(URL, big, format='json').status_code, 400)
        call_ai.assert_not_called()

    @patch('ai_gateway.lab.call_ai')
    def test_forwards_conversation_history(self, call_ai):
        call_ai.return_value = {'mode': 'ask', 'title': 'Giải đáp', 'content': 'Kd làm xe bớt lắc.', 'meta': {}}
        self.client.force_authenticate(self.user)
        history = [{'role': 'user', 'content': 'Kp là gì?'}, {'role': 'assistant', 'content': 'Kp là hệ số bẻ lái.'}]
        response = self.client.post(URL, {'lab': 'car', 'mode': 'ask', 'state': STATE, 'question': 'Còn Kd?', 'history': history}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(call_ai.call_args.args[1]['history'], history)

    @patch('ai_gateway.lab.call_ai')
    def test_rejects_bad_history(self, call_ai):
        self.client.force_authenticate(self.user)
        base = {'lab': 'car', 'mode': 'ask', 'state': STATE, 'question': 'Còn Kd?'}
        too_long = [{'role': 'user', 'content': 'x'}] * 9
        self.assertEqual(self.client.post(URL, {**base, 'history': too_long}, format='json').status_code, 400)
        self.assertEqual(self.client.post(URL, {**base, 'history': [{'role': 'system', 'content': 'x'}]}, format='json').status_code, 400)
        self.assertEqual(self.client.post(URL, {**base, 'history': [{'role': 'user', 'content': 'x' * 1600}]}, format='json').status_code, 400)
        call_ai.assert_not_called()

    @patch('ai_gateway.lab.call_ai')
    def test_generic_lab_needs_and_forwards_context(self, call_ai):
        call_ai.return_value = {'mode': 'explain', 'title': 'Giải thích', 'content': 'Ok.', 'meta': {}}
        self.client.force_authenticate(self.user)
        body = {'lab': 'generic', 'mode': 'explain', 'state': STATE}
        self.assertEqual(self.client.post(URL, body, format='json').status_code, 400)
        call_ai.assert_not_called()
        response = self.client.post(URL, {**body, 'context': 'Bài thực hành: Cảnh báo khoảng cách.'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(call_ai.call_args.args[1]['context'], 'Bài thực hành: Cảnh báo khoảng cách.')

