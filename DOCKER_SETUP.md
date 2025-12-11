# 🐳 Docker Setup - Production-Ready Configuration

## 🎯 Что Включено

Полностью настроенная инфраструктура как у senior разработчиков:

### Сервисы:
- ✅ **PostgreSQL 15** с pgvector extension (автоматически)
- ✅ **Redis 7** с persistence (AOF)
- ✅ **pgAdmin 4** - UI для управления PostgreSQL
- ✅ **Redis Commander** - UI для управления Redis

### Возможности:
- ✅ Health checks для всех сервисов
- ✅ Persistent volumes (данные сохраняются)
- ✅ Auto-restart контейнеров
- ✅ Network isolation
- ✅ Оптимизированные настройки памяти
- ✅ Makefile с 30+ командами
- ✅ Backup/Restore для БД
- ✅ Development profiles

---

## 🚀 Быстрый Старт

### 1. Установить Docker

**macOS:**
```bash
brew install --cask docker
# Открой Docker Desktop
```

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER
# Перелогинься
```

**Windows:**
Скачай [Docker Desktop](https://www.docker.com/products/docker-desktop)

### 2. Первоначальная настройка

```bash
# Скопировать .env файл
make setup

# Или вручную:
cp .env.docker .env
```

### 3. Запустить всё

```bash
make up
```

**Готово!** 🎉

---

## 📖 Основные Команды

### Управление сервисами:

```bash
make up          # Запустить всё
make down        # Остановить всё
make restart     # Перезапустить
make status      # Статус сервисов
make logs        # Все логи
make health      # Проверить здоровье
```

### Development:

```bash
make dev         # Запустить Backend + Frontend + DB
make dev-stop    # Остановить dev окружение
make tools       # Запустить pgAdmin + Redis Commander
```

### База данных:

```bash
make db-connect       # Подключиться к PostgreSQL
make db-migrate       # Применить миграции
make db-backup        # Создать backup
make db-reset         # Пересоздать БД (ОСТОРОЖНО!)
```

### Redis:

```bash
make redis-cli        # Redis CLI
make redis-flush      # Очистить Redis (ОСТОРОЖНО!)
```

### Полезное:

```bash
make help            # Список всех команд
make info            # Информация о проекте
make clean           # Удалить volumes
```

---

## 🔧 Доступные Порты

После `make up`:

| Сервис | URL | Описание |
|--------|-----|----------|
| PostgreSQL | `localhost:5433` | База данных |
| Redis | `localhost:6379` | Cache & Queue |
| Backend API | `http://localhost:8000` | FastAPI (запускай отдельно) |
| Swagger Docs | `http://localhost:8000/docs` | API документация |
| Frontend | `http://localhost:3000` | Next.js (запускай отдельно) |

После `make tools`:

| Сервис | URL | Логин |
|--------|-----|-------|
| pgAdmin | `http://localhost:5050` | admin@eduplatform.local / admin |
| Redis Commander | `http://localhost:8081` | - |

---

## 📊 Архитектура

```
┌─────────────────────────────────────┐
│         Docker Network              │
│         (eduplatform)               │
│                                     │
│  ┌──────────┐    ┌──────────┐     │
│  │PostgreSQL│    │  Redis   │     │
│  │  +pgvector│    │  +AOF    │     │
│  │  :5432   │    │  :6379   │     │
│  └────┬─────┘    └────┬─────┘     │
│       │               │            │
│  ┌────┴─────┐    ┌────┴─────┐     │
│  │ pgAdmin  │    │  Redis   │     │
│  │  :5050   │    │Commander │     │
│  └──────────┘    │  :8081   │     │
│                  └──────────┘     │
└─────────────────────────────────────┘
         ▲
         │
    ┌────┴────┐
    │ Backend │  FastAPI :8000
    │ Frontend│  Next.js :3000
    └─────────┘  (Host machine)
```

---

## 💾 Volumes (Persistent Data)

Все данные сохраняются в Docker volumes:

```bash
# Посмотреть volumes
docker volume ls | grep eduplatform

# Результат:
# eduplatform_postgres_data    - Данные PostgreSQL
# eduplatform_redis_data       - Данные Redis (AOF)
# eduplatform_pgadmin_data     - Настройки pgAdmin
```

**Важно**: Данные НЕ удаляются при `make down`. Только при `make clean`.

---

## 🔐 Безопасность

### Development (.env):
```env
POSTGRES_PASSWORD=dev123        # Простой пароль для разработки
PGADMIN_PASSWORD=admin          # Простой пароль
```

### Production:
```env
POSTGRES_PASSWORD=strong_random_password_here
PGADMIN_PASSWORD=another_strong_password
```

**Важно**: `.env` добавлен в `.gitignore` - не коммить пароли!

---

## 🛠 Настройка pgAdmin

После `make tools`:

1. Открой http://localhost:5050
2. Логин: `admin@eduplatform.local` / `admin`
3. **Add New Server**:
   - Name: `EduPlatform Dev`
   - Host: `postgres` (имя контейнера в Docker network)
   - Port: `5432` (внутренний порт)
   - Username: `eduplatform`
   - Password: `dev123`

---

## 🔄 Работа с Миграциями

### Применить миграции:

```bash
make db-migrate
```

### Создать новую миграцию:

```bash
# Внеси изменения в модели SQLAlchemy
# Затем:
make db-migrate-create msg="add user avatar column"
```

### Откатить миграцию:

```bash
cd backend
alembic downgrade -1
```

---

## 💾 Backup и Restore

### Создать backup:

```bash
make db-backup
# Создаст: backups/backup_20250130_143022.sql
```

### Восстановить backup:

```bash
make db-restore file=backups/backup_20250130_143022.sql
```

### Автоматический backup (cron):

```bash
# Добавь в crontab:
0 2 * * * cd /path/to/project && make db-backup
```

---

## 🧪 Тестирование

### Проверить что всё работает:

```bash
# 1. Запустить сервисы
make up

# 2. Проверить health
make health

# Ожидаемый вывод:
# ✓ PostgreSQL работает
# ✓ Redis работает
```

### Подключиться к PostgreSQL:

```bash
make db-connect

# В psql:
\dt              # Список таблиц
\l               # Список баз данных
\dx              # Список extensions (должен быть vector)
SELECT version();
```

### Проверить Redis:

```bash
make redis-cli

# В redis-cli:
PING             # Ответ: PONG
INFO             # Информация о Redis
KEYS *           # Все ключи
```

---

## 🐛 Troubleshooting

### Порт уже занят

**Ошибка**: `Bind for 0.0.0.0:5433 failed: port is already allocated`

**Решение**: Измени порт в `.env`:
```env
POSTGRES_PORT=5434  # Вместо 5433
```

### Контейнер не стартует

```bash
# Логи конкретного сервиса
make logs-postgres
make logs-redis

# Пересоздать контейнеры
make down
make up
```

### Данные потерялись

**Причина**: Использовал `make clean` или `docker-compose down -v`

**Решение**: Восстанови из backup:
```bash
make db-restore file=backups/latest_backup.sql
```

### pgvector не установлен

```bash
# Проверь extension
make db-connect
\dx

# Если нет, установи вручную:
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 📈 Production Deployment

Для production используй отдельный `docker-compose.prod.yml`:

```yaml
version: '3.8'
services:
  postgres:
    # ... те же настройки
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # Из secrets
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

И запускай:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🎓 Best Practices

### ✅ DO:
- Используй `make up` вместо `docker-compose up`
- Делай backup перед миграциями: `make db-backup`
- Проверяй health после изменений: `make health`
- Храни .env в .gitignore
- Используй volumes для persistent data

### ❌ DON'T:
- `docker-compose down -v` (удалит данные!)
- Коммить .env файлы
- Забывать про backup
- Использовать слабые пароли в production

---

## 🎉 Готово!

Теперь у тебя production-ready Docker setup с:

✅ **Один команда для запуска**: `make up`
✅ **Автоматический pgvector**: Установлен при старте
✅ **Persistent data**: Данные сохраняются
✅ **GUI инструменты**: pgAdmin + Redis Commander
✅ **Backup/Restore**: Встроенные команды
✅ **Health checks**: Автоматическая проверка
✅ **30+ команд**: Makefile для всего

**Используй `make help` для списка всех команд!** 🚀
