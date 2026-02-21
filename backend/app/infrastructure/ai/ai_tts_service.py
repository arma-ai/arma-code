"""
AI Text-to-Speech service using Edge TTS.
Converts AI text responses to natural-sounding speech with Russian and English support.
"""
import logging
import os
import uuid
from pathlib import Path
from typing import Optional

import edge_tts

from app.core.config import settings

logger = logging.getLogger(__name__)

# Storage directory for generated audio
AUDIO_DIR = Path(__file__).resolve().parents[3] / "storage" / "tts_audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


class AITTSService:
    """
    Service for converting AI text responses to speech using Edge TTS.
    Supports Russian and English with male/female voices.
    """

    # Voice mapping
    VOICES = {
        "ru": {
            "female": settings.EDGE_TTS_VOICE_RU_FEMALE,  # ru-RU-SvetlanaNeural
            "male": settings.EDGE_TTS_VOICE_RU_MALE,       # ru-RU-DmitryNeural
        },
        "en": {
            "female": settings.EDGE_TTS_VOICE_EN_FEMALE,   # en-US-AriaNeural
            "male": settings.EDGE_TTS_VOICE_EN_MALE,        # en-US-GuyNeural
        },
    }

    def detect_language(self, text: str) -> str:
        """
        Detect language based on character frequency.

        Args:
            text: Input text

        Returns:
            'ru' or 'en'
        """
        if not text:
            return "en"

        cyrillic_count = sum(1 for char in text if '\u0400' <= char <= '\u04FF')
        latin_count = sum(1 for char in text if 'a' <= char.lower() <= 'z')

        return "ru" if cyrillic_count > latin_count else "en"

    def get_voice(self, language: str, gender: str = "female") -> str:
        """
        Get the appropriate voice for language and gender.

        Args:
            language: 'ru' or 'en'
            gender: 'male' or 'female'

        Returns:
            Voice identifier string
        """
        lang_voices = self.VOICES.get(language, self.VOICES["en"])
        return lang_voices.get(gender, lang_voices["female"])

    async def text_to_speech(
        self,
        text: str,
        language: Optional[str] = None,
        gender: str = "female",
        rate: str = "+0%",
        pitch: str = "+0Hz",
    ) -> Optional[str]:
        """
        Convert text to speech audio file.

        Args:
            text: Text to convert to speech
            language: Language code ('ru', 'en') or None for auto-detect
            gender: 'male' or 'female'
            rate: Speech rate (e.g., '+10%', '-5%')
            pitch: Voice pitch (e.g., '+5Hz', '-3Hz')

        Returns:
            Path to the generated audio file (MP3), or None on failure
        """
        if not text or not text.strip():
            logger.warning("[TTS] Empty text, skipping synthesis")
            return None

        # Auto-detect language if not specified
        if language is None:
            language = self.detect_language(text)

        voice = self.get_voice(language, gender)

        # Generate unique filename
        audio_filename = f"tts_{uuid.uuid4().hex[:12]}.mp3"
        audio_path = str(AUDIO_DIR / audio_filename)

        try:
            logger.info(f"[TTS] Generating speech: voice={voice}, lang={language}, "
                       f"text_length={len(text)}")

            # Clean text for TTS (remove markdown formatting)
            clean_text = self._clean_for_tts(text)

            # Limit text length (Edge TTS max ~5000 chars for best quality)
            if len(clean_text) > 5000:
                clean_text = clean_text[:5000] + "..."

            communicate = edge_tts.Communicate(
                text=clean_text,
                voice=voice,
                rate=rate,
                pitch=pitch,
            )
            await communicate.save(audio_path)

            file_size = os.path.getsize(audio_path)
            logger.info(f"[TTS] Audio generated: {audio_path} ({file_size / 1024:.1f} KB)")

            return audio_path

        except Exception as e:
            logger.error(f"[TTS] Error generating speech: {str(e)}")
            # Clean up partial file if exists
            if os.path.exists(audio_path):
                try:
                    os.remove(audio_path)
                except OSError:
                    pass
            return None

    def _clean_for_tts(self, text: str) -> str:
        """
        Clean markdown/special chars from text for natural TTS output.

        Args:
            text: Raw text (possibly with markdown)

        Returns:
            Cleaned text suitable for speech synthesis
        """
        import re

        # Remove markdown formatting
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # **bold**
        text = re.sub(r'\*(.*?)\*', r'\1', text)      # *italic*
        text = re.sub(r'#{1,6}\s*', '', text)          # ## headings
        text = re.sub(r'```[\s\S]*?```', '', text)      # ```code blocks``` (must be before inline)
        text = re.sub(r'`(.*?)`', r'\1', text)         # `code`
        text = re.sub(r'>\s*', '', text)                # > blockquotes
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)  # [links](url)

        # Remove emojis (they cause TTS issues)
        text = re.sub(
            r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF'
            r'\U0001F1E0-\U0001F1FF\U00002702-\U000027B0\U0000FE0F'
            r'\U0001F900-\U0001F9FF\U0001FA00-\U0001FA6F\U00002600-\U000026FF'
            r'\U0001FA70-\U0001FAFF\U00002500-\U00002BEF]+',
            '', text
        )

        # Collapse multiple spaces/newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r'  +', ' ', text)

        return text.strip()

    async def cleanup_old_audio(self, max_age_hours: int = 24):
        """
        Clean up old TTS audio files.

        Args:
            max_age_hours: Delete files older than this many hours
        """
        import time

        cutoff = time.time() - (max_age_hours * 3600)
        deleted = 0

        for f in AUDIO_DIR.glob("tts_*.mp3"):
            if f.stat().st_mtime < cutoff:
                try:
                    f.unlink()
                    deleted += 1
                except OSError:
                    pass

        if deleted:
            logger.info(f"[TTS] Cleaned up {deleted} old audio files")
