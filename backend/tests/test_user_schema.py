"""
Tests for user schema password validation.
"""
import pytest
import sys
import os

# Ensure backend is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.schemas.user import UserCreate
from pydantic import ValidationError


class TestPasswordValidation:
    """Tests for password complexity requirements (bug #5 from report)."""

    def test_password_too_short_rejected(self):
        """Passwords shorter than 8 characters should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="test@test.com", password="Ab1")
        errors = exc_info.value.errors()
        assert any("8" in str(e) for e in errors)

    def test_password_no_uppercase_rejected(self):
        """Passwords without uppercase letter should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="test@test.com", password="abcdefg1")
        errors = exc_info.value.errors()
        assert any("uppercase" in str(e).lower() for e in errors)

    def test_password_no_digit_rejected(self):
        """Passwords without digits should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(email="test@test.com", password="Abcdefgh")
        errors = exc_info.value.errors()
        assert any("digit" in str(e).lower() for e in errors)

    def test_valid_password_accepted(self):
        """Valid passwords meeting all criteria should pass."""
        user = UserCreate(
            email="test@test.com",
            password="StrongPass1"
        )
        assert user.password == "StrongPass1"

    def test_minimum_valid_password(self):
        """Minimum valid password: 8 chars, 1 uppercase, 1 digit."""
        user = UserCreate(
            email="test@test.com",
            password="Abcdefg1"
        )
        assert user.password == "Abcdefg1"

    def test_old_weak_password_rejected(self):
        """The old example password 'strongpassword123' should be rejected (no uppercase)."""
        with pytest.raises(ValidationError):
            UserCreate(email="test@test.com", password="strongpassword123")

    def test_invalid_email_rejected(self):
        """Invalid email format should be rejected."""
        with pytest.raises(ValidationError):
            UserCreate(email="not-an-email", password="ValidPass1")

    def test_password_max_length(self):
        """Passwords over 100 characters should be rejected."""
        long_password = "A1" + "a" * 99  # 101 chars
        with pytest.raises(ValidationError):
            UserCreate(email="test@test.com", password=long_password)
