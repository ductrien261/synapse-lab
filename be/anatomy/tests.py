"""Kiểm thử phần không cần mạng/DB của AI viết nháp."""

from django.test import SimpleTestCase

from core.llm import LLMError, parse_json

from .models import Structure
from .services.drafting import _clean_citations, _terms


class DraftingHelperTests(SimpleTestCase):
    def test_terms_include_latin_and_singular(self):
        s = Structure(name_en='Papillary muscles', latin_name='Musculi papillares (TA)')
        terms = _terms(s)
        for t in ('papillary muscles', 'papillary muscle', 'musculi papillares'):
            self.assertIn(t, terms)
        self.assertNotIn('(ta)', ' '.join(terms))

    def test_clean_citations_drops_unknown_numbers(self):
        self.assertEqual(_clean_citations('Bơm máu vào động mạch chủ [1][7].', {1, 2}), 'Bơm máu vào động mạch chủ [1].')


class ParseJsonTests(SimpleTestCase):
    def test_fenced_json(self):
        self.assertEqual(parse_json('```json\n{"name_vi": "Tâm thất trái"}\n```'), {'name_vi': 'Tâm thất trái'})

    def test_invalid(self):
        with self.assertRaises(LLMError):
            parse_json('không có json')
