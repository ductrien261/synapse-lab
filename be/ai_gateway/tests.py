"""Kiểm thử tính chi phí / tổng hợp token (không cần DB)."""

from decimal import Decimal

from django.test import SimpleTestCase

from .models import ModelPrice
from .services import cost_of, summarize

STEPS = [
    {'kind': 'embedding', 'provider': 'gemini', 'model': 'gemini-embedding-001', 'input_tokens': 20, 'output_tokens': 0},
    {'kind': 'chat', 'provider': 'groq', 'model': 'qwen/qwen3.8-27b', 'input_tokens': 3000, 'output_tokens': 500},
    {'kind': 'chat', 'provider': 'groq', 'model': 'qwen/qwen3.8-27b', 'input_tokens': 1000, 'output_tokens': 200, 'status': 'ok'},
]


class CostTests(SimpleTestCase):
    def test_summarize_counts_chat_only(self):
        s = summarize(STEPS)
        self.assertEqual((s['input_tokens'], s['output_tokens'], s['embed_tokens'], s['llm_calls']), (4000, 700, 20, 2))
        self.assertEqual(s['models_used'], ['gemini/gemini-embedding-001', 'groq/qwen/qwen3.8-27b'])

    def test_cost_uses_price_table(self):
        prices = {
            ('groq', 'qwen/qwen3.8-27b'): ModelPrice(input_per_million=Decimal('0.30'), output_per_million=Decimal('0.60')),
        }
        # 4000 * 0.30/1e6 + 700 * 0.60/1e6 = 0.0012 + 0.00042
        self.assertEqual(cost_of(STEPS, prices), Decimal('0.001620'))

    def test_missing_price_is_zero(self):
        self.assertEqual(cost_of(STEPS, {}), Decimal('0'))
