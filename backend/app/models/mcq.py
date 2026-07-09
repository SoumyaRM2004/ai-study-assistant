"""
MCQ question SQLAlchemy model.
Stores generated multiple-choice questions with topic and difficulty metadata.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MCQQuestion(Base):
    __tablename__ = "mcq_questions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    option_a: Mapped[str] = mapped_column(String(500), nullable=False)
    option_b: Mapped[str] = mapped_column(String(500), nullable=False)
    option_c: Mapped[str] = mapped_column(String(500), nullable=False)
    option_d: Mapped[str] = mapped_column(String(500), nullable=False)
    correct_answer: Mapped[str] = mapped_column(
        String(1), nullable=False,
        comment="A, B, C, or D",
    )
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    topic: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True,
        comment="Topic or concept being tested",
    )
    difficulty: Mapped[str] = mapped_column(
        String(10), nullable=False, index=True,
        comment="easy, medium, or hard",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Relationships ────────────────────────────────────────
    document = relationship("Document", backref="mcq_questions", lazy="selectin")

    def __repr__(self) -> str:
        return f"<MCQQuestion {self.topic}: {self.question[:50]}>"
