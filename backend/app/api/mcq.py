"""
MCQ API routes.
Generate and retrieve multiple-choice questions for documents.
"""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.mcq import MCQGenerateRequest, MCQListResponse
from app.services import mcq_service

router = APIRouter(prefix="/api/mcq", tags=["MCQ"])


@router.post("/create", response_model=MCQListResponse, status_code=201)
async def create_mcqs(
    data: MCQGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate MCQ questions for a document.
    Uses AI to create high-quality questions with configurable count and difficulty.
    """
    return await mcq_service.create_mcqs(
        document_id=data.document_id,
        count=data.count,
        difficulty=data.difficulty,
        current_user=current_user,
        db=db,
    )


@router.get("/{document_id}", response_model=MCQListResponse)
async def get_mcqs(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all generated MCQ questions for a document."""
    return await mcq_service.get_document_mcqs(document_id, current_user, db)
