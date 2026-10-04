import classroom.models
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('classroom', '0004_lesson_plan_content'),
    ]

    operations = [
        migrations.AddField(
            model_name='lessonresource',
            name='preview_error',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='lessonresource',
            name='preview_page_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='lessonresource',
            name='preview_pdf',
            field=models.FileField(blank=True, upload_to=classroom.models.lesson_resource_preview_pdf_path),
        ),
        migrations.AddField(
            model_name='lessonresource',
            name='preview_slides',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='lessonresource',
            name='preview_status',
            field=models.CharField(
                choices=[
                    ('none', 'Không cần xử lý'),
                    ('processing', 'Đang xử lý'),
                    ('ready', 'Sẵn sàng'),
                    ('failed', 'Xử lý thất bại'),
                ],
                default='none',
                max_length=20,
            ),
        ),
    ]
