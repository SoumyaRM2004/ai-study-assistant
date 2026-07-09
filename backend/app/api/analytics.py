"""
Analytics API routes.
Weak topic analysis, per-document performance, and learning dashboard.
"""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.exam import (
    DashboardResponse,
    PerformanceResponse,
    WeakTopicsListResponse,
)
from app.services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/weak-topics", response_model=WeakTopicsListResponse)
async def weak_topics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get aggregated weak topics across all exam attempts.
    Topics scoring below 60% are flagged with study recommendations.
    """
    return await analytics_service.get_weak_topics(current_user, db)


@router.get("/performance/{document_id}", response_model=PerformanceResponse)
async def document_performance(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get performance breakdown for a specific document."""
    return await analytics_service.get_document_performance(
        document_id, current_user, db
    )


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get overall learning dashboard with stats:
    total documents, exams, accuracy, recent attempts, and top weak topics.
    """
    return await analytics_service.get_dashboard(current_user, db)
