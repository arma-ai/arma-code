"""
Тестовый скрипт для проверки Edge TTS интеграции

Запуск:
    python3 test_edge_tts.py
"""
import asyncio
import os
import sys

# Добавить backend в путь для импортов
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.domain.services.podcast_service import PodcastService


async def test_edge_tts_russian():
    """Тест Edge TTS с русским текстом"""
    print("\n" + "="*60)
    print("ТЕСТ 1: Русский подкаст")
    print("="*60)

    service = PodcastService()

    # Простой тестовый скрипт
    script = [
        {
            "speaker": "Host A",
            "text": "Привет! Сегодня мы поговорим об искусственном интеллекте."
        },
        {
            "speaker": "Host B",
            "text": "Да, это очень интересная тема! Расскажи подробнее."
        },
        {
            "speaker": "Host A",
            "text": "ИИ меняет нашу жизнь. От голосовых помощников до медицинской диагностики."
        }
    ]

    output_path = "/tmp/test_podcast_ru.mp3"

    try:
        print(f"\n📝 Генерирую подкаст из {len(script)} реплик...")
        result_path = await service.generate_podcast_audio_edge_tts(
            script=script,
            storage_path=output_path,
            language="ru"
        )

        # Проверить что файл создан
        if os.path.exists(result_path):
            file_size = os.path.getsize(result_path)
            print(f"✅ УСПЕХ! Подкаст создан:")
            print(f"   Путь: {result_path}")
            print(f"   Размер: {file_size / 1024:.1f} KB")
            print(f"\n🎵 Можете прослушать: open {result_path}")
        else:
            print(f"❌ ОШИБКА: Файл не создан")

    except Exception as e:
        print(f"❌ ОШИБКА: {str(e)}")
        import traceback
        traceback.print_exc()


async def test_edge_tts_english():
    """Тест Edge TTS с английским текстом"""
    print("\n" + "="*60)
    print("ТЕСТ 2: Английский подкаст")
    print("="*60)

    service = PodcastService()

    # Простой тестовый скрипт
    script = [
        {
            "speaker": "Host A",
            "text": "Hello! Today we're going to talk about artificial intelligence."
        },
        {
            "speaker": "Host B",
            "text": "Yes, that's a very interesting topic! Tell me more."
        },
        {
            "speaker": "Host A",
            "text": "AI is changing our lives. From voice assistants to medical diagnostics."
        }
    ]

    output_path = "/tmp/test_podcast_en.mp3"

    try:
        print(f"\n📝 Генерирую подкаст из {len(script)} реплик...")
        result_path = await service.generate_podcast_audio_edge_tts(
            script=script,
            storage_path=output_path,
            language="en"
        )

        # Проверить что файл создан
        if os.path.exists(result_path):
            file_size = os.path.getsize(result_path)
            print(f"✅ УСПЕХ! Подкаст создан:")
            print(f"   Путь: {result_path}")
            print(f"   Размер: {file_size / 1024:.1f} KB")
            print(f"\n🎵 Можете прослушать: open {result_path}")
        else:
            print(f"❌ ОШИБКА: Файл не создан")

    except Exception as e:
        print(f"❌ ОШИБКА: {str(e)}")
        import traceback
        traceback.print_exc()


async def test_language_detection():
    """Тест автоопределения языка"""
    print("\n" + "="*60)
    print("ТЕСТ 3: Автоопределение языка")
    print("="*60)

    service = PodcastService()

    test_cases = [
        ("Это текст на русском языке.", "ru"),
        ("This is English text.", "en"),
        ("Смешанный mixed текст text.", "ru"),  # Больше кириллицы
        ("Mixed смешанный text текст.", "en"),  # Больше латиницы
        ("", "en"),  # Пустая строка -> по умолчанию en
    ]

    print("\n📝 Проверяю определение языка:")
    for text, expected in test_cases:
        detected = service.detect_podcast_language(text)
        status = "✅" if detected == expected else "❌"
        print(f"{status} '{text[:30]}...' -> {detected} (ожидалось: {expected})")


async def main():
    """Главная функция тестирования"""
    print("\n🚀 Запуск тестов Edge TTS интеграции\n")

    # Тест 1: Автоопределение языка
    await test_language_detection()

    # Тест 2: Русский подкаст
    await test_edge_tts_russian()

    # Тест 3: Английский подкаст
    await test_edge_tts_english()

    print("\n" + "="*60)
    print("✅ ВСЕ ТЕСТЫ ЗАВЕРШЕНЫ!")
    print("="*60)
    print("\n💡 Проверьте созданные файлы:")
    print("   - /tmp/test_podcast_ru.mp3")
    print("   - /tmp/test_podcast_en.mp3")
    print("\n")


if __name__ == "__main__":
    asyncio.run(main())
