import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('classroom', '0007_livesession_resource_selection'),
    ]

    operations = [
        migrations.CreateModel(
            name='SessionWhiteboardSnapshot',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('context_key', models.CharField(max_length=100)),
                ('page', models.PositiveIntegerField(default=1)),
                ('strokes', models.JSONField(blank=True, default=list)),
                ('locked', models.BooleanField(default=True)),
                ('resource', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='whiteboard_snapshots', to='classroom.lessonresource')),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='whiteboard_snapshots', to='classroom.livesession')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='updated_whiteboard_snapshots', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Bản lưu bảng cộng tác',
                'verbose_name_plural': 'Bản lưu bảng cộng tác',
                'ordering': ['session', 'context_key'],
                'constraints': [models.UniqueConstraint(fields=('session', 'context_key'), name='uniq_whiteboard_context_per_session')],
            },
        ),
    ]
