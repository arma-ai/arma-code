# Production Quick Start Guide

Краткая инструкция для быстрого развертывания EduPlatform на production сервере.

## 📋 Предварительные требования

- Ubuntu 22.04 LTS сервер (минимум 8GB RAM, 4 CPU cores)
- SSH доступ с правами root
- Доменное имя, настроенное на IP сервера
- OpenAI API ключ
- Supabase проект (для Auth и Storage)

---

## 🚀 Быстрая установка (10 минут)

### 1. Подключитесь к серверу

```bash
ssh root@your-server-ip
```

### 2. Установите Docker и зависимости

```bash
# Обновляем систему
apt update && apt upgrade -y

# Устанавливаем Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Устанавливаем утилиты
apt install -y git nginx certbot python3-certbot-nginx ufw make
```

### 3. Настройте файрвол

```bash
ufw --force enable
ufw allow ssh
ufw allow http
ufw allow https
```

### 4. Клонируйте проект

```bash
# Создаем директорию
mkdir -p /opt/eduplatform
cd /opt/eduplatform

# Клонируем репозиторий (замените на ваш URL)
git clone https://github.com/your-username/eduplatform.git .

# Или загружаем с локальной машины
# rsync -avz --exclude 'node_modules' --exclude 'venv' \
#   /path/to/local/arma/ root@your-server:/opt/eduplatform/
```

### 5. Настройте переменные окружения

```bash
# Backend .env
cat > backend/.env << 'EOF'
APP_NAME=EduPlatform
APP_ENV=production
DEBUG=False
SECRET_KEY=$(openssl rand -hex 32)

DATABASE_URL=postgresql+asyncpg://eduplatform:$(openssl rand -hex 16)@postgres:5432/eduplatform_prod
DATABASE_URL_SYNC=postgresql://eduplatform:$(openssl rand -hex 16)@postgres:5432/eduplatform_prod

REDIS_URL=redis://redis:6379/0
OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE

JWT_SECRET_KEY=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

BACKEND_CORS_ORIGINS=["https://yourdomain.com","https://api.yourdomain.com"]

STORAGE_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
EOF

# Замените YOUR-KEY-HERE, yourdomain.com, и Supabase credentials
nano backend/.env
```

```bash
# Frontend .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE
EOF

# Замените на ваши credentials
nano .env.local
```

```bash
# Docker Compose .env
cat > .env << 'EOF'
POSTGRES_USER=eduplatform
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=eduplatform_prod
POSTGRES_PORT=5432
REDIS_PORT=6379
BACKEND_PORT=8000
FRONTEND_PORT=3000
EOF

# Сгенерируйте пароль
nano .env
```

### 6. Получите SSL сертификаты

```bash
# Остановите nginx если запущен
systemctl stop nginx

# Получите сертификаты (замените на ваши домены)
certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d api.yourdomain.com \
  --email your-email@example.com \
  --agree-tos

# Создайте директорию для сертификатов
mkdir -p nginx/ssl

# Скопируйте сертификаты
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Установите права
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

### 7. Настройте Nginx

Создайте конфигурацию из основного руководства:

```bash
# Создайте директории
mkdir -p nginx/conf.d

# Скопируйте конфиги из PRODUCTION_DEPLOYMENT.md
nano nginx/nginx.conf
nano nginx/conf.d/eduplatform.conf

# НЕ ЗАБУДЬТЕ заменить yourdomain.com на ваш реальный домен!
```

### 8. Создайте необходимые директории

```bash
mkdir -p logs/{backend,frontend,celery,celery-beat,nginx}
mkdir -p backups/{postgres,redis}
mkdir -p backend/storage
chmod -R 777 logs backend/storage backups
```

### 9. Запустите приложение

```bash
# Используя Makefile (рекомендуется)
make -f Makefile.prod start

# Или напрямую через docker compose
docker compose -f docker-compose.prod.yml up -d

# Запустите миграции
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### 10. Проверьте статус

```bash
# Проверьте контейнеры
docker compose -f docker-compose.prod.yml ps

# Проверьте health check
docker inspect --format='{{.State.Health.Status}}' eduplatform-backend
docker inspect --format='{{.State.Health.Status}}' eduplatform-frontend

# Проверьте логи
docker compose -f docker-compose.prod.yml logs -f

# Или через Makefile
make -f Makefile.prod status
make -f Makefile.prod logs
```

### 11. Настройте автобэкапы

```bash
# Настройка через Makefile
make -f Makefile.prod backup-auto-setup
make -f Makefile.prod ssl-auto-renew-setup

# Или вручную через crontab
crontab -e

# Добавьте:
0 2 * * * cd /opt/eduplatform && make -f Makefile.prod backup >> logs/backup.log 2>&1
0 3 * * * cd /opt/eduplatform && make -f Makefile.prod ssl-renew >> logs/ssl.log 2>&1
```

---

## ✅ Проверка работоспособности

После запуска проверьте:

1. **Backend API**: `https://api.yourdomain.com/health`
   - Должен вернуть: `{"status": "healthy", "environment": "production"}`

2. **Backend Docs**: `https://api.yourdomain.com/docs`
   - Swagger UI документация

3. **Frontend**: `https://yourdomain.com`
   - Главная страница приложения

4. **Flower (Celery мониторинг)**: `https://flower.yourdomain.com`
   - Мониторинг очередей и задач

---

## 📊 Полезные команды

### С использованием Makefile (рекомендуется)

```bash
# Показать все команды
make -f Makefile.prod help

# Статус
make -f Makefile.prod status

# Логи
make -f Makefile.prod logs
make -f Makefile.prod logs-backend
make -f Makefile.prod logs-celery

# Перезапуск
make -f Makefile.prod restart

# Бэкап
make -f Makefile.prod backup

# Обновление
make -f Makefile.prod update

# Очистка
make -f Makefile.prod cleanup
```

### С использованием deploy.sh скрипта

```bash
# Дайте права на выполнение
chmod +x scripts/deploy.sh

# Запуск
sudo ./scripts/deploy.sh start

# Остановка
sudo ./scripts/deploy.sh stop

# Бэкап
sudo ./scripts/deploy.sh backup

# Статус
sudo ./scripts/deploy.sh status
```

### Прямые Docker команды

```bash
# Статус
docker compose -f docker-compose.prod.yml ps

# Логи
docker compose -f docker-compose.prod.yml logs -f [service-name]

# Перезапуск сервиса
docker compose -f docker-compose.prod.yml restart [service-name]

# Остановка
docker compose -f docker-compose.prod.yml down
```

---

## 🔧 Настройка DNS

Настройте A записи для ваших доменов:

```
A    yourdomain.com          -> YOUR_SERVER_IP
A    www.yourdomain.com      -> YOUR_SERVER_IP
A    api.yourdomain.com      -> YOUR_SERVER_IP
A    flower.yourdomain.com   -> YOUR_SERVER_IP
```

---

## 🐛 Частые проблемы

### Контейнеры не запускаются

```bash
# Смотрим логи
docker compose -f docker-compose.prod.yml logs

# Проверяем .env файлы
cat backend/.env
cat .env.local
cat .env
```

### 502 Bad Gateway

```bash
# Проверяем backend
docker compose -f docker-compose.prod.yml logs backend

# Проверяем health
curl http://localhost:8000/health

# Перезапускаем
docker compose -f docker-compose.prod.yml restart backend nginx
```

### База данных недоступна

```bash
# Проверяем PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U eduplatform

# Смотрим логи
docker compose -f docker-compose.prod.yml logs postgres
```

### Celery задачи не выполняются

```bash
# Проверяем worker
docker compose -f docker-compose.prod.yml logs celery-worker

# Проверяем Redis
docker compose -f docker-compose.prod.yml exec redis redis-cli ping

# Перезапускаем
docker compose -f docker-compose.prod.yml restart celery-worker
```

---

## 📚 Дополнительная информация

Полная документация: [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)

- Настройка мониторинга
- Backup и восстановление
- Обновление приложения
- Настройка SSL
- Troubleshooting

---

## 🎯 Чек-лист после установки

- [ ] Все контейнеры запущены и healthy
- [ ] Backend API отвечает: `https://api.yourdomain.com/health`
- [ ] Frontend открывается: `https://yourdomain.com`
- [ ] SSL сертификаты установлены (зеленый замок в браузере)
- [ ] Flower доступен: `https://flower.yourdomain.com`
- [ ] Настроены автоматические бэкапы (cron)
- [ ] Настроено автообновление SSL (cron)
- [ ] Проверена загрузка PDF файлов
- [ ] Проверена загрузка YouTube видео
- [ ] Проверены AI функции (OpenAI API работает)
- [ ] Настроен файрвол (UFW)
- [ ] Все пароли изменены на безопасные

---

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи: `make -f Makefile.prod logs`
2. Проверьте статус: `make -f Makefile.prod status`
3. Проверьте health: `curl https://api.yourdomain.com/health`
4. Откройте issue в репозитории GitHub

---

**Готово!** Ваше приложение развернуто и готово к использованию 🎉
