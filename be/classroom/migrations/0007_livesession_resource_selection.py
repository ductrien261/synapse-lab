from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classroom', '0006_quiz_slide_runtime'),
    ]

    operations = [
        migrations.AddField(
            model_name='livesession',
            name='uses_resource_selection',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='livesession',
            name='selected_resources',
            field=models.ManyToManyField(blank=True, related_name='selected_for_sessions', to='classroom.lessonresource'),
        ),
    ]
