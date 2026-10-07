from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('tutor', '0002_feedback_reviewed_compat')]

    operations = [
        migrations.AddField(model_name='tutormessage', name='action_kind', field=models.CharField(blank=True, max_length=12)),
        migrations.AddField(model_name='tutormessage', name='action_data', field=models.JSONField(blank=True, null=True)),
    ]
