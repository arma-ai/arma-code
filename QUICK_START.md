# 🚀 Quick Start - Запуск Полной Системы

## ✅ Что Готово

1. ✅ **Backend (Python FastAPI)** - Полностью настроен
2. ✅ **Frontend (Next.js)** - API интегрирован
3. ✅ **Авторизация** - JWT auth работает
4. ✅ **Middleware** - Защита dashboard routes

---

## 📦 Шаг 1: Запуск PostgreSQL

### Вариант A: Docker (Рекомендуется)

```bash
docker run -d --name eduplatform-postgres -p 5433:5432 \
  -e POSTGRES_USER=eduplatform \
  -e POSTGRES_PASSWORD=dev123 \
  -e POSTGRES_DB=eduplatform_dev \
  postgres:15-alpine
```

### Вариант B: Локальная установка

Если PostgreSQL уже установлен локально, создай базу:

```sql
CREATE DATABASE eduplatform_dev;
CREATE USER eduplatform WITH PASSWORD 'dev123';
GRANT ALL PRIVILEGES ON DATABASE eduplatform_dev TO eduplatform;
```

### Установка pgvector extension

```bash
# Подключись к БД
psql -h localhost -p 5433 -U eduplatform -d eduplatform_dev

# В psql:
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

---

## 📦 Шаг 2: Запуск Redis

### Docker:

```bash
docker run -d --name eduplatform-redis -p 6379:6379 redis:7-alpine
```

### Локальная установка:

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt install redis-server
sudo systemctl start redis
```

---

## 🐍 Шаг 3: Настройка Backend

### 1. Создать виртуальное окружение

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 2. Установить зависимости

```bash
pip install -r requirements.txt
```

### 3. Создать .env файл

```bash
cat > .env << 'EOF'
# Application
APP_NAME=EduPlatform API
APP_ENV=development
DEBUG=True

# Database
DATABASE_URL=postgresql+asyncpg://eduplatform:dev123@localhost:5433/eduplatform_dev
DATABASE_URL_SYNC=postgresql://eduplatform:dev123@localhost:5433/eduplatform_dev

# Redis
REDIS_URL=redis://localhost:6379/0

# OpenAI (ВАЖНО: Вставь свой ключ!)
OPENAI_API_KEY=sk-proj-your-key-here

# JWT
SECRET_KEY=your-super-secret-key-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
EOF
```

**ВАЖНО**: Замени `OPENAI_API_KEY` на свой ключ!

### 4. Применить миграции

```bash
alembic upgrade head
```

### 5. Запустить Backend

```bash
uvicorn app.main:app --reload --port 8000
```

**Проверка**: Открой `http://localhost:8000/docs` - должен открыться Swagger UI

---

## 🎨 Шаг 4: Настройка Frontend

### 1. Установить зависимости

```bash
# Из корня проекта
npm install
```

### 2. Проверить .env.local

Файл уже должен существовать:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Если нет - создай его.

### 3. Запустить Frontend

```bash
npm run dev
```

**Проверка**: Открой `http://localhost:3000`

---

## 🧪 Шаг 5: Тестирование

### 1. Открой страницу логина

```
http://localhost:3000/login
```

### 2. Зарегистрируй нового пользователя

- Кликни "Don't have an account? Sign Up"
- Заполни форму:
  - **Full Name**: Test User
  - **Email**: test@example.com
  - **Password**: test123
- Кликни "Create Account"

### 3. Войди в систему

- Введи:
  - **Email**: test@example.com
  - **Password**: test123
- Кликни "Sign In"

### 4. Должен редиректнуть на Dashboard

```
http://localhost:3000/dashboard
```

---

## ✅ Чек-лист Проверки

После запуска проверь:

- [ ] PostgreSQL работает: `psql -h localhost -p 5433 -U eduplatform -d eduplatform_dev`
- [ ] Redis работает: `redis-cli ping` (ответ: PONG)
- [ ] Backend запущен: `curl http://localhost:8000/health`
- [ ] Swagger открывается: `http://localhost:8000/docs`
- [ ] Frontend открывается: `http://localhost:3000`
- [ ] Регистрация работает
- [ ] Логин работает
- [ ] Dashboard открывается после логина
- [ ] Middleware редиректит на /login если не авторизован

---

## 🐛 Частые Проблемы

### Backend не стартует

**Ошибка**: `ModuleNotFoundError: No module named 'fastapi'`

**Решение**:
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

---

**Ошибка**: `could not connect to server: Connection refused`

**Решение**: PostgreSQL не запущен
```bash
# Проверь
docker ps | grep postgres

# Если не работает, перезапусти
docker restart eduplatform-postgres
```

---

### Frontend ошибки

**Ошибка**: `Failed to fetch` в консоли

**Решение**: Backend не запущен
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

---

**Ошибка**: CORS error

**Решение**: Проверь `backend/.env`:
```env
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

---

### Авторизация

**Ошибка**: Редирект на /login сразу после входа

**Решение**: Токен не сохраняется. Открой DevTools → Application → Cookies, проверь что есть `access_token`

---

**Ошибка**: "Email already registered"

**Решение**: Удали пользователя из БД:
```sql
psql -h localhost -p 5433 -U eduplatform -d eduplatform_dev
DELETE FROM users WHERE email = 'test@example.com';
```

---

## 📊 Архитектура

```
┌─────────────────┐
│   Next.js       │
│   Frontend      │ → http://localhost:3000
│   (React)       │
└────────┬────────┘
         │
         │ JWT Token
         │ (cookie + localStorage)
         ▼
┌─────────────────┐
│   FastAPI       │
│   Backend       │ → http://localhost:8000
│   (Python)      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌───────┐
│ Postgres│ │ Redis │
│ (pgvector)│ │(Queue)│
└─────────┘ └───────┘
```

---

## 🎯 Следующие Шаги

После успешного запуска:

1. **Загрузи тестовый материал** (PDF или YouTube URL)
2. **Запусти обработку** через API
3. **Проверь Quiz систему**
4. **Попробуй AI Tutor chat**

---

## 📚 Документация

- **Backend**: `BACKEND_COMPLETE_GUIDE.md`
- **Frontend**: `FRONTEND_SETUP.md`
- **Auth Migration**: `AUTH_MIGRATION_GUIDE.md`
- **API Docs**: `http://localhost:8000/docs` (Swagger)

---

## 🎉 Готово!

Если все шаги выполнены - **система работает!**

Теперь у тебя полностью функциональная платформа с:
- ✅ JWT авторизацией
- ✅ Python FastAPI backend
- ✅ Next.js frontend
- ✅ AI интеграцией (OpenAI)
- ✅ RAG чатом (pgvector)
- ✅ Quiz системой

**Удачи в разработке! 🚀**
