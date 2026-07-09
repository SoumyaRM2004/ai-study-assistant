"""
MCQ service — orchestrates MCQ generation, validation, and storage.
"""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentStatus
from app.models.mcq import MCQQuestion
from app.models.user import User
from app.rag.vector_store import search_similar
from app.rag.embedder import embed_query
from app.mcq.generator import generate_mcqs
from app.mcq.validator import validate_and_clean_mcqs
from app.schemas.mcq import MCQListResponse, MCQQuestionResponse
from app.utils.exceptions import DocumentNotFoundError

logger = logging.getLogger(__name__)


async def _verify_document(
    document_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> Document:
    """Verify document exists, belongs to user, and is processed."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == user_id,
        )
    )
    document = result.scalar_one_or_none()

    if document is None:
        raise DocumentNotFoundError()

    if document.status != DocumentStatus.COMPLETED:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document not ready. Status: {document.status.value}",
        )

    return document


async def create_mcqs(
    document_id: uuid.UUID,
    count: int,
    difficulty: str,
    current_user: User,
    db: AsyncSession,
) -> MCQListResponse:
    """
    Generate MCQs for a document:
    1. Retrieve document chunks from vector store
    2. Generate MCQs using Gemini LLM
    3. Validate and clean generated questions
    4. Save to database
    """
    await _verify_document(document_id, current_user.id, db)

    # Get document content via vector search (use a broad query)
    query_embedding = embed_query("Summarize the key concepts and topics in this document")
    chunks = search_similar(
        query_embedding=query_embedding,
        document_id=str(document_id),
        top_k=20,
    )

    if not chunks:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No content found in document. Please re-upload and process.",
        )

    # Concatenate chunk texts for MCQ generation
    content = "\n\n".join(chunk["text"] for chunk in chunks)

    # Generate MCQs
    raw_mcqs = generate_mcqs(content=content, count=count, difficulty=difficulty)

    # Validate and clean
    valid_mcqs = validate_and_clean_mcqs(raw_mcqs)

    # Save to database
    saved_questions = []
    for mcq_data in valid_mcqs:
        mcq = MCQQuestion(
            document_id=document_id,
            question=mcq_data["question"],
            option_a=mcq_data["option_a"],
            option_b=mcq_data["option_b"],
            option_c=mcq_data["option_c"],
            option_d=mcq_data["option_d"],
            correct_answer=mcq_data["correct_answer"],
            explanation=mcq_data["explanation"],
            topic=mcq_data["topic"],
            difficulty=mcq_data["difficulty"],
        )
        db.add(mcq)
        saved_questions.append(mcq)

    await db.commit()

    # Refresh all to get IDs
    for q in saved_questions:
        await db.refresh(q)

    logger.info(
        f"Saved {len(saved_questions)} MCQs for document {document_id}"
    )

    return MCQListResponse(
        questions=[MCQQuestionResponse.model_validate(q) for q in saved_questions],
        total=len(saved_questions),
        document_id=document_id,
    )


async def get_document_mcqs(
    document_id: uuid.UUID, current_user: User, db: AsyncSession
) -> MCQListResponse:
    """Get all MCQs for a document."""
    await _verify_document(document_id, current_user.id, db)

    result = await db.execute(
        select(MCQQuestion)
        .where(MCQQuestion.document_id == document_id)
        .order_by(MCQQuestion.created_at.asc())
    )
    questions = result.scalars().all()

    return MCQListResponse(
        questions=[MCQQuestionResponse.model_validate(q) for q in questions],
        total=len(questions),
        document_id=document_id,
    )
