from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Tạo dữ liệu nền cho người mới clone repo: danh sách hệ cơ quan chuẩn + đồng bộ danh mục thuật toán từ algo-server (không tạo dữ liệu giả).'

    def handle(self, *args, **options):
        self.stdout.write('== Giải phẫu ==')
        call_command('seed_anatomy')

        self.stdout.write('== Thuật toán ==')
        try:
            call_command('sync_algorithms')
        except Exception as exc:  # noqa: BLE001
            self.stdout.write(self.style.WARNING(f'Bỏ qua: {exc}'))

        self.stdout.write(self.style.SUCCESS('Xong dữ liệu nền.'))
