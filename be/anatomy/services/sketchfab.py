"""
Lấy thông tin mô hình từ Sketchfab Data API (công khai, không cần key).

Lưu ý: danh sách chú thích (1), (2)... KHÔNG có trong Data API — chỉ lấy được qua
Sketchfab Viewer API chạy trong trình duyệt (getAnnotationList). Vì vậy frontend
đọc chú thích rồi gửi lên backend (xem API POST /api/anatomy/models/<uid>/annotations/).
"""

import re

import requests

API_URL = 'https://api.sketchfab.com/v3/models/{uid}'
UID_RE = re.compile(r'(?<![0-9a-f])([0-9a-f]{32})(?![0-9a-f])')


class SketchfabError(Exception):
    pass


def parse_uid(value: str) -> str | None:
    """Nhận link embed / link trang / mã 32 ký tự -> trả về mã mô hình."""
    match = UID_RE.search((value or '').lower())
    return match.group(1) if match else None


def _best_thumbnail(thumbnails: dict) -> str:
    images = sorted((thumbnails or {}).get('images', []), key=lambda i: i.get('width', 0))
    # ảnh rộng khoảng 640px là đủ cho thẻ danh sách
    for image in images:
        if image.get('width', 0) >= 640:
            return image.get('url', '')
    return images[-1]['url'] if images else ''


def fetch_model_metadata(uid: str, timeout: float = 10) -> dict:
    try:
        res = requests.get(API_URL.format(uid=uid), timeout=timeout)
    except requests.RequestException as exc:
        raise SketchfabError(f'Không kết nối được Sketchfab: {exc}') from exc
    if res.status_code == 404:
        raise SketchfabError('Không tìm thấy mô hình trên Sketchfab.')
    if not res.ok:
        raise SketchfabError(f'Sketchfab trả lỗi {res.status_code}.')

    data = res.json()
    user = data.get('user') or {}
    license_ = data.get('license') or {}
    return {
        'title': data.get('name', '')[:300],
        'description': data.get('description', '') or '',
        'tags': [t.get('name') for t in data.get('tags', []) if t.get('name')],
        'author_name': user.get('displayName') or user.get('username', ''),
        'author_url': user.get('profileUrl') or (f"https://sketchfab.com/{user['username']}" if user.get('username') else ''),
        'license_label': license_.get('label', ''),
        'license_url': license_.get('url', ''),
        'thumbnail_url': _best_thumbnail(data.get('thumbnails')),
    }
