"""
Pydantic schemas for exam and analytics endpoints.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Exam Request Schemas ─────────────────────────────────────

class ExamStartRequest(BaseModel):
    """Start a new exam attempt."""
    document_id: UUID
    question_count: int = Field(20, description="Number of questions for the exam")


class ExamAnswer(BaseModel):
    """A single answer submission."""
    question_id: UUID
    selected_answer: str = Field(..., description="A, B, C, or D")


class ExamSubmitRequest(BaseModel):
    """Submit exam answers."""
    attempt_id: UUID
    answers: list[ExamAnswer]
    time_taken_seconds: int = Field(0, description="Time spent on exam in seconds")


# ── Exam Response Schemas ────────────────────────────────────

class ExamQuestionResponse(BaseModel):
    """A question presented in an exam (without correct answer)."""
    id: UUID
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    topic: str
    difficulty: str


class ExamStartResponse(BaseModel):
    """Response when starting an exam."""
    attempt_id: UUID
    questions: list[ExamQuestionResponse]
    total_questions: int
    document_id: UUID


class AnswerDetail(BaseModel):
    """Detailed result for a single answer."""
    question_id: UUID
    question: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str
    topic: str


class TopicBreakdown(BaseModel):
    """Per-topic score breakdown."""
    topic: str
    total: int
    correct: int
    score_percent: float


class ExamResultResponse(BaseModel):
    """Detailed exam results."""
    attempt_id: UUID
    total_questions: int
    correct_answers: int
    wrong_answers: int
    accuracy: float
    time_taken_seconds: int
    answer_details: list[AnswerDetail]
    topic_breakdown: list[TopicBreakdown]
    created_at: datetime


class ExamAttemptSummary(BaseModel):
    """Summary of a past exam attempt."""
    id: UUID
    document_id: UUID
    total_questions: int
    correct_answers: int
    accuracy: float
    time_taken_seconds: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ExamHistoryResponse(BaseModel):
    """List of past exam attempts."""
    attempts: list[ExamAttemptSummary]
    total: int


# ── Analytics Schemas ────────────────────────────────────────

class WeakTopicResponse(BaseModel):
    """A weak topic identified from exam performance."""
    topic: str
    total_questions: int
    correct_answers: int
    score_percent: float
    recommendation: str


class WeakTopicsListResponse(BaseModel):
    """Aggregated weak topics across all exams."""
    weak_topics: list[WeakTopicResponse]
    total_exams: int
    overall_accuracy: float


class PerformanceResponse(BaseModel):
    """Per-document performance overview."""
    document_id: UUID
    total_attempts: int
    average_accuracy: float
    best_accuracy: float
    topics: list[TopicBreakdown]


class DashboardResponse(BaseModel):
    """Overall learning dashboard stats."""
    total_documents: int
    total_exams: int
    total_questions_answered: int
    overall_accuracy: float
    recent_attempts: list[ExamAttemptSummary]
    weak_topics: list[WeakTopicResponse]
