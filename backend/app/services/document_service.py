"""
Document service — business logic for file upload, validation, retrieval, and deletion.
Routes delegate here; no business logic in route handlers.
"""

import os
import uuid
import logging
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.schemas.document import (
    DocumentDeleteResponse,
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
)
from app.utils.exceptions import (
    DocumentNotFoundError,
    FileTooLargeError,
    InvalidFileTypeError,
)

settings = get_settings()
logger = logging.getLogger(__name__)


def _validate_pdf(file: UploadFile) -> None:
    """Validate uploaded file is a PDF and within size limits."""
    # Check MIME type
    if file.content_type not in ("application/pdf", "application/x-pdf"):
        raise InvalidFileTypeError()

    # Check file extension
    if file.filename and not file.filename.lower().endswith(".pdf"):
        raise InvalidFileTypeError()


async def _save_file(file: UploadFile) -> tuple[str, int]:
    """
    Save uploaded file to disk with a UUID-based filename.
    Returns (server_filename, file_size_bytes).
    """
    # Generate unique filename to avoid collisions
    file_ext = Path(file.filename or "document.pdf").suffix
    server_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, server_filename)

    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Stream file to disk in chunks (memory-efficient for large PDFs)
    file_size = 0
    chunk_size = 1024 * 1024  # 1MB chunks

    with open(file_path, "wb") as f:
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            file_size += len(chunk)

            # Check size limit during upload (fail fast)
            if file_size > settings.max_upload_size_bytes:
                # Clean up partial file
                os.remove(file_path)
                raise FileTooLargeError(settings.MAX_UPLOAD_SIZE_MB)

            f.write(chunk)

    logger.info(f"Saved file {server_filename} ({file_size} bytes)")
    return server_filename, file_size


async def upload_document(
    file: UploadFile, current_user: User, db: AsyncSession
) -> DocumentUploadResponse:
    """
    Upload a PDF document:
    1. Validate file type and size
    2. Save to disk with UUID filename
    3. Create database record with PENDING status
    4. Return response (Celery task dispatch happens in Phase 3)
    """
    _validate_pdf(file)

    server_filename, file_size = await _save_file(file)

    # Create database record
    document = Document(
        user_id=current_user.id,
        filename=server_filename,
        original_name=file.filename or "document.pdf",
        status=DocumentStatus.PENDING,
        file_size_bytes=file_size,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    logger.info(
        f"Document {document.id} created for user {current_user.id}: "
        f"{document.original_name}"
    )

    # Dispatch Celery task to process document (extract → chunk → embed → store)
    try:
        from app.workers.tasks import process_document
        process_document.delay(str(document.id))
        logger.info(f"Dispatched processing task for document {document.id}")
    except Exception as e:
        logger.warning(
            f"Could not dispatch Celery task for document {document.id}: {e}. "
            f"Document will remain in PENDING status until manually processed."
        )

    return DocumentUploadResponse(
        document=DocumentResponse.model_validate(document),
    )


async def get_user_documents(
    current_user: User, db: AsyncSession
) -> DocumentListResponse:
    """Get all documents belonging to the current user, newest first."""
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()

    return DocumentListResponse(
        documents=[DocumentResponse.model_validate(doc) for doc in documents],
        total=len(documents),
    )


async def get_document_detail(
    document_id: uuid.UUID, current_user: User, db: AsyncSession
) -> DocumentResponse:
    """
    Get a single document by ID.
    Ensures the document belongs to the requesting user.
    """
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()

    if document is None:
        raise DocumentNotFoundError()

    return DocumentResponse.model_validate(document)


async def delete_document(
    document_id: uuid.UUID, current_user: User, db: AsyncSession
) -> DocumentDeleteResponse:
    """
    Delete a document:
    1. Verify ownership
    2. Delete physical file from disk
    3. Remove database record
    4. TODO (Phase 3): Delete vectors from ChromaDB/Qdrant
    """
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()

    if document is None:
        raise DocumentNotFoundError()

    # Delete physical file
    file_path = os.path.join(settings.UPLOAD_DIR, document.filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        logger.info(f"Deleted file: {file_path}")

    # Delete vectors from Qdrant
    try:
        from app.rag import vector_store
        vector_store.delete_document(str(document.id))
    except Exception as e:
        logger.warning(f"Could not delete vectors for document {document_id}: {e}")

    # Delete database record
    await db.delete(document)
    await db.commit()

    logger.info(f"Document {document_id} deleted by user {current_user.id}")

    return DocumentDeleteResponse(document_id=document_id)
