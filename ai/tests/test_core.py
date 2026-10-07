"""Kiểm thử không cần mạng/DB: kiểm chứng trích dẫn, gộp RRF, quy trình viết nháp (LLM + tìm kiếm giả), bảo vệ API."""

import json

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.graphs import draft as draft_graph
from app.graphs import algorithm_draft
from app.llm.chat import LLMError, parse_json
from app.llm.context import RunContext
from app.tools import retrieval
from app.tools.embeddings import EmbeddingError
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


def test_cs_search_uses_keyword_index_when_embedding_is_unavailable(monkeypatch):
    class FakeCursor:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            pass

        def execute(self, sql, params):
            self.sql = sql
            assert 'embedding <=>' not in sql
            if 'search_vector @@' in sql:
                assert params[1] == ['cs', 'general']

        def fetchall(self):
            if 'search_vector @@' in self.sql:
                return [(1,)]
            return [(1, 'doc-1', 'Algorithms', 'CC BY 4.0', 'Backtracking', 'https://example.org/book.pdf#page=2',
                     'Backtracking tries every valid option.', 2, 2)]

    class FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            pass

        def cursor(self):
            return FakeCursor()

    class FakePool:
        def connection(self):
            return FakeConnection()

    monkeypatch.setattr(retrieval, '_pool', lambda: FakePool())
    monkeypatch.setattr(retrieval, 'embed_query', lambda *_: (_ for _ in ()).throw(EmbeddingError('unavailable')))
    hits, info = retrieval.search(RunContext('search'), 'backtracking', scope='cs')
    assert len(hits) == 1 and info['dense'] == 0 and info['keyword'] == 1
    with pytest.raises(EmbeddingError):
        retrieval.search(RunContext('search'), 'heart', scope='med')


def test_med_tutor_can_opt_in_to_keyword_fallback(monkeypatch):
    class FakeCursor:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            pass

        def execute(self, sql, params):
            self.sql = sql
            assert 'embedding <=>' not in sql
            if 'search_vector @@' in sql:
                assert params[1] == ['med', 'general']

        def fetchall(self):
            if 'search_vector @@' in self.sql:
                return [(2,)]
            return [(2, 'doc-2', 'Anatomy', 'CC BY', 'Heart', 'https://example.org/heart',
                     'The heart pumps blood through the circulatory system.', None, None)]

    class FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            pass

        def cursor(self):
            return FakeCursor()

    class FakePool:
        def connection(self):
            return FakeConnection()

    monkeypatch.setattr(retrieval, '_pool', lambda: FakePool())
    monkeypatch.setattr(retrieval, 'embed_query', lambda *_: (_ for _ in ()).throw(EmbeddingError('unavailable')))
    hits, info = retrieval.search(RunContext('search'), 'heart', scope='med', allow_keyword_fallback=True)
    assert len(hits) == 1
    assert hits[0].keyword_rank == 1
    assert info['dense'] == 0


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


def test_algorithm_draft_uses_explicit_approved_source(monkeypatch):
    fields = {
        key: {'value': '', 'status': 'missing', 'confidence': 0, 'sources': []}
        for key in algorithm_draft.P.FIELDS
    }
    fields['summary'] = {
        'value': 'BFS duyệt đồ thị theo từng lớp [1].',
        'status': 'found', 'confidence': 0.9, 'sources': [1],
    }
    monkeypatch.setattr(algorithm_draft, 'search', lambda *a, **k: pytest.fail('không tìm kho khi chỉ dùng nguồn URL'))
    monkeypatch.setattr(algorithm_draft, 'chat', lambda *a, **k: json.dumps({'fields': fields}))

    result = algorithm_draft.run(RunContext('algorithm_draft'), 'Breadth-First Search', 'Graph', explicit_sources=[{
        'title': 'Approved algorithms guide', 'url': 'https://docs.example.test/bfs',
        'license_name': 'CC BY', 'content': 'Breadth-first search visits graph vertices one layer at a time.' * 5,
    }])

    assert result['status'] == 'pending'
    assert result['fields']['summary']['status'] == 'found'
    assert result['citations'][0]['url'] == 'https://docs.example.test/bfs'


def test_algorithm_draft_only_accepts_inline_valid_citations():
    fields = {
        key: {'value': '', 'status': 'missing', 'confidence': 0, 'sources': []}
        for key in algorithm_draft.P.FIELDS
    }
    fields['summary'] = {
        'value': 'BFS duyệt đồ thị theo từng lớp.',
        'status': 'found', 'confidence': 0.9, 'sources': [1],
    }

    normalized, used, problems = algorithm_draft._normalize({'fields': fields}, 1)

    assert normalized['summary']['status'] == 'weak'
    assert normalized['summary']['sources'] == []
    assert used == set()
    assert problems


def test_algorithm_draft_focuses_on_named_section_of_long_page():
    page = 'Unrelated introduction.\n' + ('Other topic details. ' * 140)
    page += '\nBinary Search Algorithm\nCompare with the middle item and discard half the sorted list.\n'
    excerpt = algorithm_draft._focused_excerpt(page, 'Binary Search')
    assert 'Binary Search Algorithm' in excerpt
    assert 'discard half the sorted list' in excerpt
    assert len(excerpt) <= algorithm_draft.EXPLICIT_EXCERPT_CHARS


def test_algorithm_draft_stops_at_next_topic_on_multi_algorithm_page():
    page = (
        'Binary Search Algorithm\nCompare with the middle item and discard half the sorted list.\n'
        'Merge Sort Algorithm\nSplit a list and merge sorted halves.\n'
    )
    excerpt = algorithm_draft._focused_excerpt(
        page, 'Binary Search Algorithm', ['Binary Search Algorithm', 'Merge Sort Algorithm'],
    )
    assert 'discard half the sorted list' in excerpt
    assert 'Merge Sort' not in excerpt


def test_algorithm_draft_stops_at_next_parent_section():
    page = (
        'Hashing\nA hash table maps keys to slots.\n'
        'Graph Problems\nAn unrelated introduction to graphs.\n'
        'Depth-First Search\nVisit adjacent vertices recursively.\n'
    )
    excerpt = algorithm_draft._focused_excerpt(
        page, 'Hashing', ['Hashing', 'Depth-First Search'], [
            {'level': 4, 'title': 'Hashing'},
            {'level': 3, 'title': 'Graph Problems'},
            {'level': 5, 'title': 'Depth-First Search'},
        ],
    )
    assert 'hash table maps keys' in excerpt
    assert 'Graph Problems' not in excerpt


def test_algorithm_draft_rejects_unrelated_explicit_page(monkeypatch):
    monkeypatch.setattr(algorithm_draft, 'chat', lambda *a, **k: pytest.fail('không gọi AI với nguồn lạc đề'))
    result = algorithm_draft.run(RunContext('algorithm_draft'), 'Binary Search', 'Searching', explicit_sources=[{
        'title': 'Văn học dân gian', 'url': 'https://example.test/literature',
        'content': 'Các thể loại văn học dân gian có nhiều tác phẩm và ví dụ minh họa.' * 5,
    }])
    assert result['status'] == 'no_source'


def test_algorithm_draft_keeps_verified_pseudocode_when_model_omits_it(monkeypatch):
    monkeypatch.setattr(algorithm_draft, 'chat', lambda *a, **k: '{"fields": {}}')
    code = 'procedure binarySearch(arr)\n  return -1'
    result = algorithm_draft.run(
        RunContext('algorithm_draft'), 'Binary Search', 'Searching', explicit_sources=[{
            'title': 'Binary Search | Algorithm Visualizer',
            'url': 'https://algorithm-visualizer.seancoughlin.me/searching/binarySearch',
            'content': 'Binary Search\n' + 'Searches a sorted array. ' * 12 + '\nPseudocode\n' + code,
            'pseudocode': code,
        }],
    )
    assert result['status'] == 'pending'
    assert result['fields']['pseudocode']['status'] == 'found'
    assert code in result['fields']['pseudocode']['value']
    assert result['citations'][0]['url'].endswith('/binarySearch')


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


# ---------------- ôn tập ----------------

from app.graphs import quiz as quiz_graph  # noqa: E402
from app.verify.quiz import validate_item  # noqa: E402

SRC = [{'heading': 'Left Ventricle', 'excerpt': 'pumps blood into the aorta'}, {'heading': 'Mitral valve', 'excerpt': 'two cusps'}]
MCQ_OK = {'question': 'Tâm thất trái bơm máu vào đâu?', 'options': ['Động mạch chủ', 'Thân động mạch phổi', 'Tâm nhĩ trái', 'Tĩnh mạch chủ'],
          'correct_index': 0, 'distractor_notes': ['', 'nhầm với thất phải', 'nhầm chiều dòng máu', 'nhầm động mạch với tĩnh mạch'],
          'explanation': 'Thất trái bơm máu vào động mạch chủ [1].'}


def test_validate_item_rules():
    assert validate_item('mcq', MCQ_OK, 2) == ''
    assert validate_item('mcq', {**MCQ_OK, 'correct_index': 4}, 2)
    assert validate_item('mcq', {**MCQ_OK, 'explanation': 'không nguồn'}, 2)
    assert validate_item('short', {'question': 'Q', 'rubric': ['ý 1 [1]'], 'explanation': 'x [1]'}, 2)
    assert validate_item('short', {'question': 'Q', 'rubric': ['ý 1 [1]', 'ý 2 [2]'], 'explanation': 'x [1]'}, 2) == ''


def test_quiz_generate_retries_then_ok(monkeypatch):
    import json as _json
    replies = iter([_json.dumps({**MCQ_OK, 'options': ['a', 'a', 'b', 'c']}), _json.dumps(MCQ_OK)])
    monkeypatch.setattr(quiz_graph, 'chat', lambda *a, **k: next(replies))
    item = quiz_graph.generate(RunContext('quiz'), 'mcq', {'name_en': 'Left ventricle'}, SRC)
    assert item['status'] == 'ok' and item['correct_index'] == 0
    assert item['distractor_notes'][0] == '' and item['distractor_notes'][1] == 'nhầm với thất phải'


def test_quiz_grade(monkeypatch):
    monkeypatch.setattr(quiz_graph, 'chat', lambda *a, **k: '{"hits": [0], "feedback": "Đúng ý chính [1].", "misconception": "nhầm tâm nhĩ"}')
    out = quiz_graph.grade(RunContext('grade'), 'Q', ['ý 1 [1]', 'ý 2 [2]'], SRC, 'Tâm thất trái bơm máu vào động mạch chủ')
    assert out['score'] == 0.5 and out['misconception'] == 'nhầm tâm nhĩ'
    monkeypatch.setattr(quiz_graph, 'chat', lambda *a, **k: pytest.fail('không cần AI'))
    assert quiz_graph.grade(RunContext('grade'), 'Q', ['a [1]', 'b [1]'], SRC, '')['score'] == 0.0
