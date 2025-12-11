# 🚀 EduPlatform - Полное Руководство по Запуску

## ✅ Текущий Статус

**Все сервисы работают!**
- ✅ Backend API (FastAPI) - http://localhost:8000
- ✅ Celery Worker (Docker) - обработка материалов
- ✅ PostgreSQL + Redis (Docker) - хранение данных
- ✅ Frontend (Next.js) - http://localhost:3000

---

## 📋 Быстрый Старт

### 1. **Запуск Backend**

```bash
cd backend

# Активировать виртуальное окружение
source venv/bin/activate

# Запустить FastAPI сервер
uvicorn app.main:app --reload --port 8000
```

**Проверка:** http://localhost:8000/docs

### 2. **Запуск Celery Worker (Docker)**

```bash
# Запустить Docker сервисы (PostgreSQL, Redis, Celery)
docker compose up -d

# Проверить статус
docker compose ps

# Просмотр логов
docker compose logs -f celery-worker
```

### 3. **Запуск Frontend**

```bash
# В корне проекта
npm install
npm run dev
```

**Проверка:** http://localhost:3000

---

## 🎯 Функциональность Приложения

### **1. AI Chat with Tutor (RAG-based)**
**Endpoint:** `POST /api/v1/materials/{id}/tutor`

**Как работает:**
1. Пользователь задает вопрос
2. Backend ищет релевантные фрагменты через vector search (pgvector)
3. GPT-4o отвечает на основе контекста документа

**Frontend компонент:** `app/dashboard/materials/[id]/TutorChat.tsx`

**Тест:**
```bash
curl -X POST http://localhost:8000/api/v1/materials/{material_id}/tutor \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Объясни основные концепции из документа"}'
```

### **2. Flashcards**
**Endpoint:** `GET /api/v1/flashcards/materials/{id}`

**Как работает:**
1. При обработке материала GPT-4o генерирует вопрос-ответ пары
2. Frontend отображает в виде карточек с flip-анимацией

**Frontend компонент:** `app/dashboard/materials/[id]/InteractiveFlashcards.tsx`

### **3. Quiz**
**Endpoints:**
- `GET /api/v1/quiz/materials/{id}/quiz` - получить вопросы
- `POST /api/v1/quiz/attempt` - проверить ответы
- `POST /api/v1/quiz/attempts/save` - сохранить результат
- `GET /api/v1/quiz/materials/{id}/quiz/statistics` - статистика

**Как работает:**
1. GPT-4o генерирует multiple-choice вопросы с 4 вариантами
2. Пользователь проходит тест
3. Система сохраняет попытки и показывает статистику

**Frontend компонент:** `app/dashboard/materials/[id]/InteractiveQuiz.tsx`

### **4. Summary**
**Endpoint:** `GET /api/v1/materials/{id}` (поле `summary`)

**Как работает:**
1. GPT-4o-mini генерирует краткое резюме документа
2. Сохраняется в таблицу `material_summaries`

**Frontend:** Отображается во вкладке "Summary"

### **5. Notes**
**Endpoint:** `GET /api/v1/materials/{id}` (поле `notes`)

**Как работает:**
1. GPT-4o-mini генерирует детальные заметки с структурой
2. Сохраняется в таблицу `material_notes`

**Frontend:** Отображается во вкладке "My Notes"

---

## 🔧 Устранение Проблем

### **Проблема: "BUILDING RICH VIEW... 15%" зависает**

**Причина:** Frontend пытается построить rich document view

**Решение:**
1. Проверить, что материал обработан:
```bash
curl http://localhost:8000/api/v1/materials/{material_id} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. Проверить `processing_status`:
   - Должен быть `"completed"`
   - `processing_progress` должен быть `100`

3. Если обработка не завершена, проверить Celery логи:
```bash
docker compose logs celery-worker | tail -50
```

### **Проблема: AI Chat не отвечает**

**Причины:**
1. Embeddings не созданы
2. Нет токена авторизации
3. OpenAI API ошибка

**Решение:**
1. Проверить embeddings:
```sql
SELECT COUNT(*) FROM material_embeddings WHERE material_id = 'YOUR_MATERIAL_ID';
```

2. Проверить туториал историю:
```bash
curl http://localhost:8000/api/v1/materials/{material_id}/tutor/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. Проверить OpenAI API key в `.env`

### **Проблема: Flashcards/Quiz не отображаются**

**Причины:**
1. Материал еще обрабатывается
2. AI не сгенерировал контент
3. Ошибка в Celery task

**Решение:**
1. Проверить, что материал обработан
2. Проверить наличие данных:
```bash
# Flashcards
curl http://localhost:8000/api/v1/flashcards/materials/{material_id} \
  -H "Authorization: Bearer YOUR_TOKEN"

# Quiz
curl http://localhost:8000/api/v1/quiz/materials/{material_id}/quiz \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. Если данных нет, запустить регенерацию:
```bash
# Regenerate flashcards
curl -X POST http://localhost:8000/api/v1/materials/{material_id}/regenerate/flashcards \
  -H "Authorization: Bearer YOUR_TOKEN"

# Regenerate quiz
curl -X POST http://localhost:8000/api/v1/materials/{material_id}/regenerate/quiz \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📦 Структура Компонентов Frontend

```
app/dashboard/materials/[id]/
├── page.tsx                      # Главная страница материала
├── MaterialDocumentView.tsx      # Переключатель между PDF/YouTube/Rich view
├── SidebarClient.tsx            # Боковая панель с AI инструментами
├── TutorChat.tsx                # AI чат
├── InteractiveFlashcards.tsx    # Флешкарты
├── InteractiveQuiz.tsx          # Квиз
├── QuizStatistics.tsx           # Статистика квизов
├── GenerateSummaryButton.tsx   # Кнопка генерации summary
├── GenerateNotesButton.tsx     # Кнопка генерации notes
├── GenerateFlashcardsButton.tsx # Кнопка генерации flashcards
└── GenerateQuizButton.tsx      # Кнопка генерации quiz
```

---

## 🔑 API Авторизация

### **Получить токен:**

```bash
# Регистрация
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'

# Логин
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Ответ:
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer"
}
```

### **Использовать токен:**

```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎨 Frontend Environment Variables

**Файл:** `.env.local`

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# OpenAI API Key (для client-side генерации, если нужно)
OPENAI_API_KEY=sk-proj-...
```

---

## 🐛 Debug Mode

### **Backend Logs:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --log-level debug
```

### **Celery Logs:**
```bash
docker compose logs -f celery-worker
```

### **Frontend Logs:**
```bash
# Browser console (F12)
# Или в терминале:
npm run dev
```

---

## ✅ Checklist: Что Должно Работать

После запуска всех сервисов проверьте:

- [ ] Backend отвечает на http://localhost:8000/health
- [ ] Swagger доступен на http://localhost:8000/docs
- [ ] Celery worker запущен (`docker compose ps`)
- [ ] PostgreSQL доступна (`docker compose ps`)
- [ ] Redis доступен (`docker compose ps`)
- [ ] Frontend открывается на http://localhost:3000
- [ ] Можно залогиниться
- [ ] Можно загрузить материал (PDF/DOCX/TXT/YouTube)
- [ ] Материал обрабатывается (статус "processing" → "completed")
- [ ] Summary генерируется
- [ ] Notes генерируются
- [ ] Flashcards генерируются
- [ ] Quiz генерируется
- [ ] AI Chat отвечает на вопросы

---

## 🚀 Production Deployment

### **Docker Compose Production:**

```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
```

### **Environment Variables (Production):**

```env
# Backend
DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/eduplatform_prod
REDIS_URL=redis://redis:6379/0
OPENAI_API_KEY=sk-proj-...
JWT_SECRET_KEY=your-secret-key-here
APP_ENV=production
DEBUG=False

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 📚 Дополнительные Ресурсы

- **Backend API Docs:** http://localhost:8000/docs
- **Backend Guide:** `backend/BACKEND_COMPLETE_GUIDE.md`
- **YouTube Processing:** `backend/YOUTUBE_PROCESSING.md`
- **Document Formats:** `backend/DOCUMENT_FORMATS.md`
- **Docker Setup:** `DOCKER_SETUP.md`
- **Quick Start:** `QUICK_START.md`

---

## 💡 Tips & Tricks

### **Быстрая перезагрузка Celery:**
```bash
make celery-restart
# или
docker compose restart celery-worker
```

### **Очистка Redis:**
```bash
make redis-flush
```

### **Backup БД:**
```bash
make db-backup
```

### **Просмотр всех команд:**
```bash
make help
```

---

## 🎓 Итого

Все компоненты EduPlatform настроены и работают:

✅ **Backend (FastAPI)** - обработка запросов, AI генерация
✅ **Celery Worker** - асинхронная обработка материалов
✅ **PostgreSQL + pgvector** - хранение данных и vector search
✅ **Redis** - очереди и кеширование
✅ **Frontend (Next.js)** - пользовательский интерфейс

**Все функции доступны:**
- 🤖 AI Chat with Tutor (RAG)
- 🎴 Flashcards
- 📝 Quiz с статистикой
- 📄 Summary
- 📓 Notes
- 🎥 YouTube + 10 форматов документов

---

**Версия:** 2.0.0
**Дата:** 2024-12-09
