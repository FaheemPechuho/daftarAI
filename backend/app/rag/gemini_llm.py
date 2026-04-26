from __future__ import annotations

import logging
import re
import time
from collections.abc import Callable
from typing import TypeVar

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.config import settings

logger = logging.getLogger("daftar")

_client: genai.Client | None = None

T = TypeVar("T")


def configure() -> None:
    global _client
    _client = genai.Client(api_key=settings.gemini_api_key)


def _client_or_raise() -> genai.Client:
    if _client is None:
        raise RuntimeError("Gemini client not configured; call gemini_llm.configure() first")
    return _client


def _retry_after_seconds(exc: genai_errors.ClientError) -> float:
    msg = (exc.message or str(exc)) or ""
    m = re.search(r"retry in ([\d.]+)\s*s", msg, re.IGNORECASE)
    if m:
        return float(m.group(1)) + 2.0
    return settings.gemini_429_fallback_sleep_sec


def _with_429_retries(operation: str, fn: Callable[[], T]) -> T:
    last: BaseException | None = None
    for attempt in range(1, settings.gemini_max_retries + 1):
        try:
            return fn()
        except genai_errors.ClientError as e:
            last = e
            if e.code != 429:
                raise
            wait = _retry_after_seconds(e)
            logger.warning(
                "%s: Gemini rate limit (429), sleeping %.1fs (attempt %s/%s)",
                operation,
                wait,
                attempt,
                settings.gemini_max_retries,
            )
            time.sleep(wait)
    raise RuntimeError(f"{operation}: exceeded retries after 429 responses") from last


def generate_json(system_instruction: str, user_text: str) -> str:
    client = _client_or_raise()

    def _one() -> str:
        r = client.models.generate_content(
            model=settings.gemini_chat_model,
            contents=user_text,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
                response_mime_type="application/json",
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True,
                ),
            ),
        )
        return (r.text or "").strip() or "{}"

    return _with_429_retries("generate_json", _one)
