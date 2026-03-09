from sqlalchemy import Column, String, Integer, Text, DateTime, Enum, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.infrastructure.database.base import Base


class MaterialType(str, enum.Enum):
    PDF = "pdf"
    YOUTUBE = "youtube"
    ARTICLE = "article"
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
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # Groups materials uploaded together

    title = Column(String(200), nullable=False)
    type = Column(Enum(MaterialType, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)

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
    presentation_url = Column(String(2000), nullable=True)  # Download URL (long JWT tokens)
    presentation_embed_url = Column(String(2000), nullable=True)  # Embed URL for preview (long JWT tokens)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)
    deleted_at = Column(DateTime, nullable=True, index=True)  # Soft delete

    # Relationships
    user = relationship("User", back_populates="materials")
    project = relationship("Project", back_populates="materials")
    summary = relationship("MaterialSummary", back_populates="material", uselist=False, cascade="all, delete-orphan")
    notes = relationship("MaterialNotes", back_populates="material", uselist=False, cascade="all, delete-orphan")
    flashcards = relationship("Flashcard", back_populates="material", cascade="all, delete-orphan")
    quiz_questions = relationship("QuizQuestion", back_populates="material", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="material", cascade="all, delete-orphan")
    chunks = relationship("MaterialChunk", back_populates="material", cascade="all, delete-orphan")
    embeddings = relationship("MaterialEmbedding", back_populates="material", cascade="all, delete-orphan")
    tutor_messages = relationship("TutorMessage", back_populates="material", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index('idx_materials_user_type', 'user_id', 'type'),
        Index('idx_materials_status', 'processing_status'),
        Index('idx_materials_deleted', 'deleted_at'),
        Index('idx_materials_user_status', 'user_id', 'processing_status'),
        Index('idx_materials_user_created', 'user_id', 'created_at'),
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


class ProjectTutorMessage(Base):
    __tablename__ = "project_tutor_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    context = Column(String(50), default='chat')  # 'chat' or 'selection'
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    project = relationship("Project", back_populates="tutor_messages")


class ProjectContent(Base):
    """Unified AI-generated content for a project (all materials combined)."""
    __tablename__ = "project_contents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # AI-generated content
    summary = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    flashcards = Column(JSONB, nullable=True)  # [{question, answer}, ...]
    quiz = Column(JSONB, nullable=True)  # [{question, option_a, option_b, option_c, option_d, correct_option}, ...]
    
    # Processing metadata
    processing_status = Column(
        Enum(ProcessingStatus),
        default=ProcessingStatus.QUEUED,
        nullable=False,
        index=True
    )
    processing_progress = Column(Integer, default=0)  # 0-100
    processing_error = Column(Text, nullable=True)
    total_materials = Column(Integer, default=0)  # Count of materials in batch
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="content")
    
    __table_args__ = (
        Index('idx_project_contents_project_status', 'project_id', 'processing_status'),
    )
    
    def __repr__(self):
        return f"<ProjectContent project_id={self.project_id} status={self.processing_status}>"
