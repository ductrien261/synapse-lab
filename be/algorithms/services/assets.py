"""Stable lesson image keys, with short-lived URLs generated only for API reads."""
import re

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.files.storage import storages


def asset_key(image):
    if not isinstance(image, str) or not image.startswith('/lesson-assets/'):
        return None
    parts = image[1:].split('/')
    if len(parts) < 3 or any(
        part in {'.', '..'} or not re.fullmatch(r'[A-Za-z0-9_.-]+', part)
        for part in parts
    ):
        raise ValueError('Đường dẫn ảnh bài học không hợp lệ.')
    return '/'.join(parts)


def lesson_asset_storage():
    if not settings.S3_BUCKET:
        raise ImproperlyConfigured('Cần cấu hình S3_BUCKET trước khi upload ảnh.')
    return storages['lesson_assets']


def upload_asset(image, content):
    key = asset_key(image)
    if key is None:
        raise ValueError('Ảnh phải có đường dẫn /lesson-assets/<nhóm>/<tên-file>.')
    storage = lesson_asset_storage()
    if storage.exists(key):
        return False
    saved = storage.save(key, content)
    if saved != key:
        raise ValueError('Storage phải giữ nguyên tên ảnh bài học.')
    return True


def resolve_block_images(blocks):
    if not settings.LESSON_ASSETS_ON_S3:
        return blocks
    storage = None
    urls = {}
    result = []
    for block in blocks:
        item = dict(block)
        key = asset_key(item.get('image', ''))
        # Algorithm diagrams ship with the frontend, including when textbook assets use S3.
        if key and not key.startswith('lesson-assets/algorithms/'):
            if key not in urls:
                if storage is None:
                    storage = lesson_asset_storage()
                urls[key] = storage.url(key)
            item['image_url'] = urls[key]
        result.append(item)
    return result
