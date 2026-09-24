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
