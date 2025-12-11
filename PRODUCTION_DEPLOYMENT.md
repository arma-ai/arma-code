# Production Deployment Guide - EduPlatform

Полное руководство по развертыванию EduPlatform на production сервере с использованием Docker.

## 📋 Оглавление

1. [Требования к серверу](#требования-к-серверу)
2. [Подготовка сервера](#подготовка-сервера)
3. [Настройка переменных окружения](#настройка-переменных-окружения)
4. [Деплой с Docker Compose](#деплой-с-docker-compose)
5. [Настройка Nginx](#настройка-nginx)
6. [SSL сертификаты (Let's Encrypt)](#ssl-сертификаты)
7. [Мониторинг и логи](#мониторинг-и-логи)
8. [Backup и восстановление](#backup-и-восстановление)
9. [Обновление приложения](#обновление-приложения)
10. [Troubleshooting](#troubleshooting)

---

## 🖥️ Требования к серверу

### Минимальные требования:
- **OS**: Ubuntu 22.04 LTS / Debian 11+
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Disk**: 100 GB SSD
- **Network**: 100 Mbps

### Рекомендуемые требования:
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 8 cores
- **RAM**: 16 GB
- **Disk**: 200 GB NVMe SSD
- **Network**: 1 Gbps

---

## 🚀 Подготовка сервера

### 1. Обновление системы

```bash
# Подключаемся к серверу
ssh root@your-server-ip

# Обновляем систему
apt update && apt upgrade -y

# Устанавливаем необходимые пакеты
apt install -y curl wget git vim htop nginx certbot python3-certbot-nginx
```

### 2. Установка Docker и Docker Compose

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
apt install -y docker-compose-plugin

# Проверка установки
docker --version
docker compose version

# Запуск Docker при старте системы
systemctl enable docker
systemctl start docker
```

### 3. Создание пользователя для приложения

```bash
# Создаем пользователя
useradd -m -s /bin/bash eduplatform

# Добавляем в группу docker
usermod -aG docker eduplatform

# Создаем директорию для приложения
mkdir -p /opt/eduplatform
chown -R eduplatform:eduplatform /opt/eduplatform
```

### 4. Настройка файрвола (UFW)

```bash
# Устанавливаем UFW
apt install -y ufw

# Разрешаем SSH, HTTP, HTTPS
ufw allow ssh
ufw allow http
ufw allow https

# Включаем файрвол
ufw --force enable

# Проверяем статус
ufw status
```

### 5. Настройка swap (для серверов с <16GB RAM)

```bash
# Создаем swap файл 4GB
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Делаем постоянным
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# Настраиваем swappiness
echo 'vm.swappiness=10' | tee -a /etc/sysctl.conf
sysctl -p
```

---

## 🔐 Настройка переменных окружения

### 1. Клонирование репозитория

```bash
# Переключаемся на пользователя eduplatform
su - eduplatform

# Клонируем репозиторий
cd /opt/eduplatform
git clone https://github.com/your-repo/eduplatform.git .

# Или загружаем через rsync/scp с локальной машины
# rsync -avz --exclude 'node_modules' --exclude 'venv' \
#   /path/to/local/arma/ eduplatform@your-server:/opt/eduplatform/
```

### 2. Создание .env файлов

#### Backend .env (`/opt/eduplatform/backend/.env`)

```bash
cat > /opt/eduplatform/backend/.env << 'EOF'
# Application
APP_NAME=EduPlatform
APP_ENV=production
DEBUG=False
SECRET_KEY=CHANGE_THIS_TO_RANDOM_STRING_MIN_32_CHARS

# Database
DATABASE_URL=postgresql+asyncpg://eduplatform:SECURE_PASSWORD_HERE@postgres:5432/eduplatform_prod
DATABASE_URL_SYNC=postgresql://eduplatform:SECURE_PASSWORD_HERE@postgres:5432/eduplatform_prod

# Redis
REDIS_URL=redis://redis:6379/0

# OpenAI
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# JWT
JWT_SECRET_KEY=CHANGE_THIS_TO_RANDOM_STRING_MIN_32_CHARS
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS - замените на ваш домен
BACKEND_CORS_ORIGINS=["https://yourdomain.com","https://api.yourdomain.com"]

# Storage (Supabase)
STORAGE_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
EOF
```

#### Frontend .env.local (`/opt/eduplatform/.env.local`)

```bash
cat > /opt/eduplatform/.env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend API - замените на ваш домен
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# OpenAI (для серверных действий)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
EOF
```

#### Docker Compose .env (`/opt/eduplatform/.env`)

```bash
cat > /opt/eduplatform/.env << 'EOF'
# PostgreSQL
POSTGRES_USER=eduplatform
POSTGRES_PASSWORD=SECURE_PASSWORD_HERE
POSTGRES_DB=eduplatform_prod
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# Ports (внутренние)
BACKEND_PORT=8000
FRONTEND_PORT=3000

# Мониторинг (опционально)
FLOWER_PORT=5555
PGADMIN_PORT=5050
REDIS_COMMANDER_PORT=8081
PGADMIN_EMAIL=admin@yourdomain.com
PGADMIN_PASSWORD=SECURE_PASSWORD_HERE
EOF
```

### 3. Генерация секретных ключей

```bash
# Генерируем случайные ключи
openssl rand -hex 32  # Для SECRET_KEY
openssl rand -hex 32  # Для JWT_SECRET_KEY
openssl rand -hex 16  # Для POSTGRES_PASSWORD

# Вставляем их в .env файлы
```

### 4. Установка прав доступа

```bash
# Защищаем .env файлы
chmod 600 /opt/eduplatform/.env
chmod 600 /opt/eduplatform/backend/.env
chmod 600 /opt/eduplatform/.env.local
```

---

## 🐳 Деплой с Docker Compose

### 1. Создание production docker-compose файла

```bash
cat > /opt/eduplatform/docker-compose.prod.yml << 'EOF'
services:
  # PostgreSQL с pgvector
  postgres:
    image: ankane/pgvector:latest
    container_name: eduplatform-postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_INITDB_ARGS: "-E UTF8"
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init:/docker-entrypoint-initdb.d
      - ./backups/postgres:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - eduplatform
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Redis для кеширования и очередей
  redis:
    image: redis:7-alpine
    container_name: eduplatform-redis
    restart: always
    command: >
      redis-server
      --appendonly yes
      --appendfsync everysec
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --requirepass ${REDIS_PASSWORD:-}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - eduplatform
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Backend FastAPI
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: eduplatform-backend
    restart: always
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    env_file:
      - ./backend/.env
    volumes:
      - ./backend/storage:/app/storage
      - ./logs/backend:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - eduplatform
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

  # Celery Worker
  celery-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.celery
    container_name: eduplatform-celery-worker
    restart: always
    command: >
      celery -A app.infrastructure.queue.celery_app worker
      --loglevel=info
      --concurrency=4
      --queues=materials,ai,celery
      --max-tasks-per-child=100
      --time-limit=1200
      --soft-time-limit=1100
    env_file:
      - ./backend/.env
    volumes:
      - ./backend/storage:/app/storage
      - ./logs/celery:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      backend:
        condition: service_healthy
    networks:
      - eduplatform
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

  # Celery Beat (для периодических задач)
  celery-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile.celery
    container_name: eduplatform-celery-beat
    restart: always
    command: >
      celery -A app.infrastructure.queue.celery_app beat
      --loglevel=info
      --pidfile=/tmp/celerybeat.pid
    env_file:
      - ./backend/.env
    volumes:
      - celery_beat_data:/app/celerybeat
      - ./logs/celery-beat:/app/logs
    depends_on:
      - redis
    networks:
      - eduplatform
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Frontend Next.js
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    container_name: eduplatform-frontend
    restart: always
    env_file:
      - ./.env.local
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - eduplatform
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

  # Flower - мониторинг Celery
  flower:
    build:
      context: ./backend
      dockerfile: Dockerfile.celery
    container_name: eduplatform-flower
    restart: always
    command: >
      celery -A app.infrastructure.queue.celery_app flower
      --port=5555
      --broker=redis://redis:6379/0
      --basic_auth=${FLOWER_USER:-admin}:${FLOWER_PASSWORD:-admin}
    environment:
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
      - celery-worker
    networks:
      - eduplatform
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: eduplatform-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - backend
      - frontend
    networks:
      - eduplatform
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  celery_beat_data:
    driver: local

networks:
  eduplatform:
    driver: bridge
EOF
```

### 2. Создание Dockerfile для Backend

```bash
cat > /opt/eduplatform/backend/Dockerfile << 'EOF'
FROM python:3.13-slim

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем и устанавливаем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Копируем код приложения
COPY . .

# Создаем директории
RUN mkdir -p /app/storage /app/logs && \
    chmod 777 /app/storage /app/logs

# Переменные окружения
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Команда запуска (будет переопределена в docker-compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF
```

### 3. Создание Dockerfile для Frontend

```bash
cat > /opt/eduplatform/Dockerfile << 'EOF'
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build args для передачи переменных окружения
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
EOF
```

### 4. Обновление next.config.js для standalone

```bash
cat > /opt/eduplatform/next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
}

module.exports = nextConfig
EOF
```

### 5. Создание директорий

```bash
# Создаем необходимые директории
mkdir -p /opt/eduplatform/{nginx/{conf.d,ssl},logs/{backend,frontend,celery,celery-beat,nginx},backups/{postgres,redis}}

# Устанавливаем права
chown -R eduplatform:eduplatform /opt/eduplatform
```

### 6. Запуск приложения

```bash
cd /opt/eduplatform

# Запускаем миграции БД (первый раз)
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# Запускаем все сервисы
docker compose -f docker-compose.prod.yml up -d

# Проверяем статус
docker compose -f docker-compose.prod.yml ps

# Смотрим логи
docker compose -f docker-compose.prod.yml logs -f
```

---

## 🌐 Настройка Nginx

### 1. Основной конфиг Nginx

```bash
cat > /opt/eduplatform/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

    # Include virtual hosts
    include /etc/nginx/conf.d/*.conf;
}
EOF
```

### 2. Конфигурация для вашего домена

```bash
cat > /opt/eduplatform/nginx/conf.d/eduplatform.conf << 'EOF'
# Upstream для Backend API
upstream backend {
    server backend:8000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Upstream для Frontend
upstream frontend {
    server frontend:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Upstream для Flower (мониторинг Celery)
upstream flower {
    server flower:5555 max_fails=3 fail_timeout=30s;
}

# Редирект с HTTP на HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com api.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Frontend - основной домен
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL сертификаты (после получения Let's Encrypt)
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # SSL параметры
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Логи
    access_log /var/log/nginx/frontend_access.log;
    error_log /var/log/nginx/frontend_error.log;

    # Rate limiting
    limit_req zone=general_limit burst=50 nodelay;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Next.js static files
    location /_next/static {
        proxy_pass http://frontend;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }
}

# Backend API - поддомен
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourdomain.com;

    # SSL сертификаты
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # SSL параметры
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Логи
    access_log /var/log/nginx/backend_access.log;
    error_log /var/log/nginx/backend_error.log;

    # Rate limiting для API
    limit_req zone=api_limit burst=20 nodelay;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Health check без rate limit
    location /health {
        limit_req off;
        proxy_pass http://backend;
    }
}

# Flower мониторинг (опционально, только для админов)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name flower.yourdomain.com;

    # SSL сертификаты
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Логи
    access_log /var/log/nginx/flower_access.log;
    error_log /var/log/nginx/flower_error.log;

    # Ограничиваем доступ по IP (замените на ваш IP)
    # allow 1.2.3.4;
    # deny all;

    location / {
        proxy_pass http://flower;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

---

## 🔒 SSL сертификаты

### Вариант 1: Let's Encrypt с Certbot (рекомендуется)

```bash
# Устанавливаем Certbot
apt install -y certbot python3-certbot-nginx

# Останавливаем Docker Nginx (временно)
docker compose -f docker-compose.prod.yml stop nginx

# Получаем сертификаты для всех доменов
certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d api.yourdomain.com \
  -d flower.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email

# Копируем сертификаты в директорию nginx
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/eduplatform/nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/eduplatform/nginx/ssl/

# Устанавливаем права
chmod 644 /opt/eduplatform/nginx/ssl/fullchain.pem
chmod 600 /opt/eduplatform/nginx/ssl/privkey.pem

# Запускаем Nginx обратно
docker compose -f docker-compose.prod.yml start nginx

# Настраиваем автообновление (добавляем в crontab)
crontab -e
# Добавляем:
0 2 * * * certbot renew --quiet --post-hook "cp /etc/letsencrypt/live/yourdomain.com/*.pem /opt/eduplatform/nginx/ssl/ && docker compose -f /opt/eduplatform/docker-compose.prod.yml restart nginx"
```

### Вариант 2: Самоподписанный сертификат (только для тестирования)

```bash
# Генерируем самоподписанный сертификат
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/eduplatform/nginx/ssl/privkey.pem \
  -out /opt/eduplatform/nginx/ssl/fullchain.pem \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=EduPlatform/CN=yourdomain.com"

chmod 644 /opt/eduplatform/nginx/ssl/fullchain.pem
chmod 600 /opt/eduplatform/nginx/ssl/privkey.pem
```

---

## 📊 Мониторинг и логи

### 1. Просмотр логов

```bash
# Все сервисы
docker compose -f docker-compose.prod.yml logs -f

# Конкретный сервис
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f celery-worker
docker compose -f docker-compose.prod.yml logs -f frontend

# Последние 100 строк
docker compose -f docker-compose.prod.yml logs --tail=100 backend

# Nginx логи
tail -f /opt/eduplatform/logs/nginx/access.log
tail -f /opt/eduplatform/logs/nginx/error.log
```

### 2. Мониторинг ресурсов

```bash
# Использование ресурсов контейнерами
docker stats

# Статус контейнеров
docker compose -f docker-compose.prod.yml ps

# Проверка здоровья
docker inspect --format='{{.State.Health.Status}}' eduplatform-backend
docker inspect --format='{{.State.Health.Status}}' eduplatform-frontend
```

### 3. Flower - мониторинг Celery

Откройте в браузере: `https://flower.yourdomain.com`

- Логин: admin (настраивается в .env как FLOWER_USER)
- Пароль: admin (настраивается в .env как FLOWER_PASSWORD)

### 4. Настройка логирования в systemd

```bash
# Просмотр логов через journalctl
journalctl -u docker.service -f
journalctl -u docker.service --since "1 hour ago"
```

---

## 💾 Backup и восстановление

### 1. Скрипт для автоматического бэкапа PostgreSQL

```bash
cat > /opt/eduplatform/scripts/backup-postgres.sh << 'EOF'
#!/bin/bash

# Переменные
BACKUP_DIR="/opt/eduplatform/backups/postgres"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_${DATE}.sql.gz"
RETENTION_DAYS=7

# Создаем директорию если не существует
mkdir -p ${BACKUP_DIR}

# Выполняем бэкап
docker exec eduplatform-postgres pg_dump -U eduplatform eduplatform_prod | gzip > ${BACKUP_DIR}/${BACKUP_FILE}

# Удаляем старые бэкапы
find ${BACKUP_DIR} -name "backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${BACKUP_FILE}"
EOF

chmod +x /opt/eduplatform/scripts/backup-postgres.sh
```

### 2. Скрипт для бэкапа Redis

```bash
cat > /opt/eduplatform/scripts/backup-redis.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/eduplatform/backups/redis"
DATE=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=7

mkdir -p ${BACKUP_DIR}

# Сохраняем Redis dump
docker exec eduplatform-redis redis-cli SAVE
docker cp eduplatform-redis:/data/dump.rdb ${BACKUP_DIR}/dump_${DATE}.rdb

# Удаляем старые бэкапы
find ${BACKUP_DIR} -name "dump_*.rdb" -mtime +${RETENTION_DAYS} -delete

echo "Redis backup completed: dump_${DATE}.rdb"
EOF

chmod +x /opt/eduplatform/scripts/backup-redis.sh
```

### 3. Настройка cron для автоматических бэкапов

```bash
# Добавляем в crontab
crontab -e -u eduplatform

# Добавляем:
# PostgreSQL бэкап каждый день в 2:00 AM
0 2 * * * /opt/eduplatform/scripts/backup-postgres.sh >> /opt/eduplatform/logs/backup.log 2>&1

# Redis бэкап каждый день в 3:00 AM
0 3 * * * /opt/eduplatform/scripts/backup-redis.sh >> /opt/eduplatform/logs/backup.log 2>&1
```

### 4. Восстановление из бэкапа

#### PostgreSQL:

```bash
# Останавливаем приложение
docker compose -f docker-compose.prod.yml stop backend celery-worker

# Восстанавливаем из бэкапа
gunzip < /opt/eduplatform/backups/postgres/backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i eduplatform-postgres psql -U eduplatform eduplatform_prod

# Запускаем приложение
docker compose -f docker-compose.prod.yml start backend celery-worker
```

#### Redis:

```bash
# Останавливаем Redis
docker compose -f docker-compose.prod.yml stop redis

# Восстанавливаем dump
docker cp /opt/eduplatform/backups/redis/dump_YYYYMMDD_HHMMSS.rdb eduplatform-redis:/data/dump.rdb

# Запускаем Redis
docker compose -f docker-compose.prod.yml start redis
```

---

## 🔄 Обновление приложения

### 1. Обновление кода (с downtime)

```bash
cd /opt/eduplatform

# Пул изменений из git
git pull origin main

# Пересобираем и перезапускаем контейнеры
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Запускаем миграции (если есть)
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### 2. Zero-downtime обновление (blue-green deployment)

```bash
# 1. Создаем новую версию с другими именами контейнеров
docker compose -f docker-compose.prod.yml up -d --scale backend=2

# 2. Ждем пока новый контейнер запустится
sleep 30

# 3. Останавливаем старый
docker stop eduplatform-backend-old

# 4. Удаляем старый
docker rm eduplatform-backend-old
```

### 3. Откат к предыдущей версии

```bash
# Останавливаем текущую версию
docker compose -f docker-compose.prod.yml down

# Откатываем код
git reset --hard HEAD~1  # или конкретный коммит

# Запускаем старую версию
docker compose -f docker-compose.prod.yml up -d --build

# Откатываем миграции (если нужно)
docker compose -f docker-compose.prod.yml exec backend alembic downgrade -1
```

---

## 🛠️ Troubleshooting

### Проблема: Контейнер не запускается

```bash
# Смотрим логи
docker compose -f docker-compose.prod.yml logs [service-name]

# Проверяем статус
docker compose -f docker-compose.prod.yml ps

# Перезапускаем
docker compose -f docker-compose.prod.yml restart [service-name]
```

### Проблема: База данных недоступна

```bash
# Проверяем соединение
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U eduplatform

# Подключаемся к БД
docker compose -f docker-compose.prod.yml exec postgres psql -U eduplatform eduplatform_prod

# Проверяем логи
docker compose -f docker-compose.prod.yml logs postgres
```

### Проблема: Redis недоступен

```bash
# Проверяем Redis
docker compose -f docker-compose.prod.yml exec redis redis-cli ping

# Смотрим логи
docker compose -f docker-compose.prod.yml logs redis
```

### Проблема: Celery задачи не выполняются

```bash
# Проверяем worker
docker compose -f docker-compose.prod.yml logs celery-worker

# Проверяем очередь через Flower
# https://flower.yourdomain.com

# Перезапускаем worker
docker compose -f docker-compose.prod.yml restart celery-worker
```

### Проблема: 502 Bad Gateway от Nginx

```bash
# Проверяем backend
docker compose -f docker-compose.prod.yml logs backend

# Проверяем health check
curl http://localhost:8000/health

# Проверяем nginx конфиг
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Перезапускаем nginx
docker compose -f docker-compose.prod.yml restart nginx
```

### Проблема: Высокое использование памяти

```bash
# Проверяем использование ресурсов
docker stats

# Ограничиваем память для контейнера (в docker-compose.prod.yml):
# services:
#   backend:
#     mem_limit: 2g
#     memswap_limit: 2g

# Перезапускаем с новыми ограничениями
docker compose -f docker-compose.prod.yml up -d
```

---

## 📝 Чек-лист для production

- [ ] Все .env файлы настроены с безопасными паролями
- [ ] SSL сертификаты установлены и работают
- [ ] Настроен файрвол (UFW)
- [ ] Настроены автоматические бэкапы (cron)
- [ ] Проверены healthcheck'и всех сервисов
- [ ] Настроено логирование
- [ ] Flower доступен только для админов (или по IP)
- [ ] Настроен мониторинг (Flower, логи)
- [ ] Протестирован процесс обновления
- [ ] Протестирован процесс восстановления из бэкапа
- [ ] DNS записи настроены для всех поддоменов
- [ ] Настроена автоматическая перезагрузка контейнеров (restart: always)
- [ ] Проверена работа всех API endpoints
- [ ] Проверена загрузка материалов (PDF, YouTube)
- [ ] Проверена работа AI функций (OpenAI API)
- [ ] Настроены алерты для критических ошибок

---

## 🎯 Быстрый старт

Для быстрого развертывания выполните:

```bash
# 1. Клонируйте репозиторий
cd /opt/eduplatform && git clone <your-repo> .

# 2. Настройте .env файлы (используйте примеры выше)
nano backend/.env
nano .env.local
nano .env

# 3. Создайте директории
mkdir -p nginx/{conf.d,ssl} logs/{backend,frontend,celery,nginx} backups/{postgres,redis}

# 4. Получите SSL сертификаты
certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# 5. Скопируйте конфиги Nginx (используйте примеры выше)
nano nginx/nginx.conf
nano nginx/conf.d/eduplatform.conf

# 6. Запустите приложение
docker compose -f docker-compose.prod.yml up -d

# 7. Запустите миграции
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 8. Проверьте статус
docker compose -f docker-compose.prod.yml ps
curl https://api.yourdomain.com/health
```

---

## 📞 Поддержка

При возникновении проблем проверьте:
1. Логи контейнеров: `docker compose logs -f [service]`
2. Nginx логи: `/opt/eduplatform/logs/nginx/`
3. Healthcheck статус: `docker inspect --format='{{.State.Health.Status}}' [container]`
4. Flower мониторинг: `https://flower.yourdomain.com`

---

**Готово!** Ваше приложение теперь развернуто в production и готово к использованию.
