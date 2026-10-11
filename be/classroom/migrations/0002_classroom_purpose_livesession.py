import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('classroom', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='classroom',
            name='purpose',
            field=models.CharField(
                choices=[
                    ('study', 'Tự học tập trung'),
                    ('group', 'Học nhóm'),
                    ('presentation', 'Mock presentation'),
                    ('teaching', 'Buổi hướng dẫn'),
                ],
                default='group',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='LiveSession',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=200)),
                ('room_name', models.CharField(editable=False, max_length=100, unique=True)),
                ('status', models.CharField(choices=[('live', 'Đang diễn ra'), ('ended', 'Đã kết thúc')], default='live', max_length=10)),
                ('record', models.BooleanField(default=False)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('ended_at', models.DateTimeField(blank=True, null=True)),
                ('classroom', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sessions', to='classroom.classroom')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='created_live_sessions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Phiên học trực tiếp',
                'verbose_name_plural': 'Phiên học trực tiếp',
                'ordering': ['-started_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='livesession',
            constraint=models.UniqueConstraint(condition=models.Q(('status', 'live')), fields=('classroom',), name='uniq_live_session_per_classroom'),
        ),
    ]
