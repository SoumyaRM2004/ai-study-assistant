"""
Chat API routes.
RAG-powered document Q&A with conversation history and session management.
"""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.chat import (
    ChatHistoryResponse,
    ChatQuestion,
    ChatResponse,
    ChatSessionListResponse,
)
from app.services import chat_service

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("/question", response_model=ChatResponse)
async def ask_question(
    data: ChatQuestion,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ask a question about a document using RAG.
    Retrieves relevant chunks, generates an AI answer with source citations.
    Pass a session_id to continue an existing conversation.
    """
    return await chat_service.ask_chat_question(
        document_id=data.document_id,
        question=data.question,
        current_user=current_user,
        db=db,
        session_id=data.session_id,
    )


@router.get("/sessions/{document_id}", response_model=ChatSessionListResponse)
async def list_sessions(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all chat sessions for a specific document."""
    return await chat_service.get_chat_sessions(document_id, current_user, db)


@router.get("/history/{session_id}", response_model=ChatHistoryResponse)
async def get_history(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the full conversation history for a specific chat session."""
    return await chat_service.get_chat_history(session_id, current_user, db)
