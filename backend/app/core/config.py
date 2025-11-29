from pydantic_settings import BaseSettings
from typing import List
import secrets


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "EduPlatform API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = secrets.token_urlsafe(32)

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://eduplatform:dev123@localhost:5433/eduplatform_dev"
    DATABASE_URL_SYNC: str = "postgresql://eduplatform:dev123@localhost:5433/eduplatform_dev"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # OpenAI
    OPENAI_API_KEY: str = ""

    # JWT
    JWT_SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    # Storage
    STORAGE_TYPE: str = "supabase"  # or 's3'
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # File Upload
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_FILE_TYPES: List[str] = ["application/pdf"]

    # AI Processing
    CHUNK_SIZE: int = 8000
    EMBEDDING_CHUNK_SIZE: int = 1000
    EMBEDDING_MODEL: str = "text-embedding-3-large"
    EMBEDDING_DIMENSIONS: int = 3072

    # LLM Models
    LLM_MODEL_MINI: str = "gpt-4o-mini"
    LLM_MODEL: str = "gpt-4o"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
