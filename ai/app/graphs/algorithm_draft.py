"""Create a reviewable algorithm lesson candidate from approved sources."""

import re
import unicodedata
from difflib import SequenceMatcher

from ..llm.chat import chat, parse_json
from ..llm.context import RunContext
from ..prompts import algorithm_draft as P
from ..tools.retrieval import Hit, search
from ..verify.citations import check, strip_invalid

MAX_SOURCES = 8
EXCERPT_CHARS = 1800
EXPLICIT_EXCERPT_CHARS = 3600
MAX_ATTEMPTS = 2


def _citation(source: Hit, n: int, excerpt: str | None = None) -> dict:
    return {
        'n': n, 'chunk_id': source.id, 'document_id': source.document_id,
        'document_title': source.document_title, 'heading': source.heading,
        'url': source.url, 'page_start': source.page_start, 'page_end': source.page_end,
        'excerpt': (excerpt or source.content)[:600], 'citation': source.citation,
    }


def _explicit_hit(item: dict, index: int) -> Hit:
    return Hit(
        id=-(index + 1), document_id='', document_title=str(item.get('title') or 'Nguồn web')[:300],
        license_name=str(item.get('license_name') or '')[:200], heading='', url=str(item.get('url') or '')[:600],
        content=str(item.get('content') or '')[:60000], page_start=None, page_end=None,
    )


def _normalized_title(value: str) -> str:
    value = unicodedata.normalize('NFKD', value).casefold()
    value = ''.join(char for char in value if not unicodedata.combining(char))
    value = re.sub(r'[^a-z0-9]+', ' ', value)
    return re.sub(r'\b(algorithm|problem)\b', '', value).strip()


def _focused_excerpt(content: str, algorithm: str, topics: list[str] | None = None,
                     headings: list[dict] | None = None) -> str:
    """Find the named section within a long approved page, not its first 1,800 chars."""
    target = _normalized_title(algorithm)
    if not target:
        return content[:EXPLICIT_EXCERPT_CHARS]
    lines = content.splitlines(keepends=True)
    topic_names = {_normalized_title(topic) for topic in topics or []}
    heading_levels = {
        _normalized_title(str(heading.get('title') or '')): heading.get('level')
        for heading in headings or [] if isinstance(heading, dict)
    }
    offset = 0
    anchors = []
    for line in lines:
        label = _normalized_title(line.strip())
        if 0 < len(line.strip()) < 100 and label and (
            label == target or SequenceMatcher(None, label, target).ratio() >= 0.88
        ):
            anchors.append(offset)
        offset += len(line)
    if anchors:
        center = anchors[0]
        if topic_names or heading_levels:
            end = len(content)
            current_level = heading_levels.get(target)
            offset = 0
            for line in lines:
                label = _normalized_title(line.strip()) if len(line.strip()) < 100 else ''
                is_next_section = (
                    label in heading_levels and heading_levels[label] <= current_level
                    if current_level is not None else label in topic_names
                )
                if offset > center and label != target and is_next_section:
                    end = offset
                    break
                offset += len(line)
            return content[center:min(end, center + EXPLICIT_EXCERPT_CHARS)].strip()
    else:
        folded = unicodedata.normalize('NFKD', content).casefold()
        center = folded.find(target)
        if center < 0:
            center = content.casefold().find(algorithm.casefold())
    if center < 0:
        return content[:EXPLICIT_EXCERPT_CHARS]
    start = max(0, center - 450)
    return content[start:start + EXPLICIT_EXCERPT_CHARS]


def _mentions_algorithm(content: str, algorithm: str) -> bool:
    target = _normalized_title(algorithm)
    if not target:
        return False
    if target in _normalized_title(content):
        return True
    return any(SequenceMatcher(None, _normalized_title(line), target).ratio() >= 0.88
               for line in content.splitlines() if 0 < len(line.strip()) < 100)


def _normalize(data: dict, max_n: int) -> tuple[dict, set[int], list[str]]:
    raw_fields = data.get('fields') if isinstance(data, dict) else None
    if not isinstance(raw_fields, dict):
        return {}, set(), ['Thiếu object fields.']
    result, used, problems = {}, set(), []
    for key in P.FIELDS:
        raw = raw_fields.get(key)
        if not isinstance(raw, dict):
            raw = {}
        raw_value = str(raw.get('value') or '').strip()
        report = check([raw_value], max_n) if raw_value else None
        value = strip_invalid(raw_value, max_n)
        status = raw.get('status') if raw.get('status') in {'found', 'weak', 'missing', 'conflict'} else 'missing'
        if not value:
            status = 'missing'
        if report and (not report.ok or report.uncited):
            status = 'weak'
            problems.append(f'{key}: {report.problems()}')
        cited = sorted({int(n) for n in re.findall(r'\[(\d+)\]', value) if 1 <= int(n) <= max_n})
        used.update(cited)
        try:
            confidence = min(1.0, max(0.0, float(raw.get('confidence') or 0)))
        except (TypeError, ValueError):
            confidence = 0.0
        result[key] = {'value': value, 'status': status, 'confidence': confidence, 'sources': cited, 'generated': True}
    return result, used, problems


def run(ctx: RunContext, name: str, category: str, document_ids: list[str] | None = None,
        explicit_sources: list[dict] | None = None) -> dict:
    relevant_sources = [item for item in (explicit_sources or []) if _mentions_algorithm(str(item.get('content') or ''), name)]
    explicit_hits = [_explicit_hit(item, i) for i, item in enumerate(relevant_sources)][:MAX_SOURCES]
    remaining = MAX_SOURCES - len(explicit_hits)
    document_hits, _ = search(
        ctx, f'{name} algorithm {category}', k=remaining, scope='cs', per_section=2,
        document_ids=document_ids or None,
    ) if document_ids and remaining else ([], {})
    hits = [*explicit_hits, *document_hits]
    if not hits:
        return {'status': 'no_source', 'fields': {}, 'citations': [], 'warnings': [],
                'error': 'Các nguồn đã chọn không có đoạn nhắc trực tiếp tới thuật toán này.', 'prompt_version': P.VERSION}
    selected_texts = [
        _focused_excerpt(
            item.content, name, relevant_sources[-item.id - 1].get('topics'),
            relevant_sources[-item.id - 1].get('headings'),
        )
        if item.id < 0 else item.content[:EXCERPT_CHARS]
        for item in hits
    ]
    excerpts = '\n\n'.join(
        f'[{n}] {item.document_title} — {item.heading}\n'
        f'{selected_texts[n - 1]}'
        for n, item in enumerate(hits, start=1)
    )
    feedback = ''
    fields, used, problems = {}, set(), []
    for attempt in range(1, MAX_ATTEMPTS + 1):
        prompt = P.user_prompt(name, category, excerpts) + (f'\n\n{feedback}' if feedback else '')
        data = parse_json(chat(ctx, f'generate#{attempt}', P.SYSTEM, prompt, json_mode=True))
        fields, used, problems = _normalize(data, len(hits))
        if fields and not problems:
            break
        feedback = P.RETRY_NOTE.format(problems='; '.join(problems[:8]) or 'sai schema', max_n=len(hits))
    if not fields.get('pseudocode', {}).get('value'):
        for n, item in enumerate(relevant_sources[:len(explicit_hits)], start=1):
            pseudocode = str(item.get('pseudocode') or '').strip()
            if pseudocode and pseudocode in selected_texts[n - 1]:
                fields['pseudocode'] = {
                    'value': f'{pseudocode}\n[{n}]', 'status': 'found',
                    'confidence': 1.0, 'sources': [n], 'generated': False,
                }
                used.add(n)
                break
    if not any(item['value'] for item in fields.values()):
        return {'status': 'no_source', 'fields': fields, 'citations': [], 'warnings': problems,
                'error': 'Nguồn chưa đủ để tạo nội dung đề xuất.', 'prompt_version': P.VERSION}
    citations = [_citation(item, n, selected_texts[n - 1]) for n, item in enumerate(hits, start=1) if n in used]
    return {'status': 'pending', 'fields': fields, 'citations': citations, 'warnings': problems,
            'error': '', 'prompt_version': P.VERSION}
