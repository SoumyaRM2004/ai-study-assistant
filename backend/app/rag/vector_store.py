"""
Vector store interface using Qdrant.
Handles document chunk storage, similarity search, and cleanup.
"""

import logging
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.http.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from app.core.config import get_settings
from app.rag.embedder import EMBEDDING_DIMENSIONS

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_client() -> QdrantClient:
    """Create a Qdrant client connection."""
    return QdrantClient(
        host=settings.QDRANT_HOST,
        port=settings.QDRANT_PORT,
    )


def _ensure_collection(client: QdrantClient) -> None:
    """
    Ensure the vector collection exists with correct configuration.
    Creates it if missing; logs and continues if it already exists.
    """
    collection_name = settings.QDRANT_COLLECTION
    try:
        client.get_collection(collection_name)
        logger.debug(f"Collection '{collection_name}' already exists")
    except (UnexpectedResponse, Exception):
        logger.info(f"Creating collection '{collection_name}'")
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=EMBEDDING_DIMENSIONS,
                distance=Distance.COSINE,
            ),
        )


def add_document_chunks(
    chunk_ids: list[str],
    texts: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict],
) -> None:
    """
    Store document chunks with their embeddings in Qdrant.

    Args:
        chunk_ids: Unique IDs for each chunk (e.g., "{doc_id}_{index}").
        texts: Raw text content of each chunk.
        embeddings: Vector embeddings for each chunk.
        metadatas: Metadata dicts for each chunk (document_id, user_id, page_number, etc.).
    """
    client = _get_client()
    _ensure_collection(client)

    points = []
    for i, (chunk_id, text, embedding, metadata) in enumerate(
        zip(chunk_ids, texts, embeddings, metadatas)
    ):
        # Qdrant requires integer or UUID point IDs — use the index
        # and store the string chunk_id in the payload
        payload = {
            **metadata,
            "text": text,
            "chunk_id": chunk_id,
        }
        points.append(
            PointStruct(
                id=i if not _is_valid_uuid(chunk_id) else chunk_id,
                vector=embedding,
                payload=payload,
            )
        )

    # Upsert in batches (Qdrant handles large batches well, but let's be safe)
    batch_size = 100
    for i in range(0, len(points), batch_size):
        batch = points[i : i + batch_size]
        client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=batch,
        )
        logger.debug(
            f"Upserted batch {i // batch_size + 1}: {len(batch)} points"
        )

    logger.info(
        f"Stored {len(points)} chunks for document "
        f"{metadatas[0].get('document_id', 'unknown') if metadatas else 'unknown'}"
    )


def search_similar(
    query_embedding: list[float],
    document_id: str,
    top_k: int = 5,
) -> list[dict]:
    """
    Search for similar chunks within a specific document.

    Args:
        query_embedding: The query vector to search against.
        document_id: Restrict search to chunks from this document.
        top_k: Number of top results to return.

    Returns:
        List of dicts with 'text', 'page_number', 'score', and full metadata.
    """
    client = _get_client()

    results = client.query_points(
        collection_name=settings.QDRANT_COLLECTION,
        query=query_embedding,
        query_filter=Filter(
            must=[
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=document_id),
                )
            ]
        ),
        limit=top_k,
        with_payload=True,
    )

    search_results = []
    for point in results.points:
        search_results.append({
            "text": point.payload.get("text", ""),
            "page_number": point.payload.get("page_number", 0),
            "chunk_index": point.payload.get("chunk_index", 0),
            "score": point.score,
            "metadata": point.payload,
        })

    logger.info(
        f"Search returned {len(search_results)} results for document {document_id}"
    )
    return search_results


def delete_document(document_id: str) -> None:
    """
    Delete all vector chunks belonging to a specific document.

    Args:
        document_id: The document whose chunks should be removed.
    """
    client = _get_client()

    try:
        client.delete(
            collection_name=settings.QDRANT_COLLECTION,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id),
                    )
                ]
            ),
        )
        logger.info(f"Deleted all chunks for document {document_id}")
    except Exception as e:
        logger.error(f"Failed to delete chunks for document {document_id}: {e}")
        raise


def get_collection_info() -> dict:
    """Get collection statistics (useful for health checks and debugging)."""
    client = _get_client()
    try:
        info = client.get_collection(settings.QDRANT_COLLECTION)
        return {
            "name": settings.QDRANT_COLLECTION,
            "vectors_count": info.vectors_count,
            "points_count": info.points_count,
            "status": info.status.value,
        }
    except Exception as e:
        return {"error": str(e)}


def _is_valid_uuid(value: str) -> bool:
    """Check if a string is a valid UUID."""
    import uuid
    try:
        uuid.UUID(value)
        return True
    except (ValueError, AttributeError):
        return False
