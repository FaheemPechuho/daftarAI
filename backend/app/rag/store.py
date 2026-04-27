from __future__ import annotations

import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.config import settings

# Batch size for upserts — keeps individual payloads small enough to avoid write timeouts
_UPSERT_BATCH_SIZE = 50


def get_client() -> QdrantClient:
    url = settings.qdrant_url
    # qdrant_client defaults to port 6333 even for https:// URLs.
    # Qdrant Cloud requires 443; local instances use 6333.
    port = 443 if url.startswith("https://") else 6333
    return QdrantClient(
        url=url,
        api_key=settings.qdrant_api_key,
        port=port,
        timeout=120,  # seconds — prevents WriteTimeout on slow/distant connections
    )


def delete_collection_if_exists(client: QdrantClient) -> bool:
    """Remove the Daftar vector collection from Qdrant. Returns True if it existed and was deleted."""
    name = settings.qdrant_collection
    if not client.collection_exists(name):
        return False
    client.delete_collection(collection_name=name)
    return True


def ensure_collection(client: QdrantClient, recreate: bool = False) -> None:
    name = settings.qdrant_collection
    exists = client.collection_exists(name)
    if recreate and exists:
        client.delete_collection(name)
        exists = False
    if not exists:
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(
                size=settings.embedding_dimensions,
                distance=Distance.COSINE,
            ),
        )


def collection_point_count(client: QdrantClient) -> int:
    info = client.get_collection(settings.qdrant_collection)
    return int(info.points_count)


def upsert_chunks(
    client: QdrantClient,
    embeddings: list[list[float]],
    payloads: list[dict],
) -> None:
    if not embeddings:
        return

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=vec,
            payload=payload,
        )
        for vec, payload in zip(embeddings, payloads, strict=True)
    ]

    # Send in batches to avoid write timeouts on high-latency connections
    for i in range(0, len(points), _UPSERT_BATCH_SIZE):
        batch = points[i : i + _UPSERT_BATCH_SIZE]
        client.upsert(collection_name=settings.qdrant_collection, points=batch)


def search(
    client: QdrantClient,
    query_vector: list[float],
    limit: int,
) -> list[dict]:
    hits = client.query_points(
        collection_name=settings.qdrant_collection,
        query=query_vector,
        limit=limit,
        with_payload=True,
    ).points
    out: list[dict] = []
    for p in hits:
        payload = p.payload or {}
        payload["_score"] = getattr(p, "score", None)
        out.append(payload)
    return out