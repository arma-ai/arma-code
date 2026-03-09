# 🚀 Инструкция по запуску Python Backend

## 📋 Что реализовано

### ✅ Quiz Scoring System
- **Models**: `QuizAttempt` (SQLAlchemy) для хранения попыток
- **Schemas**: Pydantic schemas для валидации
- **Repository**: Методы для работы с БД (create, get, statistics)
- **Service**: Бизнес-логика подсчета score
- **Endpoints**:
  - `POST /api/v1/quiz/attempts/save` - сохранить попытку
  - `GET /api/v1/materials/{id}/quiz/attempts` - история попыток
  - `GET /api/v1/materials/{id}/quiz/statistics` - статистика
  - `DELETE /api/v1/quiz/attempts/{id}` - удалить попытку
- **Migration**: `alembic/versions/001_add_quiz_attempts_table.py`

### ✅ Background Queue (Celery)
- **Celery App**: Настроенное приложение с Redis broker
- **Tasks**:
  - `process_material` - обработка PDF/YouTube
  - `generate_podcast` - генерация подкаста
  - `generate_presentation` - генерация презентации
  - `cleanup_old_attempts` - периодическая очистка
- **Queues**: `materials`, `ai`

### ✅ AI Integration (OpenAI)
- **OpenAIService**:
  - `generate_summary()` - резюме (gpt-4o-mini)
  - `generate_notes()` - конспекты (gpt-4o-mini)
  - `generate_flashcards()` - карточки (gpt-4o)
  - `generate_quiz()` - тесты (gpt-4o)
  - `create_embedding()` - векторы (text-embedding-3-large)
  - `create_embeddings_batch()` - batch embeddings ⚡
  - `chat_with_context()` - RAG чат

---

## 🔧 Шаги для запуска

### 1. Установка PostgreSQL

```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# или Docker
docker run --name postgres-edu \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=eduplatform \
  -p 5433:5432 \
  -d postgres:15
```

### 2. Установка Redis

```bash
# macOS
brew install redis
brew services start redis

# или Docker
docker run --name redis-edu \
  -p 6379:6379 \
  -d redis:7
```

### 3. Установка зависимостей

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или venv\Scripts\activate  # Windows

pip install -r requirements/base.txt
pip install -r requirements/dev.txt  # для разработки
```

### 4. Настройка .env

Создай файл `backend/.env` (на основе `.env.example`):

```env
# App
APP_NAME=EduPlatform
APP_ENV=development
DEBUG=True
SECRET_KEY=your-secret-key-here-change-in-production

# Database
DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5433/eduplatform
DATABASE_URL_SYNC=postgresql://postgres:yourpassword@localhost:5433/eduplatform

# Redis
REDIS_URL=redis://localhost:6379/0

# OpenAI
OPENAI_API_KEY=sk-proj-your-api-key-here

# JWT
JWT_SECRET_KEY=another-secret-key-for-jwt
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000"]

# AI Models
LLM_MODEL_MINI=gpt-4o-mini
LLM_MODEL=gpt-4o
EMBEDDING_MODEL=text-embedding-3-large
EMBEDDING_DIMENSIONS=3072
```

### 5. Создание БД и миграции

```bash
# Создать БД (если не создана)
createdb -h localhost -p 5433 -U postgres eduplatform

# Применить миграции
cd backend
alembic upgrade head

# Или создать новую миграцию (если нужно)
alembic revision --autogenerate -m "your message"
```

### 6. Запуск приложения

#### Вариант 1: Только API сервер

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API доступно на `http://localhost:8000`
Swagger docs: `http://localhost:8000/docs`

#### Вариант 2: API + Celery Worker

**Терминал 1** (API сервер):
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Терминал 2** (Celery worker):
```bash
cd backend
celery -A app.infrastructure.queue.celery_app worker \
  --loglevel=info \
  --queues=materials,ai \
  --concurrency=2
```

**Терминал 3** (опционально - Flower для мониторинга):
```bash
cd backend
celery -A app.infrastructure.queue.celery_app flower --port=5555
```

Flower UI: `http://localhost:5555`

---

## 📊 Проверка работы

### 1. Тест API

```bash
# Регистрация
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "full_name": "Test User"
  }'

# Логин
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
# Сохрани access_token из ответа
```

### 2. Тест Quiz Scoring

```bash
TOKEN="your-access-token-here"

# Сохранить quiz attempt
curl -X POST http://localhost:8000/api/v1/quiz/attempts/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "material_id": "material-uuid-here",
    "score": 8,
    "total_questions": 10,
    "percentage": 80,
    "answers": [
      {
        "question_id": "question-uuid",
        "selected": "b",
        "correct": true,
        "correct_option": "b"
      }
    ]
  }'

# Получить статистику
curl http://localhost:8000/api/v1/materials/{material_id}/quiz/statistics \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Тест Celery Task

```python
# В Python консоли
from app.infrastructure.queue.tasks import process_material_task

# Запустить задачу
result = process_material_task.delay(
    material_id="uuid-here",
    user_id="uuid-here",
    material_type="pdf",
    file_path="/path/to/file.pdf"
)

# Проверить статус
print(result.status)  # PENDING, STARTED, SUCCESS, FAILURE
```

---

## 🗂️ Структура созданных файлов

```
backend/
├── app/
│   ├── domain/
│   │   └── services/
│   │       └── quiz_service.py                    ✅ Бизнес-логика
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   │   └── models/
│   │   │       ├── quiz_attempt.py                ✅ SQLAlchemy модель
│   │   │       └── __init__.py                    ✅ Обновлен
│   │   │
│   │   ├── repositories/
│   │   │   └── quiz_attempt_repository.py         ✅ Repository
│   │   │
│   │   ├── queue/
│   │   │   ├── celery_app.py                      ✅ Celery config
│   │   │   └── tasks.py                           ✅ Celery tasks
│   │   │
│   │   └── ai/
│   │       └── openai_service.py                  ✅ OpenAI integration
│   │
│   ├── schemas/
│   │   └── quiz.py                                ✅ Обновлен (schemas)
│   │
│   └── api/v1/endpoints/
│       └── quiz.py                                ✅ Обновлен (endpoints)
│
├── alembic/versions/
│   └── 001_add_quiz_attempts_table.py             ✅ Migration
│
└── SETUP_GUIDE.md                                 ✅ Эта инструкция
```

---

## 🐛 Возможные проблемы и решения

### PostgreSQL не подключается

```bash
# Проверить статус
brew services list | grep postgres

# Перезапустить
brew services restart postgresql@15
```

### Redis не подключается

```bash
# Проверить
redis-cli ping  # должно вернуть PONG

# Перезапустить
brew services restart redis
```

### Alembic ошибки

```bash
# Проверить текущую версию
alembic current

# Откатить последнюю миграцию
alembic downgrade -1

# Применить заново
alembic upgrade head
```

### Import ошибки

```bash
# Убедись что виртуальное окружение активировано
source venv/bin/activate

# Переустанови зависимости
pip install -r requirements/base.txt --force-reinstall
```

---

## 📝 TODO (после запуска)

1. **Создать MaterialProcessingService** (для Celery tasks)
   - Методы: `extract_pdf_text()`, `extract_youtube_transcript()`, `generate_ai_content()`, `create_embeddings()`

2. **Создать PodcastService / PresentationService**
   - Интеграция с ElevenLabs / SlidesGPT

3. **Добавить тесты**
   - Unit tests для Service layer
   - Integration tests для endpoints

4. **Настроить Docker Compose**
   - Для удобного запуска всех сервисов

---

## 🎉 Готово!

Теперь у тебя есть полноценный Python бэкенд с:
- ✅ Quiz Scoring System
- ✅ Background Queue (Celery)
- ✅ AI Integration (OpenAI)
- ✅ Batch Embeddings оптимизация
- ✅ Clean Architecture

Запускай PostgreSQL, Redis и вперёд! 🚀
