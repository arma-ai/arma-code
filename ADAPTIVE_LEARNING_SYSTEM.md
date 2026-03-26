# Адаптивная система обучения (Adaptive Learning System)

## 📋 Обзор

Реализована система **поэтапного обучения с прогрессивной разблокировкой** контента на основе профиля ученика.

---

## 🎯 Ключевые возможности

### 1. Анкета пользователя (Student Profile)
При регистрации пользователь указывает:
- **Тип обучения**: школьник / студент / взрослый
- **Возраст**
- **Для школьников**: класс (1-11)
- **Для студентов**: курс + факультет
- **Для взрослых**: профессия + цель обучения

**Зачем:** Эта информация используется для адаптации сложности генерируемого AI контента (summary, flashcards, quiz).

---

### 2. Дорожная карта обучения (Learning Path)
Для каждого материала создаётся индивидуальный план:

```
┌─────────────────────────────────────────────────────────┐
│  Material: "Python Basics"                              │
│                                                         │
│  ○ Этап 1: Summary (Конспект)                          │
│    Статус: ✓ Completed                                 │
│                                                         │
│  ○ Этап 2: Flashcards (Карточки)                       │
│    Статус: ⚡ In Progress                               │
│    Прогресс: 12/15 карточек известно                   │
│                                                         │
│  ○ Этап 3: Quiz (Тест)                                 │
│    Статус: 🔒 Locked (требуется 80% карточек)          │
│                                                         │
│  ○ Этап 4: Remedial (если тест < 70%)                  │
│    - Презентация                                       │
│    - Подкаст                                           │
└─────────────────────────────────────────────────────────┘
```

---

### 3. Поэтапная разблокировка

| Этап | Условие разблокировки | Действие при завершении |
|------|----------------------|------------------------|
| **Summary** | Доступен сразу | Открывает Flashcards |
| **Flashcards** | Summary = completed | Открывает Quiz если ≥80% карточек известно |
| **Quiz** | Flashcards ≥ 80% | При ≥70%: материал завершён<br>При <70%: открывает Remedial |
| **Remedial** | Quiz < 70% | Повторная попытка Quiz |

---

## 🗂️ Структура файлов

### Backend

```
backend/
├── app/
│   ├── infrastructure/database/models/
│   │   └── user_profile.py          # UserProfile, LearningPath модели
│   ├── schemas/
│   │   └── user_profile.py          # Pydantic схемы
│   ├── domain/services/
│   │   ├── user_profile_service.py  # Логика профиля
│   │   └── learning_path_service.py # Логика разблокировки
│   └── api/v1/endpoints/
│       └── user_profile.py          # API endpoints
├── alembic/versions/
│   └── 20260325_add_user_profile_learning_path.py  # Миграция БД
```

### Frontend

```
src/
├── components/shared/
│   ├── StudentProfileForm.tsx       # Анкета при регистрации
│   ├── LearningRoadmap.tsx          # Визуализация этапов
│   └── StageGate.tsx                # Блокировка контента
├── pages/
│   └── RegisterPage.tsx             # Обновлён с 2 шагами
├── services/
│   └── api.ts                       # userProfileApi методы
└── types/
    └── api.ts                       # TypeScript типы
```

---

## 🔌 API Endpoints

### User Profile

```http
GET /api/v1/profile
→ UserProfileWithLearningPaths

POST /api/v1/profile
→ UserProfile (создание анкеты)

PUT /api/v1/profile
→ UserProfile (обновление)
```

### Learning Path

```http
GET /api/v1/materials/{id}/learning-path
→ LearningPath

POST /api/v1/materials/{id}/learning-path/stage/complete
→ { message: "..." }
Тело: { "stage": "summary" }

POST /api/v1/materials/{id}/learning-path/flashcards-progress
→ LearningPath (обновлённый)
Тело: { "known_count": 12, "learning_count": 3, "total_count": 15 }

POST /api/v1/materials/{id}/learning-path/quiz-progress
→ LearningPath (обновлённый)
Тело: { "score": 80.0, "total_questions": 10, "correct_answers": 8 }
```

---

## 🎨 Использование компонентов

### LearningRoadmap в ProjectDetailView

```tsx
import { LearningRoadmap } from '../components/shared/LearningRoadmap';
import { userProfileApi } from '../services/api';

// В компоненте ProjectDetailView
const [learningPath, setLearningPath] = useState<LearningPath | null>(null);

useEffect(() => {
  userProfileApi.getLearningPath(materialId).then(setLearningPath);
}, [materialId]);

// Рендер
{learningPath && (
  <LearningRoadmap
    learningPath={learningPath}
    onStageClick={(stage) => {
      if (stage === 'summary') setActiveTab('summary');
      if (stage === 'flashcards') setActiveTab('flashcards');
      if (stage === 'quiz') setActiveTab('quiz');
    }}
  />
)}
```

### StageGate для блокировки контента

```tsx
import { StageGate, useStageAccess } from '../components/shared/StageGate';

// В QuizTab
<StageGate
  stageStatus={learningPath?.quiz_stage || 'locked'}
  lockedMessage="Пройдите тест после изучения карточек"
>
  <QuizContent questions={questions} />
</StageGate>
```

---

## 🔄 Поток пользователя

```
1. Регистрация
   ↓
2. Анкета (StudentProfileForm)
   ↓
3. Dashboard → Выбор проекта
   ↓
4. Загрузка материалов
   ↓
5. Обработка AI → Генерация Summary/Flashcards/Quiz
   ↓
6. Learning Path создаётся автоматически
   ↓
7. Пользователь проходит этапы:
   - Читает Summary → завершает этап
   - Изучает Flashcards → прогресс сохраняется
   - Проходит Quiz → результат определяет следующий шаг
   ↓
8. Если Quiz < 70%:
   - Открываются Remedial (презентация/подкаст)
   - Повторная попытка Quiz
```

---

## 📊 Модели данных

### UserProfile
```python
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
```

### LearningPath
```python
id: UUID
user_profile_id: UUID
material_id: UUID
current_stage: str

summary_stage: LOCKED | AVAILABLE | IN_PROGRESS | COMPLETED
flashcards_stage: LOCKED | AVAILABLE | IN_PROGRESS | COMPLETED
quiz_stage: LOCKED | AVAILABLE | IN_PROGRESS | COMPLETED

quiz_attempts_count: int
best_quiz_score: float 0-100
last_quiz_score: float 0-100

remedial_presentation_unlocked: bool
remedial_podcast_unlocked: bool

is_completed: bool
```

---

## 🚀 Следующие шаги

### 1. Интеграция с AI генерацией
Модифицировать `OpenAIService` для учёта профиля:

```python
# В generate_summary, generate_flashcards, generate_quiz
def _get_user_context(self, profile: UserProfile) -> str:
    if profile.user_type == UserType.SCHOOL:
        return f"адаптировано для {profile.school_grade} класса"
    elif profile.user_type == UserType.UNIVERSITY:
        return f"для студентов {profile.university_course} курса {profile.university_faculty}"
    else:
        return f"для взрослых изучающих {profile.profession or 'тематику'}"
```

### 2. Интеграция в ProjectDetailView
- Добавить LearningRoadmap в header материала
- Блокировать вкладки Flashcards/Quiz через StageGate
- Сохранять прогресс при завершении этапов

### 3. Миграция данных
Запустить миграцию:
```bash
cd backend
alembic upgrade head
```

---

## 🧪 Тестирование

### 1. Создать профиль
```bash
curl -X POST http://localhost:8000/api/v1/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_type": "school",
    "age": 16,
    "school_grade": 10,
    "preferred_language": "ru",
    "difficulty_preference": "medium"
  }'
```

### 2. Получить Learning Path
```bash
curl http://localhost:8000/api/v1/materials/MATERIAL_ID/learning-path \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Завершить этап Summary
```bash
curl -X POST http://localhost:8000/api/v1/materials/MATERIAL_ID/learning-path/stage/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage": "summary"}'
```

---

**Дата создания:** 2026-03-25  
**Статус:** ✅ Реализовано (требуется интеграция)
