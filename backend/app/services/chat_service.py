"""
Chat service — business logic for RAG-based Q&A conversations.
Manages sessions, stores history, and orchestrates the RAG pipeline.
"""

import uuid
import logging
from typing import Optional

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatHistory
from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.rag.qa_chain import ask_question
from app.schemas.chat import (
    ChatHistoryResponse,
    ChatMessageResponse,
    ChatResponse,
    ChatSessionListResponse,
    ChatSessionResponse,
    SourceChunk,
)
from app.utils.exceptions import DocumentNotFoundError

logger = logging.getLogger(__name__)


async def _verify_document_access(
    document_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> Document:
    """Verify the document exists, belongs to the user, and is ready for chat."""
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
            detail=f"Document is not ready for chat. Current status: {document.status.value}. "
                   f"Please wait for processing to complete.",
        )

    return document


async def _get_session_history(
    session_id: uuid.UUID, db: AsyncSession
) -> list[dict]:
    """Fetch conversation history for a session (for RAG context window)."""
    result = await db.execute(
        select(ChatHistory)
        .where(ChatHistory.session_id == session_id)
        .order_by(ChatHistory.created_at.asc())
    )
    messages = result.scalars().all()

    history = []
    for msg in messages:
        history.append({"role": "user", "content": msg.question})
        history.append({"role": "assistant", "content": msg.answer})

    return history


async def ask_chat_question(
    document_id: uuid.UUID,
    question: str,
    current_user: User,
    db: AsyncSession,
    session_id: Optional[uuid.UUID] = None,
) -> ChatResponse:
    """
    Process a user's question using the RAG pipeline:
    1. Verify document access and readiness
    2. Load conversation history (if continuing a session)
    3. Run RAG: embed → retrieve → generate answer
    4. Save Q&A pair to chat history
    5. Return answer with source citations
    """
    # Verify document ownership and readiness
    await _verify_document_access(document_id, current_user.id, db)

    # Create or continue a session
    if session_id is None:
        session_id = uuid.uuid4()
        conversation_history = []
    else:
        conversation_history = await _get_session_history(session_id, db)

    # Run RAG pipeline
    rag_result = ask_question(
        question=question,
        document_id=str(document_id),
        conversation_history=conversation_history,
    )

    # Save to chat history
    chat_record = ChatHistory(
        user_id=current_user.id,
        document_id=document_id,
        session_id=session_id,
        question=question,
        answer=rag_result["answer"],
        source_chunks={
            "sources": rag_result["sources"],
            "chunks_used": rag_result["chunks_used"],
        },
    )
    db.add(chat_record)
    await db.commit()
    await db.refresh(chat_record)

    logger.info(
        f"Chat Q&A saved: session={session_id}, user={current_user.id}, "
        f"doc={document_id}"
    )

    return ChatResponse(
        answer=rag_result["answer"],
        sources=[SourceChunk(**s) for s in rag_result["sources"]],
        session_id=session_id,
        chunks_used=rag_result["chunks_used"],
        message_id=chat_record.id,
    )


async def get_chat_sessions(
    document_id: uuid.UUID, current_user: User, db: AsyncSession
) -> ChatSessionListResponse:
    """List all chat sessions for a document, with summary info."""
    await _verify_document_access(document_id, current_user.id, db)

    # Get distinct sessions with aggregated info
    result = await db.execute(
        select(
            ChatHistory.session_id,
            func.count(ChatHistory.id).label("message_count"),
            func.min(ChatHistory.question).label("first_question"),
            func.max(ChatHistory.created_at).label("last_active"),
        )
        .where(
            ChatHistory.document_id == document_id,
            ChatHistory.user_id == current_user.id,
        )
        .group_by(ChatHistory.session_id)
        .order_by(desc("last_active"))
    )
    rows = result.all()

    sessions = [
        ChatSessionResponse(
            session_id=row.session_id,
            document_id=document_id,
            message_count=row.message_count,
            first_question=row.first_question[:100] if row.first_question else "",
            last_active=row.last_active,
        )
        for row in rows
    ]

    return ChatSessionListResponse(sessions=sessions, total=len(sessions))


async def get_chat_history(
    session_id: uuid.UUID, current_user: User, db: AsyncSession
) -> ChatHistoryResponse:
    """Get the full conversation history for a specific session."""
    result = await db.execute(
        select(ChatHistory)
        .where(
            ChatHistory.session_id == session_id,
            ChatHistory.user_id == current_user.id,
        )
        .order_by(ChatHistory.created_at.asc())
    )
    messages = result.scalars().all()

    return ChatHistoryResponse(
        session_id=session_id,
        messages=[ChatMessageResponse.model_validate(m) for m in messages],
        total=len(messages),
    )
