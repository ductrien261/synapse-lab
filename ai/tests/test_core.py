"""Kiểm thử không cần mạng/DB: kiểm chứng trích dẫn, gộp RRF, quy trình viết nháp (LLM + tìm kiếm giả), bảo vệ API."""

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.graphs import draft as draft_graph
from app.llm.chat import LLMError, parse_json
from app.llm.context import RunContext
from app.tools.retrieval import Hit, keyword_terms, rrf
from app.verify.citations import check, strip_invalid


def hit(i: int, heading: str, content: str) -> Hit:
    return Hit(i, 'doc-1', 'A&P 2e', 'CC BY', heading, f'https://x/#s{i}', content, None, None)


# ---------------- kiểm chứng ----------------

def test_citation_check_flags_uncited_and_invalid():
    r = check(['Tâm thất trái bơm máu vào động mạch chủ [1]. Thành cơ dày nhất trong các buồng tim [7].'], max_n=3)
    assert r.invalid == [7] and not r.ok
    r = check(['Câu một đủ dài có nguồn [1]. Câu hai đủ dài có nguồn [2].'], max_n=2)
    assert r.ok and r.used == {1, 2}
    r = check(['Câu một đủ dài không có nguồn. Câu hai cũng không có nguồn. Câu ba có nguồn [1].'], max_n=2)
    assert r.uncited == 2 and not r.ok


def test_strip_invalid():
    assert strip_invalid('Ý chính [1][9].', 2) == 'Ý chính [1].'


def test_rrf_and_terms():
    fused = rrf([[1, 2, 3], [3, 1]])
    assert max(fused, key=fused.get) == 1
    assert keyword_terms('What is the left ventricle? left') == 'what | is | the | left | ventricle'


def test_parse_json():
    assert parse_json('```json\n{"a": 1}\n```') == {'a': 1}
    with pytest.raises(LLMError):
        parse_json('không có')


# ---------------- quy trình viết nháp ----------------

@pytest.fixture
def fake_search(monkeypatch):
    def _search(ctx, query, **kw):
        return [
            hit(1, '19.1 Heart Anatomy › Left Ventricle', 'The left ventricle is the major pumping chamber for the systemic circuit.'),
            hit(2, '19.1 Heart Anatomy › Layers', 'The myocardium of the left ventricle is thicker.'),
        ], {}
    monkeypatch.setattr(draft_graph, 'search', _search)


def test_draft_no_source_skips_llm(monkeypatch):
    monkeypatch.setattr(draft_graph, 'search', lambda ctx, q, **kw: ([hit(1, 'Other', 'Unrelated text about bones.')], {}))
    monkeypatch.setattr(draft_graph, 'chat', lambda *a, **k: pytest.fail('không được gọi LLM'))
    out = draft_graph.run(RunContext('draft'), 'Left ventricle')
    assert out['status'] == 'no_source'


def test_draft_retries_when_citations_missing(fake_search, monkeypatch):
    replies = iter([
        '{"name_vi": "Tâm thất trái", "definition": "Là buồng bơm chính của tuần hoàn hệ thống. Thành cơ rất dày.", "function": "", "clinical_note": ""}',
        '{"name_vi": "Tâm thất trái", "definition": "Là buồng bơm chính của tuần hoàn hệ thống [1]. Thành cơ dày hơn thất phải [2].", "function": "", "clinical_note": "", "used_sources": [1, 2]}',
    ])
    calls = []
    monkeypatch.setattr(draft_graph, 'chat', lambda ctx, step, *a, **k: calls.append(step) or next(replies))
    out = draft_graph.run(RunContext('draft'), 'Left ventricle')
    assert out['status'] == 'pending'
    assert calls == ['generate#1', 'generate#2']
    assert [c['n'] for c in out['citations']] == [1, 2]
    assert out['warnings'] == []


# ---------------- API ----------------

def test_api_requires_internal_token(monkeypatch):
    monkeypatch.setenv('AI_SERVICE_TOKEN', 'secret')
    get_settings.cache_clear()
    from app.main import app

    client = TestClient(app)
    assert client.get('/health').status_code == 200
    assert client.post('/v1/translate', json={'text': 'hi'}).status_code == 401
    get_settings.cache_clear()


# ---------------- gia sư ----------------

from app.graphs import quick_check as quick_graph  # noqa: E402
from app.graphs import tutor as tutor_graph  # noqa: E402

PARTS = [
    {'index': 0, 'name_en': 'Left ventricle', 'name_vi': 'Tâm thất trái'},
    {'index': 1, 'name_en': 'Aorta', 'name_vi': 'Động mạch chủ'},
    {'index': 2, 'name_en': 'Right atrium', 'name_vi': 'Tâm nhĩ phải'},
]


def _run_tutor(monkeypatch, hits, stream_text, retry_text=None):
    monkeypatch.setattr(tutor_graph, 'search', lambda ctx, q, **kw: (hits, {'english_query': ''}))
    monkeypatch.setattr(tutor_graph, 'chat_stream', lambda *a, **k: iter([stream_text[:10], stream_text[10:]]))
    monkeypatch.setattr(tutor_graph, 'chat', lambda *a, **k: retry_text or pytest.fail('không cần viết lại'))
    events = list(tutor_graph.stream(RunContext('tutor'), {
        'question': 'Tâm thất trái có chức năng gì?', 'history': [], 'learner': {}, 'model_title': 'Heart',
        'part': PARTS[0], 'parts': PARTS, 'scope': 'med',
    }))
    return events, events[-1][1]


def test_tutor_no_source_skips_llm(monkeypatch):
    h = hit(1, 'Bones', 'Unrelated')
    h.keyword_rank = None
    monkeypatch.setattr(tutor_graph, 'chat_stream', lambda *a, **k: pytest.fail('không được gọi LLM'))
    events, done = _run_tutor(monkeypatch, [h], 'x')
    assert done['citations'] == [] and 'chưa tìm thấy' in done['answer']


def test_tutor_streams_and_highlights(monkeypatch):
    h1, h2 = hit(1, 'Left Ventricle', 'pumps blood'), hit(2, 'Aorta', 'largest artery')
    h1.keyword_rank = 1
    text = 'Tâm thất trái bơm máu vào Động mạch chủ đi nuôi cơ thể [1][2]. Thành cơ dày giúp tạo áp lực lớn [1].'
    events, done = _run_tutor(monkeypatch, [h1, h2], text)
    tokens = ''.join(e[1]['text'] for e in events if e[0] == 'token')
    assert tokens == text
    assert done['status'] == 'ok' and [c['n'] for c in done['citations']] == [1, 2]
    assert done['highlights'] == [0, 1]


def test_tutor_replaces_unverified_answer(monkeypatch):
    h1 = hit(1, 'Left Ventricle', 'pumps blood')
    h1.keyword_rank = 1
    events, done = _run_tutor(monkeypatch, [h1], 'Tâm thất trái bơm máu. Nó có thành dày nhất.',
                              retry_text='Tâm thất trái bơm máu vào vòng tuần hoàn lớn [1]. Thành cơ dày nhất [1].')
    assert any(e[0] == 'replace' for e in events)
    assert done['status'] == 'ok' and done['answer'].endswith('[1].')


def test_quick_check_validation():
    good = {'question': 'Q?', 'options': ['a', 'b', 'c', 'd'], 'correct_index': 2, 'explanation': 'Vì ... [1].'}
    assert quick_graph.validate(good, 2) == ''
    assert quick_graph.validate({**good, 'options': ['a', 'a', 'b', 'c']}, 2)
    assert quick_graph.validate({**good, 'explanation': 'không nguồn'}, 2)
    assert quick_graph.validate({**good, 'explanation': 'sai [5]'}, 2)


def test_tutor_endpoint_streams_sse(monkeypatch):
    monkeypatch.setenv('AI_SERVICE_TOKEN', 'secret')
    get_settings.cache_clear()
    from app import main

    def fake_stream(ctx, payload):
        yield 'token', {'type': 'token', 'text': 'Xin '}
        yield 'token', {'type': 'token', 'text': 'chào'}
        yield 'done', {'answer': 'Xin chào', 'citations': []}

    monkeypatch.setattr(main.tutor_graph, 'stream', fake_stream)
    client = TestClient(main.app)
    res = client.post('/v1/tutor/ask', json={'question': 'hi'}, headers={'X-Internal-Token': 'secret'})
    assert res.status_code == 200
    body = res.text
    assert body.count('event: token') == 2 and 'event: done' in body and '"meta"' in body
    get_settings.cache_clear()
