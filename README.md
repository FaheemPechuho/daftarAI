# Daftar — دفتر

**Your office, at your doorstep.**

Daftar is an AI-powered business registration and compliance assistant for Pakistani founders and freelancers. It answers questions about SECP company registration, FBR tax (NTN/STRN), business structures, and annual compliance — in plain language, without the need for a lawyer or office visit.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 19 + TypeScript + Tailwind CSS v4 |
| Backend | FastAPI + FAISS + Groq (Llama 3.1 8B) |
| Embeddings | sentence-transformers `all-MiniLM-L6-v2` (local, free) |
| Speech-to-Text | Groq Whisper `whisper-large-v3-turbo` |
| Chat History | Browser `localStorage` |
| Markdown Rendering | `react-markdown` + `remark-gfm` |

---

## Project Structure

```
daftar/
├── main.py                          ← FastAPI backend (API + conditional static serve)
├── requirements.txt
├── .env                             ← GROQ_API_KEY (not committed)
├── daftar_knowledge_base/
│   ├── metadata/kb_index.json       ← CRITICAL: document index for FAISS
│   ├── fbr/
│   ├── secp/
│   ├── comparisons/
│   └── ...
└── frontend/                        ← Vite React app
    ├── src/
    │   ├── types.ts                 ← shared TS interfaces
    │   ├── App.tsx                  ← layout + state wiring
    │   ├── hooks/
    │   │   └── useChatSessions.ts   ← localStorage chat persistence
    │   ├── components/
    │   │   ├── ChatMessage.tsx      ← structured bot response renderer
    │   │   ├── ChatInput.tsx        ← textarea + Groq Whisper mic
    │   │   └── Sidebar.tsx          ← session history sidebar
    │   └── index.css                ← Tailwind v4 + typography plugin
    ├── package.json
    └── vite.config.ts               ← dev proxy: /ask, /transcribe → :8002
```

---

## Local Development

### 1. Backend setup

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Set your Groq API key
echo "GROQ_API_KEY=gsk_your_key_here" > .env
```

### 2. Start the backend

```bash
uvicorn main:app --reload --port 8002
# Health check: http://localhost:8002/health
```

### 3. Frontend setup (first time only)

```bash
cd frontend
npm install
```

### 4. Start the frontend dev server

```bash
cd frontend
npm run dev
# Opens at http://localhost:5173
# /ask and /transcribe are proxied to :8002 automatically
```

The Vite proxy in `vite.config.ts` forwards all `/ask` and `/transcribe` requests to the FastAPI backend at `:8002`, so no CORS issues in development.

---

## Production Build

```bash
# 1. Build the React app
cd frontend
npm run build
# Outputs to frontend/dist/

# 2. Start FastAPI — it auto-detects frontend/dist and serves it
cd ..
uvicorn main:app --port 8002
# Single port serves both the UI and the API
```

`main.py` only mounts `frontend/dist` when the directory exists. During development it is never built, so port 8002 is pure API.

---

## RAG Architecture

```
User query
  │
  ├─ Layer 1: Hard block-list (~40 keywords)
  │           jokes, weather, divorce, visa, etc. → immediate refusal
  │
  ├─ Layer 2: Semantic relevance gate (FAISS cosine score < 0.28)
  │           any query semantically unrelated to business KB → refusal
  │
  ├─ Layer 3: System prompt rule
  │           LLM instructed to return refusal JSON if off-topic
  │
  ├─ Keyword → doc_id boost map
  │           metadata pre-filter using kb_index.json tags
  │
  ├─ FAISS semantic search (all-MiniLM-L6-v2, cosine, top-4 chunks)
  │
  ├─ Context assembly (chunk text + source label injected into prompt)
  │
  └─ Groq Llama 3.1 8B → structured JSON
       { answer, steps[], source, warning }
```

Response fields are rendered by `ChatMessage.tsx` as:
- **answer** — rendered via `react-markdown` + `remark-gfm`
- **steps** — numbered card list
- **source** — gray citation badge
- **warning** — amber alert box

---

## Speech-to-Text

The mic button in the chat input uses `MediaRecorder` to capture audio, then POSTs it to `POST /transcribe`. The backend calls Groq Whisper (`whisper-large-v3-turbo`) and returns the transcript, which populates the input field.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key (used for LLM + Whisper) |
| `KB_PATH` | No | Path to knowledge base (default: `./daftar_knowledge_base`) |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ask` | Submit a query, returns `{ answer, steps, source, warning }` |
| `POST` | `/transcribe` | Upload audio file, returns `{ text }` (Groq Whisper) |
| `GET` | `/health` | Returns `{ status, chunks_indexed }` |

### Test endpoints

```bash
# Health check
curl http://localhost:8002/health

# Ask a question
curl -X POST http://localhost:8002/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "Do I need NTN for freelancing?"}'

# Transcribe audio
curl -X POST http://localhost:8002/transcribe \
  -F "file=@recording.webm"
```

---

## Chat History

Chat sessions are persisted to `localStorage` under the key `daftar_sessions`. Each session stores its full message history. Sessions are grouped in the sidebar by Today / Yesterday / Older and can be deleted individually.

---

## Planned Features

- Urdu language toggle for Whisper STT (`language="ur"`)
- Streaming responses via Server-Sent Events
- Mobile-responsive sidebar (drawer overlay)
- Nginx reverse-proxy setup guide for production
