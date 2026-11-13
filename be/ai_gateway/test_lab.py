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
