from django.test import SimpleTestCase, TestCase
from django.core.management import call_command
from django.conf import settings
from pathlib import Path
from hashlib import sha256
import json
from tempfile import TemporaryDirectory
from unittest.mock import Mock, patch
from rest_framework.test import APIClient

from users.models import User
from knowledge.models import Document, DocumentChunk
from algorithms.services.imports import apply_candidate
from algorithms.services.missing import _title, in_catalog, normalize_name
from algorithms.services.source_fetch import SourceFetchError, _search_results, _topic_excerpt, _topic_relevant, discover_algorithm_sources
from algorithms.models import (
    Algorithm, AlgorithmCategory, AlgorithmContent, AlgorithmDraftCandidate,
    AlgorithmSource,
)


class MissingAlgorithmNameTests(SimpleTestCase):
    def test_near_identical_catalog_name_is_not_suggested_again(self):
        self.assertTrue(in_catalog('Hamilton Cycles', {normalize_name('Hamiltonean Cycles')}))
        self.assertEqual(_title('2-4 Trees'), '2-4 Trees')


class MissingAlgorithmDiscoveryTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email='missing-admin@example.test', password='test-password', role='admin')
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        category = AlgorithmCategory.objects.create(key='searching', name_en='Searching')
        Algorithm.objects.create(category=category, key='binary-search-tree', name='Binary Search Tree')
        document = Document.objects.create(title='Open Data Structures', scope=Document.Scope.CS,
                                           source_type=Document.SourceType.PDF, status=Document.Status.READY)
        self.source = AlgorithmSource.objects.get(document=document)
        for index, heading in enumerate(['Binary Search Trees', 'Skip Lists', 'Discussion and Exercises']):
            DocumentChunk.objects.create(document=document, index=index, section_title=heading,
                                         heading=heading, content=f'{heading} is discussed in this chapter.',
                                         url=f'https://example.test/book.pdf#page={index + 1}', page_start=index + 1)

    def test_only_missing_source_topics_are_returned_without_creating_catalog_rows(self):
        before = Algorithm.objects.count()
        response = self.client.post('/api/algorithms/admin/import/discover-missing/',
                                    {'source_ids': [self.source.pk]}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['name'] for item in response.data['results']], ['Skip Lists'])
        self.assertEqual(Algorithm.objects.count(), before)

    def test_medical_source_cannot_be_scanned(self):
        medical = Document.objects.create(title='Anatomy', scope=Document.Scope.MED,
                                          source_type=Document.SourceType.PDF, status=Document.Status.READY)
        source = AlgorithmSource.objects.create(name='Medical', kind=AlgorithmSource.Kind.DOCUMENT, document=medical)
        response = self.client.post('/api/algorithms/admin/import/discover-missing/',
                                    {'source_ids': [source.pk]}, format='json')
        self.assertEqual(response.status_code, 400)


class AlgorithmDraftTests(TestCase):
    def setUp(self):
        category = AlgorithmCategory.objects.create(key='backtracking', name_en='Backtracking')
        self.algorithm = Algorithm.objects.create(category=category, key='n-queens-problem', name='N Queens')
        self.admin = User.objects.create_user(email='admin@example.test', password='test-password', role='admin')
        self.learner = User.objects.create_user(email='learner@example.test', password='test-password')
        self.client = APIClient()
        self.url = '/api/algorithms/backtracking/n-queens-problem/'
        self.fields = {key: key for key in ['title', 'summary', 'objectives', 'problem', 'inputOutput',
                                         'example', 'theory', 'pseudocode', 'complexity', 'applications', 'references']}

    def test_admin_save_and_reload_all_fields(self):
        self.client.force_authenticate(self.admin)
        response = self.client.put(self.url, {'lesson_fields': self.fields, 'status': 'draft'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get(self.url).data['content']['lesson_fields'], self.fields)
        self.assertEqual(self.client.get('/api/algorithms/admin-drafts/').data[self.algorithm.path]['lesson_fields'], self.fields)
        self.fields['pseudocode'] = 'updated pseudocode'
        self.assertEqual(self.client.put(self.url, {'lesson_fields': self.fields}, format='json').status_code, 200)
        self.assertEqual(AlgorithmContent.objects.count(), 1)
        self.assertEqual(AlgorithmContent.objects.get().updated_by, self.admin)

    def test_invalid_save_does_not_create_content(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.put(self.url, {'lesson_fields': {'title': 123}}, format='json').status_code, 400)
        self.assertFalse(AlgorithmContent.objects.exists())

    def test_publish_and_return_to_draft_persist_status(self):
        self.client.force_authenticate(self.admin)
        response = self.client.put(self.url, {'lesson_fields': self.fields, 'status': 'published'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'published')
        content = AlgorithmContent.objects.get(algorithm=self.algorithm)
        self.assertEqual(content.status, 'published')
        self.assertEqual(content.lesson_fields, self.fields)
        self.assertEqual(self.client.get('/api/algorithms/admin-drafts/').data[self.algorithm.path]['status'], 'published')
        self.fields['references'] = 'updated reference'
        response = self.client.put(self.url, {'lesson_fields': self.fields, 'status': 'draft'}, format='json')
        self.assertEqual(response.status_code, 200)
        content.refresh_from_db()
        self.assertEqual(content.status, 'draft')
        self.assertEqual(content.lesson_fields['references'], 'updated reference')
        self.assertEqual(AlgorithmContent.objects.count(), 1)

    def test_learner_cannot_write_or_read_admin_drafts(self):
        self.client.force_authenticate(self.admin)
        self.client.put(self.url, {'lesson_fields': self.fields, 'status': 'draft'}, format='json')
        self.client.force_authenticate(self.learner)
        self.assertEqual(self.client.put(self.url, {'lesson_fields': self.fields}, format='json').status_code, 403)
        self.assertEqual(self.client.get('/api/algorithms/admin-drafts/').status_code, 403)
        detail = self.client.get(self.url)
        self.assertEqual(detail.status_code, 200)
        self.assertIsNone(detail.data['content'])
        self.assertEqual(detail.data['references'], [])

    def test_public_catalog_includes_algorithms_without_published_lessons(self):
        draft = Algorithm.objects.create(
            category=self.algorithm.category, key='draft-only', name='Draft only'
        )
        AlgorithmContent.objects.create(algorithm=draft, status='draft')
        AlgorithmContent.objects.create(algorithm=self.algorithm, status='published')
        empty = Algorithm.objects.create(
            category=self.algorithm.category, key='no-content', name='No content'
        )

        self.client.force_authenticate(None)
        response = self.client.get('/api/algorithms/')

        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(
            [item['key'] for item in response.data[0]['algorithms']],
            [draft.key, self.algorithm.key, empty.key],
        )
        self.assertIsNone(self.client.get('/api/algorithms/backtracking/no-content/').data['content'])

    def test_unpublished_algorithm_is_not_available_to_learner(self):
        AlgorithmContent.objects.create(algorithm=self.algorithm, status='published')
        self.algorithm.is_published = False
        self.algorithm.save(update_fields=['is_published'])
        self.client.force_authenticate(self.learner)

        self.assertEqual(self.client.get(self.url).status_code, 404)

    def test_admin_catalog_can_include_drafts(self):
        AlgorithmContent.objects.create(algorithm=self.algorithm, status='draft')
        self.client.force_authenticate(self.admin)

        public_response = self.client.get('/api/algorithms/')
        admin_response = self.client.get('/api/algorithms/?include_drafts=1')

        self.assertEqual(public_response.data[0]['algorithms'][0]['key'], self.algorithm.key)
        self.assertEqual(admin_response.data[0]['algorithms'][0]['key'], self.algorithm.key)

    def test_structured_blocks_roundtrip_and_invalid_kind(self):
        self.client.force_authenticate(self.admin)
        block = {key: '' for key in ['id', 'kind', 'title', 'text', 'image', 'alt', 'caption', 'source', 'attribution', 'answerType', 'options', 'answer', 'hint', 'solution']}
        block.update(id='exercise-1', kind='exercise', title='Find a path', answerType='short', answer='A B C', source='https://openstax.org')
        response = self.client.put(self.url, {'lesson_fields': self.fields, 'lesson_blocks': [block]}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get('/api/algorithms/admin-drafts/').data[self.algorithm.path]['lesson_blocks'], [block])
        block['kind'] = 'invalid'
        self.assertEqual(self.client.put(self.url, {'lesson_blocks': [block]}, format='json').status_code, 400)
        self.assertEqual(AlgorithmContent.objects.get().lesson_blocks[0]['kind'], 'exercise')

    def test_code_lesson_roundtrip_and_visibility(self):
        lesson = {'language': 'cpp', 'source': 'int main() {\n}\n', 'steps': [
            {'start_line': 1, 'end_line': 2, 'title': 'Main', 'note': 'Program entry.'},
        ]}
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.put(self.url, {'code_lesson': lesson}, format='json').status_code, 200)
        self.assertEqual(self.client.get(self.url).data['content']['code_lesson'], lesson)
        self.client.force_authenticate(self.learner)
        self.assertIsNone(self.client.get(self.url).data['content'])
        self.client.force_authenticate(self.admin)
        self.client.put(self.url, {'status': 'published'}, format='json')
        self.client.force_authenticate(self.learner)
        self.assertEqual(self.client.get(self.url).data['content']['code_lesson'], lesson)
        self.client.force_authenticate(self.admin)
        lesson['steps'][0]['end_line'] = 99
        self.assertEqual(self.client.put(self.url, {'code_lesson': lesson}, format='json').status_code, 400)
        self.assertEqual(AlgorithmContent.objects.get().code_lesson['steps'][0]['end_line'], 2)

    def test_import_code_lesson_preserves_content_and_is_idempotent(self):
        self.algorithm.key = 'hamiltonean-cycles'
        self.algorithm.save()
        content = AlgorithmContent.objects.create(algorithm=self.algorithm, summary='Keep me', status='published')
        file = Path(settings.BASE_DIR) / 'algorithms/data/hamilton/code-lesson.json'
        call_command('import_code_lesson', self.algorithm.path, str(file), dry_run=True)
        content.refresh_from_db()
        self.assertEqual(content.code_lesson, {})
        call_command('import_code_lesson', self.algorithm.path, str(file))
        content.refresh_from_db()
        self.assertEqual(content.code_lesson, json.loads(file.read_text()))
        self.assertEqual(content.status, 'published')
        self.assertEqual(content.summary, 'Keep me')
        content.code_lesson['steps'][0]['note'] = 'Admin edited note'
        content.save()
        call_command('import_code_lesson', self.algorithm.path, str(file))
        content.refresh_from_db()
        self.assertEqual(content.code_lesson['steps'][0]['note'], 'Admin edited note')

    def test_import_blocks_preserves_content_and_does_not_overwrite_edits(self):
        block = {key: '' for key in ['id', 'kind', 'title', 'text', 'image', 'alt', 'caption', 'source', 'attribution', 'answerType', 'options', 'answer', 'hint', 'solution']}
        block.update(id='source-question-1', kind='exercise', title='Source question', text='Find a cycle', answerType='essay')
        content = AlgorithmContent.objects.create(algorithm=self.algorithm, summary='Keep me', status='published', code_lesson={'source': 'Keep this code'})
        with TemporaryDirectory() as directory:
            file = Path(directory) / 'blocks.json'
            file.write_text(json.dumps([block]))
            call_command('import_lesson_blocks', self.algorithm.path, str(file), dry_run=True)
            content.refresh_from_db()
            self.assertEqual(content.lesson_blocks, [])
            call_command('import_lesson_blocks', self.algorithm.path, str(file))
            content.refresh_from_db()
            self.assertEqual(content.lesson_blocks, [block])
            self.assertEqual(content.summary, 'Keep me')
            self.assertEqual(content.status, 'published')
            self.assertEqual(content.code_lesson, {'source': 'Keep this code'})
            content.lesson_blocks[0]['text'] = 'Admin edited prompt'
            content.save()
            call_command('import_lesson_blocks', self.algorithm.path, str(file))
            content.refresh_from_db()
            self.assertEqual(content.lesson_blocks[0]['text'], 'Admin edited prompt')

    def test_replace_theory_keeps_practice_and_archives_previous_blocks(self):
        def block(key, kind):
            value = {field: '' for field in ['id', 'kind', 'title', 'text', 'image', 'alt', 'caption', 'source', 'attribution', 'answerType', 'options', 'answer', 'hint', 'solution']}
            value.update(id=key, kind=kind, title=key, text=key, answerType='essay')
            return value
        old = [block('old-theory', 'theory'), block('practice', 'exercise')]
        content = AlgorithmContent.objects.create(algorithm=self.algorithm, lesson_blocks=old, summary='Keep me', status='published')
        incoming = [block('new-topic', 'theory')]
        with TemporaryDirectory() as directory:
            file = Path(directory) / 'topics.json'
            backup = Path(directory) / 'before.json'
            file.write_text(json.dumps(incoming))
            call_command('import_lesson_blocks', self.algorithm.path, str(file), replace_theory=True, backup=backup)
            content.refresh_from_db()
            self.assertEqual(content.lesson_blocks, incoming + [old[1]])
            self.assertEqual(json.loads(backup.read_text()), old)
            self.assertEqual(content.summary, 'Keep me')
            self.assertEqual(content.status, 'published')


class AlgorithmLessonImportTests(TestCase):
    def test_bundle_is_validated_saved_as_draft_and_not_overwritten(self):
        category = AlgorithmCategory.objects.create(key='backtracking', name_en='Backtracking')
        algorithm = Algorithm.objects.create(category=category, key='knights-tour-problem', name="Knight's Tour")
        payload = {'lesson_fields': {key: 'English content' for key in ['title', 'summary', 'objectives', 'problem', 'inputOutput', 'example', 'theory', 'pseudocode', 'complexity', 'applications', 'references']}, 'lesson_blocks': [], 'status': 'published'}
        with TemporaryDirectory() as directory:
            file = Path(directory) / 'lesson.json'
            file.write_text(json.dumps(payload))
            call_command('import_algorithm_lesson', algorithm.path, str(file), dry_run=True, verbosity=0)
            self.assertFalse(AlgorithmContent.objects.filter(algorithm=algorithm).exists())
            call_command('import_algorithm_lesson', algorithm.path, str(file), verbosity=0)
            content = AlgorithmContent.objects.get(algorithm=algorithm)
            self.assertEqual(content.status, 'draft')
            content.lesson_fields['title'] = 'Edited by administrator'
            content.save()
            call_command('import_algorithm_lesson', algorithm.path, str(file), verbosity=0)
            content.refresh_from_db()
            self.assertEqual(content.lesson_fields['title'], 'Edited by administrator')
            from django.core.management.base import CommandError
            payload['lesson_fields'] = {'title': 'Missing required fields'}
            file.write_text(json.dumps(payload))
            with self.assertRaises(CommandError):
                call_command('import_algorithm_lesson', algorithm.path, str(file), dry_run=True, verbosity=0)


class AlgorithmImportWorkflowTests(TestCase):
    def setUp(self):
        category = AlgorithmCategory.objects.create(key='graph', name_en='Graph')
        self.algorithm = Algorithm.objects.create(category=category, key='breadth-first-search', name='Breadth-First Search')
        self.admin = User.objects.create_user(email='import-admin@example.test', password='test-password', role='admin')
        self.learner = User.objects.create_user(email='import-learner@example.test', password='test-password')
        self.fields = {key: f'old-{key}' for key in [
            'title', 'summary', 'objectives', 'problem', 'inputOutput', 'example',
            'theory', 'pseudocode', 'complexity', 'applications', 'references',
        ]}
        self.content = AlgorithmContent.objects.create(
            algorithm=self.algorithm, lesson_fields=self.fields, summary='old-summary',
            theory='old-theory', applications=['old-applications'], status='published',
        )
        self.candidate = AlgorithmDraftCandidate.objects.create(
            algorithm=self.algorithm,
            fields={
                'title': {'value': 'New title [1]', 'status': 'found', 'confidence': 0.9, 'sources': [1], 'generated': True},
                'summary': {'value': 'New summary [1]', 'status': 'found', 'confidence': 0.9, 'sources': [1], 'generated': True},
            },
            citations=[],
            created_by=self.admin,
        )

    def test_apply_merges_only_selected_fields_and_returns_content_to_draft(self):
        apply_candidate(self.candidate, ['summary'], self.admin)

        self.content.refresh_from_db()
        self.candidate.refresh_from_db()
        self.assertEqual(self.content.lesson_fields['summary'], 'New summary [1]')
        self.assertEqual(self.content.lesson_fields['title'], 'old-title')
        self.assertEqual(self.content.summary, 'New summary [1]')
        self.assertEqual(self.content.status, 'draft')
        self.assertEqual(self.candidate.status, 'applied')
        self.assertEqual(self.candidate.reviewed_by, self.admin)

        client = APIClient()
        client.force_authenticate(self.learner)
        self.assertIsNone(client.get('/api/algorithms/graph/breadth-first-search/').data['content'])

    def test_apply_rejects_unknown_fields_without_mutating_content(self):
        with self.assertRaisesMessage(ValueError, 'ít nhất một mục'):
            apply_candidate(self.candidate, ['unknown'], self.admin)
        self.content.refresh_from_db()
        self.assertEqual(self.content.status, 'published')
        self.assertEqual(self.content.lesson_fields, self.fields)

    def test_source_registry_requires_admin(self):
        source = AlgorithmSource.objects.create(
            name='Approved source', kind='url', url='https://docs.example.test/algorithms',
            allowed_domain='example.test', license_name='CC BY 4.0',
        )
        client = APIClient()
        client.force_authenticate(self.learner)
        self.assertEqual(client.get('/api/algorithms/admin/import/sources/').status_code, 403)
        client.force_authenticate(self.admin)
        response = client.get('/api/algorithms/admin/import/sources/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]['id'], source.pk)

    def test_medical_documents_cannot_enter_algorithm_import(self):
        medical = Document.objects.create(title='Anatomy', scope=Document.Scope.MED, status=Document.Status.READY)
        general = Document.objects.create(title='General', scope=Document.Scope.GENERAL, status=Document.Status.READY)
        cs = Document.objects.create(title='Algorithms', scope=Document.Scope.CS, status=Document.Status.READY)
        self.assertFalse(AlgorithmSource.objects.filter(document__in=[medical, general]).exists())
        self.assertTrue(AlgorithmSource.objects.filter(document=cs, enabled=True).exists())

        client = APIClient()
        client.force_authenticate(self.admin)
        listing = client.get('/api/algorithms/admin/import/sources/')
        self.assertEqual([item['document'] for item in listing.data], [cs.pk])
        for document in (medical, general):
            response = client.post('/api/algorithms/admin/import/sources/', {
                'name': document.title, 'kind': 'document', 'document': str(document.pk),
            }, format='json')
            self.assertEqual(response.status_code, 400)

        # A legacy or manually inserted source must not bypass the scan endpoint.
        legacy = AlgorithmSource.objects.create(name='Legacy medical', kind='document', document=medical)
        response = client.post('/api/algorithms/admin/import/scans/', {
            'algorithm_paths': [self.algorithm.path], 'source_ids': [legacy.pk],
        }, format='json')
        self.assertEqual(response.status_code, 400)

        self.candidate.source_ids = [legacy.pk]
        self.candidate.citations = [{'document_id': str(medical.pk), 'excerpt': 'Medical text'}]
        self.candidate.save(update_fields=['source_ids', 'citations'])
        with self.assertRaises(ValueError):
            apply_candidate(self.candidate, ['summary'], self.admin)
        self.assertEqual(self.content.algorithm.references.count(), 0)

    @patch('algorithms.api.views.fetch_source_text')
    def test_admin_can_preview_a_public_web_source(self, fetch):
        fetch.return_value = {
            'title': 'Breadth-First Search',
            'url': 'https://example.test/bfs',
            'content': 'Breadth-first search visits graph vertices one level at a time.' * 4,
        }
        client = APIClient()
        client.force_authenticate(self.admin)

        response = client.post(
            '/api/algorithms/admin/import/sources/preview/',
            {'url': 'https://example.test/bfs'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['allowed_domain'], 'example.test')
        self.assertEqual(response.data['title'], 'Breadth-First Search')
        fetch.assert_called_once_with('https://example.test/bfs', 'example.test')

    def test_source_preview_requires_admin(self):
        client = APIClient()
        client.force_authenticate(self.learner)
        response = client.post(
            '/api/algorithms/admin/import/sources/preview/',
            {'url': 'https://example.test/bfs'},
            format='json',
        )
        self.assertEqual(response.status_code, 403)

    @patch('algorithms.api.views.discover_algorithm_sources')
    def test_admin_can_discover_sources_for_candidate_gaps(self, discover):
        source = AlgorithmSource.objects.create(
            name='Current source', kind='url', url='https://example.test/bfs',
            allowed_domain='example.test',
        )
        self.candidate.source_ids = [source.pk]
        self.candidate.fields['objectives'] = {
            'value': '', 'status': 'missing', 'confidence': 0, 'sources': [], 'generated': True,
        }
        self.candidate.save(update_fields=['source_ids', 'fields'])
        discover.return_value = {
            'query': 'Breadth-First Search objectives',
            'results': [{'title': 'BFS notes', 'url': 'https://cs.example.edu/bfs',
                         'allowed_domain': 'cs.example.edu', 'excerpt': 'Course notes', 'reason': 'Nguồn học thuật'}],
        }
        client = APIClient()
        client.force_authenticate(self.admin)

        response = client.post(
            '/api/algorithms/admin/import/sources/discover/',
            {'candidate_id': self.candidate.pk},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['gap_fields'], ['objectives'])
        self.assertEqual(response.data['results'][0]['allowed_domain'], 'cs.example.edu')
        discover.assert_called_once_with(
            'Breadth-First Search', 'Graph', ['objectives'], {'https://example.test/bfs'},
        )

    def test_source_discovery_requires_admin(self):
        client = APIClient()
        client.force_authenticate(self.learner)
        response = client.post(
            '/api/algorithms/admin/import/sources/discover/',
            {'candidate_id': self.candidate.pk},
            format='json',
        )
        self.assertEqual(response.status_code, 403)


class AlgorithmSourceDiscoveryTests(SimpleTestCase):
    def test_unrelated_readable_page_is_not_a_binary_search_source(self):
        self.assertFalse(_topic_relevant('Binary Search', {
            'title': 'Đặc trưng và thể loại văn học dân gian',
            'content': 'Bài viết giải thích các thể loại văn học và ví dụ trong đời sống.',
        }))
        self.assertTrue(_topic_relevant('Binary Search', {
            'title': 'Sample Algorithms by Problem',
            'content': 'Binary search algorithm halves the sorted list at each step. Its runtime is logarithmic.',
        }))
        self.assertIn('Binary Search algorithm', _topic_excerpt(
            'Binary Search', 'Unrelated introduction. ' * 30 + 'Binary Search algorithm halves a sorted list.',
        ))

    @patch('algorithms.services.source_fetch.requests.get')
    def test_search_results_accepts_unique_https_pages_and_rejects_social_sites(self, get):
        response = Mock()
        response.content = b'''<?xml version="1.0"?><rss><channel>
            <item><title>University BFS</title><link>https://cs.example.edu/bfs</link></item>
            <item><title>Duplicate</title><link>https://cs.example.edu/bfs</link></item>
            <item><title>Video</title><link>https://www.youtube.com/watch?v=1</link></item>
            <item><title>Insecure</title><link>http://example.test/bfs</link></item>
        </channel></rss>'''
        response.raise_for_status.return_value = None
        get.return_value = response

        results = _search_results('breadth first search', limit=5)

        self.assertEqual(results, [{
            'title': 'University BFS', 'url': 'https://cs.example.edu/bfs', 'host': 'cs.example.edu',
        }])

    @patch('algorithms.services.source_fetch.fetch_source_text')
    @patch('algorithms.services.source_fetch._search_results')
    def test_discovery_skips_unreadable_pages_and_ranks_academic_sources(self, search, fetch):
        search.return_value = [
            {'title': 'Community page', 'url': 'https://example.test/bfs', 'host': 'example.test'},
            {'title': 'University notes', 'url': 'https://cs.example.edu/bfs', 'host': 'cs.example.edu'},
            {'title': 'Broken page', 'url': 'https://broken.test/bfs', 'host': 'broken.test'},
        ]

        def page(url, _host, timeout):
            if 'broken.test' in url:
                raise SourceFetchError('broken')
            return {'title': 'Breadth First Search', 'url': url, 'content': 'Breadth first search algorithm. ' * 300}

        fetch.side_effect = page
        result = discover_algorithm_sources('Breadth First Search', 'Graph', ['complexity'], set(), limit=2)

        self.assertEqual(result['results'][0]['allowed_domain'], 'cs.example.edu')
        self.assertEqual(len(result['results']), 2)
        self.assertNotIn('score', result['results'][0])


class SimulationStorageTests(TestCase):
    def setUp(self):
        category = AlgorithmCategory.objects.create(key='backtracking', name_en='Backtracking')
        self.algorithm = Algorithm.objects.create(category=category, key='sample', name='Sample')
        self.admin = User.objects.create_user(email='simulation-admin@example.test', password='test-password', role='admin')
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.url = '/api/algorithms/backtracking/sample/'
        self.config = {'renderer': 'graph', 'title': 'Sample', 'samples': [{'key': 'default', 'label': 'Default'}]}
        self.trace = {'renderer': 'graph', 'summary': 'Done', 'code': {'language': 'cpp', 'source': 'int main() {}'}, 'steps': [
            {'message': 'A step', 'codeLine': 1, 'action': {'label': 'Done', 'tone': 'complete'},
             'context': {'title': 'main', 'values': []}, 'metrics': [],
             'graph': {'nodes': [{'id': 0, 'label': '0', 'tone': 'idle'}], 'edges': []},
             'narration': {'text': 'Text from database', 'conclusion': 'Done', 'next': 'Restart', 'pause': True}}
        ]}
        self.payload = {'version': 1, 'algorithm_path': self.algorithm.path, 'config': self.config, 'samples': {'default': self.trace}}

    def test_snapshot_roundtrip_and_edit_preserves_simulation(self):
        response = self.client.put(self.url, {'simulation': self.payload, 'status': 'published'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get(self.url).data['content']['simulation'], self.payload)
        self.assertNotIn('simulation', self.client.get('/api/algorithms/admin-drafts/').data[self.algorithm.path])
        self.assertEqual(self.client.put(self.url, {'summary': 'Edited'}, format='json').status_code, 200)
        self.assertEqual(AlgorithmContent.objects.get(algorithm=self.algorithm).simulation, self.payload)
        learner = User.objects.create_user(email="simulation-learner@example.test", password="test-password")
        self.client.force_authenticate(learner)
        self.assertEqual(self.client.get(self.url).data['content']['simulation'], self.payload)
        AlgorithmContent.objects.filter(algorithm=self.algorithm).update(status='draft')
        self.assertIsNone(self.client.get(self.url).data['content'])

    def test_invalid_snapshot_does_not_write(self):
        self.trace['steps'][0]['codeLine'] = 999
        self.assertEqual(self.client.put(self.url, {'simulation': self.payload}, format='json').status_code, 400)
        self.assertFalse(AlgorithmContent.objects.exists())

    def test_applications_must_be_a_list_of_strings(self):
        for value in ['not-a-list', {'name': 'invalid'}, [1]]:
            with self.subTest(value=value):
                response = self.client.put(self.url, {'applications': value}, format='json')
                self.assertEqual(response.status_code, 400)
        self.assertFalse(AlgorithmContent.objects.exists())

    def test_sync_command_preserves_content_and_publication(self):
        from unittest.mock import patch
        from io import BytesIO
        content = AlgorithmContent.objects.create(algorithm=self.algorithm, summary='Keep me', status='published')
        with patch('algorithms.management.commands.sync_algorithm_simulation.urlopen', side_effect=[
            BytesIO(json.dumps({'algorithm': {'visualization': self.config}}).encode()),
            BytesIO(json.dumps(self.trace).encode()),
        ]) as fetch:
            call_command('sync_algorithm_simulation', self.algorithm.path)
            self.assertEqual(fetch.call_count, 2)
        content.refresh_from_db()
        self.assertEqual(content.simulation, self.payload)
        self.assertEqual(content.summary, 'Keep me')
        self.assertEqual(content.status, 'published')
        with patch('algorithms.management.commands.sync_algorithm_simulation.urlopen') as fetch:
            call_command('sync_algorithm_simulation', self.algorithm.path)
            fetch.assert_not_called()


    def test_malformed_choice_types_return_400(self):
        from copy import deepcopy
        cases = []
        bad = deepcopy(self.payload); bad['algorithm_path'] = 'backtracking/another-algorithm'; cases.append(bad)
        bad = deepcopy(self.payload); bad['config']['renderer'] = []; cases.append(bad)
        bad = deepcopy(self.payload); bad['samples']['default']['code']['language'] = {}; cases.append(bad)
        bad = deepcopy(self.payload); bad['samples']['default']['steps'][0]['action']['tone'] = []; cases.append(bad)
        bad = deepcopy(self.payload); bad['samples']['default']['steps'][0]['graph']['nodes'][0]['tone'] = {}; cases.append(bad)
        for payload in cases:
            with self.subTest(payload=payload):
                self.assertEqual(self.client.put(self.url, {'simulation': payload}, format='json').status_code, 400)
        self.assertFalse(AlgorithmContent.objects.exists())

    def test_sync_rejects_concurrent_edit(self):
        from unittest.mock import patch
        from io import BytesIO
        from django.core.management.base import CommandError
        content = AlgorithmContent.objects.create(algorithm=self.algorithm, summary='Initial')
        def fetch(url, **kwargs):
            if '/visualization?' in url:
                content.summary = 'Concurrent edit'
                content.save()
                return BytesIO(json.dumps(self.trace).encode())
            return BytesIO(json.dumps({'algorithm': {'visualization': self.config}}).encode())
        with patch('algorithms.management.commands.sync_algorithm_simulation.urlopen', side_effect=fetch):
            with self.assertRaisesMessage(CommandError, 'Bài học vừa được sửa'):
                call_command('sync_algorithm_simulation', self.algorithm.path, replace=True)
        content.refresh_from_db()
        self.assertEqual(content.summary, 'Concurrent edit')
        self.assertEqual(content.simulation, {})


class NewAlgorithmFromLinkTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email='new-lesson-admin@example.test', password='test-password', role='admin')
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.category = AlgorithmCategory.objects.create(key='backtracking', name_en='Backtracking')
        self.source = AlgorithmSource.objects.create(
            name='Algorithm source', kind=AlgorithmSource.Kind.URL,
            url='https://example.test/new-algorithm', allowed_domain='example.test',
        )
        self.url = '/api/algorithms/admin/import/scans/'

    @patch('algorithms.services.imports.threading.Thread.start')
    def test_creates_unpublished_new_algorithm_without_replacing_catalog_entry(self, start_thread):
        existing = Algorithm.objects.create(category=self.category, key='existing', name='Existing')
        response = self.client.post(self.url, {
            'new_algorithm': {'name': 'New Search Method', 'category_key': self.category.key},
            'source_ids': [self.source.pk],
        }, format='json')
        self.assertEqual(response.status_code, 202)
        self.assertTrue(start_thread.called)
        created = Algorithm.objects.exclude(pk=existing.pk).get(category=self.category)
        self.assertTrue(created.key.startswith('new-search-method-'))
        self.assertFalse(created.is_published)
        self.assertEqual(Algorithm.objects.get(pk=existing.pk).name, 'Existing')

    @patch('algorithms.services.imports.threading.Thread.start')
    def test_existing_name_creates_separate_source_draft_without_overwriting(self, start_thread):
        existing = Algorithm.objects.create(category=self.category, key='existing', name='Existing')
        response = self.client.post(self.url, {
            'new_algorithm': {'name': 'Existing', 'category_key': self.category.key},
            'source_ids': [self.source.pk],
        }, format='json')
        self.assertEqual(response.status_code, 202)
        self.assertEqual(Algorithm.objects.count(), 2)
        self.assertTrue(start_thread.called)
        self.assertEqual(Algorithm.objects.get(pk=existing.pk).name, 'Existing')
        self.assertTrue(Algorithm.objects.exclude(pk=existing.pk).get().key.startswith('existing-'))

    @patch('algorithms.services.imports.threading.Thread.start')
    def test_batch_resolves_existing_and_new_topics_separately(self, start_thread):
        existing = Algorithm.objects.create(category=self.category, key='binary-search', name='Binary Search')
        response = self.client.post(self.url, {
            'new_algorithms': [
                {'name': 'Binary Search', 'category_key': self.category.key},
                {'name': 'New Search Method', 'category_key': self.category.key},
                {'name': 'Another Method', 'category_key': self.category.key},
            ],
            'source_ids': [self.source.pk],
        }, format='json')
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data['total'], 3)
        self.assertEqual(Algorithm.objects.count(), 4)
        self.assertEqual(Algorithm.objects.get(pk=existing.pk).name, 'Binary Search')
        self.assertFalse(Algorithm.objects.get(name='New Search Method').is_published)
        self.assertTrue(start_thread.called)

    @patch('algorithms.services.imports.threading.Thread.start')
    def test_can_retry_an_empty_unpublished_new_lesson(self, start_thread):
        digest = sha256(f'{self.source.pk}:{self.category.key}:new-search-method'.encode()).hexdigest()[:10]
        existing = Algorithm.objects.create(category=self.category, key=f'new-search-method-{digest}',
                                            name='New Search Method', is_published=False)
        response = self.client.post(self.url, {
            'new_algorithm': {'name': 'New Search Method', 'category_key': self.category.key},
            'source_ids': [self.source.pk],
        }, format='json')
        self.assertEqual(response.status_code, 202)
        self.assertEqual(Algorithm.objects.count(), 1)
        self.assertEqual(Algorithm.objects.get().pk, existing.pk)
        self.assertTrue(start_thread.called)

    @patch('algorithms.services.imports.threading.Thread.start')
    def test_invalid_source_cannot_create_new_algorithm(self, start_thread):
        medical = Document.objects.create(title='Anatomy', scope=Document.Scope.MED, status=Document.Status.READY)
        source = AlgorithmSource.objects.create(name='Medical', kind=AlgorithmSource.Kind.DOCUMENT, document=medical)
        response = self.client.post(self.url, {
            'new_algorithm': {'name': 'New Search Method', 'category_key': self.category.key},
            'source_ids': [source.pk],
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Algorithm.objects.exists())
        start_thread.assert_not_called()
