"""
Nguồn OpenStax (sách giáo khoa mở): đọc trang web sách thay vì PDF.
- Mục lục: có sẵn trong HTML mỗi trang (biến __PRELOADED_STATE__) -> 1 lần tải là có cả cây chương/bài
- Nội dung: tách theo thẻ tiêu đề h2/h3/h4 -> đường dẫn tiêu đề rõ ràng, không phải đoán
- Trích dẫn: link có neo (#id) tới đúng tiểu mục trên openstax.org

Lịch sự với máy chủ: đọc robots.txt, tôn trọng crawl-delay, tối thiểu 3 giây/lần tải.
"""

import json
import re
import threading
import time
import urllib.robotparser
from dataclasses import dataclass

import requests
from bs4 import BeautifulSoup, Tag

from .chunking import Section

BASE = 'https://openstax.org'
USER_AGENT = 'SYNAPSE-LAB/1.0 (educational project, VKU)'
MIN_DELAY = 3.0
HEADINGS = ['h1', 'h2', 'h3', 'h4']
TEXT_TAGS = ('p', 'li', 'figcaption', 'td', 'dt', 'dd')
SKIP_SELECTORS = [
    'script', 'style', 'noscript', 'nav', 'header', 'footer', 'button', 'svg',
    '[data-type="glossary"]', '[data-type="review-questions"]', '[data-type="critical-thinking"]',
    '[data-type="interactive-link"]', '.os-problem-container', '.os-solution-container',
]
BOOK_RE = re.compile(r'openstax\.org/(?:details/)?books/([\w-]+)(?:/pages/([\w-]+))?', re.I)
CONTENT_PAGE_RE = re.compile(r'^(\d+-\d+-|\d+-introduction$|introduction$)')


class OpenStaxError(Exception):
    pass


@dataclass
class BookRef:
    slug: str
    page: str | None = None


# ------------------------------------------------------------
# Tải trang (tôn trọng robots.txt + giãn cách)
# ------------------------------------------------------------

_lock = threading.Lock()
_state: dict = {'last': 0.0, 'robots': None}


def _robots() -> urllib.robotparser.RobotFileParser | None:
    if _state['robots'] is None:
        parser = urllib.robotparser.RobotFileParser(f'{BASE}/robots.txt')
        try:
            parser.read()
        except Exception:  # noqa: BLE001 - không đọc được robots thì vẫn giãn cách tối thiểu
            parser = False
        _state['robots'] = parser
    return _state['robots'] or None


def page_url(book: str, page: str) -> str:
    return f'{BASE}/books/{book}/pages/{page}'


def fetch(url: str) -> str:
    with _lock:
        robots = _robots()
        if robots is not None and robots.mtime() and not robots.can_fetch(USER_AGENT, url):
            raise OpenStaxError(f'robots.txt không cho phép đọc {url}')
        delay = max(MIN_DELAY, float((robots.crawl_delay(USER_AGENT) if robots else None) or 0))
        wait = delay - (time.monotonic() - _state['last'])
        if wait > 0:
            time.sleep(wait)
        try:
            res = requests.get(url, headers={'User-Agent': USER_AGENT}, timeout=30)
        except requests.RequestException as exc:
            raise OpenStaxError(f'Không tải được {url}: {exc.__class__.__name__}') from exc
        finally:
            _state['last'] = time.monotonic()
    if res.status_code == 404:
        raise OpenStaxError(f'Không tìm thấy trang {url}')
    if not res.ok:
        raise OpenStaxError(f'OpenStax trả lỗi {res.status_code} cho {url}')
    return res.text


# ------------------------------------------------------------
# Mục lục sách
# ------------------------------------------------------------

def parse_book_ref(url: str) -> BookRef:
    m = BOOK_RE.search(url or '')
    if not m:
        raise OpenStaxError('Link không phải sách OpenStax (dạng https://openstax.org/books/<tên-sách>/...).')
    return BookRef(slug=m.group(1).lower(), page=m.group(2))


def _clean(text: str) -> str:
    return re.sub(r'\s+', ' ', text or '').strip()


def _html_text(html: str) -> str:
    return _clean(BeautifulSoup(html or '', 'html.parser').get_text(' '))


def _preloaded_state(html: str) -> dict:
    marker = '__PRELOADED_STATE__ = '
    start = html.find(marker)
    if start < 0:
        raise OpenStaxError('Trang không có dữ liệu mục lục (OpenStax có thể đã đổi cấu trúc).')
    try:
        state, _ = json.JSONDecoder().raw_decode(html[start + len(marker):])
    except json.JSONDecodeError as exc:
        raise OpenStaxError('Không đọc được dữ liệu mục lục.') from exc
    return state


def _page(node: dict) -> dict:
    slug = node.get('slug', '')
    return {
        'slug': slug,
        'title': _html_text(node.get('title', '')) or slug,
        # content = bài học chính; extra = thuật ngữ, câu hỏi ôn tập... (mặc định không chọn)
        'kind': 'content' if CONTENT_PAGE_RE.match(slug) else 'extra',
    }


def flatten_toc(tree: dict) -> list[dict]:
    """
    Cây mục lục OpenStax (Sách › Phần › Chương › Bài) -> danh sách chương:
    [{key, title, unit, pages: [{slug, title, kind}]}]. Trang lẻ (Lời nói đầu, Phụ lục...) gom vào 'Khác'.
    """
    chapters: list[dict] = []
    loose: list[dict] = []

    def visit(node: dict, unit: str, is_root: bool):
        kids = node.get('contents') or []
        if kids and all(not k.get('contents') for k in kids) and not is_root:
            chapters.append({
                'key': node.get('slug') or node.get('id', ''),
                'title': _html_text(node.get('title', '')),
                'unit': unit,
                'pages': [_page(k) for k in kids],
            })
            return
        title = '' if is_root else _html_text(node.get('title', ''))
        for kid in kids:
            if kid.get('contents'):
                visit(kid, title or unit, False)
            else:
                loose.append(_page(kid))

    visit(tree, '', True)
    if loose:
        chapters.append({'key': 'other', 'title': 'Khác (lời nói đầu, phụ lục...)', 'unit': '', 'pages': loose})
    return chapters


def parse_book_info(html: str, slug: str) -> dict:
    book = _preloaded_state(html).get('content', {}).get('book') or {}
    tree = book.get('tree')
    if not tree:
        raise OpenStaxError('Không tìm thấy mục lục sách trong trang.')
    license_ = book.get('license') or {}
    return {
        'slug': book.get('slug') or slug,
        'title': _html_text(book.get('title', '')) or slug,
        'url': f'{BASE}/details/books/{book.get("slug") or slug}',
        'license_name': license_.get('name', ''),
        'license_url': license_.get('url', ''),
        'toc': flatten_toc(tree),
    }


def load_book(url: str) -> dict:
    """Tải 1 trang của sách để lấy mục lục. Link trang cụ thể -> dùng luôn; link sách -> thử trang mở đầu."""
    ref = parse_book_ref(url)
    candidates = [ref.page] if ref.page else ['preface', '1-introduction']
    last_error: OpenStaxError | None = None
    for page in candidates:
        try:
            return parse_book_info(fetch(page_url(ref.slug, page)), ref.slug)
        except OpenStaxError as exc:
            last_error = exc
    raise last_error or OpenStaxError('Không đọc được sách.')


def find_page(toc: list[dict], slug: str) -> tuple[dict, dict] | None:
    for chapter in toc:
        for page in chapter['pages']:
            if page['slug'] == slug:
                return chapter, page
    return None


# ------------------------------------------------------------
# Nội dung 1 trang -> các Section theo tiêu đề
# ------------------------------------------------------------

def _content_root(soup: BeautifulSoup) -> Tag:
    for selector in ['[data-type="page"]', 'div.book-content', 'main', 'article', 'body']:
        el = soup.select_one(selector)
        if el is not None:
            return el
    return soup


def parse_page(html: str, url: str, chapter_title: str = '', page_title: str = '') -> list[Section]:
    soup = BeautifulSoup(html, 'html.parser')
    root = _content_root(soup)
    for sel in SKIP_SELECTORS:
        for el in root.select(sel):
            el.decompose()

    first_heading = root.find(HEADINGS)
    if not page_title:
        page_title = _clean((first_heading or soup.find('title') or soup).get_text(' ')).split('|')[0].strip()
    prefix = [chapter_title] if chapter_title else []

    sections: list[Section] = []
    path: list[str] = [page_title]
    anchor = ''
    buffer: list[str] = []
    top_level: int | None = None

    def flush():
        text = _clean(' '.join(buffer))
        buffer.clear()
        if len(text) < 40:
            return
        sections.append(Section(heading_path=prefix + path, text=text, url=f'{url}#{anchor}' if anchor else url))

    for el in root.descendants:
        if not isinstance(el, Tag):
            continue
        if el.name in HEADINGS:
            title = _clean(el.get_text(' '))
            if not title:
                continue
            if top_level is None:
                top_level = int(el.name[1])
                continue  # tiêu đề trang
            flush()
            depth = max(1, int(el.name[1]) - top_level)
            path = path[:depth] + [title]
            owner = el if el.get('id') else el.find_parent(attrs={'id': True})
            anchor = owner.get('id', '') if owner else ''
        elif el.name in TEXT_TAGS:
            if el.find_parent(list(TEXT_TAGS)) is not None:
                continue  # tránh lấy trùng khi thẻ lồng nhau (li chứa p)
            text = el.get_text(' ')
            buffer.append(f'[Hình] {text}' if el.name == 'figcaption' else text)
    flush()
    return sections
