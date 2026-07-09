"""
Analytics service — weak topic identification and learning performance analysis.
"""

import logging
import uuid
from collections import defaultdict

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.exam import ExamAttempt, TopicScore
from app.models.user import User
from app.schemas.exam import (
    DashboardResponse,
    ExamAttemptSummary,
    PerformanceResponse,
    TopicBreakdown,
    WeakTopicResponse,
    WeakTopicsListResponse,
)

logger = logging.getLogger(__name__)

WEAK_TOPIC_THRESHOLD = 60.0  # Topics below this % are considered weak


def _generate_recommendation(topic: str, score: float) -> str:
    """Generate a study recommendation based on topic performance."""
    if score < 30:
        return f"Critical gap in '{topic}'. Re-read the relevant sections and make notes. Consider asking the AI chat for explanations."
    elif score < 50:
        return f"Significant weakness in '{topic}'. Review the material and practice with more questions on this topic."
    elif score < 60:
        return f"Moderate weakness in '{topic}'. A focused review session should help strengthen this area."
    else:
        return f"'{topic}' needs minor improvement. Quick review recommended."


async def get_weak_topics(
    current_user: User, db: AsyncSession
) -> WeakTopicsListResponse:
    """
    Identify weak topics across all exam attempts.
    Aggregates topic scores and flags those below the threshold.
    """
    # Get all topic scores for user
    result = await db.execute(
        select(
            TopicScore.topic,
            func.sum(TopicScore.total).label("total_questions"),
            func.sum(TopicScore.correct).label("correct_answers"),
        )
        .where(TopicScore.user_id == current_user.id)
        .group_by(TopicScore.topic)
    )
    rows = result.all()

    # Calculate overall stats
    total_exams_result = await db.execute(
        select(func.count(ExamAttempt.id))
        .where(ExamAttempt.user_id == current_user.id)
    )
    total_exams = total_exams_result.scalar() or 0

    overall_result = await db.execute(
        select(func.avg(ExamAttempt.accuracy))
        .where(ExamAttempt.user_id == current_user.id)
    )
    overall_accuracy = overall_result.scalar() or 0.0

    # Identify weak topics
    weak_topics = []
    for row in rows:
        score = (row.correct_answers / row.total_questions * 100) if row.total_questions > 0 else 0
        if score < WEAK_TOPIC_THRESHOLD:
            weak_topics.append(WeakTopicResponse(
                topic=row.topic,
                total_questions=row.total_questions,
                correct_answers=row.correct_answers,
                score_percent=round(score, 1),
                recommendation=_generate_recommendation(row.topic, score),
            ))

    # Sort weakest first
    weak_topics.sort(key=lambda t: t.score_percent)

    return WeakTopicsListResponse(
        weak_topics=weak_topics,
        total_exams=total_exams,
        overall_accuracy=round(overall_accuracy, 1),
    )


async def get_document_performance(
    document_id: uuid.UUID, current_user: User, db: AsyncSession
) -> PerformanceResponse:
    """Get performance breakdown for a specific document."""
    # Get attempts for this document
    result = await db.execute(
        select(ExamAttempt).where(
            ExamAttempt.document_id == document_id,
            ExamAttempt.user_id == current_user.id,
        )
    )
    attempts = result.scalars().all()

    if not attempts:
        return PerformanceResponse(
            document_id=document_id,
            total_attempts=0,
            average_accuracy=0.0,
            best_accuracy=0.0,
            topics=[],
        )

    # Calculate stats
    accuracies = [a.accuracy for a in attempts]
    avg_accuracy = sum(accuracies) / len(accuracies) if accuracies else 0
    best_accuracy = max(accuracies) if accuracies else 0

    # Get topic breakdown
    result = await db.execute(
        select(
            TopicScore.topic,
            func.sum(TopicScore.total).label("total"),
            func.sum(TopicScore.correct).label("correct"),
        )
        .where(
            TopicScore.document_id == document_id,
            TopicScore.user_id == current_user.id,
        )
        .group_by(TopicScore.topic)
    )
    topic_rows = result.all()

    topics = [
        TopicBreakdown(
            topic=row.topic,
            total=row.total,
            correct=row.correct,
            score_percent=round((row.correct / row.total * 100) if row.total > 0 else 0, 1),
        )
        for row in topic_rows
    ]

    return PerformanceResponse(
        document_id=document_id,
        total_attempts=len(attempts),
        average_accuracy=round(avg_accuracy, 1),
        best_accuracy=round(best_accuracy, 1),
        topics=sorted(topics, key=lambda t: t.score_percent),
    )


async def get_dashboard(
    current_user: User, db: AsyncSession
) -> DashboardResponse:
    """Get overall learning dashboard statistics."""
    # Total documents
    doc_result = await db.execute(
        select(func.count(Document.id)).where(Document.user_id == current_user.id)
    )
    total_docs = doc_result.scalar() or 0

    # Exam stats
    exam_result = await db.execute(
        select(
            func.count(ExamAttempt.id).label("total"),
            func.sum(ExamAttempt.total_questions).label("total_questions"),
            func.avg(ExamAttempt.accuracy).label("avg_accuracy"),
        )
        .where(ExamAttempt.user_id == current_user.id)
    )
    exam_stats = exam_result.one()

    # Recent attempts
    recent_result = await db.execute(
        select(ExamAttempt)
        .where(ExamAttempt.user_id == current_user.id)
        .order_by(ExamAttempt.created_at.desc())
        .limit(5)
    )
    recent_attempts = [
        ExamAttemptSummary.model_validate(a)
        for a in recent_result.scalars().all()
    ]

    # Weak topics
    weak_topics_response = await get_weak_topics(current_user, db)

    return DashboardResponse(
        total_documents=total_docs,
        total_exams=exam_stats.total or 0,
        total_questions_answered=exam_stats.total_questions or 0,
        overall_accuracy=round(exam_stats.avg_accuracy or 0, 1),
        recent_attempts=recent_attempts,
        weak_topics=weak_topics_response.weak_topics[:5],
    )
