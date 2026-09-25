"""
Đọc dữ liệu từ AnatomyTOOL (anatomytool.org) — nguồn mô hình 3D giải phẫu mở.

Tuân thủ robots.txt của họ:
- Crawl-delay: 10  -> mỗi request cách nhau ít nhất 10 giây
- Chỉ đọc trang công khai (/collections, /content/...), không đụng vùng bị cấm

Các hàm parse_* nhận HTML (chuỗi) để test được bằng file mẫu, không cần mạng.
"""

import re
import threading
import time
from dataclasses import dataclass, field
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from .sketchfab import parse_uid

BASE_URL = 'https://anatomytool.org'
COLLECTIONS_URL = f'{BASE_URL}/collections'
LIBRARY_URL = f'{BASE_URL}/interactive'  # thư viện "3D models, games"
MAX_LIBRARY_PAGES = 40
CRAWL_DELAY = 10  # giây, theo robots.txt
USER_AGENT = 'SYNAPSE-LAB/1.0 (educational project, VKU; respects robots.txt crawl-delay)'

CONTENT_RE = re.compile(r'^/content/[^/?#]+$')
SKETCHFAB_RE = re.compile(r'sketchfab\.com/(?:models|3d-models)/', re.I)


class AnatomyToolError(Exception):
    pass


# ------------------------------------------------------------
# Tải trang (dùng chung 1 "cổng" để đảm bảo khoảng cách 10 giây)
# ------------------------------------------------------------

_lock = threading.Lock()
_last_request_at = 0.0


def fetch(url: str, timeout: float = 30) -> str:
    global _last_request_at
    with _lock:
        wait = CRAWL_DELAY - (time.monotonic() - _last_request_at)
        if wait > 0:
            time.sleep(wait)
        try:
            res = requests.get(url, headers={'User-Agent': USER_AGENT}, timeout=timeout)
        except requests.RequestException as exc:
            raise AnatomyToolError(f'Không tải được {url}: {exc}') from exc
        finally:
            _last_request_at = time.monotonic()
    if not res.ok:
        raise AnatomyToolError(f'{url} trả lỗi {res.status_code}')
    return res.text


def _abs(href: str) -> str:
    url = urljoin(BASE_URL, href.split('#')[0].split('?')[0])
    return url.rstrip('/')


def _is_content(url: str) -> bool:
    return url.startswith(BASE_URL) and bool(CONTENT_RE.match(url[len(BASE_URL):]))


def _text(el) -> str:
    return re.sub(r'\s+', ' ', el.get_text(' ', strip=True)) if el else ''


# ------------------------------------------------------------
# Trang danh mục /collections
# ------------------------------------------------------------

@dataclass
class CollectionLink:
    url: str
    title: str


def parse_collections_index(html: str) -> list[CollectionLink]:
    """Lấy danh sách trang Collection. Ưu tiên link có chữ 'collection' trong đường dẫn."""
    soup = BeautifulSoup(html, 'html.parser')
    main = soup.find('section', id='content') or soup
    found: dict[str, CollectionLink] = {}
    for a in main.find_all('a', href=True):
        url = _abs(a['href'])
        slug = url.rsplit('/', 1)[-1].lower()
        # Chỉ lấy trang Collection thật (vd. heart-collection-page), bỏ trang /content/collections chung
        if not _is_content(url) or 'collection' not in slug or slug == 'collections':
            continue
        title = _text(a)
        if url not in found or (title and not found[url].title):
            found[url] = CollectionLink(url=url, title=title)
    for item in found.values():
        if not item.title:
            item.title = item.url.rsplit('/', 1)[-1].replace('-', ' ').title()
        item.title = re.sub(r'\s*-?\s*Collection Page\s*$', '', item.title, flags=re.I).strip(' "“”')
    return list(found.values())


# ------------------------------------------------------------
# Trang Collection (vd. /content/heart-collection-page)
# ------------------------------------------------------------

@dataclass
class CollectionItem:
    url: str
    title: str
    group: str = ''

    @property
    def looks_3d(self) -> bool:
        haystack = f'{self.url} {self.title}'.lower()
        return '3d' in haystack or 'sketchfab' in haystack


@dataclass
class CollectionPage:
    title: str
    items: list[CollectionItem] = field(default_factory=list)

    @property
    def candidates(self) -> list[CollectionItem]:
        return [i for i in self.items if i.looks_3d]


def parse_collection_page(html: str, page_url: str = '') -> CollectionPage:
    soup = BeautifulSoup(html, 'html.parser')
    title = _text(soup.find('title')).split('|')[0].strip()
    title = re.sub(r'\s*-\s*Collection Page\s*$', '', title, flags=re.I)

    items: dict[str, CollectionItem] = {}
    article = soup.find('article') or soup
    groups = article.select('.subject_link_group') or [article]
    for group in groups:
        group_title = _text(group.select_one('.subject_link_group_title'))
        for a in group.find_all('a', href=True):
            url = _abs(a['href'])
            if not _is_content(url) or url == page_url.rstrip('/'):
                continue
            text = _text(a)
            if url in items:
                if text and not items[url].title:
                    items[url].title = text
                continue
            items[url] = CollectionItem(url=url, title=text, group=group_title)
    return CollectionPage(title=title, items=list(items.values()))


# ------------------------------------------------------------
# Trang một mục (vd. /content/dundee-3d-model-cardiac-veins)
# ------------------------------------------------------------

@dataclass
class ItemPage:
    url: str
    title: str
    sketchfab_uid: str | None
    nid: str = ''
    description: str = ''
    structures_latin: list[str] = field(default_factory=list)
    creators: str = ''
    institution: str = ''
    license_text: str = ''

    def as_meta(self) -> dict:
        return {
            'source': 'anatomytool',
            'nid': self.nid,
            'title': self.title,
            'description': self.description,
            'structures_latin': self.structures_latin,
            'creators': self.creators,
            'institution': self.institution,
            'license_text': self.license_text,
        }


def _labelled_block(soup, label: str):
    """Tìm khối <div class="nodeDescription"><strong>Label:</strong>...</div>."""
    for strong in soup.find_all('strong'):
        if _text(strong).rstrip(':').strip().lower() == label.lower():
            return strong.parent
    return None


def parse_item_page(html: str, url: str) -> ItemPage:
    soup = BeautifulSoup(html, 'html.parser')
    title = _text(soup.find('title')).split('|')[0].strip()

    uid = None
    for a in soup.find_all(['a', 'iframe'], href=True) + soup.find_all('iframe', src=True):
        link = a.get('href') or a.get('src') or ''
        if SKETCHFAB_RE.search(link):
            uid = parse_uid(link)
            if uid:
                break

    article = soup.find('article')
    nid = article.get('data-nid', '') if article else ''

    desc_block = _labelled_block(soup, 'Description')
    description = _text(desc_block).split(':', 1)[-1].strip() if desc_block else ''

    structures: list[str] = []
    struct_block = _labelled_block(soup, 'Anatomical structures in item')
    if struct_block:
        structures = [t for t in (_text(i) for i in struct_block.find_all('i')) if t]
        # thẻ <i> ngoài cùng bọc tất cả -> bỏ các chuỗi gộp
        structures = [s for s in dict.fromkeys(structures) if len(s) < 120 and '  ' not in s]
        if len(structures) > 1 and all(s in structures[0] for s in structures[1:]):
            structures = structures[1:]

    creators_block = soup.select_one('.credits:not(.serif)')
    creators = _text(creators_block).split(':', 1)[-1].strip() if creators_block else ''
    institution = _text(soup.select_one('span.institution'))

    license_block = soup.select_one('.requirementsForUsage')
    license_text = _text(license_block).split(':', 1)[-1].strip() if license_block else ''

    return ItemPage(
        url=url,
        title=title,
        sketchfab_uid=uid,
        nid=nid,
        description=description,
        structures_latin=structures,
        creators=creators,
        institution=institution,
        license_text=license_text[:500],
    )


# ------------------------------------------------------------
# Thư viện "3D models, games" (/interactive?page=N), 50 mục mỗi trang
# ------------------------------------------------------------

NID_RE = re.compile(r'clickDataItem\((\d+)\)')
BG_RE = re.compile(r'url\(([^)]+)\)')
PAGE_RE = re.compile(r'[?&]page=(\d+)')


@dataclass
class LibraryItem:
    nid: str
    title: str
    thumbnail_url: str = ''


def library_url(page: int) -> str:
    return LIBRARY_URL if page == 0 else f'{LIBRARY_URL}?page={page}'


def node_url(nid: str) -> str:
    return f'{BASE_URL}/node/{nid}'


def parse_library_page(html: str) -> tuple[list[LibraryItem], int]:
    """Trả về (các mục trên trang, số trang cuối theo thanh phân trang; 0 nếu chỉ có 1 trang)."""
    soup = BeautifulSoup(html, 'html.parser')
    items: dict[str, LibraryItem] = {}
    for a in soup.select('a.itemWrapper'):
        m = NID_RE.search(a.get('ng-click', ''))
        if not m:
            continue
        title = (a.get('title') or '').strip() or _text(a.select_one('.title'))
        bg = BG_RE.search(a.get('style', ''))
        thumb = bg.group(1).strip('\'" ') if bg else ''
        items.setdefault(m.group(1), LibraryItem(nid=m.group(1), title=title[:400], thumbnail_url=thumb[:500]))
    last = 0
    for a in soup.find_all('a', href=True):
        if a['href'].split('?')[0].rstrip('/').endswith('/interactive'):
            pm = PAGE_RE.search(a['href'])
            if pm:
                last = max(last, int(pm.group(1)))
    return list(items.values()), min(last, MAX_LIBRARY_PAGES)
