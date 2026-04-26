# Daftar — Implementation History & Status

---

## Phase 1 — React/Vite Migration (COMPLETED)

**Goal:** Migrate from vanilla HTML/JS/CSS to Vite + React (TypeScript) + Tailwind CSS with a Gemini-style dark UI.

**What was built:**
- `frontend/` scaffolded with `create-vite` (react-ts template)
- Tailwind CSS v4 configured via `@import "tailwindcss"` in `index.css`
- Single `App.tsx` with Gemini-style layout:
  - Sidebar (hamburger, new chat, hardcoded history, settings)
  - Empty state: centered greeting, floating input pill, suggestion chips
  - Active chat: messages list, bottom-docked input
- Backend: `main.py` (FAISS + Groq Llama 3.1) serving at port 8002
- Production: FastAPI mounts `frontend/dist` as static files

---

## Phase 2 — UI Overhaul, Chat History & Groq Whisper STT (COMPLETED)

**Date:** 2026-04-27

### Changes made

#### Frontend (`frontend/src/`)

| File | Action | Description |
|------|--------|-------------|
| `vite.config.ts` | Modified | Added `server.proxy` routing `/ask` and `/transcribe` → `localhost:8002` |
| `src/types.ts` | Created | `UserMessage`, `BotMessage`, `ChatSession` TypeScript interfaces |
| `src/hooks/useChatSessions.ts` | Created | localStorage-backed hook: session CRUD, message append, last-message patch |
| `src/components/ChatMessage.tsx` | Created | Structured bot response renderer: markdown answer, steps list, source badge, warning alert |
| `src/components/Sidebar.tsx` | Created | Dynamic session history grouped Today/Yesterday/Older; delete on hover |
| `src/components/ChatInput.tsx` | Created | Auto-resize textarea + Groq Whisper mic (MediaRecorder → POST /transcribe) |
| `src/App.tsx` | Rewritten | Wires all components; uses `useChatSessions` for persistent history |
| `src/index.css` | Modified | Added `@plugin "@tailwindcss/typography"` for `prose-*` markdown classes |

#### Backend (`main.py` — root)

| Change | Description |
|--------|-------------|
| Import `UploadFile`, `File` from FastAPI | Enables multipart file uploads |
| `POST /transcribe` endpoint | Accepts audio blob, calls `Groq whisper-large-v3-turbo`, returns `{ text }` |

#### Dependencies added

| Package | Where | Purpose |
|---------|-------|---------|
| `react-markdown` | frontend npm | Markdown rendering in bot answers |
| `remark-gfm` | frontend npm | GFM tables/strikethrough/autolinks |
| `@tailwindcss/typography` | frontend npm | `prose-*` Tailwind classes |
| `python-multipart==0.0.9` | `requirements.txt` | FastAPI file upload support |

### Architecture

```
frontend/src/
  types.ts                    # shared interfaces
  hooks/
    useChatSessions.ts        # localStorage persistence
  components/
    Sidebar.tsx               # session history sidebar
    ChatMessage.tsx           # structured message renderer
    ChatInput.tsx             # textarea + mic STT
  App.tsx                     # layout + state wiring
  index.css                   # Tailwind v4 + typography plugin
```

### How to run (development)

```bash
# Terminal 1 — backend
cd D:/Faheem/Work/Legal_System/daftar
uvicorn main:app --port 8002 --reload

# Terminal 2 — frontend dev server
cd frontend
npm run dev
# Opens at http://localhost:5173
# /ask and /transcribe are proxied to :8002
```

### How to run (production)

```bash
cd frontend && npm run build
cd ..
uvicorn main:app --port 8002
# FastAPI serves frontend/dist at /
```

---

## Phase 3 — UI Polish, Branding & Off-topic Filtering (COMPLETED)

**Date:** 2026-04-27

### Changes made

#### Frontend (`frontend/src/`)

| File | Change | Detail |
|------|--------|--------|
| `components/ChatInput.tsx` | Rewritten | Removed `min-h-[54px]` that caused oversized empty input; auto-resize now sets height to `0px` first then `scrollHeight` to eliminate phantom scrollbar; added `overflow-hidden` on textarea; flattened layout so textarea + buttons share one row (`items-end`); send button is now a filled white circle (ChatGPT style) |
| `App.tsx` | Rewritten | Rebranded welcome screen: headline **"Your office, at your doorstep."**, Urdu subtitle `دفتر · Your Legal Office`, no-lawyer tagline; suggestion chips replaced with **2×2 card grid** placed above the input (each card has icon badge + bold title + hint line); header shows `🏛️ Daftar` + tagline |

#### Backend (`main.py` — root)

| Change | Detail |
|--------|--------|
| `OUT_OF_SCOPE_KEYWORDS` expanded | Grew from 12 → ~40 terms covering conversational queries (`"joke"`, `"recipe"`, `"weather"`, `"sports"`…), additional legal topics (`"nikah"`, `"talaq"`, `"fir"`…), health, politics |
| Semantic relevance gate added | After FAISS retrieval, `chunks[0]["score"] < RELEVANCE_THRESHOLD (0.28)` → immediate out-of-scope response; blocks anything with low cosine similarity to KB (e.g. "tell me a joke" scores ~0.05) |
| `SYSTEM_PROMPT` tightened | Added absolute rule 1: if question is off-topic, return a fixed refusal JSON; `"source"` documented as always non-null string |
| `None` → `""` bug fixed | `result.get("source", "")` replaced with `result.get("source") or ""` (and same for `answer`, `steps`, `warning`) — `dict.get(key, default)` ignores the default when key exists with `None` value, causing Pydantic `ValidationError` on `str` field |

### Off-topic filtering layers (3-layer defence)

```
Query
  │
  ├─ Layer 1: OUT_OF_SCOPE_KEYWORDS block-list (~40 terms)
  │           catches: joke, weather, divorce, visa, medicine …
  │
  ├─ Layer 2: Semantic relevance gate (FAISS score < 0.28)
  │           catches: anything semantically unrelated to business KB
  │
  └─ Layer 3: System prompt rule
              LLM instructed to return refusal JSON for off-topic input
```

---

## Phase 4 — RAG Pipeline Fixes (pending)

Full audit findings and implementation order documented in:
**`.cursor/phase4-rag-fixes.md`**

12 flaws identified — 3 critical, 4 significant, 5 minor.
Fix criticals before any production deployment.

**Critical fixes:**
- [ ] C1: Build `KEYWORD_MAP` dynamically from `kb_index.json` instead of hardcoding
- [ ] C2: Remove `[1][2][3]` chunk numbering from `build_context()` (contradicts system prompt)
- [ ] C3: Remove/wire unused `MAX_CHUNK_TOKENS` and `CHUNK_OVERLAP` constants

**Significant fixes:**
- [ ] S1: Apply relevance threshold to raw score, not boosted score
- [ ] S2: Wire or delete phantom `chunking_config.json`
- [ ] S3: Free `self.embeddings` numpy array after FAISS index is built
- [ ] S4: Migrate `@app.on_event("startup")` to `asynccontextmanager lifespan`

**Minor fixes:**
- [ ] M1: Explore using `related_docs` for retrieval expansion
- [ ] M2: Fix `total_documents: 20` → 24 in `kb_index.json`
- [ ] M3: Remove `citations/source_index.md` from retrieval index
- [ ] M4: Resolve KB and cache paths relative to `__file__` not CWD
- [ ] M5: Adaptive `TOP_K` based on query complexity

## Phase 5 — Future Features

- [ ] Extend speech-to-text to support Urdu (`language="ur"`) with a language toggle
- [ ] Streaming responses (Server-Sent Events) for a more real-time feel
- [ ] User authentication / multi-user sessions
- [ ] Mobile-responsive sidebar (drawer overlay on small screens)
- [ ] Tune `RELEVANCE_THRESHOLD` based on real user queries (current: 0.28)
