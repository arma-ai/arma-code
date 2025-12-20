from sqlalchemy import Column, String, Integer, Text, DateTime, Enum, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.infrastructure.database.base import Base


class MaterialType(str, enum.Enum):
    PDF = "pdf"
    YOUTUBE = "youtube"
    DOCX = "docx"
    DOC = "doc"
    TXT = "txt"
    RTF = "rtf"
    ODT = "odt"
    EPUB = "epub"
    MD = "md"
    HTML = "html"


class ProcessingStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Material(Base):
    __tablename__ = "materials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(200), nullable=False)
    type = Column(Enum(MaterialType), nullable=False, index=True)

    # PDF specific
    file_path = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)

    # YouTube specific
    source = Column(String(500), nullable=True)  # YouTube URL

    # Processing
    processing_status = Column(
        Enum(ProcessingStatus),
        default=ProcessingStatus.QUEUED,
        nullable=False,
        index=True
    )
    processing_progress = Column(Integer, default=0)  # 0-100
    processing_error = Column(Text, nullable=True)

    # Content
    full_text = Column(Text, nullable=True)
    rich_content = Column(JSONB, nullable=True)  # Structured content (headings, lists, etc.)

    # Podcast
    podcast_script = Column(JSONB, nullable=True)  # Array of {speaker, text}
    podcast_audio_url = Column(String(500), nullable=True)  # URL to generated audio file

    # Presentation
    presentation_status = Column(String(50), nullable=True)  # 'generating', 'completed', 'failed'
    presentation_url = Column(String(500), nullable=True)  # Download URL
    presentation_embed_url = Column(String(500), nullable=True)  # Embed URL for preview

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="materials")
    summary = relationship("MaterialSummary", back_populates="material", uselist=False, cascade="all, delete-orphan")
    notes = relationship("MaterialNotes", back_populates="material", uselist=False, cascade="all, delete-orphan")
    flashcards = relationship("Flashcard", back_populates="material", cascade="all, delete-orphan")
    quiz_questions = relationship("QuizQuestion", back_populates="material", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="material", cascade="all, delete-orphan")
    embeddings = relationship("MaterialEmbedding", back_populates="material", cascade="all, delete-orphan")
    tutor_messages = relationship("TutorMessage", back_populates="material", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index('idx_materials_user_type', 'user_id', 'type'),
        Index('idx_materials_status', 'processing_status'),
    )

    def __repr__(self):
        return f"<Material {self.title} ({self.type})>"


class MaterialSummary(Base):
    __tablename__ = "material_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, unique=True)
    summary = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    material = relationship("Material", back_populates="summary")


class MaterialNotes(Base):
    __tablename__ = "material_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, unique=True)
    notes = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    material = relationship("Material", back_populates="notes")


class TutorMessage(Base):
    __tablename__ = "tutor_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    context = Column(String(50), default='chat')  # 'chat' or 'selection'
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    material = relationship("Material", back_populates="tutor_messages")

    __table_args__ = (
        Index('idx_tutor_messages_material_created', 'material_id', 'created_at'),
    )
