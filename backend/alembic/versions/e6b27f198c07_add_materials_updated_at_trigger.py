"""add_materials_updated_at_trigger

Revision ID: e6b27f198c07
Revises: ece596f687c9
Create Date: 2026-02-21 04:39:25.356126

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6b27f198c07'
down_revision: Union[str, None] = 'ece596f687c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create trigger to set updated_at on INSERT and UPDATE
    op.execute("""
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at := NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE TRIGGER trg_materials_updated_at
        BEFORE INSERT OR UPDATE ON materials
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_materials_updated_at ON materials;")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at();")
