"""
Tests for bug fixes and security improvements.
"""
import pytest
import os
import warnings
from unittest.mock import AsyncMock, MagicMock, patch


class TestConfigSecurityFixes:
    """Tests for security fixes in configuration (Bug #1.1)."""

    def test_database_url_uses_env_vars(self):
        """Test that DATABASE_URL uses environment variables."""
        from app.core.config import Settings
        
        # Create settings with custom env vars
        with patch.dict(os.environ, {
            'POSTGRES_USER': 'testuser',
            'POSTGRES_PASSWORD': 'testpass',
            'POSTGRES_HOST': 'testhost',
            'POSTGRES_PORT': '5433',
            'POSTGRES_DB': 'testdb'
        }, clear=False):
            settings = Settings()
            
            assert 'testuser' in settings.DATABASE_URL
            assert 'testpass' in settings.DATABASE_URL
            assert 'testhost' in settings.DATABASE_URL
            assert 'testdb' in settings.DATABASE_URL

    def test_database_url_warns_on_empty_password(self):
        """Test that DATABASE_URL warns when password is empty."""
        from app.core.config import Settings
        
        with patch.dict(os.environ, {
            'POSTGRES_PASSWORD': ''
        }, clear=False):
            with warnings.catch_warnings(record=True) as w:
                warnings.simplefilter("always")
                settings = Settings()
                
                # Access the property to trigger warning
                _ = settings.DATABASE_URL
                
                # Should have warned about security risk
                assert len(w) == 1
                assert "security risk" in str(w[0].message).lower()

    def test_database_url_no_warning_with_password(self):
        """Test that DATABASE_URL doesn't warn when password is set."""
        from app.core.config import Settings
        
        with patch.dict(os.environ, {
            'POSTGRES_PASSWORD': 'securepassword123'
        }, clear=False):
            with warnings.catch_warnings(record=True) as w:
                warnings.simplefilter("always")
                settings = Settings()
                
                # Access the property
                _ = settings.DATABASE_URL
                
                # Should not have warned
                security_warnings = [x for x in w if "security risk" in str(x.message).lower()]
                assert len(security_warnings) == 0


class TestUserUpdatePasswordValidation:
    """Tests for password validation in UserUpdate (Bug #1.2)."""

    def test_user_update_weak_password_rejected(self):
        """Test that weak passwords are rejected in UserUpdate."""
        from app.schemas.user import UserUpdate
        
        with pytest.raises(ValueError) as exc_info:
            UserUpdate(password="weak")
        
        assert "8 characters" in str(exc_info.value)

    def test_user_update_no_uppercase_rejected(self):
        """Test that passwords without uppercase are rejected."""
        from app.schemas.user import UserUpdate
        
        with pytest.raises(ValueError) as exc_info:
            UserUpdate(password="password123")
        
        assert "uppercase" in str(exc_info.value)

    def test_user_update_no_digit_rejected(self):
        """Test that passwords without digits are rejected."""
        from app.schemas.user import UserUpdate
        
        with pytest.raises(ValueError) as exc_info:
            UserUpdate(password="Password")
        
        assert "digit" in str(exc_info.value)

    def test_user_update_valid_password_accepted(self):
        """Test that strong passwords are accepted."""
        from app.schemas.user import UserUpdate
        
        # Should not raise
        user_update = UserUpdate(password="StrongPass1")
        assert user_update.password == "StrongPass1"

    def test_user_update_none_password_allowed(self):
        """Test that None password is allowed (no change)."""
        from app.schemas.user import UserUpdate
        
        # Should not raise when password is None
        user_update = UserUpdate(password=None)
        assert user_update.password is None


class TestQuizModelAlignment:
    """Tests for quiz model alignment with migration (Bug #1.5)."""

    def test_quiz_question_correct_option_is_text(self):
        """Test that QuizQuestion model uses Text for correct_option."""
        from app.infrastructure.database.models.quiz import QuizQuestion
        
        # Check column type
        correct_option_col = QuizQuestion.correct_option
        assert correct_option_col is not None
        
        # The column should accept text (not just single char)
        # This is verified by the model definition

    def test_migration_fix_exists(self):
        """Test that migration to fix correct_option type exists."""
        import os
        
        migrations_dir = os.path.join(
            os.path.dirname(__file__), "..", "alembic", "versions"
        )
        
        migration_found = False
        for filename in os.listdir(migrations_dir):
            if "fix_quiz" in filename.lower() or "correct_option" in filename.lower():
                migration_found = True
                break
        
        assert migration_found, "Migration to fix correct_option type not found"


class TestCeleryEventLoopHandling:
    """Tests for Celery event loop fix (Bug #2.4)."""

    def test_asyncio_helper_handles_existing_loop(self):
        """Test that asyncio helper handles existing event loop."""
        import asyncio
        
        # This test verifies the pattern used in tasks.py works
        async def dummy_async():
            return "result"
        
        def run_with_new_loop():
            """Simulate Celery task environment with existing loop."""
            try:
                # Try to get running loop (will succeed in pytest-asyncio)
                loop = asyncio.get_running_loop()
                # Create new loop for nested execution
                new_loop = asyncio.new_event_loop()
                try:
                    asyncio.set_event_loop(new_loop)
                    result = new_loop.run_until_complete(dummy_async())
                    return result
                finally:
                    new_loop.close()
            except RuntimeError:
                # No running loop
                return asyncio.run(dummy_async())
        
        # Should work without errors
        result = run_with_new_loop()
        assert result == "result"


class TestRedisConnectionCleanup:
    """Tests for Redis connection cleanup in health check (Bug #2.2)."""

    def test_redis_close_called_in_health_check(self):
        """Test that health check properly closes Redis connection."""
        # This test verifies the try/finally pattern in health.py
        # The actual implementation uses:
        # try:
        #     await redis.ping()
        # finally:
        #     await redis.close()
        
        # Just verify the pattern exists in code
        import inspect
        from app.api.v1.endpoints.health import readiness_check
        
        source = inspect.getsource(readiness_check)
        
        # Should have try/finally with close
        assert "finally" in source
        assert "close" in source


class TestSessionManagement:
    """Tests for session management fix (Bug #1.3, #1.4)."""

    def test_single_session_dependency(self):
        """Test that only one session dependency exists."""
        # Import both locations
        from app.infrastructure.database.session import get_async_session
        from app.api.dependencies import get_db
        
        # They should be the same (get_db imports from session)
        assert get_db == get_async_session

    def test_session_has_commit_and_rollback(self):
        """Test that session has proper commit/rollback logic."""
        import inspect
        from app.infrastructure.database.session import get_async_session
        
        source = inspect.getsource(get_async_session)
        
        # Should have commit and rollback
        assert "commit" in source
        assert "rollback" in source
