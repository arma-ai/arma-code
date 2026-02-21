"""
Podcast Service - генерация подкастов из материалов
"""
import json
import os
import logging
import tempfile
import subprocess
from typing import List, Dict
import httpx
import edge_tts

from app.infrastructure.database.models.material import Material
from openai import AsyncOpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)


class PodcastService:
    """Сервис для генерации подкастов"""

    # Голоса для Edge TTS (Microsoft Neural TTS)
    EDGE_TTS_VOICES = {
        "ru": {
            "host_a": "ru-RU-SvetlanaNeural",  # Женский голос
            "host_b": "ru-RU-DmitryNeural",    # Мужской голос
        },
        "en": {
            "host_a": "en-US-AriaNeural",      # Женский голос
            "host_b": "en-US-GuyNeural",       # Мужской голос
        }
    }

    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY", "")

        # Голоса для ElevenLabs (можно настроить)
        self.voice_a_id = "21m00Tcm4TlvDq8ikWAM"  # Rachel (Female)
        self.voice_b_id = "AZnzlk1XvdvUeBnXmlld"  # Domi (Male)

    @staticmethod
    def detect_podcast_language(text: str) -> str:
        """
        Определяет язык материала для выбора голосов.

        Args:
            text: Текст для анализа

        Returns:
            "ru" если русский (>30% кириллица), иначе "en"
        """
        if not text:
            return "en"

        # Берем первые 1000 символов для анализа
        sample = text[:1000]

        # Подсчитываем кириллические символы
        cyrillic_count = sum(1 for c in sample if '\u0400' <= c <= '\u04FF')

        # Если больше 30% кириллица - это русский
        if len(sample) > 0 and (cyrillic_count / len(sample)) > 0.3:
            return "ru"

        return "en"

    async def generate_podcast_script(self, material: Material) -> List[Dict[str, str]]:
        """
        Генерирует скрипт подкаста на основе текста материала

        Args:
            material: Объект материала с full_text

        Returns:
            List[Dict]: Массив объектов {speaker: str, text: str}
        """
        if not material.full_text:
            raise ValueError("Material has no text content")

        # Определяем язык материала
        language = self.detect_podcast_language(material.full_text)
        logger.info(f"[PodcastService] Detected language: {language}")

        # Используем OpenAI для генерации скрипта
        response = await self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": """You are an expert podcast producer. Create an engaging educational podcast dialogue
between two hosts (Host A and Host B) discussing the provided material. Host A is knowledgeable and leads the discussion.
Host B asks questions and provides examples. The dialogue should be natural, engaging, and educational.

Return ONLY a JSON object with this exact format:
{
  "script": [
    {"speaker": "Host A", "text": "Welcome to our podcast..."},
    {"speaker": "Host B", "text": "Thanks! Today we're discussing..."},
    ...
  ]
}

IMPORTANT: The dialogue MUST be in the EXACT SAME LANGUAGE as the source text."""
                },
                {
                    "role": "user",
                    "content": f"Create a podcast dialogue (10-15 exchanges) about this material:\n\n{material.full_text[:5000]}"
                }
            ],
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI")

        try:
            data = json.loads(content)
            script = data.get("script", [])
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON from podcast script response: {e}")

        if not script:
            raise ValueError("Generated script is empty")

        logger.info(f"[PodcastService] Generated podcast script with {len(script)} segments")
        return script

    async def generate_podcast_audio(
        self, script: List[Dict[str, str]], storage_path: str
    ) -> str:
        """
        Генерирует аудио для подкаста через ElevenLabs API

        Args:
            script: Скрипт подкаста [{speaker, text}, ...]
            storage_path: Путь для сохранения файла

        Returns:
            str: Путь к сохраненному аудио файлу
        """
        if not self.elevenlabs_api_key:
            raise ValueError("ELEVENLABS_API_KEY is not set")

        audio_buffers = []

        async with httpx.AsyncClient() as client:
            for index, line in enumerate(script):
                voice_id = (
                    self.voice_a_id if line["speaker"] == "Host A" else self.voice_b_id
                )

                try:
                    response = await client.post(
                        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                        headers={
                            "Content-Type": "application/json",
                            "xi-api-key": self.elevenlabs_api_key,
                        },
                        json={
                            "text": line["text"],
                            "model_id": "eleven_multilingual_v2",
                            "voice_settings": {
                                "stability": 0.5,
                                "similarity_boost": 0.75,
                            },
                        },
                        timeout=60.0,
                    )

                    if response.status_code != 200:
                        error_text = response.text
                        raise ValueError(
                            f"ElevenLabs API error: {response.status_code} - {error_text}"
                        )

                    audio_buffers.append(response.content)

                except Exception as e:
                    # Если это первый сегмент и он упал, пробрасываем ошибку
                    if index == 0 and not audio_buffers:
                        raise e
                    # Иначе продолжаем со следующим сегментом
                    continue

        if not audio_buffers:
            raise ValueError("Failed to generate any audio segments")

        # Конкатенируем все аудио буферы
        final_audio = b"".join(audio_buffers)

        # Сохраняем файл
        os.makedirs(os.path.dirname(storage_path), exist_ok=True)
        with open(storage_path, "wb") as f:
            f.write(final_audio)

        return storage_path

    async def generate_podcast_audio_edge_tts(
        self,
        script: List[Dict[str, str]],
        storage_path: str,
        language: str = "auto"
    ) -> str:
        """
        Генерирует аудио подкаста через Edge TTS (бесплатный Microsoft TTS).

        Args:
            script: Скрипт подкаста [{speaker, text}, ...]
            storage_path: Путь для сохранения файла
            language: Язык ("ru", "en", "auto")

        Returns:
            str: Путь к сохраненному аудио файлу
        """
        try:
            # 1. Определить язык если "auto"
            if language == "auto":
                # Собрать весь текст из скрипта
                full_text = " ".join([line.get("text", "") for line in script])
                language = self.detect_podcast_language(full_text)
                logger.info(f"[PodcastService] Detected language: {language}")

            # 2. Выбрать голоса для языка
            voices = self.EDGE_TTS_VOICES.get(language, self.EDGE_TTS_VOICES["en"])
            logger.info(f"[PodcastService] Using voices: {voices}")

            # 3. Генерировать аудио для каждой реплики
            temp_files = []

            for idx, line in enumerate(script):
                speaker = line.get("speaker", "Host A")
                text = line.get("text", "")

                if not text:
                    continue

                # Выбрать голос в зависимости от спикера
                voice = voices["host_a"] if speaker == "Host A" else voices["host_b"]

                # Создать временный файл для сегмента
                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                    tmp_path = tmp.name
                    temp_files.append(tmp_path)

                # Генерировать аудио через Edge TTS
                logger.info(f"[PodcastService] Generating segment {idx + 1}/{len(script)} with voice {voice}")
                communicate = edge_tts.Communicate(text, voice)
                await communicate.save(tmp_path)

            if not temp_files:
                raise ValueError("Failed to generate any audio segments")

            # 4. Конкатенировать все сегменты с помощью ffmpeg
            logger.info(f"[PodcastService] Concatenating {len(temp_files)} audio segments using ffmpeg")

            # Создать файл со списком всех сегментов для ffmpeg
            concat_list_path = "/tmp/podcast_concat_list.txt"
            with open(concat_list_path, "w") as f:
                for temp_file in temp_files:
                    f.write(f"file '{temp_file}'\n")

            # 5. Сохранить результат используя ffmpeg
            os.makedirs(os.path.dirname(storage_path), exist_ok=True)

            # Использовать ffmpeg для конкатенации
            ffmpeg_cmd = [
                "ffmpeg",
                "-f", "concat",
                "-safe", "0",
                "-i", concat_list_path,
                "-c", "copy",
                "-y",  # Перезаписать если существует
                storage_path
            ]

            try:
                subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
                logger.info(f"[PodcastService] Podcast audio saved to {storage_path}")
            except subprocess.CalledProcessError as e:
                logger.error(f"ffmpeg error: {e.stderr.decode()}")
                raise ValueError(f"Failed to concatenate audio segments: {e.stderr.decode()}")

            # 6. Удалить временные файлы
            for temp_file in temp_files:
                try:
                    os.unlink(temp_file)
                except Exception as e:
                    logger.warning(f"Failed to delete temp file {temp_file}: {e}")

            # Удалить файл списка для конкатенации
            try:
                os.unlink(concat_list_path)
            except Exception as e:
                logger.warning(f"Failed to delete concat list file: {e}")

            return storage_path

        except Exception as e:
            logger.error(f"[PodcastService] Edge TTS generation failed: {str(e)}")
            raise

    async def generate_podcast_audio_with_fallback(
        self,
        script: List[Dict[str, str]],
        storage_path: str,
        prefer_edge_tts: bool = True
    ) -> str:
        """
        Генерирует аудио подкаста с fallback стратегией.

        Сначала пробует Edge TTS (бесплатно), при ошибке fallback на ElevenLabs.

        Args:
            script: Скрипт подкаста [{speaker, text}, ...]
            storage_path: Путь для сохранения файла
            prefer_edge_tts: Использовать Edge TTS по умолчанию

        Returns:
            str: Путь к сохраненному аудио файлу
        """
        if prefer_edge_tts:
            try:
                # Пробуем Edge TTS (бесплатно)
                logger.info("[PodcastService] Trying Edge TTS for podcast generation")
                return await self.generate_podcast_audio_edge_tts(script, storage_path)
            except Exception as e:
                logger.warning(f"[PodcastService] Edge TTS failed: {e}, falling back to ElevenLabs")

                # Fallback на ElevenLabs
                if not self.elevenlabs_api_key:
                    raise ValueError(
                        "Both Edge TTS and ElevenLabs unavailable. "
                        "Edge TTS failed and ELEVENLABS_API_KEY is not set."
                    )

                return await self.generate_podcast_audio(script, storage_path)
        else:
            # Используем ElevenLabs напрямую
            return await self.generate_podcast_audio(script, storage_path)
