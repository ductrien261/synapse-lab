from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('algorithms', '0004_algorithmcontent_code_lesson')]
    operations = [migrations.AddField(
        model_name='algorithmcontent', name='simulation',
        field=models.JSONField(blank=True, default=dict, verbose_name='Các ví dụ mô phỏng đã biên soạn'),
    )]
