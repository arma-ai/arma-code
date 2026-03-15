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
    ProjectContent,
    ProjectTutorMessage,
)
from app.infrastructure.database.models.material_chunk import MaterialChunk
from app.infrastructure.database.models.project import Project
from app.infrastructure.database.models.quiz import QuizQuestion
from app.infrastructure.database.models.flashcard import Flashcard
from app.infrastructure.database.models.embedding import MaterialEmbedding
from app.infrastructure.database.models.quiz_attempt import QuizAttempt

__all__ = [
    "User",
    "Material",
    "MaterialChunk",
    "Project",
    "ProjectContent",
    "ProjectTutorMessage",
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
