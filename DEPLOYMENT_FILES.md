# Production Deployment Files - Структура

Этот документ описывает все файлы, созданные для production развертывания.

## 📂 Структура файлов

```
/opt/eduplatform/
├── PRODUCTION_DEPLOYMENT.md          # Полная инструкция по развертыванию
├── PRODUCTION_QUICK_START.md         # Краткая инструкция (10 минут)
│
├── docker-compose.prod.yml           # Production Docker Compose (СОЗДАТЬ ВРУЧНУЮ)
├── docker-compose.monitoring.yml     # Мониторинг (Grafana, Prometheus и т.д.)
│
├── Makefile.prod                     # Упрощенное управление через make
│
├── scripts/
│   ├── deploy.sh                     # Bash скрипт для развертывания
│   └── eduplatform.service           # Systemd service файл
│
├── docker/
│   └── postgres/
│       └── init/
│           └── 01-init.sql           # Инициализация PostgreSQL
│
├── monitoring/
│   └── prometheus/
│       └── prometheus.yml            # Конфигурация Prometheus
│
├── nginx/
│   ├── nginx.conf                    # Основной конфиг Nginx (СОЗДАТЬ ВРУЧНУЮ)
│   ├── conf.d/
│   │   └── eduplatform.conf          # Конфиг для приложения (СОЗДАТЬ ВРУЧНУЮ)
│   └── ssl/
│       ├── fullchain.pem             # SSL сертификат (получить через certbot)
│       └── privkey.pem               # SSL ключ (получить через certbot)
│
├── logs/                             # Логи приложения
│   ├── backend/
│   ├── frontend/
│   ├── celery/
│   ├── celery-beat/
│   └── nginx/
│
└── backups/                          # Бэкапы
    ├── postgres/
    └── redis/
```

---

## 📋 Созданные файлы

### 1. **PRODUCTION_DEPLOYMENT.md**
**Полная инструкция по развертыванию** - 400+ строк

Включает:
- Требования к серверу
- Пошаговая установка
- Настройка переменных окружения
- Docker Compose конфигурация
- Nginx конфигурация
- SSL сертификаты (Let's Encrypt)
- Backup и восстановление
- Мониторинг и логи
- Troubleshooting
- Обновление приложения

**Использование**: Главный документ для первичного развертывания

---

### 2. **PRODUCTION_QUICK_START.md**
**Краткая инструкция** - быстрый старт за 10 минут

Включает:
- Минимальные шаги для запуска
- Команды copy-paste
- Проверка работоспособности
- Частые проблемы

**Использование**: Для быстрого развертывания, если знаете что делаете

---

### 3. **docker-compose.prod.yml**
**Production Docker Compose файл**

Содержит:
- PostgreSQL (с pgvector)
- Redis
- Backend (FastAPI + Gunicorn/Uvicorn)
- Celery Worker
- Celery Beat (периодические задачи)
- Frontend (Next.js)
- Flower (мониторинг Celery)
- Nginx (reverse proxy)

**Использование**:
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

### 4. **docker-compose.monitoring.yml**
**Инструменты мониторинга**

Содержит:
- Portainer (Docker UI)
- pgAdmin (PostgreSQL UI)
- Redis Commander (Redis UI)
- Prometheus (метрики)
- Grafana (визуализация)
- Loki + Promtail (логи)
- Node Exporter (метрики сервера)
- cAdvisor (метрики контейнеров)

**Использование**:
```bash
docker compose -f docker-compose.monitoring.yml up -d
# или
make -f Makefile.prod monitoring-start
```

---

### 5. **Makefile.prod**
**Упрощенное управление приложением**

Команды:
- `make -f Makefile.prod start` - Запустить
- `make -f Makefile.prod stop` - Остановить
- `make -f Makefile.prod restart` - Перезапустить
- `make -f Makefile.prod status` - Статус
- `make -f Makefile.prod logs` - Логи
- `make -f Makefile.prod backup` - Бэкап
- `make -f Makefile.prod update` - Обновить
- `make -f Makefile.prod ssl-generate` - SSL сертификаты
- `make -f Makefile.prod monitoring-start` - Запустить мониторинг

**Использование**:
```bash
make -f Makefile.prod help  # Показать все команды
```

---

### 6. **scripts/deploy.sh**
**Bash скрипт для развертывания**

Функции:
- Полная установка (`./deploy.sh install`)
- Запуск/остановка (`./deploy.sh start/stop`)
- Бэкап/восстановление (`./deploy.sh backup/restore`)
- Обновление (`./deploy.sh update`)
- Логи (`./deploy.sh logs`)
- Статус (`./deploy.sh status`)
- Очистка (`./deploy.sh cleanup`)

**Использование**:
```bash
chmod +x scripts/deploy.sh
sudo ./scripts/deploy.sh install
sudo ./scripts/deploy.sh start
```

---

### 7. **scripts/eduplatform.service**
**Systemd service файл**

Автоматический запуск при старте сервера

**Установка**:
```bash
sudo cp scripts/eduplatform.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable eduplatform.service
sudo systemctl start eduplatform
```

**Использование**:
```bash
sudo systemctl status eduplatform
sudo systemctl restart eduplatform
```

---

### 8. **docker/postgres/init/01-init.sql**
**Инициализация PostgreSQL**

Автоматически:
- Включает расширения (uuid-ossp, pgcrypto, vector)
- Устанавливает timezone UTC
- Настраивает права доступа

Запускается автоматически при первом создании контейнера PostgreSQL

---

### 9. **monitoring/prometheus/prometheus.yml**
**Конфигурация Prometheus**

Собирает метрики с:
- Самого Prometheus
- Node Exporter (сервер)
- cAdvisor (контейнеры)
- Backend API
- PostgreSQL (опционально)
- Redis (опционально)

---

## 🚀 Варианты запуска

### Вариант 1: Через Makefile (рекомендуется)

```bash
# Полная установка
make -f Makefile.prod full-install

# Настройте .env файлы
nano backend/.env
nano .env.local
nano .env

# Получите SSL
make -f Makefile.prod ssl-generate

# Запустите
make -f Makefile.prod start
```

### Вариант 2: Через deploy.sh скрипт

```bash
# Полная установка
sudo ./scripts/deploy.sh install

# Настройте .env файлы
nano backend/.env
nano .env.local

# Запустите
sudo ./scripts/deploy.sh start
```

### Вариант 3: Через Docker Compose напрямую

```bash
# Настройте .env файлы
nano backend/.env
nano .env.local

# Создайте директории
mkdir -p logs/{backend,frontend,celery,nginx} backups/{postgres,redis}

# Запустите
docker compose -f docker-compose.prod.yml up -d

# Миграции
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### Вариант 4: Через systemd (после установки service)

```bash
# Установите systemd service
make -f Makefile.prod systemd-install

# Запустите
sudo systemctl start eduplatform

# Автозапуск при старте сервера
sudo systemctl enable eduplatform
```

---

## 📊 Мониторинг

После запуска доступны:

### Основное приложение:
- Frontend: `https://yourdomain.com`
- Backend API: `https://api.yourdomain.com`
- API Docs: `https://api.yourdomain.com/docs`
- Flower (Celery): `https://flower.yourdomain.com`

### Инструменты мониторинга (если запущены):
- Portainer: `http://server-ip:9000`
- Grafana: `http://server-ip:3001`
- Prometheus: `http://server-ip:9090`
- pgAdmin: `http://server-ip:5050`
- Redis Commander: `http://server-ip:8081`

---

## 🔐 Безопасность

### Обязательно измените:
1. ✅ Все пароли в `.env` файлах
2. ✅ `SECRET_KEY` и `JWT_SECRET_KEY` в `backend/.env`
3. ✅ `POSTGRES_PASSWORD` в `.env`
4. ✅ `OPENAI_API_KEY` на ваш ключ
5. ✅ Supabase credentials
6. ✅ Flower credentials (FLOWER_USER/FLOWER_PASSWORD)

### Генерация безопасных ключей:
```bash
openssl rand -hex 32  # Для SECRET_KEY
openssl rand -hex 32  # Для JWT_SECRET_KEY
openssl rand -hex 16  # Для паролей
```

---

## 📦 Бэкапы

### Автоматические бэкапы:

```bash
# Настроить автобэкапы (cron)
make -f Makefile.prod backup-auto-setup

# Или вручную
crontab -e
# Добавить:
0 2 * * * cd /opt/eduplatform && make -f Makefile.prod backup >> logs/backup.log 2>&1
```

### Ручной бэкап:

```bash
# Через Makefile
make -f Makefile.prod backup

# Через скрипт
sudo ./scripts/deploy.sh backup

# Напрямую
docker exec eduplatform-postgres pg_dump -U eduplatform eduplatform_prod | gzip > backup.sql.gz
```

### Восстановление:

```bash
# Через Makefile
make -f Makefile.prod restore DATE=20231201_120000

# Через скрипт
sudo ./scripts/deploy.sh restore 20231201_120000
```

---

## 🔄 Обновление

### С автобэкапом:

```bash
# Через Makefile (рекомендуется - автоматически создаст бэкап)
make -f Makefile.prod update

# Через скрипт
sudo ./scripts/deploy.sh update
```

### Без бэкапа (на свой риск):

```bash
cd /opt/eduplatform
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🐛 Troubleshooting

### Проверка статуса:
```bash
make -f Makefile.prod status
# или
sudo ./scripts/deploy.sh status
# или
docker compose -f docker-compose.prod.yml ps
```

### Просмотр логов:
```bash
make -f Makefile.prod logs
make -f Makefile.prod logs-backend
make -f Makefile.prod logs-celery
```

### Health check:
```bash
curl https://api.yourdomain.com/health
curl http://localhost:8000/health
```

---

## 📚 Дополнительные ресурсы

- [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) - Полная инструкция
- [PRODUCTION_QUICK_START.md](./PRODUCTION_QUICK_START.md) - Быстрый старт
- [BACKEND_COMPLETE_GUIDE.md](./BACKEND_COMPLETE_GUIDE.md) - Backend документация
- [DOCKER_SETUP.md](./DOCKER_SETUP.md) - Docker настройка

---

## ✅ Чек-лист

### Перед запуском:
- [ ] Docker и Docker Compose установлены
- [ ] Все `.env` файлы настроены
- [ ] SSL сертификаты получены
- [ ] Nginx конфиги созданы
- [ ] DNS записи настроены
- [ ] Файрвол настроен (UFW)
- [ ] Директории созданы

### После запуска:
- [ ] Все контейнеры в статусе "healthy"
- [ ] Backend API отвечает
- [ ] Frontend открывается
- [ ] SSL работает (зеленый замок)
- [ ] Celery задачи выполняются
- [ ] Автобэкапы настроены
- [ ] Логи ротируются

---

**Готово!** Используйте эти файлы для развертывания EduPlatform на production сервере.
