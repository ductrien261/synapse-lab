from django.core.management.base import BaseCommand, CommandError

from classroom.document_rendering import render_lesson_resource_preview
from classroom.models import LessonResource


class Command(BaseCommand):
    help = 'Render ảnh preview cho các PowerPoint đã được tải lên.'

    def add_arguments(self, parser):
        parser.add_argument('--resource', help='UUID của một LessonResource cụ thể.')

    def handle(self, *args, **options):
        resources = LessonResource.objects.filter(kind=LessonResource.Kind.SLIDE).exclude(file='')
        if options['resource']:
            resources = resources.filter(pk=options['resource'])
        if not resources.exists():
            raise CommandError('Không tìm thấy PowerPoint phù hợp để render.')

        failed = 0
        for resource in resources.select_related('section__plan__classroom'):
            self.stdout.write(f'Rendering {resource.id}: {resource.title}')
            render_lesson_resource_preview(resource)
            if resource.preview_status == LessonResource.PreviewStatus.READY:
                self.stdout.write(self.style.SUCCESS(f'  {resource.preview_page_count} slide đã sẵn sàng.'))
            else:
                failed += 1
                self.stderr.write(self.style.ERROR(f'  {resource.preview_error}'))
        if failed:
            raise CommandError(f'{failed} PowerPoint render thất bại.')
