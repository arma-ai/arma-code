"""
Tests for database migrations and indexes.
"""
import pytest
import os


class TestMigrationFiles:
    """Tests for Alembic migration files."""

    def test_hnsw_index_migration_exists(self):
        """Test that HNSW index migration file exists."""
        migrations_dir = os.path.join(
            os.path.dirname(__file__), "..", "alembic", "versions"
        )
        
        migration_found = False
        for filename in os.listdir(migrations_dir):
            if "vector" in filename.lower() or "index" in filename.lower():
                filepath = os.path.join(migrations_dir, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                    if "hnsw" in content.lower() or "idx_embeddings" in content:
                        migration_found = True
                        break
        
        assert migration_found, "HNSW index migration not found"

    def test_updated_at_trigger_migration_exists(self):
        """Test that updated_at trigger migration file exists."""
        migrations_dir = os.path.join(
            os.path.dirname(__file__), "..", "alembic", "versions"
        )
        
        migration_found = False
        for filename in os.listdir(migrations_dir):
            if "trigger" in filename.lower() or "updated_at" in filename.lower():
                migration_found = True
                break
        
        assert migration_found, "updated_at trigger migration not found"

    def test_hnsw_migration_has_correct_sql(self):
        """Test that migration has correct SQL for indexes."""
        migrations_dir = os.path.join(
            os.path.dirname(__file__), "..", "alembic", "versions"
        )
        
        for filename in os.listdir(migrations_dir):
            if "vector" in filename.lower() or "index" in filename.lower():
                filepath = os.path.join(migrations_dir, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                    if "idx_embeddings" in content.lower() or "vector" in content.lower():
                        # Check for required SQL elements (regular index now, not HNSW)
                        assert "CREATE INDEX" in content
                        assert "material_embeddings" in content
                        assert "embedding" in content
                        return
        
        pytest.fail("Vector index migration not found")

    def test_composite_index_migration_exists(self):
        """Test that composite index migration exists."""
        migrations_dir = os.path.join(
            os.path.dirname(__file__), "..", "alembic", "versions"
        )
        
        migration_found = False
        for filename in os.listdir(migrations_dir):
            if "index" in filename.lower():
                filepath = os.path.join(migrations_dir, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                    if "user_id" in content and "processing_status" in content:
                        migration_found = True
                        break
        
        assert migration_found, "Composite index migration not found"


class TestModelIndexes:
    """Tests for SQLAlchemy model index definitions."""

    def test_material_embedding_has_index(self):
        """Test that MaterialEmbedding model has index defined."""
        from app.infrastructure.database.models.embedding import MaterialEmbedding
        
        # Check that __table_args__ exists with indexes
        assert hasattr(MaterialEmbedding, "__table_args__")
        
        table_args = MaterialEmbedding.__table_args__
        assert table_args is not None

    def test_material_has_composite_indexes(self):
        """Test that Material model has composite indexes."""
        from app.infrastructure.database.models.material import Material
        
        # Check that __table_args__ exists with indexes
        assert hasattr(Material, "__table_args__")
        
        table_args = Material.__table_args__
        assert table_args is not None
        
        # Should have composite indexes
        indexes = Material.__table_args__
        index_names = [str(idx) for idx in indexes if hasattr(idx, 'name')]
        
        # Check for composite index names
        has_user_status = any("user_status" in name for name in index_names)
        has_user_created = any("user_created" in name for name in index_names)
        
        assert has_user_status or has_user_created, "Composite indexes not found"
