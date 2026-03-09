"""Add docx, doc, txt to materialtype enum

Revision ID: e6b27f198c08
Revises: e6b27f198c07
Create Date: 2026-03-09

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e6b27f198c08'
down_revision = '20260309_project_tutor'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Add docx, doc, txt to materialtype enum.
    """
    conn = op.get_bind()
    
    # Check current enum values
    result = conn.execute(sa.text("""
        SELECT e.enumlabel 
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        WHERE t.typname = 'materialtype'
        ORDER BY e.enumsortorder
    """)).fetchall()
    
    existing_values = [row[0] for row in result]
    
    # Add missing values: docx, doc, txt
    needed_values = ['docx', 'doc', 'txt']
    
    for value in needed_values:
        if value not in existing_values:
            conn.execute(sa.text(f"ALTER TYPE materialtype ADD VALUE IF NOT EXISTS '{value}'"))
            print(f"Added '{value}' to materialtype enum")
    
    print(f"Materialtype enum: {existing_values} -> {existing_values + needed_values}")


def downgrade() -> None:
    """Cannot remove enum values in PostgreSQL."""
    pass
