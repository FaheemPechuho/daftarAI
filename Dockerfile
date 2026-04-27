FROM python:3.11-slim

WORKDIR /app

# Install CPU-only torch first so sentence-transformers doesn't pull in CUDA (~3 GB)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install remaining backend dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model during build (needs network access — set OFFLINE after this)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Now lock HuggingFace to offline mode for runtime — prevents 30+ network calls at startup
ENV HF_HUB_OFFLINE=1
ENV TRANSFORMERS_OFFLINE=1

# Copy full repo (backend app + knowledge base)
COPY . .

WORKDIR /app/backend

EXPOSE 8080

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
