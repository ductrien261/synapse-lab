"""Hợp đồng dữ liệu giữa backend (be) và service AI."""

from typing import Literal

from pydantic import BaseModel, Field


class Caller(BaseModel):
    """Ai đang dùng (để gắn vào trace Langfuse)."""

    user_id: str = ''


class TranslateIn(Caller):
    text: str = Field(min_length=1, max_length=6000)
    target: Literal['vi', 'en'] = 'vi'


class SearchIn(Caller):
    query: str = Field(min_length=1, max_length=500)
    k: int = Field(default=5, ge=1, le=20)
    scope: str | None = None
    per_section: int = Field(default=2, ge=1, le=5)
    document_ids: list[str] | None = None


class DraftStructureIn(Caller):
    name_en: str = Field(min_length=1, max_length=200)
    latin_name: str = ''
    name_vi: str = ''
    glossary: list[list[str]] = Field(default_factory=list, description='[[name_en, name_vi], ...] đã duyệt')
    scope: str = 'med'


class TutorPart(BaseModel):
    index: int
    name_en: str = ''
    name_vi: str = ''


class TutorAskIn(Caller):
    question: str = Field(min_length=1, max_length=1000)
    history: list[dict] = Field(default_factory=list, description='[{role: user|assistant, content}] các lượt trước')
    learner: dict = Field(default_factory=dict, description='{name, track, recent: [...]}')
    model_title: str = ''
    part: TutorPart | None = None
    parts: list[TutorPart] = Field(default_factory=list)
    scope: str | None = 'med'


class QuickCheckIn(Caller):
    topic: str = ''
    answer: str = Field(default='', max_length=6000)
    sources: list[dict] = Field(default_factory=list, description='[{heading, excerpt}] theo đúng thứ tự [n]')


class QuizGenerateIn(Caller):
    kind: Literal['mcq', 'case', 'short']
    difficulty: int = Field(default=1, ge=1, le=3)
    structure: dict = Field(description='{name_en, name_vi, latin_name}')
    sources: list[dict] = Field(default_factory=list, description='[{heading, excerpt}] theo thứ tự [n]')
    misconceptions: list[str] = Field(default_factory=list)
    avoid: list[str] = Field(default_factory=list)


class QuizGradeIn(Caller):
    question: str
    rubric: list[str]
    sources: list[dict] = Field(default_factory=list)
    answer: str = Field(default='', max_length=3000)
