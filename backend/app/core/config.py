import secrets
from pathlib import Path
from typing import List, Union

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve project paths so .env is loaded reliably regardless of CWD
_BACKEND_DIR = Path(__file__).resolve().parents[2]
_REPO_ROOT = _BACKEND_DIR.parent

# Load environment files into os.environ early so third-party libs (e.g., OpenAI)
# can pick them up even before Settings is instantiated.
for env_path in (
    _BACKEND_DIR / ".env",
    _BACKEND_DIR / ".env.local",
    _REPO_ROOT / ".env",
    _REPO_ROOT / ".env.local",
):
    load_dotenv(env_path, override=False)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            _BACKEND_DIR / ".env",   # backend/.env
            _BACKEND_DIR / ".env.local",  # backend/.env.local (optional)
            _REPO_ROOT / ".env",     # project/.env
            _REPO_ROOT / ".env.local",  # project/.env.local (optional)
            ".env",                  # fallback to current working dir
        ),
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "EduPlatform API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = secrets.token_urlsafe(32)

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://eduplatform:dev123@localhost:5434/eduplatform_dev"
    DATABASE_URL_SYNC: str = "postgresql://eduplatform:dev123@localhost:5434/eduplatform_dev"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # OpenAI
    OPENAI_API_KEY: str = ""

    # JWT
    JWT_SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]
    BACKEND_CORS_ORIGIN_REGEX: str = r"https?://(localhost|127\.0\.0\.1)(:\d+)?$"

    # Storage
    STORAGE_TYPE: str = "supabase"  # or 's3'
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # File Upload
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_FILE_TYPES: List[str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # DOCX
        "application/msword",  # DOC
        "text/plain",  # TXT
        "application/rtf",  # RTF
        "text/rtf",  # RTF alternative
        "application/vnd.oasis.opendocument.text",  # ODT
        "application/epub+zip",  # EPUB
        "text/markdown",  # MD
        "text/html",  # HTML
        "application/x-markdown",  # MD alternative
    ]

    # AI Processing
    CHUNK_SIZE: int = 8000
    EMBEDDING_CHUNK_SIZE: int = 1000
    EMBEDDING_MODEL: str = "text-embedding-3-large"
    EMBEDDING_DIMENSIONS: int = 3072

    # LLM Models
    LLM_MODEL_MINI: str = "gpt-4o-mini"
    LLM_MODEL: str = "gpt-4o"

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Union[str, List[str]]) -> List[str]:
        """
        Allow passing CORS origins as JSON array, comma separated string, or list,
        and normalize away trailing slashes/whitespace.
        """
        if value is None:
            return []

        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []

            if raw.startswith("["):
                try:
                    value = json.loads(raw)
                except json.JSONDecodeError:
                    # Fallback to comma-separated parsing if JSON is malformed
                    value = [item.strip() for item in raw.split(",") if item.strip()]
            else:
                value = [item.strip() for item in raw.split(",") if item.strip()]

        if isinstance(value, (list, tuple)):
            cleaned: List[str] = []
            for origin in value:
                if not origin:
                    continue
                normalized = str(origin).strip().rstrip("/")
                if normalized:
                    cleaned.append(normalized)
            return cleaned

        raise ValueError("BACKEND_CORS_ORIGINS must be a list or comma-separated string")


settings = Settings()
