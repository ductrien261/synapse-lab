import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def register_existing_documents(apps, schema_editor):
    Document = apps.get_model('knowledge', 'Document')
    AlgorithmSource = apps.get_model('algorithms', 'AlgorithmSource')
    alias = schema_editor.connection.alias
    for document in Document.objects.using(alias).filter(status='ready', scope='cs').iterator():
        AlgorithmSource.objects.using(alias).get_or_create(
            document_id=document.pk,
            defaults={
                'name': document.title, 'kind': 'document', 'license_name': document.license_name,
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ('algorithms', '0005_algorithmcontent_simulation'),
        ('knowledge', '0002_openstax_sources_and_ingest_jobs'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AlgorithmScanJob',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('queued', 'Chờ chạy'), ('running', 'Đang chạy'), ('done', 'Hoàn tất'), ('failed', 'Lỗi')], db_index=True, default='queued', max_length=20)),
                ('params', models.JSONField(blank=True, default=dict)),
                ('total', models.PositiveIntegerField(default=0)),
                ('processed', models.PositiveIntegerField(default=0)),
                ('succeeded', models.PositiveIntegerField(default=0)),
                ('failed', models.PositiveIntegerField(default=0)),
                ('log', models.JSONField(blank=True, default=list)),
                ('error', models.TextField(blank=True)),
                ('finished_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at'], 'verbose_name': 'Lượt quét nội dung thuật toán', 'verbose_name_plural': 'Lượt quét nội dung thuật toán'},
        ),
        migrations.CreateModel(
            name='AlgorithmSource',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=300)),
                ('kind', models.CharField(choices=[('document', 'Tài liệu trong kho'), ('url', 'Trang web được duyệt')], max_length=20)),
                ('url', models.URLField(blank=True, max_length=600)),
                ('allowed_domain', models.CharField(blank=True, max_length=253)),
                ('license_name', models.CharField(blank=True, max_length=200)),
                ('enabled', models.BooleanField(db_index=True, default=True)),
                ('priority', models.PositiveSmallIntegerField(default=100)),
                ('document', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='algorithm_source', to='knowledge.document')),
            ],
            options={'ordering': ['priority', 'name'], 'verbose_name': 'Nguồn thuật toán', 'verbose_name_plural': 'Nguồn thuật toán'},
        ),
        migrations.CreateModel(
            name='AlgorithmDraftCandidate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('status', models.CharField(choices=[('pending', 'Chờ duyệt'), ('applied', 'Đã áp dụng'), ('discarded', 'Đã bỏ'), ('no_source', 'Không đủ nguồn'), ('failed', 'Lỗi')], db_index=True, default='pending', max_length=20)),
                ('fields', models.JSONField(blank=True, default=dict)),
                ('citations', models.JSONField(blank=True, default=list)),
                ('source_ids', models.JSONField(blank=True, default=list)),
                ('query', models.CharField(blank=True, max_length=500)),
                ('prompt_version', models.CharField(blank=True, max_length=50)),
                ('warnings', models.JSONField(blank=True, default=list)),
                ('error', models.TextField(blank=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('algorithm', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='draft_candidates', to='algorithms.algorithm')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
                ('job', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='candidates', to='algorithms.algorithmscanjob')),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at'], 'verbose_name': 'Đề xuất bài học thuật toán', 'verbose_name_plural': 'Đề xuất bài học thuật toán'},
        ),
        migrations.AddConstraint(
            model_name='algorithmsource',
            constraint=models.CheckConstraint(
                condition=(
                    (models.Q(kind='document', document__isnull=False) & models.Q(url='') & models.Q(allowed_domain=''))
                    | (models.Q(kind='url', document__isnull=True) & ~models.Q(url='') & ~models.Q(allowed_domain=''))
                ),
                name='algorithm_source_has_backing_data',
            ),
        ),
        migrations.RunPython(register_existing_documents, migrations.RunPython.noop),
    ]
