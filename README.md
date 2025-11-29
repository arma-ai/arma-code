# EduPlatform

Next.js проект с TypeScript, Tailwind CSS и Supabase.

## Настройка

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка Supabase и OpenAI

1. Создайте проект на [Supabase](https://supabase.com)
2. Получите API ключ на [OpenAI](https://platform.openai.com/api-keys)
3. Скопируйте `.env.local.example` в `.env.local`
4. Заполните переменные окружения:
   - `NEXT_PUBLIC_SUPABASE_URL` - URL вашего проекта Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon key из настроек проекта
   - `OPENAI_API_KEY` - API ключ OpenAI

### 3. Настройка базы данных

Выполните SQL из файла `supabase-setup.sql` в SQL Editor Supabase. Это создаст:
- Таблицу `profiles` для профилей пользователей
- Таблицу `materials` для загруженных PDF материалов
- Таблицы `material_summaries`, `material_notes`, `flashcards` для AI обработки
- Таблицу `quizzes` для тестовых вопросов
- Таблицы `material_embeddings` и `tutor_messages` для RAG чата
- Расширение `pgvector` для работы с embeddings
- Все необходимые RLS политики и функции

**Важно**: Убедитесь, что расширение `pgvector` установлено в вашем Supabase проекте.

### 4. Настройка Google OAuth

1. В Supabase Dashboard перейдите в Authentication > Providers
2. Включите Google provider
3. Добавьте Client ID и Client Secret из Google Cloud Console
4. В Authorized redirect URLs добавьте: `https://your-project-ref.supabase.co/auth/v1/callback`

### 5. Настройка Storage для PDF материалов

**Важно**: Перед загрузкой PDF файлов нужно настроить Storage bucket.

См. подробные инструкции в файле `storage-setup.md` или выполните:

1. В Supabase Dashboard перейдите в **Storage**
2. Создайте bucket с именем `materials` (не публичный)
3. Настройте политики доступа (см. `storage-setup.md`)

### 6. Запуск проекта

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## Структура проекта

- `/app` - App Router страницы
- `/app/actions` - Server Actions для работы с данными
- `/lib` - Утилиты и клиенты Supabase
- `/middleware.ts` - Middleware для защиты маршрутов

## Маршруты

- `/` - Главная страница (редирект на /login или /dashboard)
- `/login` - Страница входа с Google OAuth
- `/dashboard` - Защищённая страница Dashboard со списком материалов
- `/dashboard/upload` - Страница загрузки PDF материалов
- `/dashboard/materials/[id]` - Страница просмотра конкретного материала

## Функциональность

### Авторизация
- Google OAuth вход
- Автоматическое создание профиля при первом входе
- Middleware защита маршрутов

### Управление материалами
- Загрузка PDF файлов в Supabase Storage
- Просмотр списка своих материалов
- Детальная информация о каждом материале
- Пользователи видят только свои материалы (RLS)

### AI Обработка материалов
- Автоматическая обработка PDF с помощью OpenAI
- Извлечение текста из PDF
- Генерация summary (gpt-4o-mini)
- Генерация study notes (gpt-4o-mini)
- Генерация flashcards (gpt-4o)
- Все данные сохраняются в базе данных

### Quiz система
- Генерация тестовых вопросов на основе study notes
- Минимум 10 вопросов с 4 вариантами ответа
- Использование gpt-4o для генерации вопросов
- Отображение правильных ответов
- Пользователи видят только свои quizzes (RLS)

### AI Tutor Chat (RAG)
- Чат с AI-тьютором на основе RAG (Retrieval-Augmented Generation)
- Автоматическое создание embeddings для каждого чанка материала (text-embedding-3-large)
- Поиск релевантных чанков через cosine similarity
- Ответы строго на основе материала
- Если информации нет - ассистент сообщает "в документе нет ответа"
- История сообщений сохраняется в базе данных
- Использование gpt-4o для генерации ответов

