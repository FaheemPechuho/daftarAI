# Phase 4 — RAG Pipeline Fixes

**Status:** Pending  
**Audit date:** 2026-04-27  
**Priority:** Fix criticals before any production deployment

---

## Background

A full audit of the RAG pipeline was conducted on 2026-04-27. 12 flaws were found across `main.py`, `kb_index.json`, and the chunking/retrieval logic. They are listed below in priority order.

---

## Critical (fix first)

### C1 — `retrieval_keywords` in `kb_index.json` are silently ignored

Every KB document has a `"retrieval_keywords"` array (e.g. `["private limited", "pvt ltd", "register company"]`). These are never read by `main.py`. The code uses a completely separate hardcoded `KEYWORD_MAP` dict instead.

**Impact:** Updating the KB index has zero effect on retrieval boosting. Adding a new document requires manually editing both `kb_index.json` AND `KEYWORD_MAP` in `main.py`. They are already diverging.

**Fix:** At startup, after loading `kb_index.json`, dynamically build `KEYWORD_MAP` from `retrieval_keywords` → `doc_id` instead of the hardcoded dict.

```python
# Build keyword → doc_id boost map from kb_index.json at startup
KEYWORD_MAP: dict[str, list[str]] = {}
for doc in doc_index:
    for kw in doc.get("retrieval_keywords", []):
        KEYWORD_MAP.setdefault(kw.lower(), []).append(doc["id"])
```

---

### C2 — Context chunk numbering `[1][2][3]` contradicts the system prompt

`build_context()` prefixes each chunk with `[1]`, `[2]`, `[3]`:

```python
parts.append(f"[{i}] ({c['source_label']})\n{c['text']}")
```

The system prompt explicitly says: *"NEVER include reference markers like [1], [2], [3]"*. The LLM sees these in its input and is likely to echo them in answers, fighting the instruction.

**Fix:** Replace numbered markers with a plain section heading using `source_label`:

```python
parts.append(f"--- {c['source_label']} ---\n{c['text']}")
```

---

### C3 — `MAX_CHUNK_TOKENS` and `CHUNK_OVERLAP` constants do nothing

Defined at the top of `main.py`:
```python
MAX_CHUNK_TOKENS = 700   # never used
CHUNK_OVERLAP    = 2     # never used
```

`split_into_chunks()` uses `max_chars=2000` and `overlap_chars=200` hardcoded as default arguments. These constants mislead anyone reading the config.

**Fix:** Either wire the constants into the function call, or delete them and document the actual values as inline comments.

---

## Significant

### S1 — Score boost applied before relevance threshold gate

In `retrieve()`, the 1.2× keyword boost is applied to scores before `ask()` checks `chunks[0]["score"] < RELEVANCE_THRESHOLD`. A mildly off-topic query containing a boosted keyword (e.g. "I had my **annual** check-up") could be pushed above the 0.28 threshold and reach the LLM.

**Fix:** Store `raw_score` and `boosted_score` separately. Apply the threshold to `raw_score` only.

```python
results.append({
    **chunk,
    "raw_score": float(score),
    "score": float(score) * boosted,
})
# In ask():
if not chunks or chunks[0].get("raw_score", 0) < RELEVANCE_THRESHOLD:
    ...
```

---

### S2 — `chunking_config.json` is a phantom config file

`daftar_knowledge_base/metadata/chunking_config.json` exists but is never read by `main.py`. Anyone who edits it expecting to change chunking behaviour will be silently ignored.

**Fix:** Either read it in `split_into_chunks()` to control `max_chars` and `overlap_chars`, or delete the file and document chunking params inline.

---

### S3 — `self.embeddings` numpy array kept in RAM after FAISS index is built

```python
self.embeddings = embeddings.astype(np.float32)
self.faiss_index.add(self.embeddings)
# self.embeddings is never used again — wastes RAM
```

FAISS internalises the vectors. The raw numpy array should be released.

**Fix:**
```python
self.faiss_index.add(embeddings.astype(np.float32))
self.embeddings = None   # free RAM
```

---

### S4 — `@app.on_event("startup")` is deprecated in FastAPI

**Fix:** Migrate to the `asynccontextmanager` lifespan pattern:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    doc_index = load_kb_index(KB_PATH)
    rag_index.build(KB_PATH, doc_index)
    yield
    # shutdown (nothing needed)

app = FastAPI(title="Daftar API", lifespan=lifespan)
```

---

## Minor

### M1 — `related_docs` field never used (missed expansion opportunity)

Every document in `kb_index.json` has a `"related_docs"` list. These could boost retrieval of related chunks when a primary document matches strongly — a simple way to improve recall without a more complex retrieval strategy.

**Future idea:** After retrieving top-K chunks, check if `related_docs` of top-1 document have not already appeared; if so, add one chunk from the most related document.

---

### M2 — `total_documents: 20` in `kb_index.json` but 24 documents listed

The header says `"total_documents": 20`; the `documents` array has **24 entries**. Does not break functionality.

**Fix:** Update to `"total_documents": 24`.

---

### M3 — `citations/source_index.md` is indexed and may pollute retrieval

This document contains source citations for researchers, not user-facing knowledge (`audience: ["rag-system", "researcher"]`). It will surface in semantic search for many queries, potentially displacing more relevant content.

**Fix:** Remove `citations-source-index` from `kb_index.json` `documents` array, or add a `"rag_indexed": false` flag and skip it during indexing.

---

### M4 — CWD-relative paths are fragile in production

```python
KB_PATH   = Path(os.environ.get("KB_PATH", "./daftar_knowledge_base"))
CACHE_DIR = Path(".cache")
```

If uvicorn is started from a different working directory, both paths silently resolve incorrectly.

**Fix:** Resolve paths relative to `__file__` and validate KB exists at startup:

```python
_ROOT = Path(__file__).parent
KB_PATH   = Path(os.environ.get("KB_PATH", str(_ROOT / "daftar_knowledge_base")))
CACHE_DIR = _ROOT / ".cache"

# Validate at startup:
if not KB_PATH.exists():
    raise RuntimeError(f"Knowledge base not found at {KB_PATH}. Set KB_PATH env var.")
```

---

### M5 — Fixed `TOP_K = 4` regardless of query complexity

Every query retrieves exactly 4 chunks. Simple fact lookups waste LLM context; complex comparison queries may miss relevant content.

**Future idea:** Adaptive TOP_K — use 3 for short queries, 6 for queries containing "compare", "difference", "all structures", etc.

---

## Implementation Order (when resuming)

1. C3 — fix/remove unused constants (2 min)
2. M2 — fix `total_documents` count in `kb_index.json` (1 min)
3. C2 — fix context chunk numbering (5 min)
4. S3 — free embeddings array after FAISS build (2 min)
5. C1 — dynamically build `KEYWORD_MAP` from `kb_index.json` (15 min)
6. S1 — separate raw/boosted scores for threshold gate (10 min)
7. S4 — migrate to lifespan pattern (10 min)
8. M4 — fix CWD-relative paths (10 min)
9. M3 — remove citations doc from retrieval index (5 min)
10. S2 — wire or delete `chunking_config.json` (20 min)
11. M1 / M5 — related_docs expansion, adaptive TOP_K (future sprint)
