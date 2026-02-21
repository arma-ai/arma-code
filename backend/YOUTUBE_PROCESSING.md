# 🎥 YouTube Video Processing Guide

## Обзор

Backend поддерживает автоматическую обработку YouTube видео с извлечением текста из субтитров или транскрипцией через Whisper API.

## Стратегия Извлечения Текста

### Трехуровневый Fallback

1. **Стратегия 1: Субтитры** (Приоритет)
   - Попытка получить **ручные субтитры** (наиболее точные)
   - Если нет ручных → попытка получить **автоматические субтитры**
   - Поддержка языков: русский (`ru`), английский (`en`)

2. **Стратегия 2: Whisper API** (Fallback)
   - Если субтитры недоступны → скачивание аудио через `yt-dlp`
   - Конвертация в MP3 (192 kbps) через `ffmpeg`
   - Транскрипция через OpenAI Whisper API (`whisper-1`)
   - Автоматическая очистка временных файлов

3. **Стратегия 3: Ошибка**
   - Если обе стратегии провалились → выброс исключения с детальным описанием

## Архитектура

### Файлы

```
backend/app/infrastructure/utils/
└── text_extraction.py
    ├── extract_youtube_video_id()      # Извлечение video ID из URL
    ├── download_youtube_audio()        # Скачивание аудио
    ├── transcribe_audio_with_whisper() # Транскрипция через Whisper
    └── extract_text_from_youtube()     # Главная функция (fallback)
```

### Зависимости

**Python пакеты** (`requirements.txt`):
```
youtube-transcript-api==0.6.3  # Получение субтитров
yt-dlp==2024.11.18             # Скачивание видео/аудио
openai==1.57.2                 # Whisper API
pydub==0.25.1                  # Работа с аудио
```

**Системные зависимости** (`Dockerfile.celery`):
```dockerfile
RUN apt-get install -y ffmpeg  # Требуется для yt-dlp
```

## Использование

### API Endpoint

**POST** `/api/v1/materials`

```json
{
  "title": "Лекция по ML",
  "type": "youtube",
  "source": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Лекция по ML",
  "type": "youtube",
  "source": "https://www.youtube.com/watch?v=VIDEO_ID",
  "processing_status": "queued",
  "processing_progress": 0
}
```

### Celery Task

Обработка происходит асинхронно через Celery:

```python
# Автоматически вызывается после создания материала
process_material_task.delay(
    material_id=str(material.id),
    material_type="youtube",
    source="https://www.youtube.com/watch?v=VIDEO_ID"
)
```

### Прямое использование (для тестирования)

```python
from app.infrastructure.utils.text_extraction import extract_text_from_youtube

# Извлечение текста
text = extract_text_from_youtube(
    url="https://www.youtube.com/watch?v=VIDEO_ID",
    language="ru"  # Опционально, default: 'ru'
)

print(f"Extracted {len(text)} characters")
```

## Тестирование

### Тестовый скрипт

```bash
cd backend

# Тест с русским видео
python test_youtube_extraction.py "https://www.youtube.com/watch?v=VIDEO_ID"

# Тест с английским видео
python test_youtube_extraction.py "https://youtu.be/VIDEO_ID"
```

### Ожидаемый вывод

```
============================================================
Testing YouTube extraction for: https://www.youtube.com/watch?v=...
============================================================

2024-12-09 12:00:00 - INFO - Strategy 1: Attempting to get subtitles...
2024-12-09 12:00:01 - INFO - Found manual transcript in language: ru
2024-12-09 12:00:02 - INFO - ✓ Strategy 1 successful: Extracted 15234 characters from subtitles

============================================================
✓ SUCCESS!
============================================================

Extracted text length: 15234 characters
...
```

### Пример с fallback на Whisper

```
2024-12-09 12:00:00 - INFO - Strategy 1: Attempting to get subtitles...
2024-12-09 12:00:01 - WARNING - Strategy 1 failed: No transcript found
2024-12-09 12:00:01 - INFO - Strategy 2: Attempting to use Whisper API...
2024-12-09 12:00:02 - INFO - Downloading audio from YouTube URL...
2024-12-09 12:00:15 - INFO - Successfully downloaded audio to: /tmp/tmpXXXX/VIDEO_ID.mp3
2024-12-09 12:00:16 - INFO - Transcribing audio with Whisper API...
2024-12-09 12:00:45 - INFO - Successfully transcribed audio, length: 14856 characters
2024-12-09 12:00:45 - INFO - ✓ Strategy 2 successful: Extracted 14856 characters via Whisper
```

## Логирование

### Уровни логов

- **INFO**: Успешные операции, прогресс
- **WARNING**: Fallback на следующую стратегию
- **ERROR**: Критические ошибки

### Примеры логов

```python
# Успешное извлечение субтитров
[INFO] Strategy 1: Attempting to get subtitles...
[INFO] Found manual transcript in language: ru
[INFO] ✓ Strategy 1 successful: Extracted 15234 characters from subtitles

# Fallback на Whisper
[WARNING] Strategy 1 failed: TranscriptsDisabled for video: VIDEO_ID
[INFO] Strategy 2: Attempting to use Whisper API...
[INFO] Created temporary directory: /tmp/tmpXXXX
[INFO] Downloading audio from YouTube URL: https://...
[INFO] Successfully downloaded audio to: /tmp/tmpXXXX/VIDEO_ID.mp3
[INFO] Transcribing audio with Whisper API: /tmp/tmpXXXX/VIDEO_ID.mp3
[INFO] Successfully transcribed audio, length: 14856 characters
[INFO] ✓ Strategy 2 successful: Extracted 14856 characters via Whisper
[INFO] Cleaned up audio file: /tmp/tmpXXXX/VIDEO_ID.mp3
[INFO] Cleaned up temporary directory: /tmp/tmpXXXX
```

## Обработка Ошибок

### Типичные ошибки

#### 1. Неверный URL
```python
ValueError: Could not extract video ID from URL: https://invalid-url.com
```

**Решение:** Проверьте формат URL. Поддерживаемые форматы:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

#### 2. Видео недоступно
```python
ValueError: Failed to extract transcript using both subtitles and Whisper API.
Subtitles error: TranscriptsDisabled for video: VIDEO_ID.
Whisper error: Failed to download audio: Video unavailable
```

**Решение:** Видео может быть:
- Удалено
- Приватное
- Заблокировано по региону

#### 3. Отсутствует ffmpeg
```python
ValueError: Failed to download audio: ffmpeg not found
```

**Решение:** Убедитесь, что `ffmpeg` установлен:
```bash
# Локально
brew install ffmpeg  # macOS
apt-get install ffmpeg  # Ubuntu

# Docker (уже включено в Dockerfile.celery)
docker compose build celery-worker
```

#### 4. OpenAI API ошибки
```python
ValueError: Failed to transcribe audio: Error code: 401 - Invalid API key
```

**Решение:** Проверьте `OPENAI_API_KEY` в `.env`

## Производительность

### Сравнение стратегий

| Метод | Скорость | Стоимость | Точность |
|-------|----------|-----------|----------|
| **Субтитры (ручные)** | Мгновенно (~1-2 сек) | Бесплатно | ⭐⭐⭐⭐⭐ |
| **Субтитры (авто)** | Мгновенно (~1-2 сек) | Бесплатно | ⭐⭐⭐⭐ |
| **Whisper API** | Медленно (~30-60 сек) | ~$0.006/минута | ⭐⭐⭐⭐⭐ |

### Оптимизация

1. **Предпочитайте видео с субтитрами** — в 20-30x быстрее
2. **Для коротких видео** (<5 мин) — Whisper приемлем
3. **Для длинных видео** (>30 мин) — субтитры критически важны

### Лимиты

**Whisper API:**
- Максимальный размер файла: **25 MB**
- Рекомендуемая длительность: **до 30 минут**
- Стоимость: **$0.006 за минуту аудио**

**Решение для длинных видео:**
- Используйте yt-dlp для извлечения только аудио (меньший размер)
- Конвертация в MP3 с битрейтом 192 kbps
- При необходимости — разбиение на чанки

## Очистка Ресурсов

### Автоматическая очистка

Функция `extract_text_from_youtube()` автоматически очищает:
- ✓ Временные аудио файлы (`.mp3`)
- ✓ Временные директории (`/tmp/tmpXXXX`)

### Ручная очистка (если нужно)

```bash
# Найти оставшиеся временные файлы
find /tmp -name "*.mp3" -mtime +1 -ls

# Удалить старые файлы (>1 день)
find /tmp -name "*.mp3" -mtime +1 -delete
```

## Docker Setup

### Rebuild после изменений

```bash
# Rebuild Celery worker (включает ffmpeg)
docker compose build celery-worker

# Restart worker
docker compose restart celery-worker

# Проверить логи
docker compose logs -f celery-worker
```

### Проверка ffmpeg в контейнере

```bash
docker compose exec celery-worker ffmpeg -version
```

**Ожидаемый вывод:**
```
ffmpeg version 4.x.x
...
```

## Best Practices

### 1. Обработка очень длинных видео

```python
# Для видео >1 час рекомендуется ограничение
MAX_VIDEO_DURATION = 3600  # 1 час

# Получить длительность перед обработкой
info = yt_dlp.YoutubeDL().extract_info(url, download=False)
duration = info.get('duration', 0)

if duration > MAX_VIDEO_DURATION:
    raise ValueError(f"Video too long: {duration}s (max: {MAX_VIDEO_DURATION}s)")
```

### 2. Retry логика

```python
from celery import retry

@celery_app.task(bind=True, max_retries=3)
def process_material_task(self, material_id, ...):
    try:
        full_text = extract_text_from_youtube(url)
    except ValueError as e:
        if "rate limit" in str(e).lower():
            # Retry через 60 секунд при rate limit
            raise self.retry(countdown=60)
        raise
```

### 3. Кеширование результатов

```python
# Сохранить transcript для повторного использования
material.full_text = extract_text_from_youtube(url)
material.transcript_cached_at = datetime.utcnow()
db.commit()
```

## Troubleshooting

### Проблема: Worker не может скачать видео

**Симптомы:**
```
[ERROR] Failed to download audio: unable to download video data
```

**Решение:**
1. Проверьте интернет-соединение в контейнере
2. Обновите yt-dlp:
   ```bash
   pip install --upgrade yt-dlp
   docker compose build celery-worker
   ```

### Проблема: Whisper API возвращает пустой текст

**Симптомы:**
```
[INFO] Successfully transcribed audio, length: 0 characters
```

**Решение:**
- Возможно, видео без звука
- Проверьте аудио файл вручную:
  ```bash
  docker compose exec celery-worker ls -lh /tmp
  ```

### Проблема: Медленная обработка

**Симптомы:**
- Whisper транскрипция занимает >5 минут для короткого видео

**Решение:**
1. Проверьте качество аудио (меньше битрейт = быстрее):
   ```python
   ydl_opts['postprocessors'][0]['preferredquality'] = '128'  # Вместо 192
   ```
2. Используйте сжатие:
   ```python
   ydl_opts['format'] = 'worstaudio'  # Вместо 'bestaudio'
   ```

## Мониторинг

### Celery Flower

```bash
make flower
# Открыть http://localhost:5555
```

### Метрики

- Количество успешных извлечений
- Использование Whisper API (стоимость)
- Средняя длительность обработки
- Rate limit ошибки

## Поддержка

### Известные ограничения

1. ❌ Не поддерживаются live streams
2. ❌ Не поддерживаются playlists
3. ⚠️ Whisper API имеет rate limits (50 запросов/минуту)

### Roadmap

- [ ] Поддержка плейлистов (batch processing)
- [ ] Кеширование транскриптов по video ID
- [ ] Разбиение длинных видео на чанки
- [ ] Поддержка других видео платформ (Vimeo, Rutube)

---

**Версия:** 1.0.0
**Дата:** 2024-12-09
