"""
Ngữ cảnh 1 lượt chạy: ai gọi, tính năng gì, trace Langfuse, và danh sách lần gọi model (token, độ trễ).
Backend (be) nhận danh sách này để ghi nhật ký, tính tiền, trừ hạn mức.
"""

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class UsageEntry:
    step: str                 # vd. "generate", "verify", "translate_query", "embed_query"
    kind: str                 # "chat" | "embedding"
    provider: str             # "groq" | "gemini"
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: int = 0
    status: str = 'ok'        # "ok" | "error"
    error: str = ''
    cached: bool = False


@dataclass
class RunContext:
    feature: str
    user_id: str = ''
    trace_id: str | None = None
    trace_url: str | None = None
    callbacks: list[Any] = field(default_factory=list)
    usage: list[UsageEntry] = field(default_factory=list)

    def record(self, entry: UsageEntry):
        self.usage.append(entry)

    def meta(self) -> dict:
        return {
            'feature': self.feature,
            'trace_id': self.trace_id,
            'trace_url': self.trace_url,
            'usage': [asdict(u) for u in self.usage],
        }
