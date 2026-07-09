"""
Celery task definitions for background document processing.
Pipeline: extract PDF → chunk text → generate embeddings → store in Qdrant.
"""

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy import create_engine

from app.core.config import get_settings
from app.models.document import Document, DocumentStatus
from app.rag.pdf_processor import extract_text
from app.rag.chunker import chunk_pages
from app.rag.embedder import embed_texts
from app.rag import vector_store
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_sync_db_url() -> str:
    """Convert async DB URL to sync for Celery workers (which run synchronously)."""
    return settings.DATABASE_URL.replace(
        "postgresql+asyncpg://", "postgresql+psycopg2://"
    ).replace(
        "postgresql://", "postgresql+psycopg2://"
    )


def _get_sync_session() -> Session:
    """Create a synchronous database session for Celery tasks."""
    sync_engine = create_engine(_get_sync_db_url())
    return Session(bind=sync_engine)


@celery_app.task(
    bind=True,
    name="process_document",
    max_retries=2,
    default_retry_delay=30,
    acks_late=True,
)
def process_document(self, document_id: str) -> dict:
    """
    Full document processing pipeline:
    1. Extract text from PDF (PyMuPDF + pdfplumber fallback)
    2. Chunk text into overlapping segments with metadata
    3. Generate embeddings via Gemini API
    4. Store vectors in Qdrant
    5. Update document status in PostgreSQL

    This runs as a Celery background task, dispatched after upload.
    """
    import os

    db = _get_sync_session()

    try:
        # ── Step 0: Load document record ─────────────────────
        document = db.execute(
            select(Document).where(Document.id == document_id)
        ).scalar_one_or_none()

        if document is None:
            logger.error(f"Document {document_id} not found in database")
            return {"status": "error", "message": "Document not found"}

        # Mark as processing
        document.status = DocumentStatus.PROCESSING
        db.commit()
        logger.info(f"Processing document {document_id}: {document.original_name}")

        # ── Step 1: Extract text ─────────────────────────────
        file_path = os.path.join(settings.UPLOAD_DIR, document.filename)
        extraction_result = extract_text(file_path)

        if extraction_result.error:
            raise Exception(f"Text extraction failed: {extraction_result.error}")

        if not extraction_result.pages:
            raise Exception("No text could be extracted from the PDF")

        document.page_count = extraction_result.total_pages
        db.commit()
        logger.info(
            f"Extracted {extraction_result.total_pages} pages "
            f"via {extraction_result.extraction_method}"
        )

        # ── Step 2: Chunk text ───────────────────────────────
        pages_data = [
            {"page_number": p.page_number, "text": p.text}
            for p in extraction_result.pages
        ]

        chunks = chunk_pages(
            pages=pages_data,
            document_id=document_id,
            user_id=str(document.user_id),
        )

        if not chunks:
            raise Exception("No chunks produced from extracted text")

        document.chunk_count = len(chunks)
        db.commit()
        logger.info(f"Created {len(chunks)} chunks")

        # ── Step 3: Generate embeddings ──────────────────────
        chunk_texts = [chunk.text for chunk in chunks]
        embeddings = embed_texts(chunk_texts)
        logger.info(f"Generated {len(embeddings)} embeddings")

        # ── Step 4: Store in Qdrant ──────────────────────────
        chunk_ids = [chunk.id for chunk in chunks]
        metadatas = [chunk.to_dict() for chunk in chunks]

        vector_store.add_document_chunks(
            chunk_ids=chunk_ids,
            texts=chunk_texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        logger.info(f"Stored {len(chunks)} vectors in Qdrant")

        # ── Step 5: Mark as completed ────────────────────────
        document.status = DocumentStatus.COMPLETED
        document.error_message = None
        db.commit()

        result = {
            "status": "completed",
            "document_id": document_id,
            "pages": extraction_result.total_pages,
            "chunks": len(chunks),
            "method": extraction_result.extraction_method,
        }
        logger.info(f"Document {document_id} processing complete: {result}")
        return result

    except Exception as exc:
        logger.error(f"Document {document_id} processing failed: {exc}")

        # Update document status to FAILED
        try:
            document = db.execute(
                select(Document).where(Document.id == document_id)
            ).scalar_one_or_none()
            if document:
                document.status = DocumentStatus.FAILED
                document.error_message = str(exc)[:500]
                db.commit()
        except Exception as db_err:
            logger.error(f"Failed to update document status: {db_err}")

        # Retry if we haven't exhausted retries
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)

        return {"status": "failed", "document_id": document_id, "error": str(exc)}

    finally:
        db.close()
