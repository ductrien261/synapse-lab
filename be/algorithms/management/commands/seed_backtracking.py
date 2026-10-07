"""Seed lessons by natural keys; updates require --update-existing."""
import json
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import connections, transaction
from django.db.migrations.executor import MigrationExecutor

from algorithms.models import Algorithm, AlgorithmCategory, AlgorithmContent
from algorithms.api.serializers import AlgorithmContentSerializer


SEED = Path(__file__).resolve().parents[2] / 'data/seeds/backtracking.json'
KEYS = {'hamiltonean-cycles', 'knights-tour-problem', 'n-queens-problem', 'sum-of-subsets'}
CONTENT_FIELDS = {
    'summary', 'theory', 'time_best', 'time_average', 'time_worst', 'space',
    'applications', 'application_scenarios', 'status', 'lesson_fields', 'lesson_blocks', 'code_lesson', 'simulation',
}


class Command(BaseCommand):
    help = 'Preview backtracking seed; --apply writes atomically; --update-existing replaces differing lesson content.'

    def add_arguments(self, parser):
        parser.add_argument('--database', default='default')
        parser.add_argument('--update-existing', action='store_true', help='Replace differing lesson content with this seed; preserve catalog metadata.')
        group = parser.add_mutually_exclusive_group()
        group.add_argument('--apply', action='store_true')
        group.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        alias = options['database']
        connection = connections[alias]
        executor = MigrationExecutor(connection)
        target = ('algorithms', '0007_algorithmcontent_application_scenarios')
        executor.loader.check_consistent_history(connection)
        if executor.migration_plan([target]):
            raise CommandError('Apply algorithms migrations through 0007 before seeding. No data written.')
        try:
            payload = json.loads(SEED.read_text())
            category_data = payload['category']
            rows = payload['algorithms']
            if payload['version'] != 1 or category_data['key'] != 'backtracking':
                raise ValueError('Unexpected seed version/category')
            if len(rows) != 4 or {row['key'] for row in rows} != KEYS:
                raise ValueError('Expected exactly four backtracking algorithms')
            AlgorithmCategory(**category_data).clean_fields()
            for row in rows:
                if set(row) != {'key', 'name', 'is_published', 'content'}:
                    raise ValueError('Unexpected algorithm fields')
                Algorithm(**{k: row[k] for k in ('key', 'name', 'is_published')}).clean_fields(exclude=['category'])
                content = row['content']
                if content is not None:
                    if set(content) != CONTENT_FIELDS:
                        raise ValueError('Unexpected content fields')
                    # Empty legacy lesson_fields is valid in the database.
                    data = {k: v for k, v in content.items() if k != 'lesson_fields' or v != {}}
                    serializer = AlgorithmContentSerializer(data=data, context={'algorithm_path': f"backtracking/{row['key']}"})
                    if not serializer.is_valid():
                        raise ValueError(f"{row['key']}: {serializer.errors}")
        except (OSError, ValueError, KeyError, TypeError, ValidationError) as exc:
            raise CommandError(f'Invalid seed: {exc}') from exc

        with transaction.atomic(using=alias):
            # Also protect against concurrent edits/seed runs on PostgreSQL.
            # Preview uses only SELECT; it does not insert and roll back.
            if options['apply'] and connection.vendor == 'postgresql':
                with connection.cursor() as cursor:
                    cursor.execute("SET LOCAL lock_timeout = '5s'")
                    cursor.execute('LOCK TABLE algorithms_algorithmcategory, algorithms_algorithm, algorithms_algorithmcontent IN SHARE ROW EXCLUSIVE MODE')
            category = AlgorithmCategory.objects.using(alias).filter(key='backtracking').first()
            pending = []
            conflicts = []
            for row in rows:
                algorithm = Algorithm.objects.using(alias).filter(category=category, key=row['key']).first() if category else None
                content = AlgorithmContent.objects.using(alias).filter(algorithm=algorithm).first() if algorithm else None
                if content is not None and row['content'] is not None:
                    changed = [key for key, value in row['content'].items() if getattr(content, key) != value]
                    if changed:
                        conflicts.append(f"{row['key']}: {', '.join(changed)}")
                pending.append((row, algorithm, content))
                self.stdout.write(f"{row['key']}: algorithm={'keep' if algorithm else 'create'}, content={'keep' if content else 'create' if row['content'] is not None else 'none'}")
            if conflicts and options['update_existing']:
                self.stdout.write('Content updates:\n' + '\n'.join(conflicts))
            if conflicts and not options['update_existing']:
                raise CommandError('Existing content differs; entire seed cancelled, no writes.\n' + '\n'.join(conflicts))
            if not options['apply']:
                self.stdout.write(self.style.SUCCESS('Preview OK. No writes. Use --apply with the same options to apply these changes.'))
                return
            if category is None:
                category = AlgorithmCategory.objects.using(alias).create(**category_data)
            for row, algorithm, content in pending:
                if algorithm is None:
                    algorithm = Algorithm.objects.using(alias).create(category=category, **{key: row[key] for key in ('key', 'name', 'is_published')})
                if content is not None and options['update_existing']:
                    changed = [key for key, value in row['content'].items() if getattr(content, key) != value]
                    if changed:
                        for key in changed:
                            setattr(content, key, row['content'][key])
                        content.save(using=alias, update_fields=[*changed, 'updated_at'])
                if content is None and row['content'] is not None:
                    AlgorithmContent.objects.using(alias).create(algorithm=algorithm, **row['content'])
        self.stdout.write(self.style.SUCCESS('Seed applied. Catalog metadata preserved; requested lesson content applied.'))
