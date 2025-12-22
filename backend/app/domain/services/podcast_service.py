"""
Podcast Service - генерация подкастов из материалов
"""
import json
import os
from typing import List, Dict
from openai import AsyncOpenAI
import httpx

from app.infrastructure.database.models.material import Material
from app.core.config import settings


class PodcastService:
    """Сервис для генерации подкастов"""

    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY", "")

        # Голоса для ElevenLabs (можно настроить)
        self.voice_a_id = "21m00Tcm4TlvDq8ikWAM"  # Rachel (Female)
        self.voice_b_id = "AZnzlk1XvdvUeBnXmlld"  # Domi (Male)

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

        # Ограничиваем текст для GPT (макс 50000 символов)
        text_content = material.full_text[:50000]

        system_prompt = """You are an expert podcast producer. Create an engaging, natural-sounding podcast dialogue script between two hosts (Host A and Host B) based on the provided educational material.

Guidelines:
- Host A: Knowledgeable, structured, leads the conversation.
- Host B: Curious, asks clarifying questions, adds analogies, makes it relatable.
- Tone: Conversational, educational, enthusiastic, but professional.
- Structure: Intro, key concepts discussion, practical examples, summary/outro.
- Format: Return ONLY the dialogue in a JSON format: {"script": [{"speaker": "Host A", "text": "..."}, {"speaker": "Host B", "text": "..."}]}.
- Language: The script MUST be in the EXACT SAME LANGUAGE as the source text.
- Length: Approximately 5-10 minutes of reading time (about 1000-1500 words).
- Natural flow: Make it sound like a real conversation with smooth transitions."""

        response = await self.openai_client.chat.completions.create(
            model=settings.LLM_MODEL,  # gpt-4o
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Material Title: {material.title}\n\nContent:\n{text_content}",
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("Failed to generate podcast script")

        parsed = json.loads(content)
        script = parsed.get("script", [])

        if not script:
            raise ValueError("Generated script is empty")

        return script

    async def generate_podcast_audio(
        self, script: List[Dict[str, str]], storage_path: str
    ) -> str:
        """
        Генерирует аудио для подкаста через OpenAI TTS API

        Args:
            script: Скрипт подкаста [{speaker, text}, ...]
            storage_path: Путь для сохранения файла

        Returns:
            str: Путь к сохраненному аудио файлу
        """
        audio_buffers = []

        # OpenAI TTS voices
        # alloy, echo, fable, onyx, nova, shimmer
        voice_a = "nova"  # Female voice for Host A
        voice_b = "onyx"  # Male voice for Host B

        for index, line in enumerate(script):
            voice = voice_a if line["speaker"] == "Host A" else voice_b

            try:
                # Generate audio using OpenAI TTS
                response = await self.openai_client.audio.speech.create(
                    model="tts-1",  # Faster and cheaper than tts-1-hd
                    voice=voice,
                    input=line["text"],
                    response_format="mp3"
                )

                # Get audio content
                audio_content = response.content
                audio_buffers.append(audio_content)

            except Exception as e:
                # Если это первый сегмент и он упал, пробрасываем ошибку
                if index == 0 and not audio_buffers:
                    raise e
                # Иначе продолжаем со следующим сегментом
                print(f"Warning: Failed to generate audio for segment {index}: {e}")
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
