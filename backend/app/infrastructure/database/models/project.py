import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.infrastructure.database.base import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column("title", String(255), nullable=False)  # Column name in DB is 'title'

    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # relations
    owner = relationship("User", backref="projects")
    materials = relationship(
        "Material",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    content = relationship(
        "ProjectContent",
        back_populates="project",
        uselist=False,
        cascade="all, delete-orphan",
    )
    tutor_messages = relationship(
        "ProjectTutorMessage",
        back_populates="project",
        cascade="all, delete-orphan",
    )