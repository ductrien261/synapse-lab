import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from algorithms.models import Algorithm, AlgorithmContent
from algorithms.api.serializers import AlgorithmContentSerializer


class Command(BaseCommand):
    help = 'Nhập bài hướng dẫn code từ JSON; giữ nguyên nội dung khác và trạng thái xuất bản.'

    def add_arguments(self, parser):
        parser.add_argument('algorithm_path', help='Ví dụ: backtracking/hamiltonean-cycles')
        parser.add_argument('file', type=Path)
        parser.add_argument('--replace', action='store_true', help='Thay bài hướng dẫn code đã có.')
        parser.add_argument('--dry-run', action='store_true', help='Chỉ kiểm tra, không ghi database.')

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            category, key = options['algorithm_path'].split('/')
            algorithm = Algorithm.objects.select_for_update().get(category__key=category, key=key)
            payload = json.loads(options['file'].read_text(encoding='utf-8'))
        except (ValueError, OSError, Algorithm.DoesNotExist) as exc:
            raise CommandError(f'Không đọc được bài học: {exc}') from exc
        content = AlgorithmContent.objects.filter(algorithm=algorithm).first()
        serializer = AlgorithmContentSerializer(content, data={'code_lesson': payload}, partial=True)
        if not serializer.is_valid():
            raise CommandError(str(serializer.errors))
        if content and content.code_lesson and not options['replace']:
            self.stdout.write('Đã có bài hướng dẫn code; giữ nguyên. Dùng --replace nếu muốn thay.')
            return
        if options['dry_run']:
            self.stdout.write(self.style.SUCCESS(f"Hợp lệ: {len(payload.get('steps', []))} bước; chưa ghi DB."))
            return
        content = serializer.save(algorithm=algorithm)
        self.stdout.write(self.style.SUCCESS(
            f"Đã lưu {len(content.code_lesson.get('steps', []))} bước cho {algorithm.path}; trạng thái: {content.status}."
        ))
