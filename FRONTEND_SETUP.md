# 🎨 Frontend Setup Guide - Next.js + Python Backend

## ✅ Что реализовано

### 1. API Client для Python Backend
- **Базовый HTTP client** (`lib/api/client.ts`)
  - Автоматическое добавление JWT токена
  - Обработка ошибок
  - localStorage для токенов

### 2. TypeScript типы (100% соответствие Python Pydantic schemas)
- `lib/api/types.ts` - все типы для API responses
- Синхронизированы с Python backend

### 3. API Functions по категориям:
- **Auth**: `lib/api/auth.ts` - register, login, getCurrentUser
- **Materials**: `lib/api/materials.ts` - CRUD, uploadPDF, process, regenerate (summary/notes/flashcards/quiz)
- **Quiz**: `lib/api/quiz.ts` - работа с вопросами
- **Quiz Attempts**: `lib/api/quiz.ts` - scoring system
- **Flashcards**: `lib/api/flashcards.ts` - CRUD для карточек
- **Tutor Chat**: `lib/api/tutor.ts` - RAG-based AI chat с материалом

### 4. Обновленные компоненты:
- ✅ **InteractiveQuiz** - работает с API вместо Server Actions
- ✅ **QuizStatistics** - новый компонент для статистики
- Удалены зависимости от Next.js Server Actions

---

## 📂 Структура созданных файлов

```
/lib/api/
├── client.ts              # Базовый API client с JWT
├── types.ts               # TypeScript типы (соответствуют Pydantic)
├── auth.ts                # Auth endpoints
├── materials.ts           # Materials endpoints
├── quiz.ts                # Quiz endpoints + Quiz Attempts
├── flashcards.ts          # Flashcards endpoints
└── index.ts               # Экспорт всего

/app/dashboard/materials/[id]/
├── InteractiveQuiz.tsx    # ✅ ОБНОВЛЕН - работает с API
└── QuizStatistics.tsx     # ✅ НОВЫЙ - отображение статистики

/.env.local                # ✅ ОБНОВЛЕН - добавлен NEXT_PUBLIC_API_URL
```

---

## 🚀 Шаги для запуска

### 1. Установка зависимостей

```bash
npm install
# Все зависимости уже в package.json, ничего дополнительного не нужно
```

### 2. Настройка .env.local

Файл уже обновлен, но проверь:

```env
# Python Backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# OpenAI (используется только на backend, можно удалить с frontend)
OPENAI_API_KEY=sk-proj-...
```

### 3. Убедись что Python backend запущен

```bash
# В отдельном терминале
cd backend
uvicorn app.main:app --reload --port 8000
```

API должно быть доступно на `http://localhost:8000`
Swagger docs: `http://localhost:8000/docs`

### 4. Запуск Next.js frontend

```bash
npm run dev
```

Frontend будет на `http://localhost:3000`

---

## 📝 Использование API в компонентах

### Пример: Quiz с сохранением результатов

```typescript
'use client';

import { quizApi, quizAttemptsApi } from '@/lib/api';
import type { QuizQuestion } from '@/lib/api/types';

export default function MyQuiz({ materialId }: { materialId: string }) {
  // 1. Загрузить вопросы
  const loadQuestions = async () => {
    const data = await quizApi.getQuestions(materialId);
    console.log(data.questions); // QuizQuestion[]
  };

  // 2. Отправить попытку и получить результат
  const submitQuiz = async (answers: { question_id: string; selected_option: 'a' | 'b' | 'c' | 'd' }[]) => {
    const result = await quizApi.submitAttempt({ answers });
    console.log(result.score_percentage); // Процент правильных

    // 3. Сохранить в БД
    await quizAttemptsApi.saveAttempt({
      material_id: materialId,
      score: result.correct_answers,
      total_questions: result.total_questions,
      percentage: result.score_percentage,
      answers: result.results.map(r => ({
        question_id: r.question_id,
        selected: r.selected_option,
        correct: r.is_correct,
        correct_option: r.correct_option,
      })),
    });
  };

  // 4. Получить статистику
  const loadStats = async () => {
    const stats = await quizAttemptsApi.getStatistics(materialId);
    console.log(stats.best_percentage); // Лучший результат
    console.log(stats.average_percentage); // Средний
  };

  return <div>...</div>;
}
```

### Пример: Аутентификация

```typescript
'use client';

import { authApi, authStorage } from '@/lib/api';

export default function LoginForm() {
  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      // Токен автоматически сохраняется в localStorage
      console.log('Logged in!', response.access_token);

      // Получить текущего пользователя
      const user = await authApi.getCurrentUser();
      console.log(user.email);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = () => {
    authApi.logout(); // Удаляет токен
  };

  return <div>...</div>;
}
```

### Пример: Работа с материалами

```typescript
'use client';

import { materialsApi } from '@/lib/api';

export default function Materials() {
  // Получить все материалы
  const loadMaterials = async () => {
    const materials = await materialsApi.getAll();
    console.log(materials);
  };

  // Загрузить PDF файл
  const uploadPDF = async (file: File) => {
    const material = await materialsApi.uploadPDF('My Document', file);
    console.log('Uploaded:', material.id);

    // Запустить обработку
    await materialsApi.process(material.id);
  };

  // Создать YouTube материал
  const createYouTubeMaterial = async () => {
    const material = await materialsApi.create({
      title: 'YouTube Lecture',
      type: 'youtube',
      source: 'https://youtube.com/watch?v=...',
    });
    await materialsApi.process(material.id);
  };

  // Получить один материал с деталями
  const loadMaterial = async (id: string) => {
    const material = await materialsApi.getById(id);
    console.log(material.full_text); // Полный текст
    console.log(material.summary); // Резюме
    console.log(material.notes); // Конспекты
  };

  // Регенерировать summary
  const regenerateSummary = async (id: string) => {
    await materialsApi.regenerateSummary(id);
    console.log('Summary regenerated!');
  };

  return <div>...</div>;
}
```

### Пример: AI Tutor Chat

```typescript
'use client';

import { useState } from 'react';
import { tutorApi } from '@/lib/api';
import type { TutorMessage } from '@/lib/api/types';

export default function TutorChat({ materialId }: { materialId: string }) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState('');

  // Загрузить историю чата
  const loadHistory = async () => {
    const data = await tutorApi.getHistory(materialId);
    setMessages(data.messages);
  };

  // Отправить сообщение
  const sendMessage = async () => {
    if (!input.trim()) return;

    // Отправить сообщение тьютору
    const response = await tutorApi.sendMessage(materialId, {
      message: input,
      context: 'chat', // или 'selection' для вопросов по выделенному тексту
    });

    // Обновить UI
    await loadHistory();
    setInput('');
  };

  return (
    <div>
      {/* История сообщений */}
      {messages.map((msg) => (
        <div key={msg.id} className={msg.role === 'user' ? 'user-msg' : 'ai-msg'}>
          {msg.content}
        </div>
      ))}

      {/* Ввод */}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

---

## 🔄 Миграция с Server Actions на API

### Было (Server Actions):

```typescript
import { submitQuizAttempt } from '@/app/actions/submitQuizAttempt';

await submitQuizAttempt({ materialId, score, ... });
```

### Стало (API Client):

```typescript
import { quizAttemptsApi } from '@/lib/api';

await quizAttemptsApi.saveAttempt({ material_id, score, ... });
```

**Все Server Actions удалены** - больше не нужны!

---

## 🆕 Новые компоненты

### QuizStatistics

Добавь в страницу материала:

```typescript
import QuizStatistics from './QuizStatistics';

export default function MaterialPage({ params }: { params: { id: string } }) {
  return (
    <div>
      {/* Существующий контент */}

      {/* Новая статистика */}
      <QuizStatistics materialId={params.id} />
    </div>
  );
}
```

Компонент автоматически:
- Загружает статистику при монтировании
- Обновляется при завершении quiz (событие `quiz-completed`)
- Показывает: total attempts, best score, average, last attempt, history

---

## 🔧 Настройка CORS на Backend

Backend уже настроен на CORS для `http://localhost:3000`

Если фронтенд на другом порту, обнови в `backend/.env`:

```env
BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:3001"]
```

---

## 📊 API Endpoints Reference

### Auth
```
POST   /api/v1/auth/register          # Регистрация
POST   /api/v1/auth/login             # Логин
GET    /api/v1/auth/me                # Текущий пользователь
```

### Materials
```
GET    /api/v1/materials                            # Список материалов
POST   /api/v1/materials                            # Создать материал (с file upload для PDF)
GET    /api/v1/materials/{id}                       # Один материал
PUT    /api/v1/materials/{id}                       # Обновить материал
DELETE /api/v1/materials/{id}                       # Удалить материал
POST   /api/v1/materials/{id}/process               # Запустить обработку
POST   /api/v1/materials/{id}/regenerate/summary    # Регенерировать summary
POST   /api/v1/materials/{id}/regenerate/notes      # Регенерировать notes
POST   /api/v1/materials/{id}/regenerate/flashcards # Регенерировать flashcards
POST   /api/v1/materials/{id}/regenerate/quiz       # Регенерировать quiz
POST   /api/v1/materials/{id}/tutor                 # Отправить сообщение AI тьютору
GET    /api/v1/materials/{id}/tutor/history         # История чата с тьютором
```

### Quiz
```
GET    /api/v1/materials/{id}/quiz    # Вопросы материала
POST   /api/v1/quiz                   # Создать вопрос
POST   /api/v1/quiz/check             # Проверить ответ
POST   /api/v1/quiz/attempt           # Полная попытка
DELETE /api/v1/quiz/{id}              # Удалить вопрос
```

### Quiz Attempts (NEW!)
```
POST   /api/v1/quiz/attempts/save                 # Сохранить попытку
GET    /api/v1/materials/{id}/quiz/attempts       # История попыток
GET    /api/v1/materials/{id}/quiz/statistics     # Статистика
DELETE /api/v1/quiz/attempts/{id}                 # Удалить попытку
```

### Flashcards
```
GET    /api/v1/materials/{id}/flashcards   # Карточки материала
POST   /api/v1/flashcards                  # Создать карточку
GET    /api/v1/flashcards/{id}             # Одна карточка
PUT    /api/v1/flashcards/{id}             # Обновить карточку
DELETE /api/v1/flashcards/{id}             # Удалить карточку
```

---

## 🐛 Troubleshooting

### 1. CORS ошибки

```
Access to fetch at 'http://localhost:8000/api/v1/...' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

**Решение**: Проверь `backend/.env`:
```env
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

### 2. 401 Unauthorized

```
Error: Unauthorized
```

**Решение**: Нет токена или токен истек
```typescript
// Проверь токен
import { authStorage } from '@/lib/api';
console.log(authStorage.getToken());

// Перелогинься
await authApi.login({ email, password });
```

### 3. TypeScript ошибки

```
Property 'correct_option' does not exist on type 'QuizQuestion'
```

**Решение**: QuizQuestion не содержит `correct_option` (security!)
- Используй `QuizQuestionWithAnswer` для ответов с правильными вариантами
- Или передавай `correctAnswers` как отдельный prop

### 4. API не отвечает

```
Failed to fetch
```

**Решение**:
```bash
# Проверь что backend запущен
curl http://localhost:8000/docs

# Проверь .env.local
cat .env.local | grep API_URL
```

---

## ✅ Чек-лист перед деплоем

- [ ] Backend запущен и доступен
- [ ] CORS настроен для production URL
- [ ] `.env.local` содержит правильный `NEXT_PUBLIC_API_URL`
- [ ] Все API calls используют `lib/api/*` вместо Server Actions
- [ ] JWT токены сохраняются в localStorage (или httpOnly cookies для production)
- [ ] Error handling добавлен во все API calls
- [ ] Loading states добавлены в компоненты

---

## 🎉 Готово!

Frontend полностью интегрирован с Python backend через API client!

**Что дальше:**
1. Запусти backend: `cd backend && uvicorn app.main:app --reload`
2. Запусти frontend: `npm run dev`
3. Открой `http://localhost:3000`
4. Проверь Quiz Scoring System в действии!

**Важно**: Все данные теперь хранятся в PostgreSQL через Python API, а не в Supabase! 🚀
