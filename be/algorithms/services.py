"""Đồng bộ danh mục thuật toán từ algo-server vào database."""

import requests
from django.conf import settings
from django.utils import timezone

from .models import Algorithm, AlgorithmCategory

CATEGORY_VI = {
    'backtracking': 'Quay lui',
    'branch-and-bound': 'Nhánh cận',
    'brute-force': 'Vét cạn',
    'divide-and-conquer': 'Chia để trị',
    'dynamic-programming': 'Quy hoạch động',
    'greedy': 'Tham lam',
    'simple-recursive': 'Đệ quy',
    'uncategorized': 'Khác',
}


def sync_from_algo_server(timeout: float = 15) -> dict:
    res = requests.get(f"{settings.ALGO_SERVER_URL.rstrip('/')}/algorithms/", timeout=timeout)
    res.raise_for_status()
    categories = res.json().get('categories', [])

    now = timezone.now()
    stats = {'categories': 0, 'created': 0, 'updated': 0}
    for order, cat in enumerate(categories):
        category, _ = AlgorithmCategory.objects.update_or_create(
            key=cat['key'],
            defaults={'name_en': cat['name'], 'order': order},
        )
        if not category.name_vi and cat['key'] in CATEGORY_VI:
            category.name_vi = CATEGORY_VI[cat['key']]
            category.save(update_fields=['name_vi'])
        stats['categories'] += 1

        for algo in cat.get('algorithms', []):
            _, created = Algorithm.objects.update_or_create(
                category=category,
                key=algo['key'],
                defaults={'name': algo['name'], 'last_synced_at': now},
            )
            stats['created' if created else 'updated'] += 1
    return stats
