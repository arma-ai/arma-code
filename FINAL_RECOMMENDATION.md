# 🎯 ФИНАЛЬНАЯ РЕКОМЕНДАЦИЯ: План переписывания проекта

## TL;DR - Что делать?

### ✅ **МОЯ РЕКОМЕНДАЦИЯ:**

```
Backend:  Next.js Server Actions → FastAPI + PostgreSQL + pgvector
Frontend: Next.js (оставить) + Zustand + React Query
```

## 🚫 НЕ ДЕЛАЙ ТАК:

```
❌ Backend: FastAPI + SQLite        (SQLite не поддерживает pgvector!)
❌ Frontend: Полностью переписывать (Next.js нормальный, проблема в архитектуре)
```

---

## 📊 СРАВНЕНИЕ ВАРИАНТОВ

### Вариант 1: FastAPI + SQLite (твое предложение)

| Плюс                                                | Минус                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| ✅ Простая разработка                  | ❌**Нет pgvector - RAG НЕ РАБОТАЕТ**       |
| ✅ Не нужен отдельный сервер БД | ❌ Не подходит для продакшена          |
| ✅ SQLAlchemy                                           | ❌ Сложная миграция на PostgreSQL потом |
|                                                         | ❌ Нет concurrent writes                                   |

**Вердикт:** ❌ **НЕ ПОДХОДИТ** - RAG chat сломается

---

### Вариант 2: FastAPI + PostgreSQL (моя рекомендация)

| Плюс                                | Минус                                           |
| --------------------------------------- | ---------------------------------------------------- |
| ✅ pgvector для embeddings           | ⚠️ Нужен отдельный сервер БД |
| ✅ Production-ready                     | ⚠️ Чуть сложнее настройка      |
| ✅ Масштабируется         |                                                      |
| ✅ Легко деплоить (Docker) |                                                      |
| ✅ Concurrent writes                    |                                                      |

**Вердикт:** ✅ **ИДЕАЛЬНО** - все работает + готов к продакшену

---

## 🗺️ ROADMAP: 0% → 100%

### **Фаза 1: Подготовка (Неделя 1)**

**Цель:** Настроить окружение разработки

```bash
# 1. Создать новую папку для бэкенда
mkdir backend
cd backend

# 2. Создать виртуальное окружение
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate    # Windows

# 3. Установить зависимости
pip install fastapi uvicorn sqlalchemy alembic psycopg2-binary
pip install pgvector pydantic[email] python-multipart
pip install openai langchain langchain-openai
pip install celery redis python-jose[cryptography]

# 4. Поднять PostgreSQL через Docker
docker-compose up -d postgres redis

# 5. Создать структуру проекта (см. backend_migration_plan.md)
```

**Deliverables:**

- ✅ Структура папок готова
- ✅ PostgreSQL + Redis запущены
- ✅ Зависимости установлены

---

### **Фаза 2: Базовый CRUD API (Неделя 2)**

**Цель:** Создать работающий API для материалов

**Задачи:**

1. Создать SQLAlchemy модели (Material, User)
2. Настроить Alembic миграции
3. Реализовать базовый CRUD для materials:
   - `POST /materials` - создание
   - `GET /materials` - список
   - `GET /materials/{id}` - детали
   - `DELETE /materials/{id}` - удаление
4. Добавить JWT аутентификацию
5. Написать unit тесты

**Код:**

```python
# app/api/v1/materials.py
@router.post("/", response_model=MaterialResponse)
async def create_material(
    title: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Validate file
    # 2. Upload to storage
    # 3. Create DB record
    # 4. Return response
    pass
```

**Тестирование:**

```bash
# Запустить сервер
uvicorn app.main:app --reload

# Проверить в Swagger UI
http://localhost:8000/docs
```

**Deliverables:**

- ✅ API работает
- ✅ Swagger документация доступна
- ✅ JWT auth работает
- ✅ Тесты проходят

---

### **Фаза 3: Background Jobs (Неделя 3)**

**Цель:** Перенести процессинг материалов в background jobs

**Задачи:**

1. Настроить Celery + Redis
2. Создать worker для обработки материалов
3. Реализовать text extraction (PDF + YouTube)
4. Добавить retry logic

**Код:**

```python
# app/workers/material_processor.py
@celery_app.task(bind=True, max_retries=3)
def process_material_task(self, material_id: str):
    try:
        # 1. Extract text
        # 2. Generate AI content
        # 3. Create embeddings
        # 4. Update DB
        pass
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
```

**Запуск:**

```bash
# Terminal 1: FastAPI
uvicorn app.main:app

# Terminal 2: Celery worker
celery -A app.workers.celery_app worker --loglevel=info

# Terminal 3: Celery flower (monitoring)
celery -A app.workers.celery_app flower
```

**Deliverables:**

- ✅ Background processing работает
- ✅ PDF text extraction работает
- ✅ YouTube transcription работает
- ✅ Celery Flower доступен

---

### **Фаза 4: AI Integration (Неделя 4)**

**Цель:** Интегрировать OpenAI через LangChain

**Задачи:**

1. Создать AIService с LangChain
2. Реализовать генерацию:
   - Summary
   - Notes
   - Flashcards
   - Quiz
3. Добавить batching для embeddings
4. Настроить retry + exponential backoff

**Код:**

```python
# app/domain/services/ai_service.py
class AIService:
    async def generate_summary(self, text: str) -> str:
        prompt = ChatPromptTemplate.from_template(...)
        chain = prompt | self.llm_mini
        return await chain.ainvoke({"text": text})

    async def create_embeddings_batch(
        self,
        texts: List[str],
        batch_size: int = 10
    ) -> List[List[float]]:
        # Batch processing for efficiency
        pass
```

**Deliverables:**

- ✅ AI generation работает
- ✅ Embeddings создаются батчами
- ✅ Retry logic работает

---

### **Фаза 5: Vector Search (Неделя 5)**

**Цель:** Реализовать RAG chat с pgvector

**Задачи:**

1. Создать таблицу embeddings с vector колонкой
2. Настроить IVFFlat индекс
3. Реализовать cosine similarity search
4. Создать Tutor Chat endpoint
5. Добавить conversation history

**Код:**

```python
# app/infrastructure/repositories/embedding_repo.py
async def find_similar_chunks(
    self,
    material_id: UUID,
    query_embedding: List[float],
    limit: int = 5
) -> List[str]:
    stmt = select(
        MaterialEmbedding.chunk_text
    ).where(
        MaterialEmbedding.material_id == material_id
    ).order_by(
        MaterialEmbedding.embedding.cosine_distance(query_embedding)
    ).limit(limit)

    result = await self.session.execute(stmt)
    return [row[0] for row in result]
```

**Deliverables:**

- ✅ Vector search работает
- ✅ Tutor chat работает
- ✅ Context включается в промпт

---

### **Фаза 6: Frontend Integration (Неделя 6)**

**Цель:** Подключить фронт к новому API

**Задачи:**

1. Установить Zustand + React Query
2. Создать API client (axios)
3. Создать custom hooks
4. Переписать компоненты на новые хуки
5. Убрать Server Actions

**Код:**

```typescript
// lib/hooks/useMaterials.ts
export function useMaterials() {
  return useQuery({
    queryKey: ['materials'],
    queryFn: () => materialsApi.getAll(),
  });
}

// Usage in component
const { data: materials, isLoading } = useMaterials();
```

**Deliverables:**

- ✅ Фронт подключен к FastAPI
- ✅ React Query работает
- ✅ Zustand stores созданы

---

### **Фаза 7: Testing (Неделя 7)**

**Цель:** Покрыть тестами критический функционал

**Задачи:**

1. Unit тесты для domain logic (80% coverage)
2. Integration тесты для API endpoints
3. E2E тесты для критических флоу (pytest + httpx)
4. Performance тесты

**Пример:**

```python
# tests/unit/test_material_service.py
async def test_create_material():
    service = MaterialService(mock_repo, mock_storage)
    material = await service.create_pdf_material(
        user_id=UUID(),
        title="Test",
        file=mock_file
    )
    assert material.title == "Test"
```

**Deliverables:**

- ✅ 80% test coverage
- ✅ CI/CD настроен (GitHub Actions)

---

### **Фаза 8: Оптимизация Frontend (Неделя 8)**

**Цель:** Оптимизировать компоненты

**Задачи:**

1. Разбить MaterialDocumentView на подкомпоненты
2. Добавить виртуализацию
3. Добавить code splitting
4. Добавить skeleton states
5. Убрать window events

**Deliverables:**

- ✅ Bundle size -40%
- ✅ Initial load -50%
- ✅ Нет window events

---

### **Фаза 9: Deployment (Неделя 9)**

**Цель:** Задеплоить в продакшен

**Задачи:**

1. Настроить Docker images
2. Настроить CI/CD (GitHub Actions)
3. Задеплоить на Railway/Render/DigitalOcean
4. Настроить мониторинг (Sentry)
5. Настроить логирование

**Docker:**

```dockerfile
# Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]
```

**Deliverables:**

- ✅ Backend deployed
- ✅ Frontend deployed
- ✅ DB hosted
- ✅ Monitoring работает

---

## 📈 ПРОГРЕСС ПО НЕДЕЛЯМ

| Неделя | Фаза             | Прогресс         | Готовность |
| ------------ | -------------------- | ------------------------ | -------------------- |
| 1            | Подготовка | Setup окружения | 10%                  |
| 2            | CRUD API             | Базовый API       | 25%                  |
| 3            | Background Jobs      | Celery + Worker          | 40%                  |
| 4            | AI Integration       | LangChain + OpenAI       | 55%                  |
| 5            | Vector Search        | pgvector + RAG           | 70%                  |
| 6            | Frontend             | React Query + Zustand    | 80%                  |
| 7            | Testing              | Tests + CI/CD            | 90%                  |
| 8            | Optimization         | Performance              | 95%                  |
| 9            | Deployment           | Production               | 100%                 |

---

## 💰 СРАВНЕНИЕ ЗАТРАТ

### SQLite путь (твое предложение):

```
Неделя 1-3: Разработка с SQLite
Неделя 4:   Обнаружение проблемы с pgvector ❌
Неделя 5-6: Миграция на PostgreSQL
Неделя 7-9: Доработка

Итого: 9 недель + переделывание работы
```

### PostgreSQL путь (моя рекомендация):

```
Неделя 1-2: Setup PostgreSQL
Неделя 3-6: Разработка (все работает с первого раза) ✅
Неделя 7-9: Testing + Deploy

Итого: 9 недель, без переделывания
```

**Экономия времени:** 0 недель, но без headache
**Экономия нервов:** 💯

---

## 🎯 ЧТО ПОЛУЧИШЬ В ИТОГЕ

### Backend (FastAPI):

- ✅ Полное разделение фронта/бэка
- ✅ Автодокументация (Swagger)
- ✅ Background jobs из коробки
- ✅ pgvector для RAG
- ✅ Production-ready
- ✅ Легко масштабируется
- ✅ Python экосистема для AI

### Frontend (Next.js оптимизированный):

- ✅ React Query (кеширование, refetch)
- ✅ Zustand (управление состоянием)
- ✅ Компоненты <200 строк
- ✅ Bundle size -40%
- ✅ Performance +100%
- ✅ No window events

### Database (PostgreSQL):

- ✅ pgvector для embeddings
- ✅ Транзакции
- ✅ Concurrent writes
- ✅ Full-text search
- ✅ Индексы
- ✅ Production-ready

---

## 🚀 НАЧНИ С ЭТОГО

### День 1 (Сегодня):

```bash
# 1. Создай структуру
mkdir backend
cd backend
python -m venv venv
source venv/bin/activate

# 2. Установи зависимости
pip install fastapi uvicorn sqlalchemy alembic
pip install psycopg2-binary pgvector pydantic

# 3. Создай docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: eduplatform
      POSTGRES_PASSWORD: dev123
      POSTGRES_DB: eduplatform_dev
    ports:
      - "5432:5432"
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
EOF

# 4. Запусти БД
docker-compose up -d

# 5. Создай структуру папок (см. backend_migration_plan.md)
```

### День 2-7:

- Создай SQLAlchemy модели
- Настрой Alembic
- Реализуй CRUD для materials
- Напиши тесты

---

## ❓ FAQ

**Q: Почему не SQLite для разработки, а потом PostgreSQL для продакшена?**

A: Потому что:

1. pgvector НЕ СУЩЕСТВУЕТ для SQLite - твой RAG сломается
2. Разные SQL диалекты - придется переписывать queries
3. Миграция данных - риск потери данных
4. Лучше сразу делать правильно

**Q: Может лучше полностью переписать фронт на Vue/Svelte?**

A: НЕТ. Проблема не в Next.js, а в:

- Отсутствии state management
- Отсутствии кеширования
- God components
- Window events

React Query + Zustand решат все проблемы.

**Q: Сколько времени на переписывание?**

A:

- Один разработчик: 9 недель
- Два разработчика: 5-6 недель

**Q: Можно ли делать постепенную миграцию?**

A: ДА! План:

1. Подними FastAPI параллельно Next.js
2. Переноси endpoints один за другим
3. Фронт постепенно переключай на новый API
4. Когда все готово - удали Server Actions

---

## ✅ ЧЕКЛИСТ ДЛЯ СТАРТА

- [X] Прочитал backend_migration_plan.md
- [X] Прочитал frontend_optimization_plan.md
- [ ] Создал виртуальное окружение Python
- [ ] Установил зависимости
- [ ] Поднял PostgreSQL через Docker
- [ ] Создал структуру папок backend/
- [ ] Настроил Alembic
- [ ] Создал первую миграцию
- [ ] Написал первый endpoint
- [ ] Протестировал в Swagger UI

---

## 🎓 ЗАКЛЮЧЕНИЕ

**SQLite - это обучение.**
**PostgreSQL - это продакшен.**

Ты хочешь сделать учебный проект или реальное приложение?

Если реальное → PostgreSQL с первого дня.

**Удачи! 🚀**

*P.S. Если есть вопросы - спрашивай. Готов помочь с любым этапом.*
