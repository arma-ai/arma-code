"""
Script to create an initial admin user (sync version)
"""
from uuid import uuid4
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.security import get_password_hash
from app.infrastructure.database.models.user import User
from datetime import datetime

# Create sync engine
engine = create_engine(settings.DATABASE_URL_SYNC.replace('+asyncpg', ''))

# Create sync session
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

def create_admin_user():
    """Create initial admin user"""
    with SessionLocal() as session:
        # Check if admin already exists
        result = session.execute(
            select(User).where(User.email == "admin@example.com")
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print("❌ Admin user already exists!")
            return

        # Create admin user with explicit timestamps
        admin = User(
            id=uuid4(),
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            full_name="Admin User",
            is_active=True,
            is_superuser=True,
            is_oauth=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        session.add(admin)
        session.commit()
        print("✅ Admin user created successfully!")
        print("   Email: admin@example.com")
        print("   Password: admin123")

if __name__ == "__main__":
    create_admin_user()
