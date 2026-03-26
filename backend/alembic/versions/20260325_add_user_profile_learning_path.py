"""add_user_profile_and_learning_path

Revision ID: 20260325_add_user_profile_learning_path
Revises: 20260321_merge_heads
Create Date: 2026-03-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260325_add_user_profile_learning_path'
down_revision: Union[str, None] = '20260321_merge_heads'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enums first
    usertype_enum = sa.Enum('SCHOOL', 'UNIVERSITY', 'ADULT', name='usertype')
    learningstage_enum = sa.Enum('LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED', name='learningstage')
    
    # Create user_profiles table
    op.create_table(
        'user_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_type', usertype_enum, nullable=False, server_default="'ADULT'"),
        sa.Column('school_grade', sa.Integer(), nullable=True),
        sa.Column('university_course', sa.Integer(), nullable=True),
        sa.Column('university_faculty', sa.String(length=255), nullable=True),
        sa.Column('profession', sa.String(length=255), nullable=True),
        sa.Column('learning_goal', sa.Text(), nullable=True),
        sa.Column('age', sa.Integer(), nullable=True),
        sa.Column('preferred_language', sa.String(length=10), nullable=True, server_default="'ru'"),
        sa.Column('difficulty_preference', sa.String(length=20), nullable=True, server_default="'medium'"),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_profiles_id'), 'user_profiles', ['id'], unique=False)
    op.create_index(op.f('ix_user_profiles_user_id'), 'user_profiles', ['user_id'], unique=True)
    op.create_foreign_key(
        'fk_user_profiles_user_id',
        'user_profiles', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )

    # Create learning_paths table
    op.create_table(
        'learning_paths',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_profile_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('material_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('summary_stage', learningstage_enum, nullable=False, server_default="'AVAILABLE'"),
        sa.Column('summary_completed_at', sa.DateTime(), nullable=True),
        sa.Column('flashcards_stage', learningstage_enum, nullable=False, server_default="'LOCKED'"),
        sa.Column('flashcards_started_at', sa.DateTime(), nullable=True),
        sa.Column('flashcards_completed_at', sa.DateTime(), nullable=True),
        sa.Column('quiz_stage', learningstage_enum, nullable=False, server_default="'LOCKED'"),
        sa.Column('quiz_available_after_flashcards_score', sa.Integer(), nullable=True, server_default='80'),
        sa.Column('quiz_attempts_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('best_quiz_score', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('last_quiz_score', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('last_quiz_attempt_at', sa.DateTime(), nullable=True),
        sa.Column('quiz_completed_at', sa.DateTime(), nullable=True),
        sa.Column('remedial_presentation_unlocked', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('remedial_podcast_unlocked', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('is_completed', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('current_stage', sa.String(length=50), nullable=True, server_default="'summary'"),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_learning_paths_id'), 'learning_paths', ['id'], unique=False)
    op.create_index(op.f('ix_learning_paths_user_profile_id'), 'learning_paths', ['user_profile_id'], unique=False)
    op.create_index(op.f('ix_learning_paths_material_id'), 'learning_paths', ['material_id'], unique=False)
    op.create_foreign_key(
        'fk_learning_paths_user_profile_id',
        'learning_paths', 'user_profiles',
        ['user_profile_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_learning_paths_material_id',
        'learning_paths', 'materials',
        ['material_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    # Drop learning_paths table
    op.drop_constraint('fk_learning_paths_material_id', 'learning_paths', type_='foreignkey')
    op.drop_constraint('fk_learning_paths_user_profile_id', 'learning_paths', type_='foreignkey')
    op.drop_index(op.f('ix_learning_paths_material_id'), table_name='learning_paths')
    op.drop_index(op.f('ix_learning_paths_user_profile_id'), table_name='learning_paths')
    op.drop_index(op.f('ix_learning_paths_id'), table_name='learning_paths')
    op.drop_table('learning_paths')

    # Drop user_profiles table
    op.drop_constraint('fk_user_profiles_user_id', 'user_profiles', type_='foreignkey')
    op.drop_index(op.f('ix_user_profiles_user_id'), table_name='user_profiles')
    op.drop_index(op.f('ix_user_profiles_id'), table_name='user_profiles')
    op.drop_table('user_profiles')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS learningstage')
    op.execute('DROP TYPE IF EXISTS usertype')
