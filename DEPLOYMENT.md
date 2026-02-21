# 🐳 Production Deployment Guide

**Deploy EduPlatform to any server with Docker**

---

## 📋 Prerequisites

- Server with Ubuntu/Debian or similar
- Docker & Docker Compose installed
- Domain name (optional, for HTTPS)
- SSL certificates (optional, for HTTPS)

---

## 🚀 Quick Deploy

### 1. Clone the repository

```bash
git clone <your-repo-url> /opt/eduplatform
cd /opt/eduplatform
```

### 2. Create environment file

```bash
cp .env.example .env
nano .env
```

Fill in your values:

```bash
# Database
POSTGRES_USER=eduplatform
POSTGRES_PASSWORD=<generate_secure_password>
POSTGRES_DB=eduplatform_prod

# Redis
REDIS_PASSWORD=<generate_secure_password>

# OpenAI (Required)
OPENAI_API_KEY=sk-proj-YOUR_KEY

# Tavily (Optional)
TAVILY_API_KEY=tvly-YOUR_KEY

# JWT Secrets
SECRET_KEY=<openssl rand -hex 32>
JWT_SECRET_KEY=<openssl rand -hex 32>

# Ports
BACKEND_PORT=8000
FRONTEND_PORT=3000
FLOWER_PORT=5555
```

### 3. Deploy with Docker Compose

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 4. Run migrations

```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### 5. Create admin user

```bash
docker compose -f docker-compose.prod.yml exec backend python create_admin.py
```

---

## 🌐 Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| Flower (Celery UI) | http://localhost:5555 |

**Default Admin:**
- Email: `admin@example.com`
- Password: `admin123`

---

## 🛠️ Deployment Commands

### Using deploy.sh script

```bash
# Full installation
sudo ./scripts/deploy.sh install

# Start application
sudo ./scripts/deploy.sh start

# Stop application
sudo ./scripts/deploy.sh stop

# Restart application
sudo ./scripts/deploy.sh restart

# View logs
sudo ./scripts/deploy.sh logs

# View status
sudo ./scripts/deploy.sh status

# Create backup
sudo ./scripts/deploy.sh backup

# Update from Git
sudo ./scripts/deploy.sh update
```

### Manual Docker Compose commands

```bash
# Start
docker compose -f docker-compose.prod.yml up -d

# Stop
docker compose -f docker-compose.prod.yml down

# Restart
docker compose -f docker-compose.prod.yml restart

# Rebuild
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f backend

# Scale celery workers
docker compose -f docker-compose.prod.yml up -d --scale celery-worker=3
```

---

## 📊 Services

| Service | Container Name | Port | Description |
|---------|---------------|------|-------------|
| PostgreSQL | eduplatform-postgres | 5432 | Database with pgvector |
| Redis | eduplatform-redis | 6379 | Cache & message broker |
| Backend | eduplatform-backend | 8000 | FastAPI API server |
| Frontend | eduplatform-frontend | 3000 | React web application |
| Celery Worker | eduplatform-celery-worker | - | Background task processor |
| Flower | eduplatform-flower | 5555 | Celery monitoring UI |

---

## 🔧 Configuration

### Environment Variables

All configuration is done via `.env` file:

```bash
# Database
POSTGRES_USER=eduplatform
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=eduplatform_prod

# Redis
REDIS_PASSWORD=your_secure_password

# OpenAI
OPENAI_API_KEY=sk-proj-...

# JWT
SECRET_KEY=...
JWT_SECRET_KEY=...

# Ports
BACKEND_PORT=8000
FRONTEND_PORT=3000
FLOWER_PORT=5555
```

### Resource Limits

Edit `docker-compose.prod.yml` to set resource limits:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
```

---

## 🔄 Update Deployment

### Using deploy.sh

```bash
# Update from Git and redeploy
sudo ./scripts/deploy.sh update
```

### Manual update

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## 💾 Backup & Restore

### Create Backup

```bash
# Using script
sudo ./scripts/deploy.sh backup

# Manual PostgreSQL backup
docker exec eduplatform-postgres pg_dump -U eduplatform eduplatform_prod > backup.sql

# Manual Redis backup
docker exec eduplatform-redis redis-cli SAVE
docker cp eduplatform-redis:/data/dump.rdb ./dump.rdb
```

### Restore from Backup

```bash
# Using script
sudo ./scripts/deploy.sh restore 20240101_120000

# Manual PostgreSQL restore
cat backup.sql | docker exec -i eduplatform-postgres psql -U eduplatform eduplatform_prod
```

---

## 📝 Logs

```bash
# All logs
docker compose -f docker-compose.prod.yml logs -f

# Backend logs
docker compose -f docker-compose.prod.yml logs -f backend

# Celery logs
docker compose -f docker-compose.prod.yml logs -f celery-worker

# Database logs
docker compose -f docker-compose.prod.yml logs -f postgres
```

---

## 🔍 Monitoring

### Flower (Celery UI)

```bash
# Start Flower (optional service)
docker compose -f docker-compose.prod.yml --profile monitoring up -d

# Access: http://localhost:5555
```

### Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# Frontend health
curl http://localhost:3000/health

# PostgreSQL health
docker exec eduplatform-postgres pg_isready -U eduplatform

# Redis health
docker exec eduplatform-redis redis-cli ping
```

---

## 🛡️ Security

### Firewall Setup

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### SSL/HTTPS (Optional)

For HTTPS, use a reverse proxy like nginx or traefik in front of the application.

### Secure Secrets

```bash
# Generate secure passwords
openssl rand -base64 32  # For database passwords
openssl rand -hex 32     # For JWT secrets
```

---

## 🐛 Troubleshooting

### Services won't start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check if ports are in use
sudo netstat -tulpn | grep :8000
sudo netstat -tulpn | grep :3000
```

### Database connection failed

```bash
# Check database is running
docker compose -f docker-compose.prod.yml ps postgres

# Restart database
docker compose -f docker-compose.prod.yml restart postgres
```

### Out of memory

```bash
# Check memory usage
docker stats

# Reduce worker concurrency
# Edit docker-compose.prod.yml: celery-worker command
```

---

## 📄 Files

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production Docker configuration |
| `backend/Dockerfile` | Backend container |
| `backend/Dockerfile.celery` | Celery worker container |
| `frontend/Dockerfile` | Frontend container |
| `scripts/deploy.sh` | Deployment automation script |
| `scripts/eduplatform.service` | Systemd service for auto-start |

---

**Version:** 1.0.0  
**Last Updated:** February 21, 2026
