from django.db import migrations, models

import classroom.models


class Migration(migrations.Migration):
    dependencies = [
        ('classroom', '0009_live_poll'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lessonresource',
            name='file',
            field=models.FileField(blank=True, max_length=500, upload_to=classroom.models.lesson_resource_upload_path),
        ),
        migrations.AlterField(
            model_name='lessonresource',
            name='preview_pdf',
            field=models.FileField(blank=True, max_length=500, upload_to=classroom.models.lesson_resource_preview_pdf_path),
        ),
    ]
