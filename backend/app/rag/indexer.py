from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from qdrant_client import QdrantClient

from app.config import settings
from app.rag.chunking import build_chunks_for_document
from app.rag import st_embedder, store


def load_kb_index(kb_root: Path) -> dict[str, Any]:
    path = kb_root / "metadata" / "kb_index.json"
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def iter_document_paths(kb_index: dict[str, Any]) -> list[dict[str, Any]]:
    docs = kb_index.get("documents") or []
    return [d for d in docs if isinstance(d, dict) and d.get("path")]


def read_markdown(kb_root: Path, rel_path: str) -> str:
    root = kb_root.resolve()
    path = (root / rel_path).resolve()
    try:
        path.relative_to(root)
    except ValueError as e:
        raise ValueError(f"Invalid path: {rel_path}") from e
    return path.read_text(encoding="utf-8")


def index_knowledge_base(qdrant: QdrantClient) -> int:
    kb_root = settings.kb_root
    kb_index = load_kb_index(kb_root)
    docs = iter_document_paths(kb_index)

    texts: list[str] = []
    payloads: list[dict[str, Any]] = []

    for meta in docs:
        rel = meta["path"]
        doc_id = meta.get("id") or rel
        try:
            md = read_markdown(kb_root, rel)
        except OSError:
            continue

        for heading, chunk in build_chunks_for_document(md):
            texts.append(chunk)
            payloads.append(
                {
                    "document_id": doc_id,
                    "document_path": rel,
                    "section_heading": heading,
                    "text": chunk,
                    "topic": meta.get("topic"),
                    "type": meta.get("type"),
                }
            )

    if not texts:
        return 0

    vectors = st_embedder.embed_documents(texts)
    store.upsert_chunks(qdrant, vectors, payloads)
    return len(texts)
