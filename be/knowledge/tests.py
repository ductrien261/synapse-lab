"""Kiểm thử phần xử lý không cần mạng/DB: đọc mục lục, tách mục, chia đoạn, câu tìm từ khóa."""

import json

from django.test import SimpleTestCase

from .services import openstax
from .services.chunking import Section, chunk_sections, contextual_text
from .services.search import VI_CHARS, keyword_query, keyword_terms

TREE = {
    'id': 'book', 'slug': 'demo-book', 'title': 'Demo Book',
    'contents': [
        {'id': 'p', 'slug': 'preface', 'title': 'Preface'},
        {'id': 'u1', 'slug': 'u1', 'title': '<span>Unit</span> <span>One</span>', 'contents': [
            {'id': 'c1', 'slug': '1-the-heart', 'title': '<span class="os-number">1</span> <span>The Heart</span>', 'contents': [
                {'id': 'a', 'slug': '1-introduction', 'title': 'Introduction'},
                {'id': 'b', 'slug': '1-1-heart-anatomy', 'title': '1.1 Heart Anatomy'},
                {'id': 'c', 'slug': '1-review-questions', 'title': 'Review Questions'},
            ]},
        ]},
    ],
}

STATE = {'content': {'book': {'slug': 'demo-book', 'title': 'Demo Book', 'tree': TREE,
                              'license': {'name': 'CC BY 4.0', 'url': 'https://creativecommons.org/licenses/by/4.0/'}}}}

PAGE = f"""
<html><head><title>1.1 Heart Anatomy | Demo</title>
<script>window.__PRELOADED_STATE__ = {json.dumps(STATE)};</script></head>
<body><nav><a>menu</a></nav><div data-type="page">
  <h1>1.1 Heart Anatomy</h1>
  <p>Intro paragraph that is long enough to be kept as its own section of text.</p>
  <section id="sec-1"><h2>Chambers</h2>
    <p>The heart has four chambers: two atria and two ventricles that pump blood.</p>
    <ul><li><p>The left ventricle pumps blood into the aorta for the systemic circuit.</p></li></ul>
    <section id="sec-1-1"><h3>Left Ventricle</h3><p>The left ventricle has the thickest myocardium of all chambers.</p></section>
  </section>
  <div data-type="review-questions"><p>Question text that should be skipped entirely.</p></div>
</div></body></html>
"""


class OpenStaxTocTests(SimpleTestCase):
    def test_parse_book_ref(self):
        ref = openstax.parse_book_ref('https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy')
        self.assertEqual((ref.slug, ref.page), ('anatomy-and-physiology-2e', '19-1-heart-anatomy'))
        self.assertEqual(openstax.parse_book_ref('https://openstax.org/details/books/biology-2e').slug, 'biology-2e')
        with self.assertRaises(openstax.OpenStaxError):
            openstax.parse_book_ref('https://example.com/book')

    def test_book_info_and_toc(self):
        info = openstax.parse_book_info(PAGE, 'demo-book')
        self.assertEqual(info['title'], 'Demo Book')
        self.assertEqual(info['license_name'], 'CC BY 4.0')
        chapter, other = info['toc']
        self.assertEqual(chapter['title'], '1 The Heart')
        self.assertEqual(chapter['unit'], 'Unit One')
        self.assertEqual([p['kind'] for p in chapter['pages']], ['content', 'content', 'extra'])
        self.assertEqual(other['key'], 'other')
        self.assertEqual(other['pages'][0]['slug'], 'preface')
        self.assertIsNotNone(openstax.find_page(info['toc'], '1-1-heart-anatomy'))

    def test_missing_state(self):
        with self.assertRaises(openstax.OpenStaxError):
            openstax.parse_book_info('<html></html>', 'x')


class OpenStaxPageTests(SimpleTestCase):
    def test_sections_follow_headings(self):
        url = 'https://openstax.org/books/demo-book/pages/1-1-heart-anatomy'
        sections = openstax.parse_page(PAGE, url, '1 The Heart', '1.1 Heart Anatomy')
        crumbs = [s.breadcrumb for s in sections]
        self.assertEqual(crumbs, [
            '1 The Heart › 1.1 Heart Anatomy',
            '1 The Heart › 1.1 Heart Anatomy › Chambers',
            '1 The Heart › 1.1 Heart Anatomy › Chambers › Left Ventricle',
        ])
        self.assertTrue(sections[1].url.endswith('#sec-1'))
        self.assertTrue(sections[2].url.endswith('#sec-1-1'))
        # li chứa p không bị lấy trùng; phần câu hỏi ôn tập bị bỏ
        self.assertEqual(sections[1].text.count('aorta'), 1)
        self.assertNotIn('Question text', ' '.join(s.text for s in sections))


class ChunkingTests(SimpleTestCase):
    def test_short_section_single_chunk(self):
        s = Section(['A', 'B'], 'Short text.')
        self.assertEqual([c.text for c in chunk_sections([s])], ['Short text.'])

    def test_long_section_split_by_sentence_with_overlap(self):
        text = ' '.join(f'Sentence number {i} talks about the heart.' for i in range(60))
        chunks = chunk_sections([Section(['A'], text)], max_chars=300, overlap_chars=60)
        self.assertGreater(len(chunks), 5)
        self.assertTrue(all(len(c.text) <= 360 for c in chunks))
        self.assertTrue(all(c.text.rstrip().endswith('.') for c in chunks))
        # đoạn sau gối đầu phần cuối đoạn trước
        self.assertIn(chunks[0].text[-20:].split(' ', 1)[-1][:10], chunks[1].text)

    def test_contextual_text(self):
        self.assertEqual(contextual_text('Book', 'Ch › Sec', 'Body'), 'Book › Ch › Sec\nBody')


class SearchHelperTests(SimpleTestCase):
    def test_keyword_query_or_terms(self):
        self.assertEqual(keyword_terms("What is the left ventricle? left! a"), 'what | is | the | left | ventricle')
        self.assertIsNone(keyword_query('? !'))

    def test_vietnamese_detection(self):
        self.assertTrue(VI_CHARS.search('Tâm thất trái có chức năng gì?'))
        self.assertIsNone(VI_CHARS.search('What is the left ventricle?'))
