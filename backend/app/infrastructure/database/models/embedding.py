from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from datetime import datetime
import uuid

from app.infrastructure.database.base import Base


class MaterialEmbedding(Base):
    __tablename__ = "material_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)

    # Vector embedding (3072 dimensions for text-embedding-3-large)
    embedding = Column(Vector(3072), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    material = relationship("Material", back_populates="embeddings")

    # Indexes for efficient vector similarity search
    __table_args__ = (
        Index('idx_embeddings_material_id', 'material_id'),
        # IVFFlat index for fast similarity search
        # This will be created via migration with:
        # CREATE INDEX idx_embeddings_vector ON material_embeddings
        # USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    )

    def __repr__(self):
        return f"<MaterialEmbedding chunk {self.chunk_index}>"
