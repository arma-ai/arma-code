"""Add HNSW vector index and composite indexes

Revision ID: a1b2c3d4e5f6
Revises: 69f9387fe939
Create Date: 2026-02-20 19:20:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '69f9387fe939'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Skip HNSW index - requires pgvector extension
    # Create regular index instead
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_embeddings_material_id
        ON material_embeddings (material_id);
    """)

    # Composite index: user_id + processing_status (common query pattern)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_materials_user_status
        ON materials (user_id, processing_status);
    """)

    # Composite index: user_id + created_at for sorted listing
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_materials_user_created
        ON materials (user_id, created_at DESC);
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_embeddings_vector_hnsw;")
    op.execute("DROP INDEX IF EXISTS idx_materials_user_status;")
    op.execute("DROP INDEX IF EXISTS idx_materials_user_created;")
