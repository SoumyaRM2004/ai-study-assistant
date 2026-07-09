"""
Exam API routes.
Start exams, submit answers, view results and history.
"""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.exam import (
    ExamHistoryResponse,
    ExamResultResponse,
    ExamStartRequest,
    ExamStartResponse,
    ExamSubmitRequest,
)
from app.services import exam_service

router = APIRouter(prefix="/api/exam", tags=["Exam"])


@router.post("/start", response_model=ExamStartResponse, status_code=201)
async def start_exam(
    data: ExamStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Start a new exam attempt.
    Returns randomized questions without correct answers.
    """
    return await exam_service.start_exam(
        document_id=data.document_id,
        question_count=data.question_count,
        current_user=current_user,
        db=db,
    )


@router.post("/submit", response_model=ExamResultResponse)
async def submit_exam(
    data: ExamSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit exam answers for grading.
    Returns detailed results with per-topic breakdown.
    """
    return await exam_service.submit_exam(data, current_user, db)


@router.get("/results/{attempt_id}", response_model=ExamResultResponse)
async def get_results(
    attempt_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed results for a specific exam attempt."""
    return await exam_service.get_exam_results(attempt_id, current_user, db)


@router.get("/history", response_model=ExamHistoryResponse)
async def get_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all past exam attempts for the current user."""
    return await exam_service.get_exam_history(current_user, db)
