# 🎉 Backend Setup - Статус

## ✅ Что Сделано:

### 1. Структура Backend Создана
```
backend/
├── app/
│   ├── api/v1/          # REST endpoints
│   ├── core/            # Security, config
│   ├── domain/          # Business logic
│   ├── infrastructure/  # DB, AI, storage
│   ├── schemas/         # Pydantic models
│   └── workers/         # Background jobs
├── tests/               # Unit, integration, e2e
├── alembic/             # Database migrations
├── requirements/        # Dependencies
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
└── venv/                # Virtual environment
```

### 2. Python Virtual Environment
- ✅ Python 3.13.5 venv создан
- ✅ pip обновлен до 25.3
- ✅ Зависимости установлены (FastAPI, SQLAlchemy, OpenAI, LangChain, etc.)

### 3. Конфигурационные файлы
- ✅ `.env.example` создан
- ✅ `.gitignore` создан
- ✅ `requirements/` файлы созданы

### 4. Старые файлы очищены
- ✅ 21 SQL миграция перемещена в `old_migrations/`

---

## ⚠️ PostgreSQL Проблема

**Проблема:** У вас установлено 2 версии PostgreSQL (15 и 16), обе требуют пароль для подключения.

**Решение:** Используем Docker для чистой разработки!

---

## 📋 СЛЕДУЮЩИЕ ШАГИ (Сделай Сам)

### Шаг 1: Установи Docker Desktop

Скачай и установи Docker Desktop для Mac:
https://www.docker.com/products/docker-desktop/

После установки запусти Docker Desktop.

---

### Шаг 2: Создай docker-compose.yml

В корне проекта (`/Users/ibragimkadamzanov/PycharmProjects/arma/`):

```bash
cd /Users/ibragimkadamzanov/PycharmProjects/arma
```

Создай файл `docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: eduplatform_postgres
    environment:
      POSTGRES_USER: eduplatform
      POSTGRES_PASSWORD: dev123
      POSTGRES_DB: eduplatform_dev
    ports:
      - "5433:5432"  # Используем 5433, т.к. 5432 занят
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eduplatform"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: eduplatform_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

### Шаг 3: Запусти контейнеры

```bash
docker-compose up -d
```

Проверь что контейнеры работают:
```bash
docker-compose ps
```

Должно быть:
```
NAME                    STATUS
eduplatform_postgres    Up (healthy)
eduplatform_redis       Up
```

---

### Шаг 4: Создай .env файл

В папке `backend/`:

```bash
cd backend
cp .env.example .env
```

Отредактируй `.env`:
```bash
# Измени порт на 5433 (т.к. мы используем 5433 в docker-compose)
DATABASE_URL=postgresql+asyncpg://eduplatform:dev123@localhost:5433/eduplatform_dev
DATABASE_URL_SYNC=postgresql://eduplatform:dev123@localhost:5433/eduplatform_dev

# Добавь свой OpenAI API key
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

---

### Шаг 5: Установи pgvector extension

```bash
docker exec -it eduplatform_postgres psql -U eduplatform -d eduplatform_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Проверь:
```bash
docker exec -it eduplatform_postgres psql -U eduplatform -d eduplatform_dev -c "SELECT * FROM pg_extension WHERE extname='vector';"
```

---

### Шаг 6: Настрой Alembic

Активируй venv и настрой миграции:

```bash
cd backend
source venv/bin/activate

# Инициализация Alembic (если еще не сделано)
alembic init alembic
```

Отредактируй `alembic/env.py` (добавь в начало):

```python
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parents[1]))

from app.infrastructure.database.base import Base
from app.core.config import settings

# Set target metadata
target_metadata = Base.metadata

# Set sqlalchemy.url from settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL_SYNC)
```

---

### Шаг 7: Создай первую миграцию

```bash
# Создай config.py
cat > app/core/config.py << 'EOF'
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://eduplatform:dev123@localhost:5433/eduplatform_dev"
    DATABASE_URL_SYNC: str = "postgresql://eduplatform:dev123@localhost:5433/eduplatform_dev"
    OPENAI_API_KEY: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
EOF

# Создай base.py
cat > app/infrastructure/database/base.py << 'EOF'
from sqlalchemy.orm import declarative_base

Base = declarative_base()
EOF

# Создай первую миграцию
alembic revision --autogenerate -m "Initial migration"

# Примени миграцию
alembic upgrade head
```

---

### Шаг 8: Создай первый FastAPI endpoint

Создай `app/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="EduPlatform API",
    version="1.0.0",
    description="Educational platform with AI-powered features"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "EduPlatform API is running!"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

Запусти сервер:
```bash
source venv/bin/activate
uvicorn app.main:app --reload
```

Открой http://localhost:8000/docs - должна открыться Swagger UI!

---

## 🎯 Следующий Этап

После того как backend запущен, начинай писать:

1. **SQLAlchemy модели** (`app/infrastructure/database/models/`)
2. **API endpoints** (`app/api/v1/`)
3. **Business logic** (`app/domain/services/`)
4. **Background workers** (`app/workers/`)

---

## 📚 Полезные Команды

```bash
# Активировать venv
source venv/bin/activate

# Запустить FastAPI
uvicorn app.main:app --reload

# Запустить с auto-reload на порту 8000
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Создать миграцию
alembic revision --autogenerate -m "Description"

# Применить миграции
alembic upgrade head

# Откатить миграцию
alembic downgrade -1

# Посмотреть логи Docker
docker-compose logs -f postgres

# Подключиться к PostgreSQL
docker exec -it eduplatform_postgres psql -U eduplatform -d eduplatform_dev

# Остановить контейнеры
docker-compose down

# Остановить и удалить данные
docker-compose down -v
```

---

## ✅ Чеклист Готовности

- [ ] Docker Desktop установлен и запущен
- [ ] `docker-compose.yml` создан
- [ ] `docker-compose up -d` выполнен успешно
- [ ] pgvector extension установлен
- [ ] `.env` файл создан с правильными настройками
- [ ] Alembic настроен
- [ ] `app/main.py` создан
- [ ] FastAPI запускается на http://localhost:8000
- [ ] Swagger UI доступен на http://localhost:8000/docs

---

## 🚨 Если что-то не работает

1. **Docker не запускается:**
   - Убедись что Docker Desktop запущен
   - Проверь: `docker ps`

2. **PostgreSQL не подключается:**
   - Проверь логи: `docker-compose logs postgres`
   - Убедись что используешь порт 5433 (не 5432)

3. **Alembic ошибка:**
   - Убедись что DATABASE_URL_SYNC правильный
   - Проверь что Base импортируется

4. **FastAPI не запускается:**
   - Убедись что venv активирован: `which python` должен показывать путь в venv/
   - Проверь что все зависимости установлены: `pip list | grep fastapi`

---

**Удачи! 🚀**

Когда все будет готово, переходи к написанию кода! Смотри `backend_migration_plan.md` для деталей.
