"""Change correct_option from letter to full text

Revision ID: change_correct_option
Revises: 
Create Date: 2024-12-22
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'change_correct_option_text'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the constraint
    op.drop_constraint('check_correct_option_valid', 'quiz_questions', type_='check')
    
    # Alter column to Text
    op.alter_column('quiz_questions', 'correct_option',
                    existing_type=sa.String(1),
                    type_=sa.Text(),
                    existing_nullable=False)
    
    # Update existing data: convert letter to actual text
    op.execute("""
        UPDATE quiz_questions 
        SET correct_option = CASE correct_option
            WHEN 'a' THEN option_a
            WHEN 'b' THEN option_b
            WHEN 'c' THEN option_c
            WHEN 'd' THEN option_d
            ELSE correct_option
        END
        WHERE correct_option IN ('a', 'b', 'c', 'd')
    """)


def downgrade() -> None:
    # This is a destructive operation - we can't reliably convert back
    pass
