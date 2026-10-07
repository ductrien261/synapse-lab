import json

import pytest

from app.graphs import algorithm_tutor
from app.llm.chat import LLMError
from app.llm.context import RunContext


SOURCE = {'title': 'Bài toán', 'text': 'Đặt N quân hậu không tấn công nhau trên bàn cờ.', 'url': '', 'kind': 'lesson'}


def test_quiz_retries_invalid_options_and_uses_lesson(monkeypatch):
    prompts = []
    settings = {'count': 2, 'difficulty': 'hard', 'focus': 'trace', 'topic': 'quay lui'}
    question = {'content': 'Điều kiện nào?', 'options': ['a', 'b', 'c', 'd'], 'correct_index': 2,
                'explanation': 'Vì c đúng.', 'source_index': 1,
                'source_quote': 'Đặt N quân hậu không tấn công nhau'}
    replies = iter([
        {'title': 'Bộ câu hỏi', 'content': 'Ôn tập', 'questions': [question]},
        {'title': 'Bộ câu hỏi', 'content': 'Ôn tập', 'questions': [question, {
            'content': 'Bước nào tiếp?', 'options': ['w', 'x', 'y', 'z'], 'correct_index': 1,
            'explanation': 'Vì x đúng.', 'source_index': 1,
            'source_quote': 'Đặt N quân hậu không tấn công nhau',
        }]},
    ])

    def fake_chat(_ctx, _step, _system, prompt, **_kwargs):
        prompts.append(prompt)
        return json.dumps(next(replies))

    monkeypatch.setattr(algorithm_tutor, 'chat', fake_chat)
    result = algorithm_tutor.run(RunContext('algorithm_tutor'), 'quiz',
                                 {'name': 'N Queens', 'theory': [], 'sources': [SOURCE]}, quiz_options=settings)
    assert len(result['questions']) == 2
    assert result['questions'][0]['correct_index'] == 2
    assert result['sources'][0]['title'] == 'Bài toán'
    assert len(prompts) == 2
    assert 'N Queens' in prompts[0] and 'quay lui' in prompts[0]


def test_quiz_never_returns_malformed_result(monkeypatch):
    monkeypatch.setattr(algorithm_tutor, 'chat', lambda *_args, **_kwargs: json.dumps({
        'title': 'Bộ câu hỏi', 'content': 'Ôn tập', 'questions': [{
            'content': 'Điều kiện?', 'options': ['a'] * 4, 'correct_index': True, 'explanation': 'Sai',
        }],
    }))
    with pytest.raises(LLMError):
        algorithm_tutor.run(RunContext('algorithm_tutor'), 'quiz', {'name': 'N Queens'}, quiz_options={
            'count': 1, 'difficulty': 'easy', 'focus': 'mixed', 'topic': '',
        })


def test_explain_code_receives_exact_selection(monkeypatch):
    prompts = []
    def fake_chat(_ctx, _step, _system, prompt, **_kwargs):
        prompts.append(prompt)
        return json.dumps({'title': 'Giải thích đoạn mã', 'content': 'Điều kiện dừng.'})
    monkeypatch.setattr(algorithm_tutor, 'chat', fake_chat)
    selected = {'start_line': 10, 'end_line': 11, 'code': '10: bool knightTour(...) {\n11: if (done) return true;'}
    result = algorithm_tutor.run(RunContext('algorithm_tutor'), 'explain_code', {'name': 'Knight Tour'},
                                 code_selection=selected)
    assert result['action'] == 'explain_code'
    assert '11: if (done)' in prompts[0]


def test_flashcards_follow_count_focus_and_evidence(monkeypatch):
    cards = [{'front': f'Câu hỏi {i}?', 'back': f'Trả lời {i}.', 'source_index': 1,
              'source_quote': 'Đặt N quân hậu không tấn công nhau'} for i in range(3)]
    prompts = []

    def fake_chat(_ctx, _step, _system, prompt, **_kwargs):
        prompts.append(prompt)
        return json.dumps({'title': 'Flashcard', 'content': 'Ôn bài', 'cards': cards})

    monkeypatch.setattr(algorithm_tutor, 'chat', fake_chat)
    options = {'topic': 'N Queens', 'count': 3, 'focus': 'điều kiện hợp lệ'}
    lesson = {'name': 'N Queens', 'sources': [SOURCE]}
    result = algorithm_tutor.run(RunContext('algorithm_tutor'), 'flashcards', lesson, flashcard_options=options)
    assert len(result['cards']) == 3
    assert result['cards'][0] == cards[0]
    assert 'điều kiện hợp lệ' in prompts[0]

    cards[2] = {'front': 'câu hỏi 0?', 'back': 'Trả lời khác.', 'source_index': 1,
                'source_quote': 'Đặt N quân hậu không tấn công nhau'}
    with pytest.raises(LLMError):
        algorithm_tutor.run(RunContext('algorithm_tutor'), 'flashcards', lesson, flashcard_options=options)


def test_scenario_uses_selected_type(monkeypatch):
    prompts = []
    def fake_chat(_ctx, _step, _system, prompt, **_kwargs):
        prompts.append(prompt)
        return json.dumps({'title': 'Theo dõi bước chạy', 'content': 'Xét hàng tiếp theo.'})
    monkeypatch.setattr(algorithm_tutor, 'chat', fake_chat)
    result = algorithm_tutor.run(RunContext('algorithm_tutor'), 'scenario', {'name': 'N Queens'},
                                 scenario_options={'topic': 'Đặt quân hậu', 'style': 'trace'})
    assert result['action'] == 'scenario'
    assert 'Đặt quân hậu' in prompts[0] and 'trace' in prompts[0]


def test_quiz_rejects_a_quote_not_in_source(monkeypatch):
    monkeypatch.setattr(algorithm_tutor, 'chat', lambda *_args, **_kwargs: json.dumps({
        'title': 'Bài trắc nghiệm', 'content': 'Ôn bài', 'questions': [{
            'content': 'N quân hậu?', 'options': ['a', 'b', 'c', 'd'], 'correct_index': 0,
            'explanation': 'Đáp án a.', 'source_index': 1, 'source_quote': 'Đoạn không có trong bài',
        }],
    }))
    with pytest.raises(LLMError):
        algorithm_tutor.run(RunContext('algorithm_tutor'), 'quiz', {'name': 'N Queens', 'sources': [SOURCE]},
                            quiz_options={'count': 1, 'difficulty': 'easy', 'focus': 'mixed', 'topic': 'N Queens'})
