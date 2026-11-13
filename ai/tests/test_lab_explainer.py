import json

import pytest

from app.graphs import lab_explainer
from app.llm.chat import LLMError
from app.llm.context import RunContext

STATE = {'torque_nm': {'shoulder_lift': 1.4}, 'stall_limit_nm': 1.91}


def test_explain_retries_invalid_json_and_sends_state(monkeypatch):
    prompts = []
    replies = iter([{'title': '', 'content': ''}, {'title': 'Giải thích', 'content': 'Vai chịu 1,4 N·m.'}])

    def fake_chat(_ctx, _step, system, prompt, **_kwargs):
        prompts.append((system, prompt))
        return json.dumps(next(replies))

    monkeypatch.setattr(lab_explainer, 'chat', fake_chat)
    result = lab_explainer.run(RunContext('lab_explain'), 'explain', 'arm', 'tune', STATE)
    assert result['content'] == 'Vai chịu 1,4 N·m.'
    assert len(prompts) == 2
    assert 'shoulder_lift' in prompts[0][1]
    assert 'Không tự tính lại vật lý' in prompts[0][0]


def test_rejects_bad_input_without_calling_model(monkeypatch):
    monkeypatch.setattr(lab_explainer, 'chat', lambda *a, **k: pytest.fail('không được gọi model'))
    ctx = RunContext('lab_explain')
    with pytest.raises(ValueError):
        lab_explainer.run(ctx, 'ask', 'arm', 'tune', STATE, question='  ')
    with pytest.raises(ValueError):
        lab_explainer.run(ctx, 'explain', 'unknown', 'tune', STATE)
    with pytest.raises(ValueError):
        lab_explainer.run(ctx, 'explain', 'arm', 'tune', {'x': 'a' * 5000})


def test_gives_up_after_two_invalid_replies(monkeypatch):
    monkeypatch.setattr(lab_explainer, 'chat', lambda *a, **k: json.dumps({'title': 'x'}))
    with pytest.raises(LLMError):
        lab_explainer.run(RunContext('lab_explain'), 'hint', 'car', 'calc', STATE)
