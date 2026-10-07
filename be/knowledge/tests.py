"""Kiểm thử phần xử lý không cần mạng/DB: đọc mục lục, tách mục, chia đoạn. (Tìm kiếm: xem ai/tests)"""

import json
from tempfile import TemporaryDirectory
from unittest.mock import Mock, patch

from django.core.files.base import ContentFile
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from users.models import User

from .models import Document

from .services import curated, openstax
from .services.chunking import Section, chunk_sections, contextual_text
from .services.pdf import clean_pdf_text, parse_pdf


class DocumentUploadPathTests(SimpleTestCase):
    def test_cs_uploads_are_separate_and_medical_keys_stay_unchanged(self):
        from .models import Document, document_upload_path
        for scope in Document.Scope.values:
            document = Document(scope=scope)
            prefix = 'documents/cs' if scope == Document.Scope.CS else 'documents'
            self.assertEqual(document_upload_path(document, 'Textbook.PDF'),
                             f'{prefix}/{document.id}.pdf')
        existing = Document(scope=Document.Scope.CS, file='documents/legacy.pdf')
        existing.scope = Document.Scope.MED
        self.assertEqual(existing.file.name, 'documents/legacy.pdf')

    def test_unknown_scope_cannot_escape_documents_directory(self):
        from .models import Document, document_upload_path
        document = Document(scope='../outside')
        self.assertEqual(document_upload_path(document, 'textbook.pdf'),
                         f'documents/{document.id}.pdf')


class CuratedSourceTests(SimpleTestCase):
    def test_catalog_keeps_exact_license_and_official_source(self):
        self.assertEqual(curated.SOURCES['erickson-backtracking'].license_name, 'CC BY 4.0')
        morin = curated.SOURCES['morin-open-data-structures']
        self.assertEqual(morin.license_name, 'CC BY 2.5 CA')
        self.assertEqual(morin.license_url, 'https://creativecommons.org/licenses/by/2.5/ca/')
        self.assertTrue(all(source.url.startswith('https://') for source in curated.SOURCES.values()))

    @patch('knowledge.services.curated.requests.get')
    def test_download_rejects_non_pdf(self, get):
        response = Mock()
        response.headers = {}
        response.iter_content.return_value = [b'<html>not a PDF</html>']
        get.return_value.__enter__.return_value = response
        with self.assertRaises(curated.SourceDownloadError):
            curated.download_pdf(curated.SOURCES['erickson-backtracking'])


class PdfTextTests(SimpleTestCase):
    def test_normalizes_ligatures_and_removes_database_invalid_characters(self):
        self.assertEqual(clean_pdf_text('of\ufb01ce\x00\uffff'), 'office')

    def test_curated_pdf_citations_follow_actual_page_boundaries(self):
        import pymupdf

        pdf = pymupdf.open()
        for number in (1, 2):
            page = pdf.new_page()
            page.insert_text((72, 72), f'Page {number} explains a distinct algorithm state and its transition in enough detail to cite.')
        sections, pages = parse_pdf(pdf.tobytes(), 'Test', split_pages=True)
        self.assertEqual(pages, 2)
        self.assertEqual([section.page for section in sections], [1, 2])


class PdfPreviewTests(TestCase):
    def test_only_admin_can_stream_stored_pdf(self):
        with TemporaryDirectory() as directory, override_settings(
            MEDIA_ROOT=directory,
            STORAGES={'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'}},
        ):
            document = Document.objects.create(title='Algorithms', scope=Document.Scope.CS,
                                               source_type=Document.SourceType.PDF)
            document.file.save('algorithms.pdf', ContentFile(b'%PDF-1.4\npreview\n'))
            url = f'/api/knowledge/admin/documents/{document.pk}/preview/'
            client = APIClient()
            self.assertEqual(client.get(url).status_code, 401)
            learner = User.objects.create_user(email='preview-learner@example.test', password='test-password')
            client.force_authenticate(learner)
            self.assertEqual(client.get(url).status_code, 403)
            admin = User.objects.create_user(email='preview-admin@example.test', password='test-password', role='admin')
            client.force_authenticate(admin)
            response = client.get(url)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response['Content-Type'], 'application/pdf')
            self.assertIn('inline', response['Content-Disposition'])
            self.assertEqual(b''.join(response.streaming_content), b'%PDF-1.4\npreview\n')

            document.source_type = Document.SourceType.OPENSTAX
            document.save(update_fields=['source_type'])
            self.assertEqual(client.get(url).status_code, 404)

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
