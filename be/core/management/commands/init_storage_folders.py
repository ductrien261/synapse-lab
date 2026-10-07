"""Create visible folder markers using the same object keys as application uploads."""
from urllib.parse import urlsplit

from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError

from knowledge.models import Document


class Command(BaseCommand):
    help = 'Tạo các thư mục tài liệu và ảnh trên R2; dùng --apply để thực hiện.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        prefixes = [f'documents/{scope}/' for scope in Document.Scope.values]
        prefixes.append('lesson-assets/openstax/')
        if not options['apply']:
            self.stdout.write('\n'.join(prefixes))
            self.stdout.write('Chưa gọi R2; dùng --apply để tạo thư mục.')
            return
        endpoint = urlsplit(settings.S3_ENDPOINT_URL)
        if (not settings.S3_BUCKET or endpoint.scheme != 'https'
                or not (endpoint.hostname or '').endswith('.r2.cloudflarestorage.com')):
            raise CommandError('Cần S3_BUCKET và S3_ENDPOINT_URL HTTPS của R2 trong .env.')
        try:
            client = default_storage.connection.meta.client
            for prefix in prefixes:
                try:
                    client.head_object(Bucket=settings.S3_BUCKET, Key=prefix)
                    self.stdout.write(f'Đã có: {prefix}')
                    continue
                except ClientError as exc:
                    if exc.response.get('ResponseMetadata', {}).get('HTTPStatusCode') != 404:
                        raise
                client.put_object(Bucket=settings.S3_BUCKET, Key=prefix, Body=b'',
                                  ContentType='application/x-directory')
                client.head_object(Bucket=settings.S3_BUCKET, Key=prefix)
                self.stdout.write(f'Đã tạo và xác nhận: {prefix}')
        except ClientError as exc:
            code = exc.response.get('Error', {}).get('Code', 'Unknown')
            raise CommandError(f'R2 trả lỗi {code}. Kiểm tra bucket và quyền Object Read & Write.') from None
        except BotoCoreError:
            raise CommandError('Không kết nối được R2. Kiểm tra endpoint, key và mạng.') from None
