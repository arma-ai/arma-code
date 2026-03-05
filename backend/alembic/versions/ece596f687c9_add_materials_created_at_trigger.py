"""add_materials_created_at_trigger

Revision ID: ece596f687c9
Revises: 6fb25a3dc24c
Create Date: 2026-02-21 04:37:57.161680

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ece596f687c9'
down_revision: Union[str, None] = '6fb25a3dc24c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create trigger to set created_at on INSERT
    op.execute("""
        CREATE OR REPLACE FUNCTION set_created_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.created_at := NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE TRIGGER trg_materials_created_at
        BEFORE INSERT ON materials
        FOR EACH ROW
        EXECUTE FUNCTION set_created_at();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_materials_created_at ON materials;")
    op.execute("DROP FUNCTION IF EXISTS set_created_at();")
