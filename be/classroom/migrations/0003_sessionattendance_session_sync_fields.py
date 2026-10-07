import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('classroom', '0002_classroom_purpose_livesession'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='livesession',
            name='last_synced_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='livesession',
            name='participant_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.CreateModel(
            name='SessionAttendance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('last_joined_at', models.DateTimeField(auto_now=True)),
                ('left_at', models.DateTimeField(blank=True, null=True)),
                ('join_count', models.PositiveIntegerField(default=1)),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attendances', to='classroom.livesession')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='live_attendances', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Lượt tham gia phiên học',
                'verbose_name_plural': 'Lượt tham gia phiên học',
                'ordering': ['joined_at'],
                'constraints': [models.UniqueConstraint(fields=('session', 'user'), name='uniq_session_attendance')],
            },
        ),
    ]
