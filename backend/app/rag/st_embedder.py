from __future__ import annotations

import logging

from sentence_transformers import SentenceTransformer

from app.config import settings

logger = logging.getLogger("daftar")

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("Loading SentenceTransformer model %r…", settings.local_embedding_model)
        _model = SentenceTransformer(settings.local_embedding_model)
        get_dim = getattr(_model, "get_embedding_dimension", None) or getattr(_model, "get_sentence_embedding_dimension", None)
        dim = get_dim() if get_dim else settings.embedding_dimensions
        if dim != settings.embedding_dimensions:
            raise ValueError(
                f"Model {settings.local_embedding_model!r} outputs dimension {dim}, "
                f"but EMBEDDING_DIMENSIONS={settings.embedding_dimensions}. "
                "Set EMBEDDING_DIMENSIONS in .env to match the model."
            )
    return _model


def warmup() -> None:
    """Load weights once at startup so first /ask is not slow."""
    get_model()


def embed_documents(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    model = get_model()
    vectors = model.encode(
        texts,
        batch_size=max(1, settings.st_encode_batch_size),
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return [vectors[i].tolist() for i in range(len(texts))]


def embed_query(text: str) -> list[float]:
    model = get_model()
    v = model.encode(
        text,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return v.tolist()
