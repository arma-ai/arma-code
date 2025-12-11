"""
SQLAlchemy models
"""
from app.infrastructure.database.models.user import User
from app.infrastructure.database.models.material import (
    Material,
    MaterialType,
    ProcessingStatus,
    MaterialSummary,
    MaterialNotes,
    TutorMessage,
)
from app.infrastructure.database.models.quiz import QuizQuestion
from app.infrastructure.database.models.flashcard import Flashcard
from app.infrastructure.database.models.embedding import MaterialEmbedding
from app.infrastructure.database.models.quiz_attempt import QuizAttempt

__all__ = [
    "User",
    "Material",
    "MaterialType",
    "ProcessingStatus",
    "MaterialSummary",
    "MaterialNotes",
    "TutorMessage",
    "QuizQuestion",
    "Flashcard",
    "MaterialEmbedding",
    "QuizAttempt",
]
