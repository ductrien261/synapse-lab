import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('classroom', '0005_lessonresource_preview'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lessonquiz',
            name='trigger_mode',
            field=models.CharField(
                choices=[
                    ('manual', 'Giáo viên phát thủ công'),
                    ('after_resource', 'Sau tài liệu'),
                    ('at_minute', 'Tại mốc thời gian'),
                    ('at_slide', 'Khi tới slide'),
                ],
                default='manual',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='lessonquiz',
            name='trigger_resource',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='triggered_quizzes',
                to='classroom.lessonresource',
            ),
        ),
        migrations.AddField(
            model_name='lessonquiz',
            name='trigger_slide_number',
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.CreateModel(
            name='LiveQuizRun',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('open', 'Đang nhận câu trả lời'), ('closed', 'Đã đóng')], default='open', max_length=10)),
                ('opened_at', models.DateTimeField(auto_now_add=True)),
                ('closes_at', models.DateTimeField()),
                ('closed_at', models.DateTimeField(blank=True, null=True)),
                ('quiz', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='live_runs', to='classroom.lessonquiz')),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_runs', to='classroom.livesession')),
                ('started_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='started_quiz_runs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Lượt chạy quiz',
                'verbose_name_plural': 'Lượt chạy quiz',
                'ordering': ['-opened_at'],
            },
        ),
        migrations.CreateModel(
            name='LiveQuizResponse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('selected_option', models.PositiveSmallIntegerField()),
                ('is_correct', models.BooleanField(default=False)),
                ('submitted_at', models.DateTimeField(auto_now_add=True)),
                ('run', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='responses', to='classroom.livequizrun')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_responses', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Câu trả lời quiz',
                'verbose_name_plural': 'Câu trả lời quiz',
                'ordering': ['submitted_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='livequizrun',
            constraint=models.UniqueConstraint(fields=('session', 'quiz'), name='uniq_quiz_run_per_session'),
        ),
        migrations.AddConstraint(
            model_name='livequizresponse',
            constraint=models.UniqueConstraint(fields=('run', 'user'), name='uniq_quiz_response_per_user'),
        ),
    ]
