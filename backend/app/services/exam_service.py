"""
Exam service — business logic for exam creation, submission, and grading.
"""

import logging
import random
import uuid
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam import ExamAttempt, TopicScore
from app.models.mcq import MCQQuestion
from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.schemas.exam import (
    AnswerDetail,
    ExamAttemptSummary,
    ExamHistoryResponse,
    ExamQuestionResponse,
    ExamResultResponse,
    ExamStartResponse,
    ExamSubmitRequest,
    TopicBreakdown,
)
from app.utils.exceptions import DocumentNotFoundError

logger = logging.getLogger(__name__)


async def start_exam(
    document_id: uuid.UUID,
    question_count: int,
    current_user: User,
    db: AsyncSession,
) -> ExamStartResponse:
    """
    Start a new exam attempt:
    1. Verify document access
    2. Fetch available MCQs
    3. Randomly select and shuffle questions
    4. Create exam attempt record
    5. Return questions (without correct answers)
    """
    # Verify document
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
            Document.status == DocumentStatus.COMPLETED,
        )
    )
    if result.scalar_one_or_none() is None:
        raise DocumentNotFoundError()

    # Get available MCQs
    result = await db.execute(
        select(MCQQuestion).where(MCQQuestion.document_id == document_id)
    )
    all_questions = list(result.scalars().all())

    if not all_questions:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No MCQ questions available for this document. Generate MCQs first.",
        )

    # Select and shuffle
    count = min(question_count, len(all_questions))
    selected = random.sample(all_questions, count)

    # Create exam attempt
    attempt = ExamAttempt(
        user_id=current_user.id,
        document_id=document_id,
        total_questions=count,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    # Return questions without correct answers
    questions = [
        ExamQuestionResponse(
            id=q.id,
            question=q.question,
            option_a=q.option_a,
            option_b=q.option_b,
            option_c=q.option_c,
            option_d=q.option_d,
            topic=q.topic,
            difficulty=q.difficulty,
        )
        for q in selected
    ]

    return ExamStartResponse(
        attempt_id=attempt.id,
        questions=questions,
        total_questions=count,
        document_id=document_id,
    )


async def submit_exam(
    data: ExamSubmitRequest,
    current_user: User,
    db: AsyncSession,
) -> ExamResultResponse:
    """
    Submit and grade an exam:
    1. Load attempt and verify ownership
    2. Grade each answer
    3. Calculate per-topic scores
    4. Update attempt record
    5. Return detailed results
    """
    # Load attempt
    result = await db.execute(
        select(ExamAttempt).where(
            ExamAttempt.id == data.attempt_id,
            ExamAttempt.user_id == current_user.id,
        )
    )
    attempt = result.scalar_one_or_none()

    if attempt is None:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam attempt not found",
        )

    # Load questions for this exam
    question_ids = [a.question_id for a in data.answers]
    result = await db.execute(
        select(MCQQuestion).where(MCQQuestion.id.in_(question_ids))
    )
    questions_map = {q.id: q for q in result.scalars().all()}

    # Grade answers
    correct_count = 0
    wrong_count = 0
    answer_details = []
    topic_stats = defaultdict(lambda: {"total": 0, "correct": 0})
    answers_json = []

    for answer in data.answers:
        question = questions_map.get(answer.question_id)
        if question is None:
            continue

        is_correct = answer.selected_answer.upper() == question.correct_answer.upper()
        if is_correct:
            correct_count += 1
        else:
            wrong_count += 1

        # Track per-topic stats
        topic_stats[question.topic]["total"] += 1
        if is_correct:
            topic_stats[question.topic]["correct"] += 1

        answer_details.append(AnswerDetail(
            question_id=question.id,
            question=question.question,
            selected_answer=answer.selected_answer.upper(),
            correct_answer=question.correct_answer,
            is_correct=is_correct,
            explanation=question.explanation,
            topic=question.topic,
        ))

        answers_json.append({
            "question_id": str(question.id),
            "selected": answer.selected_answer.upper(),
            "correct": question.correct_answer,
            "is_correct": is_correct,
        })

    # Calculate accuracy
    total = correct_count + wrong_count
    accuracy = (correct_count / total * 100) if total > 0 else 0.0

    # Update attempt
    attempt.correct_answers = correct_count
    attempt.wrong_answers = wrong_count
    attempt.accuracy = accuracy
    attempt.answers = answers_json
    attempt.time_taken_seconds = data.time_taken_seconds

    # Save topic scores
    topic_breakdown = []
    for topic, stats in topic_stats.items():
        score_pct = (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
        topic_score = TopicScore(
            user_id=current_user.id,
            document_id=attempt.document_id,
            exam_attempt_id=attempt.id,
            topic=topic,
            total=stats["total"],
            correct=stats["correct"],
            score_percent=score_pct,
        )
        db.add(topic_score)

        topic_breakdown.append(TopicBreakdown(
            topic=topic,
            total=stats["total"],
            correct=stats["correct"],
            score_percent=score_pct,
        ))

    await db.commit()
    await db.refresh(attempt)

    logger.info(
        f"Exam {attempt.id} graded: {correct_count}/{total} "
        f"({accuracy:.1f}%) in {data.time_taken_seconds}s"
    )

    return ExamResultResponse(
        attempt_id=attempt.id,
        total_questions=total,
        correct_answers=correct_count,
        wrong_answers=wrong_count,
        accuracy=accuracy,
        time_taken_seconds=data.time_taken_seconds,
        answer_details=answer_details,
        topic_breakdown=topic_breakdown,
        created_at=attempt.created_at,
    )


async def get_exam_results(
    attempt_id: uuid.UUID, current_user: User, db: AsyncSession
) -> ExamResultResponse:
    """Get detailed results for a specific exam attempt."""
    result = await db.execute(
        select(ExamAttempt).where(
            ExamAttempt.id == attempt_id,
            ExamAttempt.user_id == current_user.id,
        )
    )
    attempt = result.scalar_one_or_none()

    if attempt is None:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam attempt not found",
        )

    # Build answer details from stored JSON
    answer_details = []
    if attempt.answers:
        question_ids = [uuid.UUID(a["question_id"]) for a in attempt.answers]
        qresult = await db.execute(
            select(MCQQuestion).where(MCQQuestion.id.in_(question_ids))
        )
        questions_map = {q.id: q for q in qresult.scalars().all()}

        for a in attempt.answers:
            q = questions_map.get(uuid.UUID(a["question_id"]))
            if q:
                answer_details.append(AnswerDetail(
                    question_id=q.id,
                    question=q.question,
                    selected_answer=a["selected"],
                    correct_answer=a["correct"],
                    is_correct=a["is_correct"],
                    explanation=q.explanation,
                    topic=q.topic,
                ))

    # Get topic breakdown
    ts_result = await db.execute(
        select(TopicScore).where(TopicScore.exam_attempt_id == attempt_id)
    )
    topic_scores = ts_result.scalars().all()
    topic_breakdown = [
        TopicBreakdown(
            topic=ts.topic,
            total=ts.total,
            correct=ts.correct,
            score_percent=ts.score_percent,
        )
        for ts in topic_scores
    ]

    return ExamResultResponse(
        attempt_id=attempt.id,
        total_questions=attempt.total_questions,
        correct_answers=attempt.correct_answers,
        wrong_answers=attempt.wrong_answers,
        accuracy=attempt.accuracy,
        time_taken_seconds=attempt.time_taken_seconds or 0,
        answer_details=answer_details,
        topic_breakdown=topic_breakdown,
        created_at=attempt.created_at,
    )


async def get_exam_history(
    current_user: User, db: AsyncSession
) -> ExamHistoryResponse:
    """Get all past exam attempts for the current user."""
    result = await db.execute(
        select(ExamAttempt)
        .where(ExamAttempt.user_id == current_user.id)
        .order_by(ExamAttempt.created_at.desc())
    )
    attempts = result.scalars().all()

    return ExamHistoryResponse(
        attempts=[ExamAttemptSummary.model_validate(a) for a in attempts],
        total=len(attempts),
    )
