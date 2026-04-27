from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, Field, ValidationError

from app.config import settings
from app.rag import gemini_llm, groq_llm, st_embedder, store

OUT_OF_SCOPE_KEYWORDS = [
    "divorce",
    "criminal",
    "marriage",
    "property dispute",
    "immigration",
    "custody",
    "murder",
    "accident",
]


class AskResponse(BaseModel):
    answer: str
    steps: list[str] = Field(default_factory=list)
    source: str = ""
    warning: str | None = None


SYSTEM_PROMPT = """You are Daftar, a concise assistant for Pakistani founders on business registration and compliance (SECP, FBR, NTN, STRN/Sales Tax, structures, payroll basics).

Rules:
- Answer ONLY using the provided CONTEXT. If context is insufficient, say what you can infer from it and note gaps—do not invent procedures, thresholds, or law.
- Use plain language. Use **double asterisks** for bold on key terms where helpful.
- The user interface shows: answer paragraph, numbered-style steps as a list, a short source line, and an optional warning (e.g. verify thresholds on official sites).
- "source" should name the authority (e.g. FBR, SECP) and optionally the portal or act, matching tone of CONTEXT.
- "steps" should be actionable bullets as short strings (no numbering in the string; the UI numbers them).
- If the topic is outside Pakistani business registration/compliance, set answer to a brief refusal, steps to [], source to "", warning explaining scope.

Respond with a single JSON object only, keys: answer (string), steps (array of strings), source (string), warning (string or null).
"""


def is_out_of_scope(query: str) -> bool:
    q = query.lower()
    return any(kw in q for kw in OUT_OF_SCOPE_KEYWORDS)


def format_context(hits: list[dict[str, Any]]) -> str:
    blocks: list[str] = []
    for i, h in enumerate(hits, start=1):
        path = h.get("document_path", "")
        heading = h.get("section_heading", "")
        body = h.get("text", "")
        blocks.append(f"[{i}] ({path}) ## {heading}\n{body}")
    return "\n\n---\n\n".join(blocks)


class RAGService:
    def __init__(self) -> None:
        self._qdrant = store.get_client()

    def embed_query(self, query: str) -> list[float]:
        return st_embedder.embed_query(query)

    def retrieve(self, query: str) -> list[dict[str, Any]]:
        vec = self.embed_query(query)
        return store.search(self._qdrant, vec, limit=settings.retrieval_top_k)

    def ask(self, query: str) -> AskResponse:
        if is_out_of_scope(query):
            return AskResponse(
                answer=(
                    "I only cover Pakistani business registration and compliance "
                    "(SECP, FBR, NTN, STN/sales tax, and related topics). "
                    "For other legal matters, please consult a qualified lawyer."
                ),
                steps=[],
                source="",
                warning=None,
            )

        hits = self.retrieve(query)
        if not hits:
            return AskResponse(
                answer=(
                    "I could not find relevant knowledge base content for that question yet. "
                    "Try rephrasing with terms like SECP, NTN, STRN, or private limited."
                ),
                steps=[],
                source="",
                warning=None,
            )

        ctx = format_context(hits)
        user_msg = f"USER QUESTION:\n{query}\n\nCONTEXT:\n{ctx}"

        try:
            # Prefer Groq (fast, llama-3.1-8b-instant) when key is available,
            # fall back to Gemini.
            if settings.groq_api_key.strip():
                raw = groq_llm.generate_json(SYSTEM_PROMPT, user_msg) or "{}"
            else:
                raw = gemini_llm.generate_json(SYSTEM_PROMPT, user_msg) or "{}"
        except RuntimeError as e:
            return AskResponse(
                answer=(
                    "The answer service is temporarily unavailable. "
                    "Please wait a moment and try again."
                ),
                steps=[],
                source="",
                warning=str(e),
            )
        try:
            data = json.loads(raw)
            return AskResponse.model_validate(data)
        except (json.JSONDecodeError, ValidationError):
            return AskResponse(
                answer=(
                    "I had trouble formatting the answer. Please try again or rephrase "
                    "your question (e.g. mention SECP, NTN, or your business structure)."
                ),
                steps=[],
                source="",
                warning=None,
            )

    def coerce_response(self, data: AskResponse) -> dict[str, Any]:
        d = data.model_dump()
        if d.get("warning") is None:
            d.pop("warning", None)
        return d
