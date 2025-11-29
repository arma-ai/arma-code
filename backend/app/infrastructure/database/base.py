from sqlalchemy.ext.declarative import declarative_base

# Base class for all SQLAlchemy models
Base = declarative_base()


# Import all models here so Alembic can detect them
def import_models():
    """Import all models for Alembic autogenerate."""
    from app.infrastructure.database.models import user  # noqa
    from app.infrastructure.database.models import material  # noqa
    from app.infrastructure.database.models import embedding  # noqa
    from app.infrastructure.database.models import flashcard  # noqa
    from app.infrastructure.database.models import quiz  # noqa
