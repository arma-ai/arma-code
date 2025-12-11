# 📄 Document Formats Support Guide

## Обзор

Backend поддерживает извлечение текста из **10 форматов документов**:
- PDF
- DOCX / DOC
- TXT
- RTF
- ODT
- EPUB
- Markdown
- HTML
- YouTube (видео)

---

## 📊 Поддерживаемые Форматы

| Формат | Расширение | MIME Type | Библиотека | Статус |
|--------|------------|-----------|------------|--------|
| **PDF** | `.pdf` | `application/pdf` | `pdfplumber` | ✅ Full |
| **DOCX** | `.docx` | `application/vnd.openxmlformats-...` | `python-docx`, `mammoth` | ✅ Full |
| **DOC** | `.doc` | `application/msword` | `mammoth` | ✅ Full |
| **TXT** | `.txt` | `text/plain` | Native Python | ✅ Full |
| **RTF** | `.rtf` | `application/rtf`, `text/rtf` | `striprtf` | ✅ Full |
| **ODT** | `.odt` | `application/vnd.oasis.opendocument.text` | `odfpy` | ✅ Full |
| **EPUB** | `.epub` | `application/epub+zip` | `ebooklib` | ✅ Full |
| **Markdown** | `.md` | `text/markdown` | `markdown`, `beautifulsoup4` | ✅ Full |
| **HTML** | `.html`, `.htm` | `text/html` | `beautifulsoup4` | ✅ Full |
| **YouTube** | URL | N/A | `youtube-transcript-api`, `yt-dlp`, Whisper | ✅ Full |

---

## 🔧 Технические Детали

### PDF (`.pdf`)
**Библиотека:** `pdfplumber`

**Возможности:**
- Извлечение текста постранично
- Поддержка многостраничных документов
- Обработка таблиц и структурированного контента

**Ограничения:**
- Не поддерживает сканированные документы (OCR не реализован)
- Проблемы с некоторыми нестандартными кодировками

**Пример использования:**
```python
from app.infrastructure.utils.text_extraction import extract_text_from_pdf

text = extract_text_from_pdf("/path/to/document.pdf")
```

---

### DOCX / DOC (`.docx`, `.doc`)
**Библиотеки:** `python-docx` (primary), `mammoth` (fallback)

**Возможности:**
- Извлечение параграфов с сохранением структуры
- Fallback на `mammoth` если `python-docx` возвращает пустой текст
- Поддержка старых `.doc` файлов через `mammoth`

**Ограничения:**
- Таблицы и изображения игнорируются (только текст)
- Сложное форматирование упрощается

**Пример использования:**
```python
from app.infrastructure.utils.text_extraction import extract_text_from_docx

text = extract_text_from_docx("/path/to/document.docx")
```

---

### TXT (`.txt`)
**Библиотека:** Native Python

**Возможности:**
- Автоопределение кодировки (UTF-8, UTF-8-BOM, CP1251, Latin1, ASCII)
- Поддержка многобайтовых кодировок

**Ограничения:**
- Нет структуры (plain text)

**Пример использования:**
```python
from app.infrastructure.utils.text_extraction import extract_text_from_txt

text = extract_text_from_txt("/path/to/document.txt")
```

**Поддерживаемые кодировки:**
1. UTF-8 (приоритет)
2. UTF-8 with BOM
3. CP1251 (Windows Cyrillic)
4. Latin1
5. ASCII

---

### RTF (`.rtf`)
**Библиотека:** `striprtf`

**Возможности:**
- Удаление RTF-разметки
- Сохранение текстового содержимого

**Ограничения:**
- Форматирование теряется
- Сложные структуры могут быть искажены

**Пример использования:**
```python
from app.infrastructure.utils.text_extraction import extract_text_from_rtf

text = extract_text_from_rtf("/path/to/document.rtf")
```

---

### ODT (`.odt`)
**Библиотека:** `odfpy`

**Возможности:**
- Поддержка OpenDocument Text
- Извлечение параграфов

**Ограничения:**
- Таблицы и изображения игнорируются
- LibreOffice/OpenOffice формат

**Пример использования:**
```python
from app.infrastructure.utils.text_extraction import extract_text_from_odt

text = extract_text_from_odt("/path/to/document.odt")
```

---

### EPUB (`.epub`)
**Библиотека:** `ebooklib`, `beautifulsoup4`

**Возможности:**
- Извлечение текста из глав
- Обработка HTML контента внутри EPUB
- Поддержка многих e-book форматов

**Ограничения:**
- Метаданные и обложка игнорируются
- Навигация и оглавление не сохраняются

**Пример использования:**
```python
from app.infrastructure.utils.text_extraction import extract_text_from_epub

text = extract_text_from_epub("/path/to/book.epub")
```

---

### Markdown (`.md`)
**Библиотеки:** `markdown`, `beautifulsoup4`

**Возможности:**
- Конвертация Markdown → HTML → Plain text
- Сохранение структуры параграфов
- Fallback на raw markdown если конвертация не удалась

**Ограничения:**
- Inline-форматирование (bold, italic) теряется
- Ссылки преобразуются в plain text

**Пример использования:**
```python
from app.infrastructure.utils.text_extraction import extract_text_from_markdown

text = extract_text_from_markdown("/path/to/document.md")
```

---

### HTML (`.html`, `.htm`)
**Библиотека:** `beautifulsoup4`

**Возможности:**
- Извлечение текста из HTML
- Удаление `<script>` и `<style>` тегов
- Сохранение структуры параграфов

**Ограничения:**
- Форматирование теряется
- Ссылки преобразуются в plain text

**Пример использования:**
```python
from app.infrastructure.utils.text_extraction import extract_text_from_html

text = extract_text_from_html("/path/to/page.html")
```

---

## 🚀 Использование

### Универсальная Функция

```python
from app.infrastructure.utils.text_extraction import extract_text_from_document

# Автоопределение типа и извлечение
text = extract_text_from_document("/path/to/file.docx", "docx")
text = extract_text_from_document("/path/to/file.pdf", "pdf")
text = extract_text_from_document("/path/to/file.txt", "txt")
```

### API Endpoint

**POST** `/api/v1/materials`

**Request (multipart/form-data):**
```
file: <binary file>
title: "Название документа"
type: "docx"  // pdf, docx, txt, rtf, odt, epub, md, html
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Название документа",
  "type": "docx",
  "file_path": "storage/materials/uuid/filename.docx",
  "processing_status": "queued",
  "processing_progress": 0
}
```

### Celery Processing

Обработка происходит асинхронно:

1. **Загрузка файла** → Material создан со статусом `queued`
2. **Celery task** запускается автоматически
3. **Извлечение текста** → `processing_status = "processing"`
4. **AI обработка** → Summary, Notes, Flashcards, Quiz
5. **Embeddings** → Vector embeddings для RAG
6. **Завершение** → `processing_status = "completed"`

---

## 🧪 Тестирование

### Тестовый Скрипт

```bash
cd backend

# PDF
python test_document_extraction.py document.pdf

# DOCX
python test_document_extraction.py document.docx

# TXT
python test_document_extraction.py document.txt

# RTF
python test_document_extraction.py document.rtf

# ODT
python test_document_extraction.py document.odt

# EPUB
python test_document_extraction.py book.epub

# Markdown
python test_document_extraction.py README.md

# HTML
python test_document_extraction.py page.html
```

### Ожидаемый Вывод

```
============================================================
Testing document extraction for: document.docx
============================================================

Detected file type: DOCX
File size: 45678 bytes

------------------------------------------------------------

2024-12-09 12:00:00 - INFO - Extracting text from DOCX: document.docx
2024-12-09 12:00:01 - INFO - Successfully extracted text from DOCX, length: 12345 characters

============================================================
✓ SUCCESS!
============================================================

Extracted text length: 12345 characters

First 500 characters:
------------------------------------------------------------
Lorem ipsum dolor sit amet, consectetur adipiscing elit...
------------------------------------------------------------

Approximate word count: 2000
Line count: 50
```

---

## 📦 Установка Зависимостей

### Requirements

Все зависимости в `requirements.txt`:

```txt
# PDF
pdfplumber==0.11.4

# DOCX/DOC
python-docx==1.1.2
mammoth==1.8.0

# RTF
striprtf==0.0.26

# ODT
odfpy==1.4.1

# EPUB
ebooklib==0.18

# Markdown & HTML
markdown==3.7
beautifulsoup4==4.12.3

# YouTube
youtube-transcript-api==0.6.3
yt-dlp==2024.11.18
openai==1.57.2  # Whisper API
```

### Установка

```bash
# В виртуальном окружении
cd backend
pip install -r requirements.txt

# Docker (автоматически)
docker compose build celery-worker
```

---

## ⚙️ Конфигурация

### Разрешённые Типы Файлов

**Файл:** `backend/app/core/config.py`

```python
ALLOWED_FILE_TYPES: List[str] = [
    "application/pdf",                                                     # PDF
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # DOCX
    "application/msword",                                                   # DOC
    "text/plain",                                                           # TXT
    "application/rtf",                                                      # RTF
    "text/rtf",                                                             # RTF alt
    "application/vnd.oasis.opendocument.text",                             # ODT
    "application/epub+zip",                                                # EPUB
    "text/markdown",                                                       # MD
    "text/html",                                                           # HTML
    "application/x-markdown",                                              # MD alt
]

MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50 MB
```

---

## 🔍 Логирование

### Уровни Логов

```python
[INFO] Extracting text from DOCX: /path/to/file.docx
[INFO] Successfully extracted text from DOCX, length: 12345 characters
[ERROR] Error extracting DOCX text: File not found
```

### Debug Режим

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## ⚠️ Ограничения и Known Issues

### 1. **PDF с изображениями вместо текста**
**Проблема:** Сканированные PDF не содержат текстовый слой

**Решение:**
- Использовать OCR (не реализовано)
- Рекомендовать пользователям загружать текстовые PDF

### 2. **Кодировки TXT файлов**
**Проблема:** Некоторые редкие кодировки не распознаются

**Решение:**
- Добавить больше кодировок в список
- Использовать `chardet` для автоопределения

### 3. **Сложное форматирование в DOCX**
**Проблема:** Таблицы, изображения, диаграммы игнорируются

**Решение:**
- Извлекать таблицы отдельно (будущая функциональность)
- Использовать `python-docx` API для структурированного извлечения

### 4. **RTF с нестандартной разметкой**
**Проблема:** `striprtf` может неправильно парсить некоторые RTF

**Решение:**
- Использовать альтернативную библиотеку (pyth, rtfparse)

### 5. **EPUB с защитой DRM**
**Проблема:** DRM-защищённые книги не открываются

**Решение:**
- Информировать пользователя об ограничении
- Поддерживать только DRM-free EPUB

---

## 🎯 Best Practices

### 1. **Проверка Размера Файла**
```python
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

if file_size > MAX_FILE_SIZE:
    raise ValueError(f"File too large: {file_size} bytes (max: {MAX_FILE_SIZE})")
```

### 2. **Валидация MIME Type**
```python
from fastapi import UploadFile

def validate_file_type(file: UploadFile):
    if file.content_type not in settings.ALLOWED_FILE_TYPES:
        raise ValueError(f"Unsupported file type: {file.content_type}")
```

### 3. **Обработка Ошибок**
```python
try:
    text = extract_text_from_document(file_path, file_type)
except ValueError as e:
    logger.error(f"Extraction failed: {e}")
    # Fallback или retry логика
```

### 4. **Нормализация Текста**
```python
from app.infrastructure.utils.text_extraction import normalize_text

text = extract_text_from_document(file_path, file_type)
text = normalize_text(text)  # Удаление лишних пробелов и переносов
```

---

## 📈 Производительность

### Скорость Извлечения

| Формат | Файл (10 страниц) | Скорость |
|--------|-------------------|----------|
| **PDF** | ~500 KB | ~1-2 сек |
| **DOCX** | ~100 KB | ~0.5-1 сек |
| **TXT** | ~50 KB | ~0.1-0.3 сек |
| **RTF** | ~200 KB | ~0.5-1 сек |
| **ODT** | ~150 KB | ~1-2 сек |
| **EPUB** | ~1 MB | ~2-5 сек |
| **MD** | ~20 KB | ~0.2-0.5 сек |
| **HTML** | ~50 KB | ~0.3-0.7 сек |

### Оптимизация

1. **Кеширование:** Сохранять `full_text` в БД
2. **Параллельная обработка:** Использовать Celery для больших файлов
3. **Chunking:** Разбивать большие документы на части

---

## 🔄 Миграция БД

### Добавление Новых Типов

**Alembic Migration:**

```python
# backend/alembic/versions/xxx_add_document_types.py

from alembic import op
import sqlalchemy as sa

def upgrade():
    # PostgreSQL: Добавить новые значения в enum
    op.execute("""
        ALTER TYPE materialtype ADD VALUE IF NOT EXISTS 'docx';
        ALTER TYPE materialtype ADD VALUE IF NOT EXISTS 'txt';
        ALTER TYPE materialtype ADD VALUE IF NOT EXISTS 'rtf';
        ALTER TYPE materialtype ADD VALUE IF NOT EXISTS 'odt';
        ALTER TYPE materialtype ADD VALUE IF NOT EXISTS 'epub';
        ALTER TYPE materialtype ADD VALUE IF NOT EXISTS 'md';
        ALTER TYPE materialtype ADD VALUE IF NOT EXISTS 'html';
    """)

def downgrade():
    # Нельзя удалить значения из enum в PostgreSQL
    pass
```

**Запуск миграции:**
```bash
cd backend
alembic upgrade head
```

---

## 🛠️ Troubleshooting

### Проблема: "No module named 'docx'"
**Решение:**
```bash
pip install python-docx
```

### Проблема: "Could not decode TXT file"
**Решение:**
- Проверить кодировку файла
- Добавить кодировку в список `encodings`

### Проблема: "No text could be extracted from PDF"
**Решение:**
- Проверить, содержит ли PDF текстовый слой
- Использовать OCR для сканированных документов

### Проблема: "EPUB file is protected by DRM"
**Решение:**
- Использовать DRM-free версию книги
- Информировать пользователя об ограничении

---

## 📚 Дополнительные Ресурсы

### Документация Библиотек

- **pdfplumber:** https://github.com/jsvine/pdfplumber
- **python-docx:** https://python-docx.readthedocs.io/
- **mammoth:** https://github.com/mwilliamson/python-mammoth
- **striprtf:** https://github.com/joshy/striprtf
- **odfpy:** https://github.com/eea/odfpy
- **ebooklib:** https://github.com/aerkalov/ebooklib
- **markdown:** https://python-markdown.github.io/
- **beautifulsoup4:** https://www.crummy.com/software/BeautifulSoup/

---

## 🗺️ Roadmap

- [ ] OCR для сканированных PDF (Tesseract)
- [ ] Извлечение таблиц из DOCX/PDF
- [ ] Поддержка PowerPoint (PPTX)
- [ ] Поддержка Excel (XLSX)
- [ ] Автоопределение языка документа
- [ ] Извлечение метаданных (автор, дата создания)
- [ ] Поддержка архивов (ZIP, RAR)

---

**Версия:** 1.0.0
**Дата:** 2024-12-09
**Автор:** EduPlatform Team
