.PHONY: help setup up down restart logs clean db-migrate db-reset test dev prod tools

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Показать справку
	@echo "$(BLUE)EduPlatform - Команды Управления$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# === Setup ===

setup: ## Первоначальная настройка проекта
	@echo "$(BLUE)🚀 Настройка проекта...$(NC)"
	@if [ ! -f .env ]; then cp .env.docker .env && echo "$(GREEN)✓ .env создан$(NC)"; else echo "$(YELLOW)⚠ .env уже существует$(NC)"; fi
	@if [ ! -f backend/.env ]; then echo "$(YELLOW)⚠ Создай backend/.env вручную (см. backend/.env.example)$(NC)"; fi
	@echo "$(GREEN)✓ Готово! Запусти 'make up' для старта$(NC)"

# === Docker Commands ===

up: ## Запустить все сервисы
	@echo "$(BLUE)🐳 Запуск Docker контейнеров...$(NC)"
	docker compose up -d
	@echo "$(GREEN)✓ Сервисы запущены!$(NC)"
	@make status

down: ## Остановить все сервисы
	@echo "$(BLUE)🛑 Остановка Docker контейнеров...$(NC)"
	docker compose down
	@echo "$(GREEN)✓ Сервисы остановлены$(NC)"

restart: ## Перезапустить все сервисы
	@echo "$(BLUE)🔄 Перезапуск сервисов...$(NC)"
	docker compose restart
	@echo "$(GREEN)✓ Сервисы перезапущены$(NC)"

status: ## Показать статус сервисов
	@echo "$(BLUE)📊 Статус сервисов:$(NC)"
	@docker compose ps

logs: ## Показать логи всех сервисов
	docker compose logs -f

logs-postgres: ## Логи PostgreSQL
	docker compose logs -f postgres

logs-redis: ## Логи Redis
	docker compose logs -f redis

# === Инструменты разработки ===

tools: ## Запустить инструменты (pgAdmin + Redis Commander)
	@echo "$(BLUE)🛠 Запуск инструментов разработки...$(NC)"
	docker compose --profile tools up -d
	@echo "$(GREEN)✓ Инструменты запущены:$(NC)"
	@echo "  pgAdmin:        http://localhost:5050"
	@echo "  Redis Commander: http://localhost:8081"

tools-down: ## Остановить инструменты
	docker compose --profile tools down

# === Database ===

db-connect: ## Подключиться к PostgreSQL
	@echo "$(BLUE)🔌 Подключение к PostgreSQL...$(NC)"
	docker compose exec postgres psql -U eduplatform -d eduplatform_dev

db-migrate: ## Применить миграции Alembic
	@echo "$(BLUE)🔄 Применение миграций...$(NC)"
	cd backend && alembic upgrade head
	@echo "$(GREEN)✓ Миграции применены$(NC)"

db-migrate-create: ## Создать новую миграцию (make db-migrate-create msg="описание")
	@if [ -z "$(msg)" ]; then \
		echo "$(RED)❌ Укажи описание: make db-migrate-create msg='описание'$(NC)"; \
		exit 1; \
	fi
	cd backend && alembic revision --autogenerate -m "$(msg)"
	@echo "$(GREEN)✓ Миграция создана$(NC)"

db-reset: ## ОСТОРОЖНО: Удалить и пересоздать БД
	@echo "$(RED)⚠️  ВНИМАНИЕ: Все данные будут удалены!$(NC)"
	@read -p "Продолжить? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v; \
		docker compose up -d postgres redis; \
		sleep 5; \
		make db-migrate; \
		echo "$(GREEN)✓ БД пересоздана$(NC)"; \
	else \
		echo "$(YELLOW)Отменено$(NC)"; \
	fi

db-backup: ## Создать backup БД
	@echo "$(BLUE)💾 Создание backup...$(NC)"
	@mkdir -p backups
	docker compose exec -T postgres pg_dump -U eduplatform eduplatform_dev > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✓ Backup создан: backups/backup_$(shell date +%Y%m%d_%H%M%S).sql$(NC)"

db-restore: ## Восстановить backup (make db-restore file=backup.sql)
	@if [ -z "$(file)" ]; then \
		echo "$(RED)❌ Укажи файл: make db-restore file=backups/backup_xxx.sql$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)📥 Восстановление backup...$(NC)"
	docker compose exec -T postgres psql -U eduplatform -d eduplatform_dev < $(file)
	@echo "$(GREEN)✓ Backup восстановлен$(NC)"

# === Redis ===

redis-cli: ## Подключиться к Redis CLI
	docker compose exec redis redis-cli

redis-flush: ## ОСТОРОЖНО: Очистить все данные Redis
	@echo "$(RED)⚠️  ВНИМАНИЕ: Все данные Redis будут удалены!$(NC)"
	@read -p "Продолжить? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose exec redis redis-cli FLUSHALL; \
		echo "$(GREEN)✓ Redis очищен$(NC)"; \
	else \
		echo "$(YELLOW)Отменено$(NC)"; \
	fi

# === Celery ===

celery-start: ## Запустить Celery worker (Docker)
	@echo "$(BLUE)🔄 Запуск Celery worker...$(NC)"
	docker compose up -d celery-worker
	@echo "$(GREEN)✓ Celery worker запущен$(NC)"

celery-stop: ## Остановить Celery worker
	@echo "$(BLUE)🛑 Остановка Celery worker...$(NC)"
	docker compose stop celery-worker
	@echo "$(GREEN)✓ Celery worker остановлен$(NC)"

celery-restart: ## Перезапустить Celery worker
	@echo "$(BLUE)🔄 Перезапуск Celery worker...$(NC)"
	docker compose restart celery-worker
	@echo "$(GREEN)✓ Celery worker перезапущен$(NC)"

celery-logs: ## Показать логи Celery worker
	docker compose logs -f celery-worker

celery-status: ## Показать статус Celery worker
	@echo "$(BLUE)📊 Статус Celery workers:$(NC)"
	docker compose exec celery-worker celery -A app.infrastructure.queue.celery_app inspect active

celery-purge: ## ОСТОРОЖНО: Очистить все задачи в очереди
	@echo "$(RED)⚠️  ВНИМАНИЕ: Все задачи в очереди будут удалены!$(NC)"
	@read -p "Продолжить? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose exec celery-worker celery -A app.infrastructure.queue.celery_app purge -f; \
		echo "$(GREEN)✓ Очередь очищена$(NC)"; \
	else \
		echo "$(YELLOW)Отменено$(NC)"; \
	fi

flower: ## Запустить Flower (Celery UI)
	@echo "$(BLUE)🌸 Запуск Flower...$(NC)"
	docker compose --profile tools up -d flower
	@echo "$(GREEN)✓ Flower запущен: http://localhost:5555$(NC)"

flower-down: ## Остановить Flower
	docker compose stop flower

# === Development ===

dev: ## Запустить dev окружение (DB + Backend + Frontend)
	@echo "$(BLUE)🚀 Запуск dev окружения...$(NC)"
	@make up
	@echo "$(BLUE)🐍 Запуск Backend...$(NC)"
	@cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000 &
	@echo "$(BLUE)🎨 Запуск Frontend...$(NC)"
	@npm run dev &
	@echo "$(GREEN)✓ Dev окружение запущено!$(NC)"
	@echo ""
	@echo "$(GREEN)Backend: http://localhost:8000$(NC)"
	@echo "$(GREEN)Frontend: http://localhost:3000$(NC)"
	@echo "$(GREEN)Swagger: http://localhost:8000/docs$(NC)"

dev-stop: ## Остановить dev окружение
	@echo "$(BLUE)🛑 Остановка dev окружения...$(NC)"
	@pkill -f "uvicorn app.main:app" || true
	@pkill -f "next dev" || true
	@make down
	@echo "$(GREEN)✓ Dev окружение остановлено$(NC)"

# === Clean ===

clean: ## Удалить Docker volumes (данные БД и Redis)
	@echo "$(RED)⚠️  ВНИМАНИЕ: Все данные будут удалены!$(NC)"
	@read -p "Продолжить? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v; \
		echo "$(GREEN)✓ Volumes удалены$(NC)"; \
	else \
		echo "$(YELLOW)Отменено$(NC)"; \
	fi

clean-all: ## Удалить ВСЕ (контейнеры, volumes, images)
	@echo "$(RED)⚠️  ВНИМАНИЕ: Удаление ВСЕХ Docker ресурсов проекта!$(NC)"
	@read -p "Продолжить? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v --rmi all; \
		echo "$(GREEN)✓ Все ресурсы удалены$(NC)"; \
	else \
		echo "$(YELLOW)Отменено$(NC)"; \
	fi

# === Testing ===

test: ## Запустить тесты
	@echo "$(BLUE)🧪 Запуск тестов...$(NC)"
	cd backend && pytest
	@echo "$(GREEN)✓ Тесты пройдены$(NC)"

test-backend: ## Тесты backend
	cd backend && pytest -v

test-frontend: ## Тесты frontend
	npm test

# === Health Checks ===

health: ## Проверить здоровье всех сервисов
	@echo "$(BLUE)🏥 Проверка сервисов...$(NC)"
	@echo ""
	@echo "$(BLUE)PostgreSQL:$(NC)"
	@docker compose exec postgres pg_isready -U eduplatform || echo "$(RED)❌ PostgreSQL недоступен$(NC)"
	@echo ""
	@echo "$(BLUE)Redis:$(NC)"
	@docker compose exec redis redis-cli ping || echo "$(RED)❌ Redis недоступен$(NC)"
	@echo ""
	@echo "$(BLUE)Backend:$(NC)"
	@curl -s http://localhost:8000/health > /dev/null && echo "$(GREEN)✓ Backend работает$(NC)" || echo "$(RED)❌ Backend недоступен$(NC)"
	@echo ""
	@echo "$(BLUE)Frontend:$(NC)"
	@curl -s http://localhost:3000 > /dev/null && echo "$(GREEN)✓ Frontend работает$(NC)" || echo "$(RED)❌ Frontend недоступен$(NC)"

# === Info ===

info: ## Показать информацию о проекте
	@echo "$(BLUE)ℹ️  Информация о проекте$(NC)"
	@echo ""
	@echo "$(GREEN)Сервисы:$(NC)"
	@echo "  PostgreSQL:     localhost:5434"
	@echo "  Redis:          localhost:6379"
	@echo "  Celery Worker:  (Docker container)"
	@echo "  Backend:        http://localhost:8000"
	@echo "  Frontend:       http://localhost:3000"
	@echo "  Swagger:        http://localhost:8000/docs"
	@echo ""
	@echo "$(GREEN)Инструменты (make tools или make flower):$(NC)"
	@echo "  pgAdmin:        http://localhost:5050"
	@echo "  Redis Commander: http://localhost:8081"
	@echo "  Flower:         http://localhost:5555"
	@echo ""
	@echo "$(GREEN)Volumes:$(NC)"
	@docker volume ls | grep eduplatform || echo "  Нет volumes"
