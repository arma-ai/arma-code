"""Pydantic schemas for API request/response validation."""

from app.schemas.common import (
    BaseSchema,
    TimestampSchema,
    PaginationParams,
    PaginatedResponse,
    MessageResponse,
    ErrorResponse,
)

from app.schemas.user import (
    UserBase,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    Token,
    TokenData,
)

from app.schemas.material import (
    MaterialType,
    ProcessingStatus,
    MaterialBase,
    MaterialCreate,
    MaterialUpdate,
    MaterialSummaryResponse,
    MaterialNotesResponse,
    MaterialResponse,
    MaterialDetailResponse,
    MaterialProcessingUpdate,
    TutorMessageRequest,
    TutorMessageResponse,
    TutorChatHistoryResponse,
)

from app.schemas.flashcard import (
    FlashcardBase,
    FlashcardCreate,
    FlashcardResponse,
    FlashcardListResponse,
    FlashcardUpdate,
)

from app.schemas.quiz import (
    QuizQuestionBase,
    QuizQuestionCreate,
    QuizQuestionResponse,
    QuizQuestionWithAnswerResponse,
    QuizListResponse,
    QuizAnswerRequest,
    QuizAnswerResponse,
    QuizAttemptRequest,
    QuizAttemptResponse,
)

__all__ = [
    # Common
    "BaseSchema",
    "TimestampSchema",
    "PaginationParams",
    "PaginatedResponse",
    "MessageResponse",
    "ErrorResponse",
    # User
    "UserBase",
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "UserUpdate",
    "Token",
    "TokenData",
    # Material
    "MaterialType",
    "ProcessingStatus",
    "MaterialBase",
    "MaterialCreate",
    "MaterialUpdate",
    "MaterialSummaryResponse",
    "MaterialNotesResponse",
    "MaterialResponse",
    "MaterialDetailResponse",
    "MaterialProcessingUpdate",
    "TutorMessageRequest",
    "TutorMessageResponse",
    "TutorChatHistoryResponse",
    # Flashcard
    "FlashcardBase",
    "FlashcardCreate",
    "FlashcardResponse",
    "FlashcardListResponse",
    "FlashcardUpdate",
    # Quiz
    "QuizQuestionBase",
    "QuizQuestionCreate",
    "QuizQuestionResponse",
    "QuizQuestionWithAnswerResponse",
    "QuizListResponse",
    "QuizAnswerRequest",
    "QuizAnswerResponse",
    "QuizAttemptRequest",
    "QuizAttemptResponse",
]
