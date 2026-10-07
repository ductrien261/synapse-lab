from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('algorithms', '0006_algorithm_import_workflow')]
    operations = [migrations.AddField(
        model_name='algorithmcontent', name='application_scenarios',
        field=models.JSONField(blank=True, default=list, verbose_name='Tình huống ứng dụng'),
    )]
