"""Keep tutor message inserts compatible with databases that already have this column."""

from django.db import migrations, models


def ensure_feedback_reviewed(apps, schema_editor):
    table = apps.get_model('tutor', 'TutorMessage')._meta.db_table
    with schema_editor.connection.cursor() as cursor:
        columns = {column.name for column in schema_editor.connection.introspection.get_table_description(cursor, table)}
    if 'feedback_reviewed' not in columns:
        quote = schema_editor.quote_name
        schema_editor.execute(
            f'ALTER TABLE {quote(table)} ADD COLUMN {quote("feedback_reviewed")} boolean NOT NULL DEFAULT false',
        )


class Migration(migrations.Migration):
    dependencies = [('tutor', '0001_initial')]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[migrations.RunPython(ensure_feedback_reviewed, migrations.RunPython.noop)],
            state_operations=[
                migrations.AddField(
                    model_name='tutormessage', name='feedback_reviewed',
                    field=models.BooleanField(default=False),
                ),
            ],
        ),
    ]
