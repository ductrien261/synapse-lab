"""Run only against an isolated test database (see data/seeds/README.md)."""
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase
from django.test.utils import CaptureQueriesContext

from algorithms.models import Algorithm, AlgorithmCategory, AlgorithmContent


def seed(**kwargs):
    call_command('seed_backtracking', stdout=StringIO(), **kwargs)


class BacktrackingSeedTests(TestCase):
    def test_preview_is_read_only(self):
        with CaptureQueriesContext(connection) as queries:
            seed()
        self.assertFalse(AlgorithmCategory.objects.exists())
        self.assertFalse(any(q['sql'].lstrip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')) for q in queries))

    def test_insert_and_repeat_preserve_ids_and_timestamps(self):
        seed(apply=True)
        before = list(AlgorithmContent.objects.order_by('pk').values())
        self.assertEqual(Algorithm.objects.count(), 4)
        self.assertEqual(len(before), 4)
        self.assertEqual(AlgorithmContent.objects.filter(status='published').count(), 4)
        self.assertTrue(AlgorithmContent.objects.filter(algorithm__key='sum-of-subsets').exists())
        seed(apply=True)
        self.assertEqual(before, list(AlgorithmContent.objects.order_by('pk').values()))
        self.assertEqual(Algorithm.objects.count(), 4)

    def test_explicit_update_preview_apply_and_repeat(self):
        seed(apply=True)
        content = AlgorithmContent.objects.get(algorithm__key='n-queens-problem')
        content.summary = 'Old incomplete lesson'
        content.application_scenarios = []
        content.save()
        before = list(AlgorithmContent.objects.order_by('pk').values())
        with CaptureQueriesContext(connection) as queries:
            seed(update_existing=True)
        self.assertFalse(any(q['sql'].lstrip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')) for q in queries))
        self.assertEqual(before, list(AlgorithmContent.objects.order_by('pk').values()))
        seed(apply=True, update_existing=True)
        content.refresh_from_db()
        self.assertNotEqual(content.summary, 'Old incomplete lesson')
        self.assertEqual(len(content.application_scenarios), 4)
        updated = content.updated_at
        seed(apply=True, update_existing=True)
        content.refresh_from_db()
        self.assertEqual(content.updated_at, updated)

    def test_application_validation_rejects_invalid_step_indices(self):
        import copy
        import json
        from algorithms.management.commands.seed_backtracking import SEED
        from algorithms.api.serializers import AlgorithmContentSerializer
        scenarios = json.loads(SEED.read_text())['algorithms'][0]['content']['application_scenarios']
        for invalid in (999, -1, True):
            value = copy.deepcopy(scenarios)
            value[0]['steps'][0]['route'] = [invalid]
            serializer = AlgorithmContentSerializer(data={'application_scenarios': value}, partial=True)
            self.assertFalse(serializer.is_valid())
            self.assertIn('application_scenarios', serializer.errors)

    def test_complete_lessons_and_application_routes(self):
        seed(apply=True)
        for content in AlgorithmContent.objects.select_related('algorithm'):
            self.assertEqual(len(content.lesson_fields), 11)
            self.assertTrue(all(value.strip() for value in content.lesson_fields.values()))
            self.assertTrue(content.code_lesson['steps'])
            self.assertTrue(content.simulation['samples'])
            self.assertEqual(len(content.application_scenarios), 4)
            for item in content.application_scenarios:
                self.assertIn('scene', item)
                route = item['steps'][-1]['route']
                if content.algorithm.key == 'hamiltonean-cycles':
                    self.assertEqual(route[0], route[-1])
                    self.assertEqual(len(set(route[:-1])), len(item['nodes']))
                    edges = {tuple(sorted(edge)) for edge in item['edges']}
                    self.assertTrue(all(tuple(sorted(pair)) in edges for pair in zip(route, route[1:])))
                elif content.algorithm.key == 'knights-tour-problem':
                    self.assertEqual(len(set(route)), 25)
                    self.assertTrue(all(sorted([abs(a//5-b//5), abs(a%5-b%5)]) == [1, 2] for a,b in zip(route, route[1:])))
                elif content.algorithm.key == 'n-queens-problem':
                    self.assertEqual(len(route), 4)
                    self.assertTrue(all(a//4 != b//4 and a%4 != b%4 and abs(a//4-b//4) != abs(a%4-b%4) for i,a in enumerate(route) for b in route[i+1:]))
                else:
                    self.assertEqual(sum(item['scene']['values'][i] for i in route), item['scene']['target'])

    def test_revised_lessons_have_vietnamese_theory_and_visual_practice(self):
        seed(apply=True)
        expected_titles = [
            'Bài toán, đầu vào và đầu ra',
            'Ý tưởng và nguyên lý hoạt động',
            'Các bước thực hiện',
            'Theo dõi trạng thái và mã nguồn',
            'Độ phức tạp, tính đúng đắn và giới hạn',
            'Ứng dụng, biến thể và so sánh',
        ]
        for key in ('hamiltonean-cycles', 'knights-tour-problem', 'n-queens-problem', 'sum-of-subsets'):
            blocks = AlgorithmContent.objects.get(algorithm__key=key).lesson_blocks
            theory = [block for block in blocks if block['kind'] == 'theory']
            self.assertEqual([block['title'] for block in theory], expected_titles)
            self.assertTrue(all(block['text'].strip() for block in theory))
        for key in ('knights-tour-problem', 'n-queens-problem', 'sum-of-subsets'):
            blocks = AlgorithmContent.objects.get(algorithm__key=key).lesson_blocks
            theory = [block for block in blocks if block['kind'] == 'theory']
            practice = [block for block in blocks if block['kind'] != 'theory']
            self.assertEqual(len(theory), 6)
            self.assertEqual(len(practice), 8)
            self.assertTrue(all(not block['id'].startswith('knight-learning-') for block in theory))
            self.assertTrue(all(block['image'].startswith('/lesson-assets/algorithms/backtracking/') for block in practice))
            self.assertTrue(all(block['answer'] and block['solution'] and block['hint'] for block in practice))

    def test_route_comparisons_are_valid_and_optimal(self):
        import itertools
        import json
        import math
        from algorithms.management.commands.seed_backtracking import SEED
        scenarios = json.loads(SEED.read_text())['algorithms'][0]['content']['application_scenarios']
        for scenario in scenarios:
            config = scenario['scene']
            if 'alternatives' not in config:
                continue
            nodes = scenario['nodes']
            def cost(route):
                pairs = [(abs(nodes[a]['x']-nodes[b]['x']), abs(nodes[a]['y']-nodes[b]['y'])) for a,b in zip(route,route[1:])]
                return sum(math.hypot(dx,dy) if config['distance']['metric']=='euclidean' else dx+dy for dx,dy in pairs)
            optimal = config['alternatives'][0]['steps'][-1]['route']
            candidates = ([0,*p,0] for p in itertools.permutations(range(1,len(nodes))))
            self.assertAlmostEqual(cost(optimal), min(map(cost,candidates)))
            for sequence in [scenario['steps'],config['alternatives'][0]['steps']]:
                final = sequence[-1]['route']
                self.assertEqual(final[0], final[-1])
                self.assertEqual(set(final[:-1]), set(range(len(nodes))))
                actions = [s['route'][-1] for s in sequence if s.get('phase')=='act']
                self.assertEqual(sorted(actions), list(range(1,len(nodes))))

    def test_alternative_steps_are_validated(self):
        import copy
        import json
        from algorithms.validators.applications import validate_application_scenarios
        from algorithms.management.commands.seed_backtracking import SEED
        from rest_framework.exceptions import ValidationError
        scenario = json.loads(SEED.read_text())['algorithms'][0]['content']['application_scenarios'][1]
        for change in ({'route':[999]}, {'phase':'unknown'}):
            invalid = copy.deepcopy(scenario)
            invalid['scene']['alternatives'][0]['steps'][0].update(change)
            with self.assertRaises(ValidationError):
                validate_application_scenarios([invalid])

    def test_scene_validation_and_legacy_compatibility(self):
        import copy
        import json
        from algorithms.validators.applications import validate_application_scenarios
        from algorithms.management.commands.seed_backtracking import SEED
        from rest_framework.exceptions import ValidationError

        rows = json.loads(SEED.read_text())['algorithms']
        scenarios = [s for row in rows for s in row['content']['application_scenarios']]
        self.assertEqual(len({s['scene']['theme'] for s in scenarios}), 16)
        for scenario in scenarios:
            validate_application_scenarios([scenario])
            legacy = copy.deepcopy(scenario)
            del legacy['scene']
            validate_application_scenarios([legacy])
        for scene_patch in ({'theme': 'unknown'}, {'values': [2]}, {'target': True}, {'target': float('inf')}):
            invalid = copy.deepcopy(scenarios[-1])
            invalid['scene'].update(scene_patch)
            with self.assertRaises(ValidationError):
                validate_application_scenarios([invalid])

    def test_conflict_cancels_all_inserts(self):
        category = AlgorithmCategory.objects.create(key='backtracking', name_en='Team title')
        algorithm = Algorithm.objects.create(category=category, key='n-queens-problem', name='Team name', is_published=False)
        existing = AlgorithmContent.objects.create(algorithm=algorithm, summary='Shared database content')
        for apply in (False, True):
            with self.assertRaises(CommandError):
                seed(apply=apply)
        self.assertEqual(Algorithm.objects.count(), 1)
        existing.refresh_from_db()
        self.assertEqual(existing.summary, 'Shared database content')

    def test_existing_catalog_and_other_groups_preserved(self):
        category = AlgorithmCategory.objects.create(key='backtracking', name_en='Team title')
        algorithm = Algorithm.objects.create(category=category, key='n-queens-problem', name='Team name', is_published=False)
        other = AlgorithmCategory.objects.create(key='other', name_en='Other')
        unrelated = Algorithm.objects.create(category=other, key='n-queens-problem', name='Unrelated')
        seed(apply=True)
        category.refresh_from_db()
        algorithm.refresh_from_db()
        self.assertEqual(category.name_en, 'Team title')
        self.assertEqual(algorithm.name, 'Team name')
        self.assertFalse(algorithm.is_published)
        self.assertTrue(Algorithm.objects.filter(pk=unrelated.pk).exists())
        self.assertEqual(Algorithm.objects.count(), 5)

    def test_failure_rolls_back_whole_seed(self):
        with patch.object(AlgorithmContent, 'save', side_effect=RuntimeError('simulated write failure')):
            with self.assertRaises(RuntimeError):
                seed(apply=True)
        self.assertFalse(AlgorithmCategory.objects.exists())
        self.assertFalse(Algorithm.objects.exists())


class BacktrackingMigrationTests(TransactionTestCase):
    def test_upgrade_from_main_preserves_existing_data(self):
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        old = [('algorithms', '0001_initial')]
        executor.migrate(old)
        try:
            loader = MigrationExecutor(connection).loader
            apps = loader.project_state(old).apps
            category = apps.get_model('algorithms', 'AlgorithmCategory').objects.create(key='existing', name_en='Existing')
            algorithm = apps.get_model('algorithms', 'Algorithm').objects.create(category=category, key='existing', name='Existing')
            content = apps.get_model('algorithms', 'AlgorithmContent').objects.create(algorithm=algorithm, summary='Keep me', theory='Theory', status='published', applications=['Example'])
            original = apps.get_model('algorithms', 'AlgorithmContent').objects.values().get(pk=content.pk)
            # Only algorithms is rolled back; knowledge keeps its current schema.
            from knowledge.models import Document
            document = Document(title='Existing textbook', status='ready', scope='cs')
            Document.objects.bulk_create([document])
            reference = apps.get_model('algorithms', 'AlgorithmReference').objects.create(algorithm=algorithm, document_id=document.pk, excerpt='Keep reference')
            with self.assertRaises(CommandError):
                seed()
            MigrationExecutor(connection).migrate(latest)
            actual = AlgorithmContent.objects.values().get(pk=content.pk)
            for key, value in original.items():
                self.assertEqual(actual[key], value, key)
            for key, default in [('lesson_fields', {}), ('lesson_blocks', []), ('code_lesson', {}), ('simulation', {})]:
                self.assertEqual(actual[key], default)
            from algorithms.models import AlgorithmReference, AlgorithmSource
            self.assertEqual(AlgorithmReference.objects.get(pk=reference.pk).excerpt, 'Keep reference')
            self.assertEqual(AlgorithmSource.objects.get(document_id=document.pk).name, 'Existing textbook')
        finally:
            MigrationExecutor(connection).migrate(latest)
