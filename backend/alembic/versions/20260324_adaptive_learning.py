"""add adaptive learning system tables

Revision ID: 20260324_adaptive_learning
Revises: 20260321_merge_heads
Create Date: 2026-03-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260324_adaptive_learning'
down_revision: Union[str, Sequence[str], None] = '20260321_merge_heads'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create user_profiles table
    op.create_table(
        'user_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('age', sa.Integer(), nullable=True),
        sa.Column('education_level', sa.String(length=50), nullable=True),
        sa.Column('grade_level', sa.Integer(), nullable=True),
        sa.Column('school_interests', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('university_year', sa.Integer(), nullable=True),
        sa.Column('faculty', sa.String(length=100), nullable=True),
        sa.Column('major', sa.String(length=100), nullable=True),
        sa.Column('occupation', sa.String(length=100), nullable=True),
        sa.Column('work_field', sa.String(length=100), nullable=True),
        sa.Column('learning_style', sa.String(length=50), nullable=True),
        sa.Column('interests', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_user_profiles_user_id', 'user_profiles', ['user_id'], unique=False)
    op.create_index('idx_user_profiles_education_level', 'user_profiles', ['education_level'], unique=False)
    op.create_index(op.f('ix_user_profiles_id'), 'user_profiles', ['id'], unique=False)

    # Create learning_progress table
    op.create_table(
        'learning_progress',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('material_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('current_stage', sa.String(length=50), nullable=False),
        sa.Column('summary_completed', sa.Boolean(), nullable=True),
        sa.Column('summary_read_time_seconds', sa.Integer(), nullable=True),
        sa.Column('summary_word_count', sa.Integer(), nullable=True),
        sa.Column('flashcards_completed', sa.Boolean(), nullable=True),
        sa.Column('flashcards_viewed_count', sa.Integer(), nullable=True),
        sa.Column('quiz_attempts_count', sa.Integer(), nullable=True),
        sa.Column('best_quiz_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('quiz_passed', sa.Boolean(), nullable=True),
        sa.Column('quiz_weak_areas', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('presentation_completed', sa.Boolean(), nullable=True),
        sa.Column('presentation_generated', sa.Boolean(), nullable=True),
        sa.Column('podcast_completed', sa.Boolean(), nullable=True),
        sa.Column('podcast_generated', sa.Boolean(), nullable=True),
        sa.Column('mastery_achieved', sa.Boolean(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_learning_progress_user_material', 'learning_progress', ['user_id', 'material_id'], unique=True)
    op.create_index('idx_learning_progress_current_stage', 'learning_progress', ['current_stage'], unique=False)
    op.create_index('idx_learning_progress_mastery', 'learning_progress', ['mastery_achieved'], unique=False)
    op.create_index(op.f('ix_learning_progress_id'), 'learning_progress', ['id'], unique=False)
    op.create_index(op.f('ix_learning_progress_user_id'), 'learning_progress', ['user_id'], unique=False)
    op.create_index(op.f('ix_learning_progress_material_id'), 'learning_progress', ['material_id'], unique=False)

    # Create presentations table
    op.create_table(
        'presentations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('material_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('slides', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('total_slides', sa.Integer(), nullable=True),
        sa.Column('generation_prompt', sa.Text(), nullable=True),
        sa.Column('user_profile_context', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('focus_areas', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('generation_status', sa.String(length=50), nullable=True),
        sa.Column('viewed', sa.Boolean(), nullable=True),
        sa.Column('viewed_at', sa.DateTime(), nullable=True),
        sa.Column('view_duration_seconds', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_presentations_material_user', 'presentations', ['material_id', 'user_id'], unique=False)
    op.create_index('idx_presentations_status', 'presentations', ['generation_status'], unique=False)
    op.create_index(op.f('ix_presentations_id'), 'presentations', ['id'], unique=False)
    op.create_index(op.f('ix_presentations_material_id'), 'presentations', ['material_id'], unique=False)
    op.create_index(op.f('ix_presentations_user_id'), 'presentations', ['user_id'], unique=False)

    # Create podcasts table
    op.create_table(
        'podcasts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('material_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('audio_url', sa.String(length=500), nullable=True),
        sa.Column('audio_file_path', sa.String(length=500), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('generation_prompt', sa.Text(), nullable=True),
        sa.Column('user_profile_context', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('voice_type', sa.String(length=50), nullable=True),
        sa.Column('playback_speed', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('generation_status', sa.String(length=50), nullable=True),
        sa.Column('played', sa.Boolean(), nullable=True),
        sa.Column('play_progress_seconds', sa.Integer(), nullable=True),
        sa.Column('completed', sa.Boolean(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_podcasts_material_user', 'podcasts', ['material_id', 'user_id'], unique=False)
    op.create_index('idx_podcasts_status', 'podcasts', ['generation_status'], unique=False)
    op.create_index(op.f('ix_podcasts_id'), 'podcasts', ['id'], unique=False)
    op.create_index(op.f('ix_podcasts_material_id'), 'podcasts', ['material_id'], unique=False)
    op.create_index(op.f('ix_podcasts_user_id'), 'podcasts', ['user_id'], unique=False)

    # Add updated_at trigger for user_profiles
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE TRIGGER update_user_profiles_updated_at
            BEFORE UPDATE ON user_profiles
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)

    # Add updated_at trigger for learning_progress
    op.execute("""
        CREATE TRIGGER update_learning_progress_updated_at
            BEFORE UPDATE ON learning_progress
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)

    # Add updated_at trigger for presentations
    op.execute("""
        CREATE TRIGGER update_presentations_updated_at
            BEFORE UPDATE ON presentations
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)

    # Add updated_at trigger for podcasts
    op.execute("""
        CREATE TRIGGER update_podcasts_updated_at
            BEFORE UPDATE ON podcasts
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    # Drop triggers
    op.execute('DROP TRIGGER IF EXISTS update_podcasts_updated_at ON podcasts')
    op.execute('DROP TRIGGER IF EXISTS update_presentations_updated_at ON presentations')
    op.execute('DROP TRIGGER IF EXISTS update_learning_progress_updated_at ON learning_progress')
    op.execute('DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles')
    op.execute('DROP FUNCTION IF EXISTS update_updated_at_column()')

    # Drop tables
    op.drop_table('podcasts')
    op.drop_table('presentations')
    op.drop_table('learning_progress')
    op.drop_table('user_profiles')
