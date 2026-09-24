"""Cấu hình service AI (đọc từ biến môi trường / .env)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    # Bảo vệ: chỉ backend (be) được gọi service này
    ai_service_token: str = ''

    # Kho tri thức (Neon Postgres) — service AI chỉ ĐỌC
    database_url: str = ''
    redis_url: str = 'redis://localhost:6379/1'

    # LLM (Groq, API tương thích OpenAI)
    groq_api_key: str = ''
    groq_model: str = 'qwen/qwen3.8-27b'
    groq_base_url: str = 'https://api.groq.com/openai/v1'
    llm_min_interval: float = 2.0  # giây giữa 2 lần gọi (gói miễn phí giới hạn lượt/phút)

    # Embedding (Gemini)
    gemini_api_key: str = ''
    gemini_embed_model: str = 'gemini-embedding-001'
    embed_dimensions: int = 768

    # Langfuse (tùy chọn) — xem trace từng bước
    langfuse_public_key: str = ''
    langfuse_secret_key: str = ''
    langfuse_host: str = 'https://cloud.langfuse.com'

    @property
    def langfuse_enabled(self) -> bool:
        return bool(self.langfuse_public_key and self.langfuse_secret_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
