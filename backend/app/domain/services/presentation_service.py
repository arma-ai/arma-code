"""
Presentation Service - генерация презентаций из материалов
"""
import httpx

from app.infrastructure.database.models.material import Material
from openai import AsyncOpenAI
from app.core.config import settings


class PresentationService:
    """Сервис для генерации презентаций"""

    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.slidesgpt_api_key = settings.SLIDESGPT_API_KEY

    async def generate_presentation_prompt(self, material: Material, summary: str = None) -> str:
        """
        Генерирует промпт для SlidesGPT на основе текста материала

        Args:
            material: Объект материала с full_text
            summary: Опциональное резюме материала

        Returns:
            str: Промпт для SlidesGPT
        """
        if not material.full_text and not summary:
            raise ValueError("Material has no text content")

        # Используем summary если есть, иначе берем часть full_text
        content_context = summary or material.full_text[:10000]

        # Используем OpenAI для генерации промпта
        response = await self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": """You are an expert presentation designer. Create a perfect prompt for SlidesGPT API.
The prompt should describe a professional educational presentation with clear structure, key points, and visual style.

Format: "Create a [number] slide presentation about [topic]. Target audience: [audience].
Key points: - [point 1] - [point 2] ... Tone: [tone]. Visual style: [style]."

Keep it under 1000 characters but detailed. ALWAYS use ENGLISH regardless of source language."""
                },
                {
                    "role": "user",
                    "content": f"Title: {material.title}\n\nContent summary:\n{content_context}"
                }
            ]
        )

        prompt_content = response.choices[0].message.content
        if not prompt_content:
            raise ValueError("Failed to generate presentation prompt")

        return prompt_content.strip()

    async def generate_presentation_with_slidesgpt(
        self, prompt: str
    ) -> dict:
        """
        Генерирует презентацию через SlidesGPT API

        Args:
            prompt: Промпт для генерации презентации

        Returns:
            dict: Данные презентации с URL для скачивания и embed
        """
        if not self.slidesgpt_api_key:
            raise ValueError("SLIDESGPT_API_KEY is not set")

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(
                    "https://api.slidesgpt.com/v1/presentations/generate",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.slidesgpt_api_key}",
                    },
                    json={"prompt": prompt},
                )

                if response.status_code != 200:
                    error_text = response.text
                    raise ValueError(
                        f"SlidesGPT API error: {response.status_code} - {error_text}"
                    )

                data = response.json()

                # Извлекаем URL из ответа
                # API может возвращать разные поля, пробуем все варианты
                presentation_url = (
                    data.get("download")
                    or data.get("download_url")
                    or data.get("url")
                    or data.get("link")
                )

                presentation_embed_url = data.get("embed") or data.get("embed_url")

                if not presentation_url:
                    raise ValueError(
                        f"Failed to get presentation URL from SlidesGPT response: {data}"
                    )

                return {
                    "url": presentation_url,
                    "embed_url": presentation_embed_url,
                }

            except httpx.TimeoutException:
                raise ValueError(
                    "SlidesGPT API timeout - presentation generation took too long"
                )
            except Exception as e:
                raise ValueError(f"Failed to generate presentation: {str(e)}")

    async def generate_presentation(
        self, material: Material, summary: str = None
    ) -> dict:
        """
        Полный цикл генерации презентации:
        1. Создает промпт через ChatGPT
        2. Отправляет промпт в SlidesGPT
        3. Возвращает URL презентации

        Args:
            material: Объект материала
            summary: Опциональное резюме

        Returns:
            dict: {"url": str, "embed_url": str}
        """
        # Шаг 1: Генерируем промпт
        prompt = await self.generate_presentation_prompt(material, summary)

        # Шаг 2: Генерируем презентацию
        presentation_data = await self.generate_presentation_with_slidesgpt(prompt)

        return presentation_data
