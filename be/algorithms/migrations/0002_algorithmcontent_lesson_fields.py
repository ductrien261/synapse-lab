from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('algorithms', '0001_initial')]
    operations = [migrations.AddField(
        model_name='algorithmcontent', name='lesson_fields',
        field=models.JSONField(blank=True, default=dict, verbose_name='Nội dung bài học'),
    )]
