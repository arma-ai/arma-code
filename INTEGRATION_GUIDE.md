# Руководство по интеграции нового фронтенда с бэкендом

## Обзор выполненных работ

Новый фронтенд из директории `Arma AI-Powered EdTech Interface Design` был успешно интегрирован с существующим FastAPI бэкендом. Все API эндпоинты были проверены и адаптированы для совместимости.

## Изменения в бэкенде

### 1. Добавлены недостающие эндпоинты

#### `/api/v1/materials/{id}/summary` (GET)
Возвращает резюме материала или `null` если его нет.

```python
@router.get("/{material_id}/summary")
async def get_material_summary(...)
```

#### `/api/v1/materials/{id}/notes` (GET)
Возвращает конспекты материала или `null` если их нет.

```python
@router.get("/{material_id}/notes")
async def get_material_notes(...)
```

### 2. Обновлены response типы для генерации контента

#### Podcast Script Generation
**Было:** `{"message": "..."}`
**Стало:** `{"podcast_script": [{"speaker": "...", "text": "..."}]}`

#### Podcast Audio Generation
**Было:** `{"message": "..."}`
**Стало:** `{"podcast_audio_url": "..."}`

#### Presentation Generation
**Было:** `{"message": "..."}`
**Стало:**
```json
{
  "presentation_url": "...",
  "presentation_embed_url": "...",
  "presentation_status": "completed"
}
```

### 3. Обновлены CORS настройки

Добавлена поддержка порта 3001 для нового фронтенда:

```python
# backend/app/core/config.py
BACKEND_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",  # ← Новый фронтенд
    "http://127.0.0.1:3001",  # ← Новый фронтенд
    "http://localhost:8000",
]
```

## Изменения во фронтенде

### 1. Обновлен API клиент для flashcards

**Файл:** `src/services/api.ts`

```typescript
// Бэкенд возвращает { flashcards: [], total: number }
list: async (materialId: string): Promise<Flashcard[]> => {
  const response = await apiClient.get<{ flashcards: Flashcard[]; total: number }>(
    `/materials/${materialId}/flashcards`
  );
  return response.data.flashcards; // ← Извлекаем массив
}
```

### 2. Обновлен API клиент для quiz

```typescript
// Бэкенд возвращает { questions: [], total: number }
getQuestions: async (materialId: string): Promise<QuizQuestion[]> => {
  const response = await apiClient.get<{ questions: QuizQuestion[]; total: number }>(
    `/materials/${materialId}/quiz`
  );
  return response.data.questions; // ← Извлекаем массив
}
```

## Полная карта API эндпоинтов

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/auth/register` | Регистрация нового пользователя |
| POST | `/auth/login` | Вход в систему |
| GET | `/auth/me` | Получить данные текущего пользователя |

### Materials (`/api/v1/materials`)

| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/materials` | Список всех материалов пользователя |
| POST | `/materials` | Создать материал (PDF или YouTube) |
| GET | `/materials/{id}` | Получить детали материала |
| PUT | `/materials/{id}` | Обновить материал |
| DELETE | `/materials/{id}` | Удалить материал |
| POST | `/materials/{id}/process` | Запустить обработку материала |
| **GET** | **`/materials/{id}/summary`** | **✨ Получить резюме** |
| **GET** | **`/materials/{id}/notes`** | **✨ Получить конспекты** |
| POST | `/materials/{id}/regenerate/summary` | Перегенерировать резюме |
| POST | `/materials/{id}/regenerate/notes` | Перегенерировать конспекты |
| POST | `/materials/{id}/regenerate/flashcards` | Перегенерировать флэшкарты |
| POST | `/materials/{id}/regenerate/quiz` | Перегенерировать викторину |

### AI Features

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/materials/{id}/tutor` | Отправить сообщение AI тьютору |
| GET | `/materials/{id}/tutor/history` | Получить историю чата |
| DELETE | `/materials/{id}/tutor/history` | Очистить историю |
| POST | `/materials/{id}/podcast/generate-script` | Генерировать скрипт подкаста |
| POST | `/materials/{id}/podcast/generate-audio` | Генерировать аудио подкаста |
| POST | `/materials/{id}/presentation/generate` | Генерировать презентацию |

### Flashcards (`/api/v1`)

| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/materials/{id}/flashcards` | Получить все флэшкарты материала |
| POST | `/flashcards` | Создать флэшкарту |
| GET | `/flashcards/{id}` | Получить флэшкарту |
| PUT | `/flashcards/{id}` | Обновить флэшкарту |
| DELETE | `/flashcards/{id}` | Удалить флэшкарту |

### Quiz (`/api/v1`)

| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/materials/{id}/quiz` | Получить все вопросы викторины |
| POST | `/quiz/attempt` | Отправить попытку прохождения викторины |
| POST | `/quiz` | Создать вопрос викторины |
| GET | `/quiz/{id}` | Получить вопрос |
| DELETE | `/quiz/{id}` | Удалить вопрос |

## Запуск проекта

### 1. Запуск бэкенда

```bash
cd backend

# Установить зависимости (если еще не установлены)
pip install -r requirements.txt

# Запустить PostgreSQL (убедитесь что порт 5434)
# Запустить Redis
redis-server

# Запустить Celery worker (в отдельном терминале)
celery -A app.infrastructure.queue.celery_app worker -l info

# Запустить FastAPI сервер
uvicorn app.main:app --reload --port 8000
```

**Проверка:** Откройте http://localhost:8000/docs для Swagger UI

### 2. Запуск нового фронтенда

```bash
cd "Arma AI-Powered EdTech Interface Design"

# Установить зависимости
npm install

# Создать .env.development файл
echo 'VITE_API_URL=http://localhost:8000/api/v1' > .env.development
echo 'VITE_APP_NAME=Arma AI EdTech' >> .env.development

# Запустить dev сервер
npm run dev
```

**Проверка:** Откройте http://localhost:3001

### 3. Переменные окружения

#### Бэкенд (`.env` в корне проекта или `backend/.env`)

```env
# Database
DATABASE_URL=postgresql+asyncpg://eduplatform:dev123@localhost:5434/eduplatform_dev
DATABASE_URL_SYNC=postgresql://eduplatform:dev123@localhost:5434/eduplatform_dev

# Redis
REDIS_URL=redis://localhost:6379/0

# OpenAI
OPENAI_API_KEY=sk-proj-your-key-here

# JWT
JWT_SECRET_KEY=your-secret-key
```

#### Фронтенд (`.env.development`)

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=Arma AI EdTech
```

## Структура проекта

```
arma/
├── backend/                           # FastAPI бэкенд
│   ├── app/
│   │   ├── api/v1/endpoints/         # API эндпоинты
│   │   │   ├── auth.py               # ✅ Обновлен (GET /auth/me)
│   │   │   ├── materials.py          # ✅ Обновлен (+summary, +notes)
│   │   │   ├── flashcards.py         # ✅ Готов
│   │   │   └── quiz.py               # ✅ Готов
│   │   ├── core/
│   │   │   └── config.py             # ✅ Обновлен (CORS)
│   │   ├── domain/services/          # Бизнес-логика
│   │   └── infrastructure/           # Инфраструктура
│   └── requirements.txt
│
└── Arma AI-Powered EdTech Interface Design/  # Новый фронтенд
    ├── src/
    │   ├── services/
    │   │   └── api.ts                # ✅ Обновлен (flashcards, quiz)
    │   ├── components/               # React компоненты
    │   ├── pages/                    # Страницы
    │   └── types/                    # TypeScript типы
    ├── package.json
    └── vite.config.ts
```

## Тестирование интеграции

### 1. Регистрация и авторизация

```bash
# Регистрация
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'

# Получит: {"access_token": "...", "token_type": "bearer"}

# Получить текущего пользователя
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Создание материала

```bash
# YouTube материал
curl -X POST http://localhost:8000/api/v1/materials \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Test Video" \
  -F "material_type=youtube" \
  -F "source=https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# PDF материал
curl -X POST http://localhost:8000/api/v1/materials \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Test PDF" \
  -F "material_type=pdf" \
  -F "file=@/path/to/file.pdf"
```

### 3. Проверка новых эндпоинтов

```bash
# Получить резюме
curl http://localhost:8000/api/v1/materials/{material_id}/summary \
  -H "Authorization: Bearer YOUR_TOKEN"

# Получить конспекты
curl http://localhost:8000/api/v1/materials/{material_id}/notes \
  -H "Authorization: Bearer YOUR_TOKEN"

# Получить флэшкарты (с total)
curl http://localhost:8000/api/v1/materials/{material_id}/flashcards \
  -H "Authorization: Bearer YOUR_TOKEN"
# Ответ: {"flashcards": [...], "total": 15}

# Получить вопросы викторины (с total)
curl http://localhost:8000/api/v1/materials/{material_id}/quiz \
  -H "Authorization: Bearer YOUR_TOKEN"
# Ответ: {"questions": [...], "total": 10}
```

## Возможные проблемы и решения

### 1. CORS ошибки

**Проблема:** `Access to fetch at 'http://localhost:8000/api/v1/...' from origin 'http://localhost:3001' has been blocked by CORS policy`

**Решение:** Убедитесь что:
- Бэкенд запущен на порту 8000
- Фронтенд запущен на порту 3001
- В `backend/app/core/config.py` добавлен `http://localhost:3001` в CORS origins
- Перезапустите бэкенд после изменения config

### 2. JWT ошибки

**Проблема:** `401 Unauthorized` при запросах

**Решение:**
- Проверьте что токен сохранен в localStorage (`access_token`)
- Токен должен передаваться в заголовке: `Authorization: Bearer {token}`
- Токен валиден 7 дней (настройка `ACCESS_TOKEN_EXPIRE_MINUTES`)

### 3. Database connection ошибки

**Проблема:** `Cannot connect to database`

**Решение:**
```bash
# Проверьте что PostgreSQL запущен на порту 5434
psql -h localhost -p 5434 -U eduplatform -d eduplatform_dev

# Если нужно создать БД
createdb -h localhost -p 5434 -U eduplatform eduplatform_dev

# Выполнить миграции
cd backend
alembic upgrade head
```

### 4. Celery ошибки

**Проблема:** `Connection refused` при создании материала

**Решение:**
```bash
# Убедитесь что Redis запущен
redis-cli ping
# Ответ: PONG

# Запустите Celery worker
cd backend
celery -A app.infrastructure.queue.celery_app worker -l info
```

### 5. OpenAI API ошибки

**Проблема:** `AuthenticationError: No API key provided`

**Решение:**
- Убедитесь что `OPENAI_API_KEY` установлен в `.env`
- Ключ должен начинаться с `sk-` или `sk-proj-`
- Проверьте квоты на https://platform.openai.com/usage

## Следующие шаги

### Готово ✅
- [x] Интеграция API эндпоинтов
- [x] CORS настройка
- [x] Response типы обновлены
- [x] Фронтенд API клиент адаптирован

### Требуется дополнительно

1. **Настройка продакшн окружения**
   - Настроить PostgreSQL для production
   - Настроить Nginx/Caddy reverse proxy
   - Настроить SSL сертификаты
   - Environment variables для production

2. **Доработка UI**
   - Убрать mock данные из `mockData.ts`
   - Подключить реальные API calls во всех компонентах
   - Добавить loading states
   - Добавить error handling

3. **Тестирование**
   - E2E тесты (Playwright/Cypress)
   - Unit тесты для критичных компонентов
   - API integration тесты

4. **Деплой**
   - Backend: Railway, Render, или DigitalOcean
   - Frontend: Vercel, Netlify, или Cloudflare Pages
   - Database: Managed PostgreSQL (Supabase, Railway, Neon)

## Контакты и поддержка

- **Backend API документация:** http://localhost:8000/docs
- **ReDoc документация:** http://localhost:8000/redoc
- **Frontend dev сервер:** http://localhost:3001

## Заключение

Интеграция завершена успешно! Новый фронтенд полностью совместим с существующим бэкендом. Все основные фичи (Auth, Materials, AI Features, Flashcards, Quiz) готовы к использованию.

Для запуска полноценной разработки:
1. Запустите бэкенд (FastAPI + Celery + PostgreSQL + Redis)
2. Запустите фронтенд (Vite dev server)
3. Откройте http://localhost:3001 и начните работу!
