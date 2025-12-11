"""
SQLAlchemy модель для хранения попыток прохождения quiz
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.infrastructure.database.base import Base


class QuizAttempt(Base):
    """
    Модель для хранения результатов прохождения quiz пользователем
    """
    __tablename__ = "quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)

    # Результаты
    score = Column(Integer, nullable=False)  # Количество правильных ответов
    total_questions = Column(Integer, nullable=False)  # Всего вопросов
    percentage = Column(Integer, nullable=False)  # Процент правильных (0-100)

    # Детали ответов (JSON массив)
    # Формат: [{"question_id": "uuid", "selected": "a", "correct": true, "correct_option": "a"}, ...]
    answers = Column(JSON, nullable=False)

    # Timestamps
    completed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Constraints
    __table_args__ = (
        CheckConstraint('score >= 0', name='check_score_positive'),
        CheckConstraint('total_questions > 0', name='check_total_positive'),
        CheckConstraint('percentage >= 0 AND percentage <= 100', name='check_percentage_range'),
        CheckConstraint('score <= total_questions', name='check_score_not_exceeds_total'),
    )

    # Relationships
    user = relationship("User", back_populates="quiz_attempts")
    material = relationship("Material", back_populates="quiz_attempts")

    def __repr__(self):
        return f"<QuizAttempt(id={self.id}, user_id={self.user_id}, score={self.score}/{self.total_questions})>"
