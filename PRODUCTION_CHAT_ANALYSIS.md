# Production Chat Analysis - AI Tutor with RAG

## Как работает Chat на Продакшене

### 1. Архитектура

```
Frontend (React)
    ↓ HTTP Request
Backend API (FastAPI)
    ↓ TutorService
RAG (Retrieval-Augmented Generation)
    ↓ Vector Search + OpenAI
AI Response
    ↓ Save to DB
TutorMessage (PostgreSQL)
    ↓ Response
Frontend UI
```

---

### 2. API Endpoints (Production)

Все endpoints находятся в файле:
**`prod_version/backend/app/api/v1/endpoints/materials.py`**

#### 2.1 Отправить сообщение
```python
POST /api/v1/materials/{material_id}/tutor
```

**Request Body:**
```json
{
  "message": "Explain this concept",
  "context": "chat"  // или "selection"
}
```

**Response:**
```json
{
  "id": "uuid",
  "material_id": "uuid",
  "role": "assistant",
  "content": "AI response text...",
  "context": "chat",
  "created_at": "2026-03-06T12:00:00"
}
```

**Логика:**
1. Проверяет что материал существует
2. Проверяет что processing_status = "completed"
3. Вызывает `TutorService.send_message()`
4. Сохраняет user message + AI response в БД
5. Возвращает AI сообщение

---

#### 2.2 Получить историю чата
```python
GET /api/v1/materials/{material_id}/tutor/history?limit=50
```

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "User question",
      "created_at": "..."
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "AI response",
      "created_at": "..."
    }
  ],
  "total": 10
}
```

**Логика:**
- Загружает сообщения из БД
- Сортирует по created_at.asc (от старых к новым)
- Ограничивает limit параметром (default 50)

---

#### 2.3 Очистить историю
```python
DELETE /api/v1/materials/{material_id}/tutor/history
```

**Response:**
```json
{
  "message": "Chat history cleared successfully"
}
```

---

### 3. База Данных

#### Таблица: `tutor_messages`

**Файл миграции:**
`prod_version/backend/alembic/versions/dab3998dcff8_initial_migration_create_all_tables.py`

**Структура:**
```python
class TutorMessage(Base):
    __tablename__ = "tutor_messages"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    material_id = Column(UUID, ForeignKey("materials.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    context = Column(String(50), default='chat')  # 'chat' or 'selection'
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    material = relationship("Material", back_populates="tutor_messages")
    
    __table_args__ = (
        Index('idx_tutor_messages_material_created', 'material_id', 'created_at'),
    )
```

**Индексы:**
- `ix_tutor_messages_material_id` - для быстрого поиска по material_id
- `ix_tutor_messages_created_at` - для сортировки по времени
- `idx_tutor_messages_material_created` - composite индекс для оптимизации

---

### 4. RAG (Retrieval-Augmented Generation)

**Файл:** `prod_version/backend/app/domain/services/tutor_service.py`

#### 4.1 Как работает RAG

```
User Question
    ↓
1. Create Embedding для вопроса (OpenAI)
    ↓
2. Vector Search в material_embeddings таблице
   (cosine similarity <=> оператор)
    ↓
3. Найти top_k=5 релевантных chunks
    ↓
4. Получить conversation history (last 10 messages)
    ↓
5. Сформировать prompt для OpenAI:
   - System prompt
   - Relevant context chunks
   - Conversation history
   - User question
    ↓
6. OpenAI генерирует ответ
    ↓
7. Сохранить user message + AI response в БД
    ↓
8. Вернуть ответ фронтенду
```

#### 4.2 Код RAG поиска

```python
async def _find_relevant_context(
    self, material_id: UUID, query: str, top_k: int = 5
) -> str:
    # 1. Создать embedding для запроса
    query_embedding = await self.ai_service.create_embedding(query)
    
    # 2. Vector similarity search используя pgvector
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
    
    search_query = text("""
        SELECT chunk_text, chunk_index,
               (embedding <=> :query_embedding) AS distance
        FROM material_embeddings
        WHERE material_id = :material_id
        ORDER BY distance ASC
        LIMIT :top_k
    """)
    
    result = await self.session.execute(
        search_query,
        {"material_id": material_id, "query_embedding": embedding_str, "top_k": top_k}
    )
    
    # 3. Объединить найденные chunks
    context_chunks = [row.chunk_text for row in result.all()]
    return "\n\n".join(context_chunks)
```

**Оператор `<=>`:** Cosine distance из pgvector расширения
- Меньше = более похоже
- ORDER BY distance ASC = самые релевантные первыми

---

### 5. OpenAI Integration

**Файл:** `prod_version/backend/app/infrastructure/ai/openai_service.py`

#### 5.1 System Prompt

```python
"You are an intelligent tutor helping students understand educational materials. "
"Use the provided context to answer questions accurately. "
"If the context doesn't contain relevant information, say so honestly."
```

#### 5.2 Метод chat_with_context

```python
async def chat_with_context(
    self,
    question: str,
    context: str,
    conversation_history: List[Dict[str, str]] = None,
    model: str = "gpt-4o-mini"
) -> str:
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
    ]
    
    # Добавить историю диалога если есть
    if conversation_history:
        messages[1:1] = conversation_history
    
    response = await openai.ChatCompletion.create(
        model=model,
        messages=messages,
        temperature=0.7,
        max_tokens=500
    )
    
    return response.choices[0].message.content
```

---

### 6. Frontend Integration (Production)

**Файл:** `prod_version/Arma AI-Powered EdTech Interface Design/src/hooks/useApi.ts`

#### 6.1 useTutorChat Hook

```typescript
export function useTutorChat(materialId: string | null) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchHistory = async () => {
    const data = await tutorApi.getHistory(materialId);
    setMessages(data.messages);
  };

  const sendMessage = async (message: string, context: 'chat' | 'selection' = 'chat') => {
    const response = await tutorApi.sendMessage(materialId, { message, context });
    await fetchHistory(); // Refresh to get both user + AI messages
    return response;
  };

  return { messages, loading, sending, sendMessage, fetchHistory };
}
```

#### 6.2 API Client

**Файл:** `prod_version/.../src/services/api.ts`

```typescript
export const tutorApi = {
  sendMessage: async (materialId: string, data: SendTutorMessageRequest): Promise<TutorMessage> => {
    const response = await apiClient.post<TutorMessage>(`/materials/${materialId}/tutor`, data);
    return response.data;
  },
  
  getHistory: async (materialId: string): Promise<TutorHistoryResponse> => {
    const response = await apiClient.get<TutorHistoryResponse>(`/materials/${materialId}/tutor/history`);
    return response.data;
  },
  
  clearHistory: async (materialId: string): Promise<void> => {
    await apiClient.delete(`/materials/${materialId}/tutor/history`);
  }
};
```

---

### 7. Схемы (Schemas)

**Файл:** `prod_version/backend/app/schemas/material.py`

```python
class TutorMessageRequest(BaseModel):
    message: str
    context: str = "chat"  # 'chat' or 'selection'

class TutorMessageResponse(BaseModel):
    id: UUID
    material_id: UUID
    role: str
    content: str
    context: str
    created_at: datetime

class TutorChatHistoryResponse(BaseModel):
    messages: List[TutorMessageResponse]
    total: int
```

---

### 8. Ключевые Отличия Production vs Local

| Аспект | Production | Local |
|--------|-----------|-------|
| **Tutor Endpoints** | ✅ В materials.py | ❌ Отсутствуют |
| **TutorService** | ✅ С RAG | ❌ Отсутствует |
| **TutorMessage Model** | ✅ В БД | ❌ Отсутствует |
| **Vector Search** | ✅ pgvector | ✅ Есть embeddings |
| **Frontend Component** | ✅ ChatTab | ✅ ChatTab (адаптирован) |
| **Frontend Hook** | ✅ useTutorChat | ✅ useTutorChat |

---

### 9. Что Нужно Реализовать в Local

#### 9.1 База Данных

**Создать таблицу:**
```sql
CREATE TABLE tutor_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    context VARCHAR(50) DEFAULT 'chat',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tutor_messages_material_created ON tutor_messages(material_id, created_at);
CREATE INDEX ix_tutor_messages_created_at ON tutor_messages(created_at);
```

#### 9.2 Backend Endpoints

**Добавить в `backend/app/api/v1/endpoints/materials.py`:**

```python
@router.post("/{material_id}/tutor", response_model=TutorMessageResponse)
async def send_tutor_message(...)

@router.get("/{material_id}/tutor/history", response_model=TutorChatHistoryResponse)
async def get_tutor_history(...)

@router.delete("/{material_id}/tutor/history", response_model=MessageResponse)
async def clear_tutor_history(...)
```

#### 9.3 TutorService

**Создать `backend/app/domain/services/tutor_service.py`:**
- RAG поиск через vector similarity
- Интеграция с OpenAI
- Сохранение сообщений в БД

#### 9.4 Schemas

**Добавить в `backend/app/schemas/material.py`:**
```python
class TutorMessageRequest(BaseModel): ...
class TutorMessageResponse(BaseModel): ...
class TutorChatHistoryResponse(BaseModel): ...
```

#### 9.5 Model

**Добавить в `backend/app/infrastructure/database/models/material.py`:**
```python
class TutorMessage(Base): ...
```

---

### 10. Варианты Реализации

#### Вариант A: Полноценный RAG (как на проде)

**Плюсы:**
- ✅ Умные ответы на основе контента материалов
- ✅ Контекст из vector embeddings
- ✅ История диалога

**Минусы:**
- ❌ Требует больше кода
- ❌ Нужен pgvector
- ❌ Сложнее тестировать

**Время:** 4-6 часов

---

#### Вариант B: Простой Chat без RAG

**Плюсы:**
- ✅ Быстрее реализовать
- ✅ Проще код
- ✅ Легче тестировать

**Минусы:**
- ❌ AI не знает о контенте материалов
- ❌ Менее полезный для студентов

**Время:** 1-2 часа

---

#### Вариант C: Гибридный (RAG позже)

**Сначала:**
- ✅ Создать таблицу tutor_messages
- ✅ Добавить endpoints (заглушки)
- ✅ Простой OpenAI chat без context

**Потом:**
- ⏳ Добавить vector search
- ⏳ Добавить RAG логику

**Время сейчас:** 2 часа  
**Время потом:** 2-3 часа

---

### 11. Рекомендация

**Начать с Варианта C (Гибридный):**

1. **Создать таблицу** `tutor_messages` (15 мин)
2. **Добавить schemas** (15 мин)
3. **Добавить endpoints** в materials.py (30 мин)
4. **Простой OpenAI chat** без RAG (30 мин)
5. **Тестирование** (30 мин)

**Итого:** ~2 часа для рабочей версии

**Потом добавить RAG:**
- Vector search (1 час)
- TutorService (1-2 часа)
- Тестирование RAG (1 час)

**Итого:** +3-4 часа для полноценного AI tutor

---

*Анализ завершен: 2026-03-06*  
*Автор: AI Assistant*
