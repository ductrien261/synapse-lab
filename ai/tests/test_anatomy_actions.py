"""Anatomy learning activities require relevant sources and cited output."""

import json

import pytest
from pydantic import ValidationError

from app.graphs import anatomy_actions
from app.llm.context import RunContext
from app.schemas import AnatomyActionIn
from app.tools.retrieval import Hit


def source():
    hit = Hit(1, 'doc-1', 'Anatomy and Physiology 2e', 'CC BY', 'Coronary Veins',
              'https://example.org/heart', 'The coronary sinus empties into the right atrium.', None, None)
    hit.keyword_rank = 1
    return hit


def test_quiz_is_generated_from_source_and_cited(monkeypatch):
    monkeypatch.setattr(anatomy_actions, 'search', lambda *_args, **_kwargs: ([source()], {}))
    prompts = []

    def generate(_ctx, _key, _system, prompt, **_kwargs):
        prompts.append(prompt)
        return json.dumps({'questions': [
            {'question': f'Xoang vành đổ vào buồng tim nào? Câu {i}',
             'options': ['Tâm nhĩ phải', 'Tâm nhĩ trái', 'Tâm thất phải', 'Tâm thất trái'],
             'correct_index': 0, 'explanation': 'Xoang vành đổ vào tâm nhĩ phải [1].',
             'source_n': 1, 'source_quote': 'The coronary sinus empties into the right atrium.'}
            for i in range(1, 4)
        ]})

    monkeypatch.setattr(anatomy_actions, 'chat', generate)
    result = anatomy_actions.run(RunContext('tutor'), 'quiz', 'Heart', None,
                                 topic='Xoang vành', question_count=3, quiz_style='practice')
    assert result['status'] == 'ok'
    assert len(result['data']['questions']) == 3
    assert result['citations'][0]['chunk_id'] == 1
    assert 'nhận diện cấu trúc' in prompts[0]
    assert 'Xoang vành' in prompts[0]


def test_quiz_rejects_missing_or_uncited_questions():
    question = {'question': 'Xoang vành đổ vào buồng tim nào?',
                'options': ['Tâm nhĩ phải', 'Tâm nhĩ trái', 'Tâm thất phải', 'Tâm thất trái'],
                'correct_index': 0, 'explanation': 'Xoang vành đổ vào tâm nhĩ phải [1].',
                'source_n': 1, 'source_quote': 'The coronary sinus empties into the right atrium.'}
    assert anatomy_actions.validate('quiz', {'questions': [question]}, 1, question_count=2)
    assert anatomy_actions.validate('quiz', {'questions': [question, {**question, 'explanation': 'Không nguồn'}]}, 1, question_count=2)
    assert anatomy_actions.validate('quiz', {'questions': [question]}, 1, hits=[source()]) == ''
    assert anatomy_actions.validate('quiz', {'questions': [{**question, 'source_quote': 'A made up quote'}]}, 1, hits=[source()])


def test_quiz_request_limits_count_and_style():
    request = AnatomyActionIn(action='quiz', model_title='Heart', question_count=5, quiz_style='application')
    assert request.question_count == 5
    with pytest.raises(ValidationError):
        AnatomyActionIn(action='quiz', question_count=11)
    with pytest.raises(ValidationError):
        AnatomyActionIn(action='quiz', quiz_style='unsupported')


def test_no_relevant_source_skips_llm(monkeypatch):
    unrelated = source()
    unrelated.keyword_rank = None
    monkeypatch.setattr(anatomy_actions, 'search', lambda *_args, **_kwargs: ([unrelated], {}))
    monkeypatch.setattr(anatomy_actions, 'chat', lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError('No LLM call expected')))
    result = anatomy_actions.run(RunContext('tutor'), 'scenario', 'Heart', None)
    assert result['status'] == 'no_source'


def test_uncited_cards_are_rejected():
    assert anatomy_actions.validate('flashcards', {
        'cards': [{'front': 'Một?', 'back': 'Không nguồn'}, {'front': 'Hai?', 'back': 'Đúng [1]'},
                  {'front': 'Ba?', 'back': 'Đúng [1]'}],
    }, 1, card_count=3)


def test_flashcards_follow_requested_focus_count_and_source(monkeypatch):
    monkeypatch.setattr(anatomy_actions, 'search', lambda *_args, **_kwargs: ([source()], {}))
    prompts = []

    def generate(_ctx, _key, _system, prompt, **_kwargs):
        prompts.append(prompt)
        return json.dumps({'cards': [
            {'front': f'Xoang vành {i} đổ vào đâu?', 'back': 'Tâm nhĩ phải [1].',
             'source_n': 1, 'source_quote': 'The coronary sinus empties into the right atrium.'}
            for i in range(1, 4)
        ]})

    monkeypatch.setattr(anatomy_actions, 'chat', generate)
    result = anatomy_actions.run(RunContext('tutor'), 'flashcards', 'Heart', None,
                                 topic='Xoang vành', card_count=3, focus_note='Đường dẫn lưu máu')
    assert result['status'] == 'ok'
    assert len(result['data']['cards']) == 3
    assert 'Đường dẫn lưu máu' in prompts[0]
    assert 'đúng 3 flashcard' in prompts[0]
    assert anatomy_actions.validate('flashcards', {'cards': [{
        'front': 'Xoang vành đổ vào đâu?', 'back': 'Tâm nhĩ phải [1].',
        'source_n': 1, 'source_quote': 'Nguồn không có câu này',
    }]}, 1, hits=[source()], card_count=1)


def test_flashcard_request_limits_count():
    assert AnatomyActionIn(action='flashcards', card_count=4, focus_note='Vị trí').card_count == 4
    with pytest.raises(ValidationError):
        AnatomyActionIn(action='flashcards', card_count=11)
