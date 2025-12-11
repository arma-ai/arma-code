# 🔐 Миграция Авторизации: Supabase → Python FastAPI

## 📋 Текущая Ситуация

**Проблема**: Сейчас у вас **ДВЕ системы авторизации** которые не работают вместе:

1. ❌ **Старая (Supabase Auth)** - используется в `app/login/page.tsx`
   - OAuth через Google
   - Magic Links
   - Email confirmation

2. ✅ **Новая (Python FastAPI + JWT)** - создана, но не подключена
   - Backend готов: `/api/v1/auth/register`, `/api/v1/auth/login`
   - Frontend API готов: `lib/api/auth.ts`
   - Страница логина НЕ обновлена

## 🎯 Решение

Нужно **заменить старую страницу логина** на новую, которая использует Python backend.

---

## 🚀 Шаги Миграции

### Вариант 1: Быстрый (Заменить файл)

```bash
# 1. Создать бэкап старого файла
mv app/login/page.tsx app/login/page_old_supabase.tsx

# 2. Переименовать новый файл
mv app/login/page_new.tsx app/login/page.tsx

# 3. Перезапустить dev server
npm run dev
```

### Вариант 2: Ручной (Скопировать код)

Открой `app/login/page_new.tsx` и скопируй весь код в `app/login/page.tsx`.

---

## ✅ Что Работает в Новой Авторизации

### Backend (Python FastAPI)
- ✅ JWT Authentication
- ✅ Password hashing (bcrypt)
- ✅ User registration
- ✅ User login
- ✅ Protected endpoints
- ✅ Token validation

### Frontend
- ✅ Login form
- ✅ Registration form
- ✅ Auto-login after registration
- ✅ Token storage (localStorage)
- ✅ Auto-redirect if already logged in
- ✅ Error handling
- ✅ Loading states

---

## ❌ Что НЕ Работает (Пока)

Эти фичи были в Supabase, но не реализованы в Python backend:

- ❌ OAuth (Google Sign In)
- ❌ Magic Links (email-only login)
- ❌ Password Reset
- ❌ Email Confirmation

**Решение**: Можно добавить позже если нужно. Сейчас базовая авторизация работает.

---

## 🔧 Настройка Backend для Авторизации

### 1. Убедись что PostgreSQL запущен

```bash
# Проверь подключение
psql -h localhost -p 5433 -U eduplatform -d eduplatform_dev

# Если нет, запусти Docker
docker run -d --name postgres -p 5433:5432 \
  -e POSTGRES_USER=eduplatform \
  -e POSTGRES_PASSWORD=dev123 \
  -e POSTGRES_DB=eduplatform_dev \
  postgres:15-alpine
```

### 2. Примени миграции

```bash
cd backend
alembic upgrade head
```

### 3. Запусти Backend

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

### 4. Проверь Swagger Docs

Открой `http://localhost:8000/docs` и проверь endpoints:
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`
- GET `/api/v1/auth/me`

---

## 🧪 Тестирование

### 1. Регистрация нового пользователя

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "full_name": "Test User"
  }'
```

**Ожидаемый ответ:**
```json
{
  "id": "...",
  "email": "test@example.com",
  "full_name": "Test User",
  "is_active": true,
  "created_at": "2025-..."
}
```

### 2. Логин

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

**Ожидаемый ответ:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 3. Получить текущего пользователя

```bash
# Замени YOUR_TOKEN на token из предыдущего шага
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Тест через Frontend

1. Открой `http://localhost:3000/login`
2. Кликни "Don't have an account? Sign Up"
3. Заполни форму:
   - Full Name: Test User
   - Email: test@example.com
   - Password: test123
4. Кликни "Create Account"
5. Появится alert "Регистрация успешна!"
6. Введи те же данные и кликни "Sign In"
7. Должен редиректнуть на `/dashboard`

---

## 🐛 Troubleshooting

### Ошибка: "Failed to fetch"

**Причина**: Backend не запущен или неверный URL

**Решение**:
```bash
# Проверь что backend работает
curl http://localhost:8000/health

# Проверь .env.local
cat .env.local | grep API_URL
# Должно быть: NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Ошибка: "Email already registered"

**Причина**: Пользователь уже существует в БД

**Решение**:
```sql
-- Удали пользователя из БД
psql -h localhost -p 5433 -U eduplatform -d eduplatform_dev
DELETE FROM users WHERE email = 'test@example.com';
```

### Ошибка: "Unauthorized"

**Причина**: Токен невалидный или истек

**Решение**:
```typescript
// Очисти localStorage в браузере
localStorage.removeItem('access_token');

// Или в DevTools Console:
authStorage.removeToken();
```

### Ошибка: CORS

**Причина**: Backend не настроен на прием запросов от frontend

**Решение**:
```env
# В backend/.env добавь:
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

---

## 📊 Сравнение: Старое vs Новое

| Фича | Supabase Auth | Python FastAPI |
|------|--------------|----------------|
| Email/Password | ✅ | ✅ |
| OAuth (Google) | ✅ | ❌ (можно добавить) |
| Magic Links | ✅ | ❌ |
| Email Confirmation | ✅ | ❌ |
| Password Reset | ✅ | ❌ (можно добавить) |
| JWT Tokens | ✅ | ✅ |
| Row Level Security | ✅ | ✅ (через user_id) |
| Session Management | ✅ | ✅ |
| Полный контроль | ❌ | ✅ |
| Бесплатный tier | ✅ (лимиты) | ✅ (unlimited) |

---

## 🎯 Что Дальше

### Обязательно:
1. ✅ Заменить страницу логина
2. ✅ Протестировать регистрацию + логин
3. ⬜ Обновить middleware для проверки JWT токенов
4. ⬜ Добавить logout функцию

### Опционально:
1. ⬜ Добавить Password Reset
2. ⬜ Добавить Email Confirmation
3. ⬜ Добавить OAuth (Google)
4. ⬜ Добавить Remember Me
5. ⬜ Добавить 2FA

---

## 🎉 После Миграции

После успешной миграции у тебя будет:

✅ **Полностью функциональная авторизация**
- Регистрация новых пользователей
- Вход по email/password
- JWT токены для API запросов
- Защищенные endpoints

✅ **Интеграция Frontend + Backend**
- Все API requests используют JWT
- Автоматическое добавление токенов
- Error handling

✅ **Готовность к масштабированию**
- Можно добавить OAuth
- Можно добавить email confirmations
- Можно добавить любые другие фичи

---

## 📞 Нужна Помощь?

Если что-то не работает:
1. Проверь логи backend: `uvicorn app.main:app --reload --log-level debug`
2. Проверь браузер DevTools Console
3. Проверь Network tab для API requests
4. Проверь что PostgreSQL запущен

**Все должно работать!** 🚀
