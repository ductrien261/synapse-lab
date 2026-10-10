from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('classroom', '0006_quiz_slide_runtime'),
    ]

    operations = [
        migrations.RenameField(
            model_name='livesession',
            old_name='bbb_meeting_id',
            new_name='room_name',
        ),
    ]
