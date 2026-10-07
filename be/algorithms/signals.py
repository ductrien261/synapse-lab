"""Keep the algorithm source registry in sync with reusable knowledge documents."""

from django.db.models.signals import post_save
from django.dispatch import receiver

from knowledge.models import Document

from .models import AlgorithmSource


@receiver(post_save, sender=Document)
def register_ready_document(sender, instance: Document, **kwargs):
    if instance.status != Document.Status.READY or instance.scope != Document.Scope.CS:
        AlgorithmSource.objects.filter(document=instance).update(enabled=False)
        return
    AlgorithmSource.objects.update_or_create(
        document=instance,
        defaults={
            'name': instance.title,
            'kind': AlgorithmSource.Kind.DOCUMENT,
            'url': '',
            'allowed_domain': '',
            'license_name': instance.license_name,
            'enabled': True,
        },
    )
