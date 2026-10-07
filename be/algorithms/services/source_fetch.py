"""Fetch text from an explicitly approved public URL without exposing the internal network."""

import ipaddress
import json
import re
import socket
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin, urlparse
from xml.etree import ElementTree

import requests
from bs4 import BeautifulSoup

MAX_REDIRECTS = 3
MAX_BYTES = 2 * 1024 * 1024
TIMEOUT = (5, 20)
DISCOVERY_TIMEOUT = (3, 8)
DISCOVERY_SEARCH_URL = 'https://www.bing.com/search'
DISCOVERY_TERMS = {
    'title': 'Vietnamese name',
    'summary': 'overview',
    'objectives': 'learning objectives prerequisites',
    'problem': 'problem statement constraints',
    'inputOutput': 'input output specification',
    'example': 'worked example',
    'theory': 'algorithm explanation correctness proof',
    'pseudocode': 'pseudocode',
    'complexity': 'time space complexity',
    'applications': 'applications limitations common mistakes',
    'references': 'lecture notes references',
}
PREFERRED_DOMAINS = {
    'cp-algorithms.com': 30,
    'geeksforgeeks.org': 24,
    'programiz.com': 20,
    'wikipedia.org': 16,
}
EXCLUDED_DOMAINS = {
    'facebook.com', 'instagram.com', 'linkedin.com', 'pinterest.com',
    'reddit.com', 'tiktok.com', 'x.com', 'youtube.com',
}


class SourceFetchError(ValueError):
    pass


NON_TOPIC_HEADINGS = {
    'learning objectives', 'think it through', 'summary', 'references',
    'review questions', 'key terms', 'introduction', 'exercises',
    'data structure problems', 'graph problems', 'searching', 'sorting',
    'traversal', 'minimum spanning trees', 'shortest paths',
    'weighted shortest path', 'overview', 'the algorithm', 'algorithm',
    'how it works', 'intuition', 'complexity', 'time complexity',
    'space complexity', 'analysis', 'correctness', 'implementation',
    'code', 'pseudocode', 'example', 'examples', 'applications',
    'practice', 'problem', 'steps',
}

VISUALIZER_ALGORITHMS = {
    'searching': {'binarySearch', 'linearSearch'},
    'sorting': {'bubbleSort', 'heapSort', 'insertionSort', 'mergeSort', 'quickSort', 'selectionSort'},
    'graph': {'bellmanFord', 'bfs', 'dfs', 'dijkstra', 'kruskal', 'prim', 'topologicalSort'},
    'datastructure': {'bst', 'heap'},
    'dp': {'editDistance', 'lcs'},
    'pathfinding': {'aStar', 'dijkstraGrid', 'mazeRecursiveBacktracker'},
}


def _visualizer_pseudocode(page_url: str) -> tuple[str, str]:
    """Read pseudocode from the public MIT-licensed source of a client-rendered page."""
    parsed = urlparse(page_url)
    if parsed.hostname != 'algorithm-visualizer.seancoughlin.me':
        return '', ''
    parts = parsed.path.strip('/').split('/')
    if len(parts) != 2 or parts[1] not in VISUALIZER_ALGORITHMS.get(parts[0], set()):
        return '', ''
    category, algorithm = parts
    code_url = (
        'https://raw.githubusercontent.com/Scc33/algorithm-visualizer/main/'
        f'lib/algorithms/{category}/{algorithm}.ts'
    )
    try:
        response = requests.get(code_url, timeout=TIMEOUT, allow_redirects=False)
        response.raise_for_status()
        if len(response.content) > 100_000:
            return '', ''
        match = re.search(r'\bpseudoCode\s*:\s*\[([\s\S]*?)\n\s*\],', response.text)
        if not match:
            return '', ''
        lines = json.loads('[' + match.group(1).strip().rstrip(',') + ']')
        if not isinstance(lines, list) or not all(isinstance(line, str) for line in lines):
            return '', ''
        return '\n'.join(lines), code_url
    except (requests.RequestException, ValueError):
        return '', ''


def extract_topics(headings: list[dict], page_title: str) -> list[str]:
    """Offer specific leaf sections for review, falling back to a single page title."""
    topics, seen = [], set()
    for index, heading in enumerate(headings):
        title = heading['title'].strip()
        if not title or title.casefold() in NON_TOPIC_HEADINGS:
            continue
        following = headings[index + 1:]
        has_child = bool(following and following[0]['level'] > heading['level'])
        if has_child:
            continue
        key = title.casefold()
        if key not in seen:
            topics.append(title)
            seen.add(key)
    if topics:
        return topics[:100]
    fallback = re.split(r'\s+[|–—-]\s+', page_title, maxsplit=1)[0].strip()
    return [fallback] if fallback else []


def _public_host(hostname: str) -> None:
    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)}
    except socket.gaierror as exc:
        raise SourceFetchError('Không phân giải được tên miền nguồn.') from exc
    if not addresses:
        raise SourceFetchError('Tên miền nguồn không có địa chỉ hợp lệ.')
    for value in addresses:
        ip = ipaddress.ip_address(value)
        if not ip.is_global:
            raise SourceFetchError('Nguồn phải nằm trên địa chỉ Internet công khai.')


def _validate_url(url: str, allowed_domain: str) -> str:
    parsed = urlparse(url)
    host = (parsed.hostname or '').rstrip('.').lower()
    domain = allowed_domain.rstrip('.').lower()
    if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise SourceFetchError('Nguồn chỉ được dùng HTTPS cổng chuẩn.')
    if not host or not (host == domain or host.endswith('.' + domain)):
        raise SourceFetchError('URL nằm ngoài tên miền đã được duyệt.')
    _public_host(host)
    return url


def fetch_source_text(url: str, allowed_domain: str, timeout=TIMEOUT) -> dict:
    current = _validate_url(url, allowed_domain)
    session = requests.Session()
    session.headers['User-Agent'] = 'SynapseLab-AlgorithmImporter/1.0'
    for _ in range(MAX_REDIRECTS + 1):
        try:
            response = session.get(current, timeout=timeout, allow_redirects=False, stream=True)
        except requests.RequestException as exc:
            raise SourceFetchError('Không tải được nguồn đã duyệt.') from exc
        if response.is_redirect:
            target = response.headers.get('location')
            response.close()
            if not target:
                raise SourceFetchError('Nguồn chuyển hướng nhưng thiếu địa chỉ đích.')
            current = _validate_url(urljoin(current, target), allowed_domain)
            continue
        if not response.ok:
            response.close()
            raise SourceFetchError(f'Nguồn trả lỗi HTTP {response.status_code}.')
        content_type = response.headers.get('content-type', '').split(';', 1)[0].strip().lower()
        if content_type not in {'text/html', 'text/plain'}:
            response.close()
            raise SourceFetchError('Nguồn phải là trang HTML hoặc văn bản thuần.')
        chunks, size = [], 0
        for chunk in response.iter_content(64 * 1024):
            size += len(chunk)
            if size > MAX_BYTES:
                response.close()
                raise SourceFetchError('Nguồn vượt quá giới hạn 2 MB.')
            chunks.append(chunk)
        body_bytes = b''.join(chunks)
        response.close()
        if content_type == 'text/html':
            # Let BeautifulSoup detect the document charset. Many textbook pages
            # omit it from the HTTP header but declare UTF-8 in the HTML itself.
            soup = BeautifulSoup(body_bytes, 'html.parser')
            for node in soup(['script', 'style', 'nav', 'footer', 'form']):
                node.decompose()
            title = soup.title.get_text(' ', strip=True) if soup.title else current
            headings = [
                {'level': int(node.name[1]), 'title': node.get_text(' ', strip=True)[:200]}
                for node in soup.select('h2, h3, h4, h5')
                if node.get_text(' ', strip=True)
            ][:100]
            text = soup.get_text('\n', strip=True)
        else:
            title, text = current, body_bytes.decode(response.encoding or 'utf-8', errors='replace').strip()
            headings = []
        text = '\n'.join(line for line in (part.strip() for part in text.splitlines()) if line)
        code_source_url = ''
        pseudocode = ''
        if content_type == 'text/html' and 'Pseudocode' not in text:
            pseudocode, code_source_url = _visualizer_pseudocode(current)
            if pseudocode:
                text += f'\nPseudocode (source code: {code_source_url})\n{pseudocode}'
        if len(text) < 200:
            raise SourceFetchError('Nguồn không có đủ nội dung văn bản để quét.')
        return {
            'title': title[:300], 'url': current, 'content': text[:60000],
            'headings': headings, 'topics': extract_topics(headings, title),
            'code_source_url': code_source_url, 'pseudocode': pseudocode,
        }
    raise SourceFetchError('Nguồn chuyển hướng quá nhiều lần.')


def _search_results(query: str, limit: int = 10) -> list[dict]:
    """Return public HTTPS results from Bing's RSS response without an API key."""
    try:
        response = requests.get(
            DISCOVERY_SEARCH_URL,
            params={'q': query, 'format': 'rss', 'count': min(limit, 20)},
            headers={'User-Agent': 'SynapseLab-SourceDiscovery/1.0'},
            timeout=DISCOVERY_TIMEOUT,
        )
        response.raise_for_status()
        if len(response.content) > 1024 * 1024:
            raise SourceFetchError('Kết quả tìm kiếm vượt quá giới hạn cho phép.')
        root = ElementTree.fromstring(response.content)
    except (requests.RequestException, ElementTree.ParseError) as exc:
        raise SourceFetchError('Dịch vụ tìm nguồn đang tạm thời không phản hồi.') from exc

    results = []
    for item in root.findall('.//item'):
        title = (item.findtext('title') or '').strip()
        url = (item.findtext('link') or '').strip()
        parsed = urlparse(url)
        host = (parsed.hostname or '').lower().rstrip('.')
        if parsed.scheme != 'https' or not host or any(host == domain or host.endswith('.' + domain) for domain in EXCLUDED_DOMAINS):
            continue
        if url not in {result['url'] for result in results}:
            results.append({'title': title[:300], 'url': url, 'host': host})
        if len(results) >= limit:
            break
    return results


def _trust_score(host: str) -> tuple[int, str]:
    if host.endswith('.edu') or '.edu.' in host or host.endswith('.ac.uk'):
        return 36, 'Nguồn học thuật'
    for domain, score in PREFERRED_DOMAINS.items():
        if host == domain or host.endswith('.' + domain):
            return score, 'Nguồn kỹ thuật phổ biến'
    return 8, 'Trang kỹ thuật có nội dung đọc được'


def _normalized_words(text: str) -> list[str]:
    text = unicodedata.normalize('NFKD', text).casefold()
    text = ''.join(char for char in text if not unicodedata.combining(char))
    return re.findall(r'[a-z0-9]+', text)


def _topic_relevant(name: str, page: dict) -> bool:
    """Reject readable but unrelated pages before showing them as lesson sources."""
    topic = [word for word in _normalized_words(name) if word not in {'algorithm', 'problem', 'the'}]
    if not topic:
        return False
    title = ' '.join(_normalized_words(page['title']))
    body = ' '.join(_normalized_words(page['content']))
    phrase = ' '.join(topic)
    matched = phrase in title or phrase in body
    if not matched and len(topic) > 1:
        matched = all(word in title.split() for word in topic)
    technical = any(term in body for term in ('algorithm', 'data structure', 'pseudocode', 'runtime', 'complexity'))
    return matched and technical


def _topic_excerpt(name: str, content: str, limit: int = 360) -> str:
    start = content.casefold().find(name.casefold())
    if start < 0:
        return content[:limit]
    return content[max(0, start - 60):max(0, start - 60) + limit]


def discover_algorithm_sources(name: str, category: str, gap_keys: list[str], existing_urls: set[str], limit: int = 3) -> dict:
    terms = ' '.join(DISCOVERY_TERMS.get(key, key) for key in gap_keys[:5])
    query = f'"{name}" algorithm {category} {terms}'.strip()
    candidates = [item for item in _search_results(query, 10) if item['url'] not in existing_urls]

    def inspect(item: dict) -> dict | None:
        try:
            page = fetch_source_text(item['url'], item['host'], timeout=DISCOVERY_TIMEOUT)
        except SourceFetchError:
            return None
        if not _topic_relevant(name, page):
            return None
        host = (urlparse(page['url']).hostname or item['host']).lower().rstrip('.')
        trust, reason = _trust_score(host)
        name_words = {word.lower() for word in name.replace('-', ' ').split() if len(word) > 2}
        title_words = set(page['title'].lower().replace('-', ' ').split())
        score = trust + 4 * len(name_words & title_words) + min(len(page['content']) // 3000, 8)
        return {
            'title': page['title'],
            'url': page['url'],
            'allowed_domain': host,
            'excerpt': _topic_excerpt(name, page['content']),
            'reason': reason,
            'score': score,
        }

    inspected = []
    with ThreadPoolExecutor(max_workers=min(4, len(candidates) or 1)) as executor:
        futures = [executor.submit(inspect, item) for item in candidates]
        for future in as_completed(futures):
            item = future.result()
            if item and item['url'] not in existing_urls:
                inspected.append(item)
    inspected.sort(key=lambda item: (-item['score'], item['title']))
    for item in inspected:
        item.pop('score', None)
    return {'query': query, 'results': inspected[:limit]}
