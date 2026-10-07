"""Import a validated lesson bundle without silently replacing existing content."""
import json
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from algorithms.models import Algorithm, AlgorithmContent
from algorithms.api.serializers import AlgorithmContentSerializer

class Command(BaseCommand):
    help = 'Import a structured algorithm lesson as draft; preserve existing lessons.'

    def add_arguments(self, parser):
        parser.add_argument('algorithm_path')
        parser.add_argument('file', type=Path)
        parser.add_argument('--dry-run', action='store_true')

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            category, key = options['algorithm_path'].split('/')
            algorithm = Algorithm.objects.select_for_update().get(category__key=category, key=key)
            payload = json.loads(options['file'].read_text(encoding='utf-8'))
        except (ValueError, OSError, Algorithm.DoesNotExist) as exc:
            raise CommandError(str(exc)) from exc
        if not isinstance(payload, dict):
            raise CommandError('Expected a lesson object.')
        writable = set(AlgorithmContentSerializer().fields) - {'updated_at'}
        if set(payload) - writable:
            raise CommandError('Unknown fields in lesson bundle.')
        payload['status'] = 'draft'
        serializer = AlgorithmContentSerializer(data=payload, context={'algorithm_path': algorithm.path})
        if not serializer.is_valid():
            raise CommandError(str(serializer.errors))
        if options['dry_run']:
            self.stdout.write('Valid lesson bundle. No DB writes.')
            return
        if AlgorithmContent.objects.filter(algorithm=algorithm).exists():
            self.stdout.write('Existing content retained; import skipped.')
            return
        content = serializer.save(algorithm=algorithm)
        self.stdout.write(self.style.SUCCESS(f'Imported {len(content.lesson_blocks)} blocks for {algorithm.path} as draft.'))
