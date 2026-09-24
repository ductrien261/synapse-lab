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
