# 🔍 Диагностика Проблемы "BUILDING RICH VIEW..."

## Проблема
На странице материала показывается "BUILDING RICH VIEW... 15%" и функционал не работает.

## Причины и Решения

### 1. **Материал Еще Обрабатывается**

**Проверка:**
```bash
# Откройте Swagger UI
open http://localhost:8000/docs

# Или через curl (замените {material_id} на ID вашего материала):
curl http://localhost:8000/api/v1/materials/{material_id} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Что смотреть:**
- `processing_status`: должен быть `"completed"`
- `processing_progress`: должен быть `100`

**Если статус "processing" или "queued":**
1. Проверьте Celery логи:
```bash
docker compose logs -f celery-worker
```

2. Подождите завершения обработки (1-5 минут для обычного документа)

3. Обновите страницу в браузере (F5)

---

### 2. **Нет Данных Summary/Notes/Flashcards/Quiz**

**Проверка через Swagger UI:**

1. Откройте http://localhost:8000/docs
2. Нажмите "Authorize" → введите токен
3. Проверьте endpoints:
   - `GET /api/v1/materials/{id}` - должно быть `summary` и `notes`
   - `GET /api/v1/flashcards/materials/{id}` - должны быть flashcards
   - `GET /api/v1/quiz/materials/{id}/quiz` - должны быть вопросы

**Если данных нет - запустите регенерацию:**

```bash
# Получите токен (из localStorage в браузере или через login)
TOKEN="your_token_here"
MATERIAL_ID="your_material_id"

# Regenerate summary
curl -X POST http://localhost:8000/api/v1/materials/${MATERIAL_ID}/regenerate/summary \
  -H "Authorization: Bearer ${TOKEN}"

# Regenerate notes
curl -X POST http://localhost:8000/api/v1/materials/${MATERIAL_ID}/regenerate/notes \
  -H "Authorization: Bearer ${TOKEN}"

# Regenerate flashcards
curl -X POST http://localhost:8000/api/v1/materials/${MATERIAL_ID}/regenerate/flashcards \
  -H "Authorization: Bearer ${TOKEN}"

# Regenerate quiz
curl -X POST http://localhost:8000/api/v1/materials/${MATERIAL_ID}/regenerate/quiz \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### 3. **Frontend Не Подключен к Backend**

**Проверка `.env.local`:**

```bash
cat .env.local | grep NEXT_PUBLIC_API_URL
```

**Должно быть:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Если неправильно:**
1. Отредактируйте `.env.local`
2. Перезапустите frontend:
```bash
# Ctrl+C для остановки
npm run dev
```

---

### 4. **Ошибка Авторизации**

**Проблема:** Токен истек или неверный

**Решение:**
1. Откройте браузер (F12 → Console)
2. Проверьте ошибки (401 Unauthorized)
3. Перелогиньтесь:
   - Выйдите из аккаунта
   - Войдите снова
   - Обновите страницу

---

### 5. **Celery Worker Не Работает**

**Проверка:**
```bash
docker compose ps celery-worker
```

**Должен быть статус "Up"**

**Если "Exited" или нет:**
```bash
# Перезапустить
docker compose restart celery-worker

# Проверить логи
docker compose logs celery-worker | tail -50
```

---

## 🚀 Быстрое Решение (All-in-One)

```bash
# 1. Проверить все сервисы
docker compose ps
docker compose logs celery-worker | tail -20

# 2. Перезапустить Celery
docker compose restart celery-worker

# 3. Проверить backend
curl http://localhost:8000/health

# 4. Проверить frontend
curl -I http://localhost:3000

# 5. Открыть Swagger и проверить данные
open http://localhost:8000/docs
```

---

## 📝 Как Получить Токен Авторизации

### Вариант 1: Из Браузера (Рекомендуется)

1. Откройте приложение http://localhost:3000
2. Нажмите F12 → Console
3. Введите:
```javascript
localStorage.getItem('access_token')
```
4. Скопируйте токен

### Вариант 2: Через API

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "your_password"
  }'

# Ответ:
{
  "access_token": "eyJhbGciOiJI...",
  "token_type": "bearer"
}
```

---

## ✅ Checklist

После каждого шага проверяйте:

- [ ] Backend работает: http://localhost:8000/health
- [ ] Celery worker запущен: `docker compose ps celery-worker`
- [ ] Frontend работает: http://localhost:3000
- [ ] Материал обработан: `processing_status = "completed"`
- [ ] Есть summary: проверить в Swagger `/api/v1/materials/{id}`
- [ ] Есть flashcards: проверить `/api/v1/flashcards/materials/{id}`
- [ ] Есть quiz: проверить `/api/v1/quiz/materials/{id}/quiz`
- [ ] AI Chat работает: отправить тестовое сообщение

---

## 🆘 Если Ничего Не Помогло

### Полная перезагрузка:

```bash
# 1. Остановить все
docker compose down
pkill -f "uvicorn"
pkill -f "next dev"

# 2. Очистить кеш (опционально)
docker compose down -v  # ВНИМАНИЕ: удалит данные БД!

# 3. Запустить заново
docker compose up -d
cd backend && source venv/bin/activate && uvicorn app.main:app --reload &
npm run dev
```

### Проверка логов:

```bash
# Backend logs
tail -f backend/logs/app.log  # если есть

# Celery logs
docker compose logs -f celery-worker

# Frontend logs
# В терминале где запущен npm run dev
```

---

## 📞 Нужна Помощь?

Соберите информацию:

```bash
# 1. Статус сервисов
docker compose ps > status.txt

# 2. Логи Celery
docker compose logs celery-worker > celery.log

# 3. Backend health
curl http://localhost:8000/health > health.txt

# 4. Material info (замените ID и TOKEN)
curl http://localhost:8000/api/v1/materials/{ID} \
  -H "Authorization: Bearer {TOKEN}" > material.json
```

---

**Главное:** Все компоненты уже работают! Просто нужно убедиться, что:
1. ✅ Материал полностью обработан
2. ✅ Есть токен авторизации
3. ✅ Frontend подключен к правильному API URL
