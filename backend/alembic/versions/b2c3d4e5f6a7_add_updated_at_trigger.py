"""Add updated_at trigger for automatic timestamp updates.

This migration adds a PostgreSQL trigger function ``set_updated_at()``
and attaches BEFORE UPDATE triggers to ``materials`` and ``users`` tables.
This ensures ``updated_at`` is always set server-side, regardless of whether
the application-level ``onupdate`` fires (which is unreliable with async
SQLAlchemy).

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-20
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create a reusable trigger function
    op.execute("""
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # Attach trigger to materials table (separate statements for asyncpg)
    op.execute("DROP TRIGGER IF EXISTS trg_materials_updated_at ON materials;")
    op.execute("""
        CREATE TRIGGER trg_materials_updated_at
            BEFORE UPDATE ON materials
            FOR EACH ROW
            EXECUTE PROCEDURE set_updated_at();
    """)

    # Attach trigger to users table
    op.execute("DROP TRIGGER IF EXISTS trg_users_updated_at ON users;")
    op.execute("""
        CREATE TRIGGER trg_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE PROCEDURE set_updated_at();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_materials_updated_at ON materials;")
    op.execute("DROP TRIGGER IF EXISTS trg_users_updated_at ON users;")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at();")
