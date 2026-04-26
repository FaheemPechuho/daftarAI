from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import settings
from app.rag.indexer import index_knowledge_base
from app.rag import gemini_llm
from app.rag.service import AskResponse, RAGService
from app.rag import st_embedder, store

logger = logging.getLogger("daftar")

_rag: RAGService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _rag
    logging.basicConfig(level=logging.INFO)
    qdrant = store.get_client()
    rebuild = settings.rebuild_kb_index
    store.ensure_collection(qdrant, recreate=rebuild)
    count = store.collection_point_count(qdrant)

    if rebuild or count == 0:
        st_embedder.warmup()
        logger.info("Indexing Daftar knowledge base into Qdrant (local embeddings)…")
        n = index_knowledge_base(qdrant)
        logger.info("Indexed %s chunks.", n)
    else:
        st_embedder.warmup()

    if settings.gemini_api_key.strip():
        gemini_llm.configure()
        _rag = RAGService()
    else:
        logger.warning(
            "GEMINI_API_KEY is not set; /ask is disabled. "
            "Embeddings use Sentence Transformers locally; add Gemini for chat."
        )
        _rag = None
    yield
    _rag = None


app = FastAPI(title="Daftar API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskBody(BaseModel):
    query: str = Field(..., min_length=1, max_length=8000)


@app.get("/health")
def health() -> dict:
    qc = store.get_client()
    try:
        n = store.collection_point_count(qc)
    except Exception:
        n = -1
    return {
        "status": "ok",
        "qdrant_chunks": n,
        "embedding_model": settings.local_embedding_model,
        "embedding_dims": settings.embedding_dimensions,
        "rag_enabled": bool(settings.gemini_api_key.strip()) and _rag is not None,
    }


@app.post("/ask", response_model=AskResponse)
def ask(body: AskBody) -> AskResponse:
    if _rag is None:
        raise HTTPException(
            status_code=503,
            detail="RAG chat is not configured. Set GEMINI_API_KEY in backend/.env and restart.",
        )
    try:
        return _rag.ask(body.query.strip())
    except Exception as e:
        logger.exception("ask failed")
        raise HTTPException(status_code=502, detail=str(e)) from e
