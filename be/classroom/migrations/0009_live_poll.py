import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('classroom', '0008_sessionwhiteboardsnapshot'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='LivePoll',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('question', models.CharField(max_length=500)),
                ('options', models.JSONField(default=list)),
                ('duration_seconds', models.PositiveSmallIntegerField(default=60)),
                ('is_anonymous', models.BooleanField(default=True)),
                ('status', models.CharField(choices=[('open', 'Đang nhận phản hồi'), ('closed', 'Đã công bố kết quả'), ('dismissed', 'Đã đóng')], default='open', max_length=12)),
                ('opened_at', models.DateTimeField(auto_now_add=True)),
                ('closes_at', models.DateTimeField()),
                ('closed_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='created_live_polls', to=settings.AUTH_USER_MODEL)),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='polls', to='classroom.livesession')),
            ],
            options={'verbose_name': 'Khảo sát trực tiếp', 'verbose_name_plural': 'Khảo sát trực tiếp', 'ordering': ['-opened_at']},
        ),
        migrations.CreateModel(
            name='LivePollResponse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('selected_option', models.PositiveSmallIntegerField()),
                ('submitted_at', models.DateTimeField(auto_now_add=True)),
                ('poll', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='responses', to='classroom.livepoll')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='poll_responses', to=settings.AUTH_USER_MODEL)),
            ],
            options={'verbose_name': 'Phản hồi khảo sát', 'verbose_name_plural': 'Phản hồi khảo sát', 'ordering': ['submitted_at']},
        ),
        migrations.AddConstraint(
            model_name='livepoll',
            constraint=models.UniqueConstraint(condition=models.Q(('status', 'open')), fields=('session',), name='uniq_open_poll_per_session'),
        ),
        migrations.AddConstraint(
            model_name='livepollresponse',
            constraint=models.UniqueConstraint(fields=('poll', 'user'), name='uniq_poll_response_per_user'),
        ),
    ]
