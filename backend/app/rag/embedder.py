"""
Embedding generation engine.
Uses Google Generative AI embeddings (text-embedding-004) with batch processing
and rate limiting for reliable large-document processing.
"""

import logging
import time
from typing import Optional

from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Model configuration
EMBEDDING_MODEL = "models/text-embedding-004"
EMBEDDING_DIMENSIONS = 768
BATCH_SIZE = 100  # Google API batch limit
RATE_LIMIT_DELAY = 0.1  # seconds between batches to avoid rate limits


def get_embedding_model(
    api_key: Optional[str] = None,
) -> GoogleGenerativeAIEmbeddings:
    """
    Create a configured embedding model instance.
    Uses Google's text-embedding-004 (768 dimensions).
    """
    key = api_key or settings.GEMINI_API_KEY
    if not key:
        raise ValueError(
            "GEMINI_API_KEY is not configured. "
            "Set it in .env or pass it explicitly."
        )

    return GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL,
        google_api_key=key,
    )


def embed_texts(
    texts: list[str],
    api_key: Optional[str] = None,
    batch_size: int = BATCH_SIZE,
) -> list[list[float]]:
    """
    Generate embeddings for a list of texts using batch processing.

    Splits texts into batches to respect API limits and adds rate
    limiting delays between batches.

    Args:
        texts: List of text strings to embed.
        api_key: Optional Gemini API key (defaults to settings).
        batch_size: Number of texts per API call.

    Returns:
        List of embedding vectors (each is a list of floats).
    """
    if not texts:
        return []

    model = get_embedding_model(api_key)
    all_embeddings: list[list[float]] = []

    total_batches = (len(texts) + batch_size - 1) // batch_size
    logger.info(
        f"Embedding {len(texts)} texts in {total_batches} batches "
        f"(batch_size={batch_size})"
    )

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        batch_num = (i // batch_size) + 1

        try:
            embeddings = model.embed_documents(batch)
            all_embeddings.extend(embeddings)
            logger.debug(
                f"Batch {batch_num}/{total_batches}: "
                f"embedded {len(batch)} texts"
            )
        except Exception as e:
            logger.error(
                f"Batch {batch_num}/{total_batches} failed: {e}"
            )
            raise

        # Rate limiting between batches
        if i + batch_size < len(texts):
            time.sleep(RATE_LIMIT_DELAY)

    logger.info(f"Generated {len(all_embeddings)} embeddings successfully")
    return all_embeddings


def embed_query(
    query: str,
    api_key: Optional[str] = None,
) -> list[float]:
    """
    Generate embedding for a single query string.
    Uses the query-specific embedding method for better retrieval quality.

    Args:
        query: The search query to embed.
        api_key: Optional Gemini API key.

    Returns:
        Embedding vector as a list of floats.
    """
    model = get_embedding_model(api_key)
    return model.embed_query(query)
