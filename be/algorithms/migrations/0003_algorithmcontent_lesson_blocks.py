from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('algorithms', '0002_algorithmcontent_lesson_fields')]
    operations = [migrations.AddField(model_name='algorithmcontent', name='lesson_blocks', field=models.JSONField(blank=True, default=list, verbose_name='Nội dung có cấu trúc'))]
