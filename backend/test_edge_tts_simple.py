"""
Упрощенный тестовый скрипт для проверки Edge TTS

Запуск:
    python3 test_edge_tts_simple.py
"""
import asyncio
import os
import subprocess
import tempfile
import edge_tts


# Голоса для Edge TTS
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


def detect_podcast_language(text: str) -> str:
    """Определяет язык текста"""
    if not text:
        return "en"

    sample = text[:1000]
    cyrillic_count = sum(1 for c in sample if '\u0400' <= c <= '\u04FF')

    if len(sample) > 0 and (cyrillic_count / len(sample)) > 0.3:
        return "ru"

    return "en"


async def generate_podcast(script, output_path, language="auto"):
    """Генерирует подкаст через Edge TTS"""

    # 1. Определить язык
    if language == "auto":
        full_text = " ".join([line.get("text", "") for line in script])
        language = detect_podcast_language(full_text)
        print(f"✓ Определен язык: {language}")

    # 2. Выбрать голоса
    voices = EDGE_TTS_VOICES.get(language, EDGE_TTS_VOICES["en"])
    print(f"✓ Используются голоса: {voices}")

    # 3. Генерировать аудио сегменты
    temp_files = []

    for idx, line in enumerate(script):
        speaker = line.get("speaker", "Host A")
        text = line.get("text", "")

        if not text:
            continue

        voice = voices["host_a"] if speaker == "Host A" else voices["host_b"]

        # Создать временный файл
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp_path = tmp.name
            temp_files.append(tmp_path)

        print(f"✓ Генерирую сегмент {idx + 1}/{len(script)} ({speaker}, {voice})...")
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(tmp_path)

    if not temp_files:
        raise ValueError("Failed to generate audio segments")

    print(f"✓ Сгенерировано {len(temp_files)} аудио сегментов")

    # 4. Конкатенировать с помощью ffmpeg
    print(f"✓ Объединяю сегменты с помощью ffmpeg...")

    concat_list_path = "/tmp/podcast_concat_list.txt"
    with open(concat_list_path, "w") as f:
        for temp_file in temp_files:
            f.write(f"file '{temp_file}'\n")

    # Создать директорию если не существует
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    ffmpeg_cmd = [
        "ffmpeg",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list_path,
        "-c", "copy",
        "-y",
        output_path
    ]

    subprocess.run(ffmpeg_cmd, check=True, capture_output=True)

    # 5. Очистка
    for temp_file in temp_files:
        try:
            os.unlink(temp_file)
        except:
            pass

    try:
        os.unlink(concat_list_path)
    except:
        pass

    print(f"✓ Подкаст сохранен: {output_path}")
    return output_path


async def test_russian():
    """Тест русского подкаста"""
    print("\n" + "="*60)
    print("ТЕСТ 1: Русский подкаст")
    print("="*60 + "\n")

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
        await generate_podcast(script, output_path, language="auto")

        if os.path.exists(output_path):
            size = os.path.getsize(output_path) / 1024
            print(f"\n✅ УСПЕХ! Файл создан ({size:.1f} KB)")
            print(f"   Прослушать: open {output_path}\n")
        else:
            print(f"\n❌ ОШИБКА: Файл не создан\n")

    except Exception as e:
        print(f"\n❌ ОШИБКА: {str(e)}\n")
        import traceback
        traceback.print_exc()


async def test_english():
    """Тест английского подкаста"""
    print("\n" + "="*60)
    print("ТЕСТ 2: Английский подкаст")
    print("="*60 + "\n")

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
        await generate_podcast(script, output_path, language="auto")

        if os.path.exists(output_path):
            size = os.path.getsize(output_path) / 1024
            print(f"\n✅ УСПЕХ! Файл создан ({size:.1f} KB)")
            print(f"   Прослушать: open {output_path}\n")
        else:
            print(f"\n❌ ОШИБКА: Файл не создан\n")

    except Exception as e:
        print(f"\n❌ ОШИБКА: {str(e)}\n")
        import traceback
        traceback.print_exc()


async def main():
    """Главная функция"""
    print("\n🚀 Тестирование Edge TTS интеграции\n")

    await test_russian()
    await test_english()

    print("="*60)
    print("✅ ВСЕ ТЕСТЫ ЗАВЕРШЕНЫ!")
    print("="*60)
    print("\nПроверьте файлы:")
    print("  - /tmp/test_podcast_ru.mp3")
    print("  - /tmp/test_podcast_en.mp3\n")


if __name__ == "__main__":
    asyncio.run(main())
