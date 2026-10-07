from django.core.management.base import BaseCommand, CommandError

from algorithms.services.catalog import sync_from_algo_server


class Command(BaseCommand):
    help = 'Đồng bộ danh mục thuật toán từ algo-server (packages/algo-viz) vào database.'

    def handle(self, *args, **options):
        try:
            stats = sync_from_algo_server()
        except Exception as exc:  # noqa: BLE001
            raise CommandError(f'Không đồng bộ được: {exc}. Kiểm tra algo-server đang chạy chưa.') from exc
        self.stdout.write(self.style.SUCCESS(
            f"Đã đồng bộ {stats['categories']} nhóm: {stats['created']} thuật toán mới, {stats['updated']} cập nhật."
        ))
