from django.apps import AppConfig


class AlgorithmsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'algorithms'
    verbose_name = 'Thuật toán'

    def ready(self):
        from . import signals  # noqa: F401
