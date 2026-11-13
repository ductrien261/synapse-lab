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


class AlgorithmHeading(BaseModel):
    level: int = Field(ge=2, le=5)
    title: str = Field(min_length=1, max_length=200)


class AlgorithmExplicitSource(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    url: str = Field(min_length=1, max_length=600)
    license_name: str = Field(default='', max_length=200)
    content: str = Field(min_length=200, max_length=60000)
    topics: list[str] = Field(default_factory=list, max_length=100)
    headings: list[AlgorithmHeading] = Field(default_factory=list, max_length=100)
    pseudocode: str = Field(default='', max_length=10000)


class DraftAlgorithmIn(Caller):
    name: str = Field(min_length=1, max_length=200)
    category: str = Field(default='', max_length=100)
    document_ids: list[str] = Field(default_factory=list, max_length=20)
    explicit_sources: list[AlgorithmExplicitSource] = Field(default_factory=list, max_length=8)


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


class AnatomyActionIn(Caller):
    action: Literal['quiz', 'scenario', 'summary', 'flashcards']
    model_title: str = Field(default='', max_length=300)
    part: TutorPart | None = None
    topic: str = Field(default='', max_length=160)
    style: Literal['clinic', 'imaging'] = 'clinic'
    question_count: int = Field(default=5, ge=1, le=10)
    quiz_style: Literal['theory', 'application', 'practice'] = 'theory'
    card_count: int = Field(default=5, ge=1, le=10)
    focus_note: str = Field(default='', max_length=200)


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


class AlgorithmQuizOptions(BaseModel):
    count: int = Field(ge=1, le=5)
    difficulty: Literal['easy', 'medium', 'hard']
    focus: Literal['mixed', 'problem', 'principle', 'trace', 'complexity', 'application']
    topic: str = Field(default='', max_length=200)


class AlgorithmCodeSelection(BaseModel):
    start_line: int = Field(ge=1)
    end_line: int = Field(ge=1)
    code: str = Field(min_length=1, max_length=12000)


class AlgorithmScenarioOptions(BaseModel):
    topic: str = Field(min_length=1, max_length=160)
    style: Literal['trace', 'application']


class AlgorithmFlashcardOptions(BaseModel):
    topic: str = Field(min_length=1, max_length=160)
    count: int = Field(ge=1, le=10)
    focus: str = Field(default='', max_length=200)


class AlgorithmTutorIn(Caller):
    action: Literal['ask', 'quiz', 'scenario', 'summary', 'hint', 'explain_code', 'flashcards']
    lesson: dict
    question: str = Field(default='', max_length=500)
    frame: dict | None = None
    quiz_options: AlgorithmQuizOptions | None = None
    scenario_options: AlgorithmScenarioOptions | None = None
    flashcard_options: AlgorithmFlashcardOptions | None = None
    code_selection: AlgorithmCodeSelection | None = None


class LabExplainIn(Caller):
    lab: Literal['arm', 'car', 'iot']
    mode: Literal['explain', 'ask', 'hint']
    stage: str = Field(default='', max_length=40)
    state: dict
    question: str = Field(default='', max_length=500)


class ClassroomCopilotIn(Caller):
    document_title: str = Field(default='', max_length=300)
    page: int = Field(ge=1)
    total_pages: int = Field(default=1, ge=1)
    section_title: str = Field(default='', max_length=300)
    lesson_objective: str = Field(default='', max_length=2000)
    section_objective: str = Field(default='', max_length=2000)
    teacher_notes: str = Field(default='', max_length=3000)
    page_text: str = Field(min_length=1, max_length=15000)


class ClassroomAssistantIn(Caller):
    document_title: str = Field(default='', max_length=300)
    section_title: str = Field(default='', max_length=300)
    lesson_objective: str = Field(default='', max_length=2000)
    current_page: int = Field(ge=1)
    total_pages: int = Field(default=1, ge=1)
    question: str = Field(min_length=1, max_length=8000)
    page_contexts: list[dict] = Field(default_factory=list, max_length=3)
    history: list[dict] = Field(default_factory=list, max_length=12)
