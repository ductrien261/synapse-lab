import json

from app.graphs import classroom_assistant
from app.llm.context import RunContext


def test_classroom_assistant_keeps_history_and_page_context(monkeypatch):
    captured = {}

    def fake_chat(_ctx, _step, _system, user, **_kwargs):
        captured.update(json.loads(user))
        return json.dumps({
            'answer': 'Trang 2 phát triển khái niệm đã giới thiệu ở trang 1.',
            'used_external_knowledge': False,
            'suggested_questions': ['Cho mình ví dụ?', 'Điểm khác nhau là gì?'],
        }, ensure_ascii=False)

    monkeypatch.setattr(classroom_assistant, 'chat', fake_chat)
    result = classroom_assistant.run(RunContext('classroom_assistant'), {
        'document_title': 'Bài học',
        'current_page': 2,
        'total_pages': 5,
        'question': 'Trang này liên quan trang trước thế nào?',
        'page_contexts': [
            {'page': 1, 'text': 'Khái niệm nền tảng được giới thiệu tại đây.'},
            {'page': 2, 'text': 'Trang này giải thích cách áp dụng khái niệm nền tảng.'},
        ],
        'history': [{'role': 'assistant', 'content': 'Trang 1 trình bày khái niệm.', 'page': 1}],
    })

    assert result['status'] == 'ok'
    assert result['used_external_knowledge'] is False
    assert captured['current_page'] == 2
    assert [item['page'] for item in captured['page_contexts']] == [1, 2]
    assert captured['conversation_history'][0]['page'] == 1
