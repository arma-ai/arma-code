# 🚀 Запуск адаптивной системы обучения

## Быстрый старт

### 1. Применить миграции БД

```bash
cd backend

# Применить все миграции
alembic upgrade head

# Проверить что таблицы созданы
psql -U eduplatform -d eduplatform_dev -c "\dt"
# Должны быть таблицы: user_profiles, learning_paths
```

### 2. Запустить backend

```bash
cd backend
source venv/bin/activate  # или venv\Scripts\activate на Windows
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Запустить frontend

```bash
cd "Arma AI-Powered EdTech Interface Design"
npm run dev
```

---

## 🧪 Тестирование системы

### Шаг 1: Регистрация нового пользователя

1. Открой http://localhost:3000/register
2. Введи данные (email, password, имя)
3. Нажми "Зарегистрироваться"

### Шаг 2: Заполнение анкеты

После регистрации автоматически откроется анкета:

1. **Выберите тип**:
   - 🎓 Школьник → укажи класс (1-11) и возраст
   - 🏛️ Студент → укажи курс, факультет и возраст
   - 💼 Взрослый → укажи профессию, цель обучения и возраст

2. Нажми "Продолжить"

### Шаг 3: Загрузка материала

1. Перейди в Dashboard
2. Создай новый проект или выбери существующий
3. Нажми "+ Add Material"
4. Загрузи PDF файл

### Шаг 4: Прохождение обучения

#### Этап 1: Summary (Конспект)
- Открой вкладку **Summary**
- Прочитай сгенерированный конспект
- Нажми кнопку **"Я прочитал"** ✅
- Статус изменится на "Прочитано"

#### Этап 2: Flashcards (Карточки)
- После завершения Summary, вкладка **Flashcards** разблокируется
- Если Summary не прочитан — будет замок 🔒
- Изучи карточки (переворачивай, отмечай "Know It" / "Still Learning")
- После прохождения всех карточек:
  - Если ≥80% известно → открывается Quiz ✅
  - Если <80% → карточки остаются доступными для повторения

#### Этап 3: Quiz (Тест)
- После успешного прохождения Flashcards, вкладка **Quiz** разблокируется
- Если Flashcards не пройдены — будет замок 🔒
- Пройди тест
- Результаты:
  - **≥70%** → материал освоен! 🎉
  - **<70%** → открываются remedial материалы (презентация/подкаст) для повторения

---

## 📊 API Endpoints для тестирования

### Получить профиль пользователя

```bash
curl http://localhost:8000/api/v1/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Получить learning path для материала

```bash
curl http://localhost:8000/api/v1/materials/MATERIAL_ID/learning-path \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Завершить этап Summary

```bash
curl -X POST http://localhost:8000/api/v1/materials/MATERIAL_ID/learning-path/stage/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage": "summary"}'
```

### Обновить прогресс flashcards

```bash
curl -X POST http://localhost:8000/api/v1/materials/MATERIAL_ID/learning-path/flashcards-progress \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "known_count": 12,
    "learning_count": 3,
    "total_count": 15
  }'
```

### Обновить прогресс quiz

```bash
curl -X POST http://localhost:8000/api/v1/materials/MATERIAL_ID/learning-path/quiz-progress \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 80.0,
    "total_questions": 10,
    "correct_answers": 8
  }'
```

---

## 🎨 Визуализация системы

```
┌─────────────────────────────────────────────────────────┐
│  ProjectDetailView                                      │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Learning Roadmap                                 │ │
│  │  ○ Summary      ✓ Completed                       │ │
│  │  ○ Flashcards   ⚡ In Progress (12/15)            │ │
│  │  ○ Quiz         🔒 Locked                         │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [Tabs: Summary | Flashcards | Quiz | Chat]            │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Flashcards Tab (разблокирован)                   │ │
│  │  [Card 1] [Card 2] ... [Card 15]                  │ │
│  │  [Still Learning] [Know It]                       │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Quiz Tab (заблокирован)                          │ │
│  │  🔒 Пройдите карточки, чтобы открыть тест         │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Отладка

### Проверка состояния БД

```bash
psql -U eduplatform -d eduplatform_dev

-- Проверить профиль пользователя
SELECT * FROM user_profiles LIMIT 5;

-- Проверить learning paths
SELECT * FROM learning_paths LIMIT 10;

-- Проверить статус этапов
SELECT 
    lp.material_id,
    lp.summary_stage,
    lp.flashcards_stage,
    lp.quiz_stage,
    lp.is_completed
FROM learning_paths lp;
```

### Логи backend

```bash
# В terminal где запущен uvicorn
# Ищи сообщения о вызовах API:
INFO:     POST /api/v1/profile
INFO:     GET /api/v1/materials/xxx/learning-path
INFO:     POST /api/v1/materials/xxx/learning-path/stage/complete
```

### Логи frontend

Открой DevTools → Console:
```javascript
// Проверить состояние learning path
console.log(learningPath);

// Проверить вызовы API
// (добавь console.log в handleStageComplete, handleFlashcardsProgress, handleQuizComplete)
```

---

## ⚠️ Возможные проблемы

### 1. Ошибка "relation user_profiles does not exist"

**Решение:**
```bash
cd backend
alembic upgrade head
```

### 2. LearningPath не загружается

**Проверь:**
- Backend запущен и доступен
- Token действителен
- Material ID существует

**Debug:**
```bash
curl http://localhost:8000/api/v1/materials/YOUR_MATERIAL_ID/learning-path \
  -H "Authorization: Bearer YOUR_TOKEN" -v
```

### 3. StageGate не разблокируется

**Проверь в БД:**
```bash
psql -U eduplatform -d eduplatform_dev \
  -c "SELECT summary_stage, flashcards_stage, quiz_stage FROM learning_paths WHERE material_id='YOUR_MATERIAL_ID';"
```

---

## 📚 Документация

- `ADAPTIVE_LEARNING_SYSTEM.md` — полное описание системы
- `backend/app/domain/services/learning_path_service.py` — логика разблокировки
- `src/components/shared/LearningRoadmap.tsx` — визуализация
- `src/components/shared/StageGate.tsx` — блокировка контента

---

**Дата обновления:** 2026-03-25  
**Статус:** ✅ Готово к тестированию
