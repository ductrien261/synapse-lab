import json
from collections import Counter
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from algorithms.models import Algorithm, AlgorithmContent
from algorithms.api.serializers import AlgorithmContentSerializer


class Command(BaseCommand):
    help = 'Nạp kiến thức, ví dụ và bài tập từ JSON; giữ nội dung đã lưu và trạng thái xuất bản.'

    def add_arguments(self, parser):
        parser.add_argument('algorithm_path')
        parser.add_argument('file', type=Path)
        parser.add_argument('--dry-run', action='store_true')
        parser.add_argument('--replace-theory', action='store_true', help='Thay phần lý thuyết; giữ nguyên ví dụ và bài tập.')
        parser.add_argument('--backup', type=Path, help='File sao lưu các khối hiện có trước khi thay lý thuyết.')

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            category, key = options['algorithm_path'].split('/')
            algorithm = Algorithm.objects.select_for_update().get(category__key=category, key=key)
            incoming = json.loads(options['file'].read_text(encoding='utf-8'))
        except (ValueError, OSError, Algorithm.DoesNotExist) as exc:
            raise CommandError(f'Không đọc được nội dung: {exc}') from exc
        validator = AlgorithmContentSerializer(data={'lesson_blocks': incoming}, partial=True)
        if not validator.is_valid():
            raise CommandError(str(validator.errors))
        content = AlgorithmContent.objects.filter(algorithm=algorithm).first()
        saved = content.lesson_blocks if content else []
        if options['replace_theory']:
            if not incoming or any(block['kind'] != 'theory' for block in incoming):
                raise CommandError('--replace-theory chỉ nhận các mục lý thuyết.')
            if not options['backup']:
                raise CommandError('Cần --backup để lưu nội dung trước khi thay lý thuyết.')
            retained = [block for block in saved if block['kind'] != 'theory']
            merged = incoming + retained
        else:
            merged = None
        existing_ids = {block['id'] for block in saved}
        added = [block for block in incoming if block['id'] not in existing_ids]
        merged = merged if merged is not None else saved + added
        serializer = AlgorithmContentSerializer(content, data={'lesson_blocks': merged}, partial=True)
        if not serializer.is_valid():
            raise CommandError(str(serializer.errors))
        stats = dict(Counter(block['kind'] for block in merged))
        if options['dry_run']:
            self.stdout.write(f'Hợp lệ; sẽ thêm {len(added)} mục. Tổng: {stats}. Chưa ghi DB.')
            return
        if merged == saved:
            self.stdout.write('Không có mục mới; giữ nguyên nội dung đã lưu.')
            return
        if options['replace_theory']:
            try:
                with options['backup'].open('x', encoding='utf-8') as backup:
                    json.dump(saved, backup, ensure_ascii=False, indent=2)
            except OSError as exc:
                raise CommandError(f'Không lưu được bản sao nội dung: {exc}') from exc
        content = serializer.save(algorithm=algorithm)
        self.stdout.write(self.style.SUCCESS(
            f'Đã thêm {len(added)} mục cho {algorithm.path}. Tổng: {stats}; trạng thái: {content.status}.'
        ))
