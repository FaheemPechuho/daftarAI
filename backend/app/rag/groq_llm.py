from __future__ import annotations

import json
import logging
import re

from app.config import settings

logger = logging.getLogger("daftar")

GROQ_CHAT_MODEL = "llama-3.1-8b-instant"


def generate_json(system_prompt: str, user_text: str) -> str:
    """Call Groq Llama and return a JSON string."""
    from groq import Groq

    client = Groq(api_key=settings.groq_api_key)
    response = client.chat.completions.create(
        model=GROQ_CHAT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text},
        ],
        temperature=0.2,
        max_tokens=1024,
    )
    raw = (response.choices[0].message.content or "").strip()

    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    # Validate it's parseable JSON before returning
    try:
        json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Groq returned non-JSON, wrapping: %s", raw[:120])
        raw = "{}"
    return raw
