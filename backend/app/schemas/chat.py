"""
Pydantic schemas for chat endpoints.
Validates chat requests and shapes AI responses with source citations.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Request Schemas ──────────────────────────────────────────

class ChatQuestion(BaseModel):
    """POST /api/chat/question request body."""
    document_id: UUID = Field(..., description="Document to ask about")
    question: str = Field(
        ..., min_length=3, max_length=2000,
        examples=["What is the main topic of chapter 3?"],
    )
    session_id: Optional[UUID] = Field(
        None,
        description="Existing session ID to continue a conversation. "
                    "If not provided, a new session is created.",
    )


# ── Response Schemas ─────────────────────────────────────────

class SourceChunk(BaseModel):
    """A single source citation from the document."""
    page_number: int
    snippet: str
    relevance_score: float = 0.0


class ChatResponse(BaseModel):
    """AI answer with source citations."""
    answer: str
    sources: list[SourceChunk]
    session_id: UUID
    chunks_used: int
    message_id: UUID


class ChatMessageResponse(BaseModel):
    """A single Q&A pair from chat history."""
    id: UUID
    question: str
    answer: str
    source_chunks: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionResponse(BaseModel):
    """Summary of a chat session."""
    session_id: UUID
    document_id: UUID
    message_count: int
    first_question: str
    last_active: datetime


class ChatSessionListResponse(BaseModel):
    """List of chat sessions for a document."""
    sessions: list[ChatSessionResponse]
    total: int


class ChatHistoryResponse(BaseModel):
    """Full conversation history for a session."""
    session_id: UUID
    messages: list[ChatMessageResponse]
    total: int
