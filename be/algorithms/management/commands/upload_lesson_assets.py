"""Upload existing lesson images without rewriting lesson content or seed files."""
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError

from algorithms.services.assets import asset_key, upload_asset


class Command(BaseCommand):
    help = 'Upload ảnh bài học lên S3; mặc định chỉ liệt kê, dùng --apply để upload.'

    def add_arguments(self, parser):
        parser.add_argument('--directory', type=Path, default=(
            settings.BASE_DIR / 'algorithms/data/references/openstax-hamilton/assets'
        ))
        parser.add_argument('--prefix', default='openstax')
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        directory = options['directory']
        if not directory.is_dir():
            raise CommandError('Không tìm thấy thư mục ảnh.')
        files = sorted(path for path in directory.rglob('*') if path.is_file()
                       and path.suffix.lower() in {'.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg'})
        if not files:
            raise CommandError('Thư mục không có ảnh để upload.')
        pending = []
        for path in files:
            image = f'/lesson-assets/{options["prefix"]}/{path.relative_to(directory).as_posix()}'
            try:
                asset_key(image)
                path.resolve().relative_to(directory.resolve())
            except ValueError as exc:
                raise CommandError('Đường dẫn ảnh hoặc prefix không hợp lệ.') from exc
            pending.append((path, image))
        if not options['apply']:
            for _, image in pending:
                self.stdout.write(image)
            self.stdout.write(f'{len(pending)} ảnh. Chưa gọi S3; dùng --apply để upload.')
            return
        uploaded = skipped = 0
        try:
            for path, image in pending:
                with path.open('rb') as stream:
                    if upload_asset(image, File(stream, name=path.name)):
                        uploaded += 1
                    else:
                        skipped += 1
        except (ImproperlyConfigured, ValueError, OSError) as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(self.style.SUCCESS(
            f'Đã upload {uploaded} ảnh; giữ nguyên {skipped} ảnh có sẵn. Không đổi DB hay file local.'
        ))
