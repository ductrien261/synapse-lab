import json
from urllib.parse import urlencode
from urllib.request import urlopen

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from algorithms.models import Algorithm, AlgorithmContent
from algorithms.api.serializers import AlgorithmContentSerializer
from algorithms.validators.simulation import MAX_BUNDLE_BYTES


class Command(BaseCommand):
    help = 'Tạo và lưu các ví dụ mô phỏng vào DB; giữ nguyên nội dung và trạng thái xuất bản.'

    def add_arguments(self, parser):
        parser.add_argument('algorithm_path')
        parser.add_argument('--replace', action='store_true')
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        try:
            category, key = options['algorithm_path'].split('/')
            algorithm = Algorithm.objects.get(category__key=category, key=key)
        except (ValueError, Algorithm.DoesNotExist) as exc:
            raise CommandError('Không tìm thấy thuật toán.') from exc
        existing = AlgorithmContent.objects.filter(algorithm=algorithm).first()
        if existing and existing.simulation and not options['replace']:
            self.stdout.write('Đã có mô phỏng; giữ nguyên. Dùng --replace để cập nhật.')
            return
        base = settings.ALGO_SERVER_URL.rstrip('/') + '/algorithms/' + algorithm.path
        def fetch(url):
            with urlopen(url, timeout=30) as response:
                data = response.read(MAX_BUNDLE_BYTES + 1)
                if len(data) > MAX_BUNDLE_BYTES:
                    raise ValueError('Mô phỏng vượt giới hạn dung lượng.')
                return json.loads(data)
        try:
            config = fetch(base)['algorithm']['visualization']
            if not isinstance(config, dict) or not isinstance(config.get('samples'), list) or not 1 <= len(config['samples']) <= 20:
                raise ValueError('Danh sách ví dụ mô phỏng không hợp lệ.')
            samples = {sample['key']: fetch(base + '/visualization?' + urlencode({'sample': sample['key']}))
                       for sample in config['samples']}
        except (OSError, ValueError, KeyError, TypeError) as exc:
            raise CommandError(f'Không tạo được mô phỏng: {exc}') from exc
        payload = {'version': 1, 'algorithm_path': algorithm.path, 'config': config, 'samples': samples}
        serializer = AlgorithmContentSerializer(data={'simulation': payload}, partial=True, context={'algorithm_path': algorithm.path})
        if not serializer.is_valid():
            raise CommandError(str(serializer.errors))
        count = sum(len(trace['steps']) for trace in samples.values())
        if not options['dry_run']:
            with transaction.atomic():
                Algorithm.objects.select_for_update().get(pk=algorithm.pk)
                content, created = AlgorithmContent.objects.get_or_create(algorithm=algorithm)
                if (existing and content.updated_at != existing.updated_at) or (not existing and not created):
                    raise CommandError('Bài học vừa được sửa trong lúc tạo mô phỏng. Chạy lại để dùng dữ liệu mới.')
                if content.simulation and not options['replace']:
                    raise CommandError('Mô phỏng vừa được cập nhật; giữ nguyên dữ liệu mới.')
                content.simulation = serializer.validated_data['simulation']
                content.save(update_fields=['simulation', 'updated_at'])
        self.stdout.write(self.style.SUCCESS(
            f'{"Hợp lệ, chưa ghi DB" if options["dry_run"] else "Đã lưu DB"}: {algorithm.path}, {len(samples)} ví dụ, {count} bước.'
        ))
