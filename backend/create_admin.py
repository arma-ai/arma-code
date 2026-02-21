"""
Script to create an initial admin user
"""
import asyncio
from uuid import uuid4
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.security import get_password_hash
from app.infrastructure.database.models.user import User

async def create_admin_user():
    """Create initial admin user"""
    # Create async engine
    engine = create_async_engine(settings.DATABASE_URL, echo=True)

    # Create async session
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        # Check if admin already exists
        from sqlalchemy import select
        result = await session.execute(
            select(User).where(User.email == "admin@example.com")
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print("❌ Admin user already exists!")
            return

        # Create admin user (created_at/updated_at will be set by database triggers)
        admin = User(
            id=uuid4(),
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            full_name="Admin User",
            is_active=True,
            is_superuser=True,
            is_oauth=False
        )

        session.add(admin)
        await session.commit()
        print("✅ Admin user created successfully!")
        print("   Email: admin@example.com")
        print("   Password: admin123")

if __name__ == "__main__":
    asyncio.run(create_admin_user())
