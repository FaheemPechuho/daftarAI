from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_kb_root() -> Path:
    # backend/app/config.py -> parents[2] == repo root (daftar)
    return Path(__file__).resolve().parents[2] / "daftar_knowledge_base"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    qdrant_url: str
    qdrant_api_key: str
    gemini_api_key: str = ""
    groq_api_key: str = ""

    gemini_chat_model: str = "gemini-2.0-flash"
    gemini_max_retries: int = 8
    # When a 429 has no Retry-After hint, wait this long (free tier is often per-minute).
    gemini_429_fallback_sleep_sec: float = 62.0

    local_embedding_model: str = "all-MiniLM-L6-v2"
    st_encode_batch_size: int = 32

    daftar_kb_root: Path | None = None

    rebuild_kb_index: bool = False
    qdrant_collection: str = "daftar_kb"
    retrieval_top_k: int = 8
    # Must match SentenceTransformer output (all-MiniLM-L6-v2 → 384).
    embedding_dimensions: int = 384

    @property
    def kb_root(self) -> Path:
        root = self.daftar_kb_root or _default_kb_root()
        return root.resolve()


settings = Settings()
