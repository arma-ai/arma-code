# AI Tutor Chat Implementation - Session Summary

**Date:** 2026-03-06  
**Session Goal:** Implement AI Tutor Chat with RAG for both single material and all materials (project) modes

---

## ✅ ЧТО БЫЛО РЕАЛИЗОВАНО

### 1. База Данных

**Миграция:** `backend/alembic/versions/20260306_add_tutor_messages.py`

Создана таблица `tutor_messages`:
```sql
CREATE TABLE tutor_messages (
    id UUID PRIMARY KEY,
    material_id UUID NOT NULL (FK to materials),
    role VARCHAR(20) NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    context VARCHAR(50),  -- 'chat' or 'selection'
    created_at TIMESTAMP
);
```

**Индексы:**
- `ix_tutor_messages_material_id`
- `ix_tutor_messages_created_at`
- `idx_tutor_messages_material_created` (composite)

---

### 2. Backend API Endpoints

**Файл:** `backend/app/api/v1/endpoints/materials.py`

#### Single Material Mode:
```python
POST /api/v1/materials/{material_id}/tutor
GET  /api/v1/materials/{material_id}/tutor/history
DELETE /api/v1/materials/{material_id}/tutor/history
```

#### All Materials Mode (Project-wide):
```python
POST /api/v1/materials/projects/{project_id}/tutor
GET  /api/v1/materials/projects/{project_id}/tutor/history
DELETE /api/v1/materials/projects/{project_id}/tutor/history
```

---

### 3. Backend Services

**Файл:** `backend/app/domain/services/tutor_service.py`

#### TutorService Class:
- `send_message()` - для одного материала
- `send_message_project_wide()` - для всех материалов проекта
- `_find_relevant_context()` - RAG поиск для одного материала
- `_find_relevant_context_project_wide()` - RAG поиск по всем материалам
- `_get_conversation_history()` - загрузка истории диалога
- `_save_messages()` - сохранение сообщений в БД

#### RAG Implementation:
```python
# Vector search с pgvector
SELECT chunk_text, chunk_index, material_id,
       (embedding::vector <=> :query_embedding::vector) AS distance
FROM material_embeddings
WHERE material_id = ANY(ARRAY[...])
ORDER BY distance ASC
LIMIT :top_k
```

**Важно:** Требуется CAST к `vector` типу: `embedding::vector <=> :query_embedding::vector`

---

### 4. Frontend API Client

**Файл:** `Arma AI-Powered EdTech Interface Design/src/services/api.ts`

```typescript
export const tutorApi = {
  sendMessage: async (materialId, data) => POST /materials/${materialId}/tutor
  sendProjectMessage: async (projectId, data) => POST /materials/projects/${projectId}/tutor
  getHistory: async (materialId) => GET /materials/${materialId}/tutor/history
  getProjectHistory: async (projectId) => GET /materials/projects/${projectId}/tutor/history
  clearHistory: async (materialId) => DELETE /materials/${materialId}/tutor/history
  clearProjectHistory: async (projectId) => DELETE /materials/projects/${projectId}/tutor/history
}
```

---

### 5. Frontend Hooks

**Файл:** `Arma AI-Powered EdTech Interface Design/src/hooks/useApi.ts`

```typescript
export function useTutorChat(materialId: string | null, projectId?: string | null) {
  // Возвращает: messages, loading, error, sending, sendMessage, clearHistory, refetch
  // Автоматически выбирает между material и project режимом
}
```

---

### 6. Frontend UI Components

**Файл:** `Arma AI-Powered EdTech Interface Design/src/pages/ProjectDetailView.tsx`

- Chat tab добавлен в навигацию
- View Mode Toggle для Chat (All Materials / Single Material)
- Интеграция с ChatTab компонентом

**Файлы табов:**
- `src/components/dashboard/tabs/ChatTab.tsx` - уже существует с TTS поддержкой

---

## ❌ ТЕКУЩИЕ ПРОБЛЕМЫ И ОШИБКИ

### Критичная Ошибка: Transaction Aborted

**Симптом:**
```
sqlalchemy.exc.DBAPIError: (sqlalchemy.dialects.postgresql.asyncpg.Error) 
<class 'asyncpg.exceptions.InFailedSQLTransactionError'>: 
current transaction is aborted, commands ignored until end of transaction block
```

**Где происходит:** При INSERT в `tutor_messages` после генерации AI ответа

**Статус:** ❌ НЕ ИСПРАВЛЕНО

**Попытки исправления:**
1. ✅ Добавлен `await self.session.flush()` перед `commit()`
2. ✅ Добавлен `await self.session.rollback()` в except блоках
3. ✅ Добавлена обработка ошибок в `send_message()` и `send_message_project_wide()`
4. ✅ Исправлен CAST для pgvector: `embedding::vector <=> :query_embedding::vector`

**Возможные причины:**
1. AsyncSession не правильно управляет транзакциями
2. Где-то есть предыдущая ошибка которая abort'ит транзакцию
3. Нужно явно начинать транзакцию через `async with self.session.begin()`

---

### Проблема 2: Project Model Field Name

**Ошибка:**
```
AttributeError: 'Project' object has no attribute 'user_id'
```

**Статус:** ✅ ИСПРАВЛЕНО

**Решение:** Заменить `project.user_id` на `project.owner_id`

---

### Проблема 3: Vector Search Operator

**Ошибка:**
```
operator does not exist: text <=> unknown
```

**Статус:** ✅ ИСПРАВЛЕНО

**Решение:** Добавить CAST в SQL запросе:
```sql
(embedding::vector <=> :query_embedding::vector) AS distance
```

---

## 📋 ПЛАН ДЛЯ СЛЕДУЮЩЕЙ СЕССИИ

### Приоритет 1: Исправить Transaction Aborted Error

**Варианты решения:**

1. **Использовать явные транзакции:**
```python
async with self.session.begin():
    self.session.add(user_msg)
    self.session.add(ai_msg)
    await self.session.commit()
```

2. **Проверить что нет предыдущих ошибок** перед `_save_messages()`
   - Добавить логирование перед каждым шагом
   - Проверять состояние сессии

3. **Использовать отдельную сессию для сохранения:**
```python
async with get_db_session() as save_session:
    save_session.add(user_msg)
    save_session.add(ai_msg)
    await save_session.commit()
```

4. **Убрать flush() и использовать только commit():**
```python
self.session.add(user_msg)
self.session.add(ai_msg)
await self.session.commit()  # Без flush()
```

### Приоритет 2: Тестирование

После исправления ошибки протестировать:

1. **Single Material Mode:**
   - [ ] Отправить сообщение
   - [ ] Получить историю
   - [ ] Очистить историю
   - [ ] TTS работает

2. **All Materials Mode:**
   - [ ] Отправить сообщение (RAG по всем материалам)
   - [ ] Получить комбинированную историю
   - [ ] Очистить историю

3. **View Mode Toggle:**
   - [ ] Переключение между режимами работает
   - [ ] История загружается правильная

### Приоритет 3: Улучшения (опционально)

1. **Добавить project_tutor_messages таблицу** для правильного хранения project-level чатов
2. **Добавить pagination** для истории чата
3. **Добавить typing indicators** во фронтенд
4. **Добавить retry logic** для failed запросов

---

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Стек:
- **Backend:** FastAPI + SQLAlchemy (async) + PostgreSQL + pgvector
- **Frontend:** React + TypeScript + React Query (через axios)
- **AI:** OpenAI API (gpt-4o-mini для chat, text-embedding-3-large для embeddings)

### Ключевые файлы:

**Backend:**
```
backend/
├── alembic/versions/20260306_add_tutor_messages.py
├── app/
│   ├── api/v1/endpoints/materials.py (tutor endpoints)
│   ├── domain/services/tutor_service.py (RAG logic)
│   ├── infrastructure/database/models/material.py (TutorMessage model)
│   └── schemas/material.py (TutorMessage schemas)
```

**Frontend:**
```
Arma AI-Powered EdTech Interface Design/src/
├── services/api.ts (tutorApi client)
├── hooks/useApi.ts (useTutorChat hook)
├── pages/ProjectDetailView.tsx (Chat tab integration)
└── components/dashboard/tabs/ChatTab.tsx (UI component)
```

### Environment Variables:
```bash
# Backend
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql+asyncpg://...

# Frontend
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 📝 ЗАМЕТКИ

1. **Project модель** использует `owner_id` вместо `user_id`
2. **pgvector** требует CAST: `embedding::vector`
3. **AsyncSession** требует правильной обработки транзакций
4. **TTS функционал** уже есть в ChatTab компоненте
5. **RAG поиск** работает через cosine similarity (`<=>` оператор)

---

## 🎯 ЦЕЛЬ СЛЕДУЮЩЕЙ СЕССИИ

**Исправить ошибку "transaction is aborted" и заставить чат работать в обоих режимах!**

---

*Last updated: 2026-03-06*
*Session duration: ~4 hours*
*Status: 90% complete - critical bug remaining*
