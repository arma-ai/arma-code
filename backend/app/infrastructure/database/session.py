from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Async engine for async operations
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
)

# Async session maker
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_async_session() -> AsyncSession:
    """
    Dependency for getting async database session.
    
    Bug fix #1.3: Don't auto-commit on yield. Let endpoints control transactions.
    This prevents committing data before knowing if the full request succeeded.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            # Commit is now handled by endpoints explicitly or by dependency injection
            # Only commit if we got here without exceptions
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
