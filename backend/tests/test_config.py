"""
Tests for configuration and security settings.
"""
import os
import re
from unittest.mock import patch

import pytest


class TestConfig:
    """Tests for app configuration loading."""

    def test_tavily_api_key_not_hardcoded(self):
        """Verify Tavily API key is NOT hardcoded (bug #1 from report)."""
        config_path = os.path.join(
            os.path.dirname(__file__), "..", "app", "core", "config.py"
        )
        with open(config_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Should NOT contain the old hardcoded key
        assert "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" not in content, (
            "TAVILY_API_KEY is still hardcoded in config.py!"
        )

    def test_secret_key_uses_env_var(self):
        """Verify SECRET_KEY reads from env var (bug #2 from report)."""
        config_path = os.path.join(
            os.path.dirname(__file__), "..", "app", "core", "config.py"
        )
        with open(config_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Should use os.getenv for SECRET_KEY
        assert 'os.getenv("SECRET_KEY"' in content or "os.getenv('SECRET_KEY'" in content, (
            "SECRET_KEY should be loaded from environment variable"
        )

    def test_jwt_secret_uses_env_var(self):
        """Verify JWT_SECRET_KEY reads from env var (bug #2 from report)."""
        config_path = os.path.join(
            os.path.dirname(__file__), "..", "app", "core", "config.py"
        )
        with open(config_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Should use os.getenv for JWT_SECRET_KEY
        assert 'os.getenv("JWT_SECRET_KEY"' in content or "os.getenv('JWT_SECRET_KEY'" in content, (
            "JWT_SECRET_KEY should be loaded from environment variable"
        )

    def test_embedding_chunk_size_reduced(self):
        """Verify EMBEDDING_CHUNK_SIZE is 500, not 1000 (performance bug)."""
        config_path = os.path.join(
            os.path.dirname(__file__), "..", "app", "core", "config.py"
        )
        with open(config_path, "r", encoding="utf-8") as f:
            content = f.read()

        assert "EMBEDDING_CHUNK_SIZE: int = 500" in content, (
            "EMBEDDING_CHUNK_SIZE should be 500 for better embedding quality"
        )


class TestDockerCompose:
    """Tests for Docker configuration security."""

    def test_no_default_postgres_password(self):
        """Verify docker-compose doesn't have weak default password."""
        compose_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "docker-compose.yml"
        )
        if not os.path.exists(compose_path):
            pytest.skip("docker-compose.yml not found")

        with open(compose_path, "r", encoding="utf-8") as f:
            content = f.read()

        assert "dev123" not in content, (
            "docker-compose.yml still contains weak default password 'dev123'"
        )

    def test_no_default_pgadmin_password(self):
        """Verify pgAdmin doesn't have weak default password."""
        compose_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "docker-compose.yml"
        )
        if not os.path.exists(compose_path):
            pytest.skip("docker-compose.yml not found")

        with open(compose_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Should not have the default 'admin' password
        assert "PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD:-admin}" not in content, (
            "docker-compose.yml still contains weak default pgAdmin password"
        )
