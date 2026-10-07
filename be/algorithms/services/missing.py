"""Read-only discovery of source topics that are absent from the algorithm catalog."""

import re
import unicodedata
from difflib import SequenceMatcher

from knowledge.models import DocumentChunk

from algorithms.models import Algorithm, AlgorithmCategory, AlgorithmSource
from algorithms.services.source_fetch import SourceFetchError, fetch_source_text


SKIP = re.compile(
    r'\b(?:introduction|discussion|exercise|summary|bibliography|references|'
    r'proof|lemma|analysis|conclusion|acknowledgment|chapter|overview|background|'
    r'interfaces?|operations|lower.bound)\b',
    re.I,
)
GENERIC = {'searching', 'greedy algorithm', 'recursive algorithm', 'sorting algorithm', 'graph', 'tree'}
TOPIC = re.compile(
    r'\b(?:algorithm\w*|search\w*|sort\w*|travers\w*|tree\w*|trie\w*|hash\w*|'
    r'heap\w*|stack\w*|queue\w*|list\w*|set\w*|array\w*|skiplist\w*|'
    r'backtrack\w*|greedy|matching|coding|graph\w*|path\w*|cycle\w*|'
    r'sequence\w*|dynamic|recurs\w*|dequ\w*|bloom\w*)\b',
    re.I,
)


def normalize_name(value: str) -> str:
    value = unicodedata.normalize('NFKD', value).casefold()
    value = ''.join(char for char in value if not unicodedata.combining(char))
    value = re.sub(r'[^a-z0-9]+', ' ', value)
    words = [word[:-1] if word.endswith('s') and len(word) > 4 else word for word in value.split()]
    return ' '.join(words)


def in_catalog(name: str, existing: set[str]) -> bool:
    normalized = normalize_name(name)
    return any(normalized == item or SequenceMatcher(None, normalized, item).ratio() >= 0.88 for item in existing)


def _title(raw: str) -> str:
    title = re.sub(r'^\s*(?:\d+(?:\.\d+)*[.\s]+|§\s*\d+(?:\.\d+)*)', '', raw).strip(' .—–-')
    title = title.split(':', 1)[0]
    title = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', title)
    return re.sub(r'\s+', ' ', title)


def _candidate(title: str) -> bool:
    return bool(4 <= len(title) <= 100 and len(title.split()) <= 12
                and sum(char.isalpha() for char in title) >= 5
                and normalize_name(title) not in GENERIC
                and not SKIP.search(title) and TOPIC.search(title))


def discover_missing(sources: list[AlgorithmSource]) -> dict:
    existing = {
        normalize_name(value)
        for algorithm in Algorithm.objects.all().only('name', 'key')
        for value in (algorithm.name, algorithm.key.replace('-', ' '))
    }
    existing.update(normalize_name(value) for category in AlgorithmCategory.objects.all().only('name_en', 'name_vi')
                    for value in (category.name_en, category.name_vi) if value)
    results = {}
    warnings = []
    by_document = {source.document_id: source for source in sources if source.document_id}
    if by_document:
        chunks = list(DocumentChunk.objects.filter(document_id__in=by_document).order_by('document_id', 'index').values(
            'document_id', 'section_title', 'heading', 'url', 'page_start',
        ))
        parents = {normalize_name(_title(segment)) for chunk in chunks
                   for segment in chunk['heading'].split(' › ')[:-1]}
        for chunk in chunks:
            source = by_document[chunk['document_id']]
            title = _title(chunk['section_title'] or chunk['heading'].rsplit('›', 1)[-1])
            if (not _candidate(title) or normalize_name(title) in parents
                    or normalize_name(title) == normalize_name(source.document.title)
                    or in_catalog(title, existing)):
                continue
            key = normalize_name(title)
            if key not in results:
                results[key] = {
                    'name': title, 'source_id': source.pk, 'source_name': source.name,
                    'url': chunk['url'] or source.document.source_url,
                    'page': chunk['page_start'],
                }
    for source in sources:
        if source.document_id:
            continue
        try:
            page = fetch_source_text(source.url, source.allowed_domain)
        except SourceFetchError as exc:
            warnings.append(f'{source.name}: {exc}')
            continue
        title = _title(re.split(r'\s+[|—–-]\s+', page['title'], maxsplit=1)[0])
        if _candidate(title) and not in_catalog(title, existing):
            results.setdefault(normalize_name(title), {
                'name': title, 'source_id': source.pk, 'source_name': source.name,
                'url': page['url'], 'page': None,
            })
    return {'results': sorted(results.values(), key=lambda item: item['name'].casefold()),
            'warnings': warnings}
