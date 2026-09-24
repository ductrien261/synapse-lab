from django.core.management.base import BaseCommand, CommandError

from anatomy.models import BodySystem
from anatomy.services.importer import import_model
from anatomy.services.sketchfab import SketchfabError


class Command(BaseCommand):
    help = (
        'Nhập một mô hình Sketchfab thật vào database.\n'
        'Ví dụ: python manage.py add_anatomy_model https://sketchfab.com/models/<mã>/embed '
        '--system cardiovascular --publish'
    )

    def add_arguments(self, parser):
        parser.add_argument('link', help='Link embed, link trang Sketchfab hoặc mã 32 ký tự')
        parser.add_argument('--system', help='slug hệ cơ quan, vd. cardiovascular')
        parser.add_argument('--title-vi', default='', help='Tên tiếng Việt')
        parser.add_argument('--publish', action='store_true', help='Xuất bản luôn cho học viên thấy')

    def handle(self, *args, **opts):
        system = None
        if opts['system']:
            system = BodySystem.objects.filter(slug=opts['system']).first()
            if system is None:
                slugs = ', '.join(BodySystem.objects.values_list('slug', flat=True))
                raise CommandError(f"Không có hệ cơ quan '{opts['system']}'. Các slug hợp lệ: {slugs}")
        try:
            model, created = import_model(opts['link'], system=system, publish=True if opts['publish'] else None)
        except SketchfabError as exc:
            raise CommandError(str(exc)) from exc
        if opts['title_vi']:
            model.title_vi = opts['title_vi']
            model.save(update_fields=['title_vi'])
        state = 'đã xuất bản' if model.is_published else 'nháp'
        self.stdout.write(self.style.SUCCESS(
            f"{'Đã thêm' if created else 'Đã cập nhật'}: {model.title} [{model.author_name} · {model.license_label}] ({state})"
        ))
