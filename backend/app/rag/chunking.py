from __future__ import annotations

import re


def split_markdown_sections(markdown: str) -> list[tuple[str, str]]:
    """Split on level-2 headings (##). Returns (heading, body) pairs."""
    text = markdown.strip()
    if not text:
        return []

    lines = text.split("\n")
    sections: list[tuple[str, str]] = []
    current_title = "Overview"
    current_lines: list[str] = []

    for line in lines:
        if re.match(r"^## [^#]", line):
            if current_lines:
                body = "\n".join(current_lines).strip()
                if body:
                    sections.append((current_title, body))
            current_title = line[3:].strip()
            current_lines = [line]
        else:
            current_lines.append(line)

    if current_lines:
        body = "\n".join(current_lines).strip()
        if body:
            sections.append((current_title, body))

    if not sections:
        return [("Document", text)]

    return sections


def chunk_text(
    text: str,
    max_chars: int = 2800,
    overlap: int = 480,
) -> list[str]:
    """Split long text into overlapping windows (paragraph-aware)."""
    t = text.strip()
    if len(t) <= max_chars:
        return [t] if t else []

    paras = re.split(r"\n\n+", t)
    chunks: list[str] = []
    buf: list[str] = []
    buf_len = 0

    def flush() -> None:
        nonlocal buf, buf_len
        if not buf:
            return
        chunk = "\n\n".join(buf).strip()
        if chunk:
            chunks.append(chunk)
        buf = []
        buf_len = 0

    for p in paras:
        plen = len(p) + (2 if buf else 0)
        if buf_len + plen > max_chars and buf:
            flush()
            if chunks:
                tail = chunks[-1]
                if overlap and len(tail) > overlap:
                    overlap_text = tail[-overlap:]
                    buf = [overlap_text, p]
                    buf_len = len(overlap_text) + 2 + len(p)
                else:
                    buf = [p]
                    buf_len = len(p)
            else:
                buf = [p]
                buf_len = len(p)
        else:
            buf.append(p)
            buf_len += plen

    flush()

    out: list[str] = []
    for c in chunks:
        if len(c) <= max_chars:
            out.append(c)
            continue
        start = 0
        while start < len(c):
            end = min(start + max_chars, len(c))
            piece = c[start:end].strip()
            if piece:
                out.append(piece)
            if end >= len(c):
                break
            start = end - overlap if end - overlap > start else end

    return out


def build_chunks_for_document(
    markdown: str,
    max_chars: int = 2800,
    overlap: int = 480,
) -> list[tuple[str, str]]:
    """Returns list of (section_heading, chunk_text)."""
    result: list[tuple[str, str]] = []
    for heading, body in split_markdown_sections(markdown):
        for piece in chunk_text(body, max_chars=max_chars, overlap=overlap):
            result.append((heading, piece))
    return result
