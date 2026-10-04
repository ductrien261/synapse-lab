import uuid

import classroom.models
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('anatomy', '0004_anatomytool_library'),
        ('classroom', '0003_sessionattendance_session_sync_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='LessonPlan',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('subject', models.CharField(choices=[('anatomy', 'Giải phẫu')], default='anatomy', max_length=30)),
                ('title', models.CharField(max_length=250)),
                ('objective', models.TextField(blank=True)),
                ('classroom', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='lesson_plan', to='classroom.classroom')),
            ],
            options={'verbose_name': 'Kế hoạch bài dạy', 'verbose_name_plural': 'Kế hoạch bài dạy'},
        ),
        migrations.CreateModel(
            name='LessonSection',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=250)),
                ('objective', models.TextField(blank=True)),
                ('teacher_notes', models.TextField(blank=True)),
                ('duration_minutes', models.PositiveSmallIntegerField(default=10)),
                ('position', models.PositiveIntegerField(default=0)),
                ('plan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sections', to='classroom.lessonplan')),
            ],
            options={'verbose_name': 'Phần bài dạy', 'verbose_name_plural': 'Phần bài dạy', 'ordering': ['position', 'created_at']},
        ),
        migrations.CreateModel(
            name='LessonResource',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('kind', models.CharField(choices=[('slide', 'Slide'), ('pdf', 'PDF'), ('doc', 'Tài liệu'), ('model_3d', 'Mô hình 3D'), ('quiz', 'Quiz'), ('video', 'Video'), ('link', 'Liên kết')], max_length=20)),
                ('title', models.CharField(max_length=300)),
                ('description', models.TextField(blank=True)),
                ('file', models.FileField(blank=True, upload_to=classroom.models.lesson_resource_upload_path)),
                ('external_url', models.URLField(blank=True, max_length=600)),
                ('duration_minutes', models.PositiveSmallIntegerField(default=10)),
                ('position', models.PositiveIntegerField(default=0)),
                ('visible_to_students', models.BooleanField(default=True)),
                ('allow_download', models.BooleanField(default=False)),
                ('show_page_number', models.BooleanField(default=True)),
                ('learning_objectives', models.JSONField(blank=True, default=list)),
                ('tags', models.JSONField(blank=True, default=list)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('anatomy_model', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='lesson_resources', to='anatomy.anatomymodel')),
                ('section', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='resources', to='classroom.lessonsection')),
            ],
            options={'verbose_name': 'Tài nguyên bài dạy', 'verbose_name_plural': 'Tài nguyên bài dạy', 'ordering': ['position', 'created_at']},
        ),
        migrations.CreateModel(
            name='LessonQuiz',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('question', models.TextField()),
                ('options', models.JSONField(default=list)),
                ('correct_option', models.PositiveSmallIntegerField(default=0)),
                ('duration_seconds', models.PositiveSmallIntegerField(default=60)),
                ('trigger_mode', models.CharField(choices=[('manual', 'Giáo viên phát thủ công'), ('after_resource', 'Sau tài liệu'), ('at_minute', 'Tại mốc thời gian')], default='manual', max_length=20)),
                ('trigger_minute', models.PositiveSmallIntegerField(default=0)),
                ('delay_seconds', models.PositiveSmallIntegerField(default=0)),
                ('success_threshold', models.PositiveSmallIntegerField(default=70)),
                ('resource', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='quiz', to='classroom.lessonresource')),
            ],
            options={'verbose_name': 'Cấu hình quiz', 'verbose_name_plural': 'Cấu hình quiz'},
        ),
    ]
