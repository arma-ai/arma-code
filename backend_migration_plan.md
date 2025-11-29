# Backend Migration Plan: FastAPI + PostgreSQL

## Шаг 1: Создание структуры проекта

```bash
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app
│   ├── config.py               # Настройки (Pydantic Settings)
│   │
│   ├── api/                    # REST API endpoints
│   │   ├── __init__.py
│   │   ├── deps.py            # Dependencies (auth, db)
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── materials.py   # Material endpoints
│   │   │   ├── auth.py        # Auth endpoints
│   │   │   ├── tutor.py       # Tutor chat endpoints
│   │   │   ├── flashcards.py
│   │   │   └── quiz.py
│   │
│   ├── core/                   # Core functionality
│   │   ├── __init__.py
│   │   ├── security.py        # JWT, password hashing
│   │   ├── config.py          # Configuration
│   │   └── errors.py          # Custom exceptions
│   │
│   ├── domain/                 # Domain layer (business logic)
│   │   ├── __init__.py
│   │   ├── entities/
│   │   │   ├── material.py
│   │   │   ├── user.py
│   │   │   └── flashcard.py
│   │   ├── repositories/      # Abstract interfaces
│   │   │   ├── material_repo.py
│   │   │   └── user_repo.py
│   │   └── services/          # Business logic
│   │       ├── material_service.py
│   │       ├── ai_service.py
│   │       └── embedding_service.py
│   │
│   ├── infrastructure/         # Infrastructure layer
│   │   ├── __init__.py
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── base.py        # SQLAlchemy Base
│   │   │   ├── session.py     # DB session
│   │   │   └── models/        # SQLAlchemy models
│   │   │       ├── material.py
│   │   │       ├── user.py
│   │   │       └── embedding.py
│   │   ├── repositories/      # Concrete implementations
│   │   │   ├── sqlalchemy_material_repo.py
│   │   │   └── sqlalchemy_user_repo.py
│   │   ├── ai/
│   │   │   ├── openai_client.py
│   │   │   └── langchain_service.py
│   │   ├── storage/
│   │   │   └── s3_storage.py  # или Supabase Storage
│   │   └── queue/
│   │       └── celery_tasks.py
│   │
│   ├── schemas/                # Pydantic schemas (DTOs)
│   │   ├── __init__.py
│   │   ├── material.py
│   │   ├── user.py
│   │   ├── flashcard.py
│   │   └── responses.py
│   │
│   └── workers/                # Background workers
│       ├── __init__.py
│       ├── material_processor.py
│       └── embedding_generator.py
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── alembic/                    # Database migrations
│   ├── versions/
│   └── env.py
│
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
│
├── .env.example
├── alembic.ini
├── pyproject.toml
└── README.md
```

## Шаг 2: Настройка базы данных

### PostgreSQL Setup

```bash
# Docker Compose для разработки
docker-compose.yml:

version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: eduplatform
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: eduplatform_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### SQLAlchemy Models

```python
# app/infrastructure/database/models/material.py
from sqlalchemy import Column, String, Integer, Text, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
import uuid
from datetime import datetime

from app.infrastructure.database.base import Base

class Material(Base):
    __tablename__ = "materials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    type = Column(Enum("pdf", "youtube", name="material_type"), nullable=False)

    # PDF specific
    file_path = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)

    # YouTube specific
    source = Column(String(500), nullable=True)  # YouTube URL

    # Processing
    processing_status = Column(
        Enum("queued", "processing", "completed", "failed", name="processing_status"),
        default="queued"
    )
    processing_progress = Column(Integer, default=0)

    # Content
    full_text = Column(Text, nullable=True)
    rich_content = Column(JSONB, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="materials")
    summary = relationship("MaterialSummary", back_populates="material", uselist=False)
    notes = relationship("MaterialNotes", back_populates="material", uselist=False)
    flashcards = relationship("Flashcard", back_populates="material")
    quiz_questions = relationship("QuizQuestion", back_populates="material")
    embeddings = relationship("MaterialEmbedding", back_populates="material")

    # Indexes
    __table_args__ = (
        Index('idx_materials_user_id', 'user_id'),
        Index('idx_materials_type', 'type'),
        Index('idx_materials_status', 'processing_status'),
    )


class MaterialEmbedding(Base):
    __tablename__ = "material_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"))
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)

    # Vector embedding (3072 dimensions for text-embedding-3-large)
    embedding = Column(Vector(3072), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    material = relationship("Material", back_populates="embeddings")

    # Indexes for vector similarity search
    __table_args__ = (
        Index('idx_embeddings_material_id', 'material_id'),
        Index('idx_embeddings_vector', 'embedding', postgresql_using='ivfflat',
              postgresql_with={'lists': 100}),  # IVFFlat index for fast similarity search
    )
```

## Шаг 3: Pydantic Schemas (DTOs)

```python
# app/schemas/material.py
from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Literal

class MaterialBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    type: Literal["pdf", "youtube"]

class MaterialCreate(MaterialBase):
    # For PDF
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None

    # For YouTube
    source: Optional[str] = None

class MaterialUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    processing_status: Optional[str] = None
    processing_progress: Optional[int] = Field(None, ge=0, le=100)

class MaterialResponse(MaterialBase):
    id: UUID
    user_id: UUID
    processing_status: str
    processing_progress: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MaterialDetailResponse(MaterialResponse):
    full_text: Optional[str] = None
    summary: Optional[str] = None
    notes: Optional[str] = None
    flashcard_count: int
    quiz_count: int
```

## Шаг 4: Repository Pattern

```python
# app/domain/repositories/material_repo.py
from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from app.domain.entities.material import Material

class MaterialRepository(ABC):
    @abstractmethod
    async def create(self, material: Material) -> Material:
        pass

    @abstractmethod
    async def get_by_id(self, material_id: UUID, user_id: UUID) -> Optional[Material]:
        pass

    @abstractmethod
    async def get_all_by_user(self, user_id: UUID) -> List[Material]:
        pass

    @abstractmethod
    async def update(self, material: Material) -> Material:
        pass

    @abstractmethod
    async def delete(self, material_id: UUID, user_id: UUID) -> bool:
        pass

# app/infrastructure/repositories/sqlalchemy_material_repo.py
from typing import List, Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.repositories.material_repo import MaterialRepository
from app.infrastructure.database.models.material import Material as MaterialModel
from app.domain.entities.material import Material

class SQLAlchemyMaterialRepository(MaterialRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, material: Material) -> Material:
        db_material = MaterialModel(**material.dict())
        self.session.add(db_material)
        await self.session.commit()
        await self.session.refresh(db_material)
        return Material.from_orm(db_material)

    async def get_by_id(self, material_id: UUID, user_id: UUID) -> Optional[Material]:
        stmt = select(MaterialModel).where(
            MaterialModel.id == material_id,
            MaterialModel.user_id == user_id
        )
        result = await self.session.execute(stmt)
        db_material = result.scalar_one_or_none()
        return Material.from_orm(db_material) if db_material else None

    # ... other methods
```

## Шаг 5: FastAPI Endpoints

```python
# app/api/v1/materials.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from typing import List
from uuid import UUID

from app.api.deps import get_current_user, get_material_service
from app.schemas.material import MaterialCreate, MaterialResponse, MaterialDetailResponse
from app.schemas.user import User
from app.domain.services.material_service import MaterialService

router = APIRouter(prefix="/materials", tags=["materials"])

@router.post("/", response_model=MaterialResponse, status_code=201)
async def create_material(
    title: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    material_service: MaterialService = Depends(get_material_service)
):
    """Upload a new PDF material"""
    # Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(400, "Only PDF files are allowed")

    # Validate file size (50MB)
    file_size = 0
    chunk_size = 1024 * 1024  # 1MB chunks
    while chunk := await file.read(chunk_size):
        file_size += len(chunk)
        if file_size > 50 * 1024 * 1024:
            raise HTTPException(400, "File too large (max 50MB)")

    await file.seek(0)  # Reset file pointer

    # Create material
    material = await material_service.create_pdf_material(
        user_id=current_user.id,
        title=title,
        file=file
    )

    return material

@router.post("/youtube", response_model=MaterialResponse, status_code=201)
async def create_youtube_material(
    title: str,
    youtube_url: str,
    current_user: User = Depends(get_current_user),
    material_service: MaterialService = Depends(get_material_service)
):
    """Create material from YouTube video"""
    material = await material_service.create_youtube_material(
        user_id=current_user.id,
        title=title,
        youtube_url=youtube_url
    )
    return material

@router.post("/{material_id}/process", status_code=202)
async def process_material(
    material_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    material_service: MaterialService = Depends(get_material_service)
):
    """Start processing material (background job)"""
    # Verify ownership
    material = await material_service.get_by_id(material_id, current_user.id)
    if not material:
        raise HTTPException(404, "Material not found")

    # Queue processing job
    background_tasks.add_task(
        material_service.process_material,
        material_id=material_id
    )

    return {"status": "queued", "message": "Processing started"}

@router.get("/", response_model=List[MaterialResponse])
async def get_materials(
    current_user: User = Depends(get_current_user),
    material_service: MaterialService = Depends(get_material_service)
):
    """Get all materials for current user"""
    materials = await material_service.get_all_by_user(current_user.id)
    return materials

@router.get("/{material_id}", response_model=MaterialDetailResponse)
async def get_material(
    material_id: UUID,
    current_user: User = Depends(get_current_user),
    material_service: MaterialService = Depends(get_material_service)
):
    """Get material details"""
    material = await material_service.get_detail(material_id, current_user.id)
    if not material:
        raise HTTPException(404, "Material not found")
    return material
```

## Шаг 6: Business Logic Service

```python
# app/domain/services/material_service.py
from typing import List, Optional
from uuid import UUID
from fastapi import UploadFile

from app.domain.repositories.material_repo import MaterialRepository
from app.domain.services.ai_service import AIService
from app.domain.services.storage_service import StorageService
from app.schemas.material import MaterialCreate, MaterialResponse

class MaterialService:
    def __init__(
        self,
        material_repo: MaterialRepository,
        ai_service: AIService,
        storage_service: StorageService
    ):
        self.material_repo = material_repo
        self.ai_service = ai_service
        self.storage_service = storage_service

    async def create_pdf_material(
        self,
        user_id: UUID,
        title: str,
        file: UploadFile
    ) -> MaterialResponse:
        # Upload to storage
        file_path = await self.storage_service.upload_pdf(
            user_id=user_id,
            file=file
        )

        # Create material record
        material_data = MaterialCreate(
            title=title,
            type="pdf",
            file_path=file_path,
            file_name=file.filename,
            file_size=file.size
        )

        material = await self.material_repo.create(material_data)
        return MaterialResponse.from_orm(material)

    async def process_material(self, material_id: UUID):
        """Process material (extract text, generate AI content, embeddings)"""
        # This will be called as background task
        # Implementation similar to current processMaterial.ts
        # but with proper service separation
        pass
```

## Шаг 7: AI Service с LangChain

```python
# app/domain/services/ai_service.py
from typing import List
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser

from app.schemas.flashcard import FlashcardGenerated

class AIService:
    def __init__(self, openai_api_key: str):
        self.llm_mini = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=openai_api_key
        )
        self.llm = ChatOpenAI(
            model="gpt-4o",
            api_key=openai_api_key
        )
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-large",
            api_key=openai_api_key
        )

    async def generate_summary(self, text: str) -> str:
        prompt = ChatPromptTemplate.from_template(
            "You are an expert at summarizing educational materials.\n"
            "Create a concise summary of the following text.\n"
            "IMPORTANT: Write the summary in the SAME LANGUAGE as the source text.\n\n"
            "Text: {text}"
        )

        chain = prompt | self.llm_mini
        response = await chain.ainvoke({"text": text})
        return response.content

    async def generate_flashcards(self, text: str) -> List[FlashcardGenerated]:
        parser = PydanticOutputParser(pydantic_object=FlashcardGenerated)

        prompt = ChatPromptTemplate.from_template(
            "Generate 10-15 educational flashcards from this text.\n"
            "IMPORTANT: Write in the SAME LANGUAGE as the source text.\n\n"
            "{format_instructions}\n\n"
            "Text: {text}"
        )

        chain = prompt | self.llm | parser
        flashcards = await chain.ainvoke({
            "text": text,
            "format_instructions": parser.get_format_instructions()
        })
        return flashcards

    async def create_embeddings_batch(
        self,
        texts: List[str]
    ) -> List[List[float]]:
        """Create embeddings in batch (more efficient)"""
        embeddings = await self.embeddings.aembed_documents(texts)
        return embeddings
```

## Шаг 8: Background Jobs с Celery

```python
# app/workers/material_processor.py
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "eduplatform",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60
)
def process_material_task(self, material_id: str):
    try:
        # Import here to avoid circular imports
        from app.domain.services.material_processor import MaterialProcessor

        processor = MaterialProcessor()
        processor.process(material_id)

    except Exception as exc:
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
```

## Шаг 9: Vector Search с pgvector

```python
# app/infrastructure/repositories/embedding_repo.py
from typing import List, Tuple
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.models.material import MaterialEmbedding

class EmbeddingRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_similar_chunks(
        self,
        material_id: UUID,
        query_embedding: List[float],
        limit: int = 5,
        threshold: float = 0.5
    ) -> List[Tuple[str, float]]:
        """Find similar chunks using cosine similarity"""

        # pgvector cosine similarity operator: <=>
        stmt = select(
            MaterialEmbedding.chunk_text,
            MaterialEmbedding.embedding.cosine_distance(query_embedding).label("distance")
        ).where(
            MaterialEmbedding.material_id == material_id
        ).order_by(
            "distance"
        ).limit(limit)

        result = await self.session.execute(stmt)
        rows = result.all()

        # Filter by threshold and convert distance to similarity
        similar_chunks = [
            (row.chunk_text, 1 - row.distance)
            for row in rows
            if (1 - row.distance) >= threshold
        ]

        return similar_chunks
```

## Миграция данных

```bash
# Создать миграцию
alembic revision --autogenerate -m "Initial migration"

# Применить миграцию
alembic upgrade head

# Откатить миграцию
alembic downgrade -1
```

## Деплой

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements/prod.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run migrations and start server
CMD alembic upgrade head && \
    uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Преимущества этого подхода

1. ✅ Полное разделение фронта/бэка
2. ✅ PostgreSQL с pgvector - RAG работает
3. ✅ Автодокументация API (Swagger)
4. ✅ Background jobs из коробки
5. ✅ Легко тестировать (моки для всех сервисов)
6. ✅ Легко масштабировать
7. ✅ Python экосистема для AI/ML
