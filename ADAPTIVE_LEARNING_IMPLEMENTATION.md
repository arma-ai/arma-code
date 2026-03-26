# 📚 Адаптивная система обучения (Adaptive Learning System)

**Дата реализации:** 2026-03-25  
**Статус:** ✅ Реализовано и интегрировано

---

## 🎯 Обзор системы

Реализована **система поэтапного обучения с прогрессивной разблокировкой** контента на основе профиля ученика.

### Ключевая идея
Пользователь проходит обучение поэтапно, где каждый следующий этап открывается только после успешного завершения предыдущего. Это обеспечивает:
- Постепенное погружение в материал
- Закрепление знаний перед переходом к следующему этапу
- Адаптацию под уровень ученика (школьник/студент/взрослый)

---

## 🏗️ Архитектура системы

```
┌─────────────────────────────────────────────────────────┐
│  1. РЕГИСТРАЦИЯ + АНКЕТА                                │
│  ┌──────────────────────────────────────────────┐       │
│  │ • Тип: школьник / студент / взрослый         │       │
│  │ • Возраст                                    │       │
│  │ • Класс (1-11) / Курс + Факультет            │       │
│  │ • Профессия + Цель обучения                  │       │
│  └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  2. ЗАГРУЗКА МАТЕРИАЛОВ                                 │
│  • PDF, YouTube, статьи                                 │
│  • AI генерирует: Summary, Flashcards, Quiz             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  3. LEARNING PATH (дорожная карта)                      │
│  ┌──────────────────────────────────────────────┐       │
│  │  ○ Summary       → прочитал → ✓              │       │
│  │  ○ Flashcards    → 80%+ → ✓                  │       │
│  │  ○ Quiz          → 70%+ → ✓                  │       │
│  │  ○ Remedial      (если quiz < 70%)           │       │
│  └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Изменения в коде

### Backend (Python/FastAPI)

#### 1. Новые модели данных

**Файл:** `backend/app/infrastructure/database/models/user_profile.py`

```python
class UserProfile(Base):
    """Анкета пользователя для адаптивного обучения."""
    id: UUID
    user_id: UUID
    user_type: SCHOOL | UNIVERSITY | ADULT
    age: int (optional)
    school_grade: int 1-11 (optional)
    university_course: int 1-6 (optional)
    university_faculty: str (optional)
    profession: str (optional)
    learning_goal: str (optional)
    preferred_language: str
    difficulty_preference: easy | medium | hard

class LearningPath(Base):
    """Дорожная карта обучения для материала."""
    id: UUID
    user_profile_id: UUID
    material_id: UUID
    current_stage: str
    
    summary_stage: LOCKED | AVAILABLE | IN_PROGRESS | COMPLETED
    flashcards_stage: LOCKED | AVAILABLE | IN_PROGRESS | COMPLETED
    quiz_stage: LOCKED | AVAILABLE | IN_PROGRESS | COMPLETED
    
    quiz_attempts_count: int
    best_quiz_score: float 0-100
    
    remedial_presentation_unlocked: bool
    remedial_podcast_unlocked: bool
    
    is_completed: bool
```

#### 2. Pydantic схемы

**Файл:** `backend/app/schemas/user_profile.py`

- `UserProfileCreate` — создание анкеты
- `UserProfileUpdate` — обновление анкеты
- `UserProfileResponse` — ответ профиля
- `LearningPathResponse` — статус обучения
- `StageCompleteRequest` — завершение этапа
- `FlashcardsProgressRequest` — прогресс карточек
- `QuizProgressRequest` — результат теста

#### 3. Сервисы бизнес-логики

**Файл:** `backend/app/domain/services/user_profile_service.py`

```python
class UserProfileService:
    - get_by_user_id()
    - create()
    - update()
    - get_or_create()
    - get_difficulty_multiplier()  # Для адаптации AI контента
    - get_target_audience_description()  # Для AI промптов
```

**Файл:** `backend/app/domain/services/learning_path_service.py`

```python
class LearningPathService:
    - get_by_material()
    - get_or_create()
    - complete_summary()  # Открывает flashcards
    - complete_flashcards()  # Открывает quiz если ≥80%
    - record_quiz_attempt()  # При ≥70% → завершено
    - retry_quiz_after_remedial()
```

#### 4. API Endpoints

**Файл:** `backend/app/api/v1/endpoints/user_profile.py`

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/v1/profile` | Получить профиль + learning paths |
| POST | `/api/v1/profile` | Создать анкету (после регистрации) |
| PUT | `/api/v1/profile` | Обновить анкету |
| GET | `/api/v1/materials/{id}/learning-path` | Получить дорожную карту |
| POST | `/api/v1/materials/{id}/learning-path/stage/complete` | Завершить этап |
| POST | `/api/v1/materials/{id}/learning-path/flashcards-progress` | Прогресс карточек |
| POST | `/api/v1/materials/{id}/learning-path/quiz-progress` | Результат теста |

#### 5. Миграция БД

**Файл:** `backend/alembic/versions/20260325_add_user_profile_learning_path.py`

Создаёт таблицы:
- `user_profiles` — анкеты пользователей
- `learning_paths` — дорожные карты обучения

---

### Frontend (React/TypeScript)

#### 1. Новые типы TypeScript

**Файл:** `src/types/api.ts`

```typescript
type UserType = 'school' | 'university' | 'adult'
type LearningStage = 'locked' | 'available' | 'in_progress' | 'completed'

interface UserProfile { ... }
interface LearningPath { ... }
interface CreateUserProfileRequest { ... }
interface FlashcardsProgressRequest { ... }
interface QuizProgressRequest { ... }
```

#### 2. API клиент

**Файл:** `src/services/api.ts`

```typescript
export const userProfileApi = {
  get: () => GET /profile
  create: (data) => POST /profile
  update: (data) => PUT /profile
  getLearningPath: (materialId) => GET /materials/{id}/learning-path
  completeStage: (materialId, stage) => POST .../stage/complete
  updateFlashcardsProgress: (materialId, progress) => POST .../flashcards-progress
  updateQuizProgress: (materialId, progress) => POST .../quiz-progress
}
```

#### 3. Компоненты

**Файл:** `src/components/shared/StudentProfileForm.tsx`

Анкета из 2 шагов:
1. Регистрация (email, password, имя)
2. Профиль (тип, возраст, класс/курс/факультет)

**Файл:** `src/components/shared/LearningRoadmap.tsx`

Визуализация дорожной карты:
- 3 этапа: Summary → Flashcards → Quiz
- Индикаторы статуса (locked, in_progress, completed)
- Клик по этапу → переход к соответствующей вкладке

**Файл:** `src/components/shared/StageGate.tsx`

Блокировка контента:
- Показывает размытый контент + замок
- Сообщение с условием разблокировки

#### 4. Обновлённые компоненты

**Файл:** `src/pages/RegisterPage.tsx`

```typescript
// 2-шаговая регистрация
const [step, setStep] = useState<'register' | 'profile'>('register')

// Шаг 1: Регистрация
await register({ email, password, full_name })
setStep('profile')

// Шаг 2: Анкета
await userProfileApi.create(profileData)
navigate('/dashboard')
```

**Файл:** `src/pages/ProjectDetailView.tsx`

Добавлено:
- `learningPath` state + загрузка при монтировании
- `handleStageComplete()` — завершение этапа
- `handleFlashcardsProgress()` — прогресс карточек
- `handleQuizComplete()` — результат теста

Интеграция:
- **Summary Tab:** LearningRoadmap + кнопка "Я прочитал"
- **Flashcards Tab:** StageGate (блокировка если summary не прочитан)
- **Quiz Tab:** StageGate (блокировка если flashcards не пройдены)

**Файл:** `src/components/dashboard/tabs/FlashcardsTab.tsx`

```typescript
interface FlashcardsTabProps {
  onFinishReview?: (knownCount: number, totalCount: number) => void
}

// При завершении обзора
useEffect(() => {
  onFinishReview?.(knownCards.length, flashcards.length)
}, [knownCards.length, flashcards.length])
```

**Файл:** `src/components/dashboard/tabs/QuizTab.tsx`

```typescript
interface QuizTabProps {
  onQuizComplete?: (score: number, total: number, correct: number) => void
}

// При показе результатов
useEffect(() => {
  onQuizComplete?.(percentage, questions.length, score)
}, [percentage, questions.length, score])
```

---

## 🔄 Поток пользователя

### 1. Регистрация и анкета

```
1. Пользователь вводит email, password, имя
   ↓
2. Создаётся User в БД
   ↓
3. Открывается анкета (StudentProfileForm)
   ↓
4. Пользователь выбирает тип и заполняет поля
   ↓
5. Создаётся UserProfile в БД
   ↓
6. Редирект в Dashboard
```

### 2. Загрузка материала

```
1. Пользователь загружает PDF/YouTube
   ↓
2. AI генерирует Summary, Flashcards, Quiz
   ↓
3. Автоматически создаётся LearningPath:
   - summary_stage = AVAILABLE
   - flashcards_stage = LOCKED
   - quiz_stage = LOCKED
```

### 3. Прохождение обучения

```
┌─────────────────────────────────────────────────────────┐
│ ЭТАП 1: SUMMARY                                         │
│                                                         │
│ 1. Пользователь открывает вкладку Summary              │
│ 2. Видит LearningRoadmap сверху                         │
│ 3. Читает сгенерированный конспект                      │
│ 4. Нажимает кнопку "Я прочитал"                         │
│ 5. Вызывается handleStageComplete('summary')            │
│ 6. learningPath.summary_stage = COMPLETED               │
│ 7. flashcards_stage = AVAILABLE ✅                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ ЭТАП 2: FLASHCARDS                                      │
│                                                         │
│ 1. StageGate проверяет flashcards_stage                 │
│ 2. Если LOCKED → показывает замок                       │
│ 3. Если AVAILABLE → открывает доступ                    │
│ 4. Пользователь изучает карточки                        │
│ 5. Отмечает "Know It" / "Still Learning"                │
│ 6. При завершении:                                      │
│    onFinishReview(knownCount, totalCount)               │
│ 7. Если knownCount/totalCount ≥ 80%:                    │
│    → quiz_stage = AVAILABLE ✅                          │
│ 8. Если < 80%:                                          │
│    → flashcards остаются доступными для повторения      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ ЭТАП 3: QUIZ                                            │
│                                                         │
│ 1. StageGate проверяет quiz_stage                       │
│ 2. Если LOCKED → показывает замок                       │
│ 3. Если AVAILABLE → открывает доступ                    │
│ 4. Пользователь проходит тест                           │
│ 5. При показе результатов:                              │
│    onQuizComplete(score, total, correct)                │
│ 6. Если score ≥ 70%:                                    │
│    → quiz_stage = COMPLETED                             │
│    → is_completed = TRUE ✅                             │
│ 7. Если score < 70%:                                    │
│    → remedial_presentation_unlocked = TRUE              │
│    → remedial_podcast_unlocked = TRUE                   │
│    → Повторная попытка после remedial                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Визуализация UI

### Learning Roadmap (вкладка Summary)

```
┌─────────────────────────────────────────────────────────┐
│  Ваш план обучения                                      │
│  Пройдите все этапы для закрепления материала           │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📖  Конспект              ✓ Готово             │   │
│  │      Изучите основные понятия                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🧠  Карточки              ⚡ В процессе         │   │
│  │      Запомните ключевые термины                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🔒  Тест                  Заблокирован         │   │
│  │      Проверьте свои знания                      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### StageGate (заблокированная вкладка)

```
┌─────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────┐ │
│  │  ╔═══════════════════════════════════════════╗   │ │
│  │  ║  [🔒]                                     ║   │ │
│  │  ║  Прочитайте конспект, чтобы открыть       ║   │ │
│  │  ║  карточки                                 ║   │ │
│  │  ╚═══════════════════════════════════════════╝   │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Условия разблокировки

| Этап | Условие разблокировки | Условие завершения |
|------|----------------------|-------------------|
| **Summary** | Доступен сразу | Нажата кнопка "Я прочитал" |
| **Flashcards** | Summary = COMPLETED | ≥80% карточек известно |
| **Quiz** | Flashcards ≥ 80% | Score ≥ 70% |
| **Remedial** | Quiz < 70% | Пройдено → повторный Quiz |

---

## 🧪 Тестирование

### 1. Проверка миграции БД

```bash
cd backend
alembic upgrade head

# Проверить таблицы
psql -U eduplatform -d eduplatform_dev -c "\dt"
# Должны быть: user_profiles, learning_paths
```

### 2. Тест API

```bash
# Получить профиль
curl http://localhost:8000/api/v1/profile \
  -H "Authorization: Bearer TOKEN"

# Создать профиль
curl -X POST http://localhost:8000/api/v1/profile \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_type": "school",
    "age": 16,
    "school_grade": 10,
    "preferred_language": "ru",
    "difficulty_preference": "medium"
  }'

# Получить learning path
curl http://localhost:8000/api/v1/materials/MATERIAL_ID/learning-path \
  -H "Authorization: Bearer TOKEN"

# Завершить этап
curl -X POST http://localhost:8000/api/v1/materials/MATERIAL_ID/learning-path/stage/complete \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage": "summary"}'
```

### 3. Проверка в браузере

1. http://localhost:3000/register
2. Зарегистрироваться → заполнить анкету
3. Загрузить PDF материал
4. Открыть Summary → нажать "Я прочитал"
5. Открыть Flashcards → пройти карточки
6. Открыть Quiz → пройти тест

---

## 🔧 Конфигурация и пороги

### Пороги разблокировки

В `LearningPathService`:

```python
# Flashcards → Quiz
if mastery_percentage >= learning_path.quiz_available_after_flashcards_score:  # 80%
    learning_path.quiz_stage = LearningStage.AVAILABLE

# Quiz completion
if progress.score >= 70.0:  # 70%
    learning_path.quiz_stage = LearningStage.COMPLETED
    learning_path.is_completed = True
```

### Адаптация сложности

В `UserProfileService`:

```python
def get_difficulty_multiplier(self, profile: UserProfile) -> float:
    # Возраст
    if profile.age < 14: return 0.6  # Упрощённый контент
    if profile.age < 16: return 0.8
    if profile.age < 18: return 0.9
    
    # Класс
    if profile.school_grade <= 7: return 0.6
    if profile.school_grade <= 9: return 0.75
    
    # Предпочтение сложности
    preference_multipliers = {
        "easy": 0.7,
        "medium": 1.0,
        "hard": 1.2,
    }
```

---

## 📝 Следующие улучшения

### 1. AI адаптация по профилю

Модифицировать `OpenAIService` для учёта профиля:

```python
# В generate_summary, generate_flashcards, generate_quiz
def _get_user_context(self, profile: UserProfile) -> str:
    if profile.user_type == UserType.SCHOOL:
        return f"адаптировано для {profile.school_grade} класса"
    elif profile.user_type == UserType.UNIVERSITY:
        return f"для студентов {profile.university_course} курса"
    else:
        return f"для взрослых изучающих {profile.profession or 'тематику'}"
```

### 2. Геймификация

- XP очки за завершение этапов
- Достижения (серии правильных ответов)
- Leaderboard среди студентов

### 3. Аналитика

- Время на каждом этапе
- Количество попыток Quiz
- Прогресс по материалам

---

## 📚 Файловая структура

```
backend/
├── app/
│   ├── infrastructure/database/models/
│   │   └── user_profile.py          # ✅ NEW
│   ├── schemas/
│   │   └── user_profile.py          # ✅ NEW
│   ├── domain/services/
│   │   ├── user_profile_service.py  # ✅ NEW
│   │   └── learning_path_service.py # ✅ NEW
│   ├── api/v1/endpoints/
│   │   └── user_profile.py          # ✅ NEW
│   └── api/v1/
│       └── router.py                # ✏️ UPDATED
│
├── alembic/versions/
│   └── 20260325_add_user_profile_learning_path.py  # ✅ NEW
│
Arma AI-Powered EdTech Interface Design/
├── src/
│   ├── types/
│   │   └── api.ts                   # ✏️ UPDATED
│   ├── services/
│   │   └── api.ts                   # ✏️ UPDATED
│   ├── components/shared/
│   │   ├── StudentProfileForm.tsx   # ✅ NEW
│   │   ├── LearningRoadmap.tsx      # ✅ NEW
│   │   └── StageGate.tsx            # ✅ NEW
│   ├── pages/
│   │   └── RegisterPage.tsx         # ✏️ UPDATED
│   └── components/dashboard/
│       ├── tabs/FlashcardsTab.tsx   # ✏️ UPDATED
│       ├── tabs/QuizTab.tsx         # ✏️ UPDATED
│       └── ProjectDetailView.tsx    # ✏️ UPDATED
```

---

## 🎯 Итог

Реализована **полноценная система адаптивного обучения** с:

✅ Анкетирование при регистрации  
✅ Поэтапная разблокировка контента  
✅ Learning Path для каждого материала  
✅ Прогресс и статистика  
✅ Remedial контент при провале  
✅ Визуализация roadmap  
✅ StageGate для блокировки  

**Система готова к использованию!** 🚀
