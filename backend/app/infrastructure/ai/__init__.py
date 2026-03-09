# Expose submodules as package attributes so unittest.mock.patch() can resolve them.
# e.g. patch("app.infrastructure.ai.openai_service.client") works correctly.
from . import openai_service  # noqa: F401
from . import ai_tts_service  # noqa: F401
