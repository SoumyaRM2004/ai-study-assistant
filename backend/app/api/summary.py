"""
Summary API routes.
Post-process AI answers: summarize, simplify, or generate MCQs.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.user import User
from app.services import summary_service

router = APIRouter(prefix="/api/summary", tags=["Summary"])


class SummaryRequest(BaseModel):
    """Request body for summary operations."""
    answer: str = Field(
        ..., min_length=10, max_length=10000,
        description="The AI answer text to process",
    )


class SummaryResponse(BaseModel):
    """Response from summary operations."""
    result: str
    operation: str


@router.post("/summarize", response_model=SummaryResponse)
async def summarize(
    data: SummaryRequest,
    current_user: User = Depends(get_current_user),
):
    """Summarize an AI answer into concise key points."""
    result = summary_service.summarize_answer(data.answer)
    return SummaryResponse(result=result, operation="summarize")


@router.post("/simplify", response_model=SummaryResponse)
async def simplify(
    data: SummaryRequest,
    current_user: User = Depends(get_current_user),
):
    """Rewrite an AI answer in simpler, more accessible language."""
    result = summary_service.simplify_answer(data.answer)
    return SummaryResponse(result=result, operation="simplify")


@router.post("/generate-mcq", response_model=SummaryResponse)
async def generate_mcq(
    data: SummaryRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate MCQ questions from an existing AI answer."""
    result = summary_service.generate_mcq_from_answer(data.answer)
    return SummaryResponse(result=result, operation="generate-mcq")
