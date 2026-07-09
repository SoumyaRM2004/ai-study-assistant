"""
Pydantic schemas for MCQ endpoints.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MCQGenerateRequest(BaseModel):
    """Request to generate MCQs for a document."""
    document_id: UUID
    count: int = Field(20, description="Number of questions (20, 40, or 60)")
    difficulty: str = Field("medium", description="easy, medium, or hard")


class MCQQuestionResponse(BaseModel):
    """A single MCQ question."""
    id: UUID
    document_id: UUID
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    explanation: str
    topic: str
    difficulty: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MCQListResponse(BaseModel):
    """List of MCQ questions for a document."""
    questions: list[MCQQuestionResponse]
    total: int
    document_id: UUID


class MCQGenerateResponse(BaseModel):
    """Response after triggering MCQ generation."""
    message: str = "MCQ generation started"
    task_id: Optional[str] = None
    document_id: UUID
    count: int
    difficulty: str
