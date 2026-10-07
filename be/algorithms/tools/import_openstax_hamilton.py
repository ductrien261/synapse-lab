"""Download OpenStax source blocks and images for explicit database import."""
import json
import re
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# Use the same storage configuration as the backend, including Docker env vars.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()
from django.conf import settings
from django.core.files.base import ContentFile
from algorithms.services.assets import upload_asset

ROOT = Path(__file__).resolve().parents[1] / 'data' / 'references' / 'openstax-hamilton'
ASSETS = ROOT / 'assets'
ROOT.mkdir(parents=True, exist_ok=True)
if not settings.LESSON_ASSETS_ON_S3:
    ASSETS.mkdir(parents=True, exist_ok=True)
ATTR = ('Donna Kirk, Contemporary Mathematics, OpenStax / Rice University. '
        'Original English content extracted and formatted by Synapse Lab; CC BY-NC-SA 4.0. '
        'Access for free at https://openstax.org/books/contemporary-mathematics/pages/1-introduction')
blocks, downloads = [], {}


def plain(node):
    if node is None:
        return ''
    clone = BeautifulSoup(str(node), 'html.parser')
    for item in clone.select('figure, button, summary, [data-type="solution-title"], .os-number, .os-divider'):
        item.decompose()
    for math in clone.find_all('math'):
        tex = math.find('annotation', encoding='application/x-tex')
        if tex:
            text = tex.get_text()
        else:
            for annotation in math.find_all(['annotation', 'annotation-xml']):
                annotation.decompose()
            text = math.get_text('', strip=True)
        math.replace_with(text)
    for br in clone.find_all('br'):
        br.replace_with('\n')
    for li in clone.find_all('li'):
        li.insert_before('\n• ')
        li.append('\n')
    return re.sub(r' *\n *', '\n', clone.get_text(' ', strip=True)).strip()


def label(node):
    return node.get_text(' ', strip=True) if node else ''


def new_block(kind, title, text, node_id, source, solution=''):
    item = dict(id=f'os-src-{source.rsplit("/", 1)[-1]}-{node_id}', kind=kind,
                title=title, text=text, image='', alt='', caption='', source=source,
                attribution=ATTR, answerType='essay', options='', answer='', hint='', solution=solution)
    blocks.append(item)
    return item


def attach_images(item, node, source):
    images = node.find_all('img')
    for i, image in enumerate(images):
        url = urljoin(source, image.get('src', ''))
        if not image.get('src'):
            continue
        resource = Path(urlparse(url).path).name
        filename = resource + '.webp'
        downloads[url] = filename
        target = item if i == 0 else new_block(item['kind'], item['title'] + f' — Image {i + 1}',
                                              item['text'], item['id'].split(source.rsplit('/', 1)[-1] + '-', 1)[1] + f'-image-{i + 1}', source, item['solution'])
        figure = image.find_parent('figure')
        caption = label(figure.find('figcaption')) if figure else ''
        target.update(image='/lesson-assets/openstax/' + filename,
                      alt=image.get('alt', ''), caption=caption)
        if 'credit:' in caption.lower():
            target['attribution'] = caption + '\n' + ATTR


for slug in ['12-7-hamilton-cycles', '12-8-hamilton-paths']:
    source = f'https://openstax.org/books/contemporary-mathematics/pages/{slug}'
    response = requests.get(source, timeout=60)
    response.raise_for_status()
    soup = BeautifulSoup(response.content.decode('utf-8'), 'html.parser')
    page = soup.select_one('[data-book-content]')
    if page is None:
        raise ValueError(f'No book content found at {source}')
    (ROOT / f'{slug}.html').write_text(str(page), encoding='utf-8')
    heading = [label(page.find(['h1', 'h2'])) or slug, 'introduction']
    topics = {}

    def walk(node):
        if not getattr(node, 'name', None):
            return
        dtype = node.get('data-type')
        if dtype == 'solution':
            return
        if dtype == 'example' or (dtype == 'exercise' and not node.find_parent(attrs={'data-type': 'example'})):
            problem = node.select_one('[data-type="problem"]') or node
            title = label(node.find(['h3', 'h4'])) or heading[0]
            solution = node.select_one('[data-type="solution"]')
            item = new_block('example' if dtype == 'example' else 'exercise', title,
                             plain(problem), node.get('id') or f'item-{len(blocks)}', source, plain(solution))
            attach_images(item, problem, source)
            return
        if dtype == 'exercise-question':
            problem = node.select_one('[data-type="question-stem"]') or node.select_one('.os-problem-container') or node
            number = label(node.select_one('.os-number'))
            parent_note = node.find_parent(class_='your-turn')
            title = label(parent_note.find(['h3', 'h4'])) if parent_note else f'{slug[:4]} · Exercise {number}'
            item = new_block('exercise', title, plain(problem), node.get('id') or f'question-{len(blocks)}', source,
                             plain(node.select_one('[data-type="solution"]')))
            if node.get('data-formats') == 'true-false':
                item.update(answerType='choice', options='True\nFalse')
            attach_images(item, problem, source)
            return
        if dtype == 'note':
            if node.select_one('[data-type="exercise-question"]'):
                for question in node.select('[data-type="exercise-question"]'):
                    walk(question)
            else:
                body = node.find('section') or node
                item = new_block('theory', label(node.find(['h3', 'h4'])) or heading[0],
                                 plain(body), node.get('id') or f'note-{len(blocks)}', source)
                attach_images(item, body, source)
            return
        if node.name in ['h1', 'h2', 'h3', 'h4']:
            heading[:] = [label(node), node.get('id') or re.sub(r'[^a-z0-9]+', '-', label(node).lower())]
            return
        if node.name == 'figure':
            item = new_block('theory', label(node.find('figcaption')) or heading[0], '',
                             node.get('id') or node.get('data-id') or f'figure-{len(blocks)}', source)
            attach_images(item, node, source)
            return
        if node.name in ['p', 'ol', 'ul', 'table']:
            text = plain(node)
            if node.find('img'):
                item = new_block('theory', heading[0], text, node.get('id') or f'illustration-{len(blocks)}', source)
                attach_images(item, node, source)
            elif text:
                topic = topics.get(heading[1])
                if topic is None:
                    topic = new_block('theory', heading[0], '', 'topic-' + heading[1], source)
                    topics[heading[1]] = topic
                topic['text'] = '\n\n'.join(filter(None, [topic['text'], text]))
            return
        for child in node.children:
            walk(child)

    walk(page)


def download(pair):
    url, filename = pair
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    if settings.LESSON_ASSETS_ON_S3:
        upload_asset('/lesson-assets/openstax/' + filename, ContentFile(response.content, name=filename))
    else:
        (ASSETS / filename).write_bytes(response.content)


with ThreadPoolExecutor(max_workers=6) as pool:
    list(pool.map(download, downloads.items()))
if len({block['id'] for block in blocks}) != len(blocks):
    raise ValueError('Duplicate source block IDs')
(ROOT / 'blocks.json').write_text(json.dumps(blocks, ensure_ascii=False, indent=2), encoding='utf-8')
manifest = {'sources': [f'https://openstax.org/books/contemporary-mathematics/pages/{slug}' for slug in ['12-7-hamilton-cycles', '12-8-hamilton-paths']],
            'retrieved_at': datetime.now(timezone.utc).isoformat(), 'images': downloads, 'blocks': len(blocks), 'attribution': ATTR}
(ROOT / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(json.dumps({'blocks': len(blocks), 'images': len(downloads), 'theory': sum(b['kind'] == 'theory' for b in blocks),
                  'examples': sum(b['kind'] == 'example' for b in blocks), 'exercises': sum(b['kind'] == 'exercise' for b in blocks)}))
