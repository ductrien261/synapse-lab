from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('algorithms', '0003_algorithmcontent_lesson_blocks')]
    operations = [migrations.AddField(
        model_name='algorithmcontent', name='code_lesson',
        field=models.JSONField(blank=True, default=dict, verbose_name='Hướng dẫn viết code'),
    )]
