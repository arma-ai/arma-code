#!/bin/bash

###############################################################################
# Production Deployment Script для EduPlatform
# Использование: ./scripts/deploy.sh [command]
# Команды: install, start, stop, restart, update, backup, logs
###############################################################################

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Директории
PROJECT_DIR="/opt/eduplatform"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"

# Функции для вывода
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Проверка прав root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Этот скрипт должен запускаться от root или с sudo"
    fi
}

# Проверка установки Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен. Установите Docker: curl -fsSL https://get.docker.com | sh"
    fi

    if ! docker compose version &> /dev/null; then
        error "Docker Compose не установлен"
    fi

    info "Docker установлен: $(docker --version)"
}

# Установка зависимостей
install_dependencies() {
    info "Установка системных зависимостей..."

    apt update
    apt install -y curl wget git vim htop nginx certbot python3-certbot-nginx ufw

    info "Зависимости установлены"
}

# Настройка файрвола
setup_firewall() {
    info "Настройка UFW..."

    ufw --force enable
    ufw allow ssh
    ufw allow http
    ufw allow https

    info "Файрвол настроен"
}

# Создание пользователя
create_user() {
    if id "eduplatform" &>/dev/null; then
        info "Пользователь eduplatform уже существует"
    else
        info "Создание пользователя eduplatform..."
        useradd -m -s /bin/bash eduplatform
        usermod -aG docker eduplatform
        info "Пользователь создан"
    fi
}

# Создание директорий
create_directories() {
    info "Создание необходимых директорий..."

    mkdir -p ${PROJECT_DIR}/{nginx/{conf.d,ssl},logs/{backend,frontend,celery,celery-beat,nginx},backups/{postgres,redis},scripts}

    chown -R eduplatform:eduplatform ${PROJECT_DIR}

    info "Директории созданы"
}

# Проверка .env файлов
check_env_files() {
    info "Проверка .env файлов..."

    if [[ ! -f "${PROJECT_DIR}/backend/.env" ]]; then
        warn "Файл backend/.env не найден. Создайте его из .env.example"
        return 1
    fi

    if [[ ! -f "${PROJECT_DIR}/.env.local" ]]; then
        warn "Файл .env.local не найден. Создайте его из .env.local.example"
        return 1
    fi

    if [[ ! -f "${PROJECT_DIR}/.env" ]]; then
        warn "Файл .env не найден для Docker Compose"
        return 1
    fi

    info "Все .env файлы найдены"
    return 0
}

# Проверка SSL сертификатов
check_ssl() {
    info "Проверка SSL сертификатов..."

    if [[ ! -f "${PROJECT_DIR}/nginx/ssl/fullchain.pem" ]] || [[ ! -f "${PROJECT_DIR}/nginx/ssl/privkey.pem" ]]; then
        warn "SSL сертификаты не найдены"
        warn "Получите их через: certbot certonly --standalone -d yourdomain.com"
        return 1
    fi

    info "SSL сертификаты найдены"
    return 0
}

# Запуск миграций
run_migrations() {
    info "Запуск миграций базы данных..."

    cd ${PROJECT_DIR}
    docker compose -f ${DOCKER_COMPOSE_FILE} exec -T backend alembic upgrade head || {
        warn "Не удалось запустить миграции через exec, пробуем через run..."
        docker compose -f ${DOCKER_COMPOSE_FILE} run --rm backend alembic upgrade head
    }

    info "Миграции выполнены"
}

# Создание начальных данных
seed_database() {
    info "Создание начальных данных (если необходимо)..."

    # Здесь можно добавить команды для создания начальных данных
    # docker compose -f ${DOCKER_COMPOSE_FILE} exec backend python -m app.scripts.seed_data

    info "Данные созданы"
}

# Команда: Полная установка
cmd_install() {
    info "=== Начало полной установки ==="

    check_root
    check_docker
    install_dependencies
    setup_firewall
    create_user
    create_directories

    info "=== Установка завершена ==="
    info "Следующие шаги:"
    info "1. Настройте .env файлы в ${PROJECT_DIR}"
    info "2. Получите SSL сертификаты"
    info "3. Настройте nginx конфиги"
    info "4. Запустите: sudo ./scripts/deploy.sh start"
}

# Команда: Запуск
cmd_start() {
    info "=== Запуск приложения ==="

    cd ${PROJECT_DIR}

    # Проверки
    check_env_files || error "Настройте .env файлы перед запуском"

    # Создаем сеть если не существует
    docker network create eduplatform 2>/dev/null || true

    # Запускаем контейнеры
    info "Запуск контейнеров..."
    docker compose -f ${DOCKER_COMPOSE_FILE} up -d

    # Ждем запуска БД
    info "Ожидание запуска PostgreSQL..."
    sleep 10

    # Запускаем миграции
    run_migrations

    # Показываем статус
    info "=== Статус сервисов ==="
    docker compose -f ${DOCKER_COMPOSE_FILE} ps

    info "=== Приложение запущено ==="
    info "Frontend: http://localhost или https://yourdomain.com"
    info "Backend API: http://localhost:8000 или https://api.yourdomain.com"
    info "API Docs: http://localhost:8000/docs"
    info "Flower: http://localhost:5555 или https://flower.yourdomain.com"
}

# Команда: Остановка
cmd_stop() {
    info "=== Остановка приложения ==="

    cd ${PROJECT_DIR}
    docker compose -f ${DOCKER_COMPOSE_FILE} down

    info "Приложение остановлено"
}

# Команда: Перезапуск
cmd_restart() {
    info "=== Перезапуск приложения ==="

    cmd_stop
    sleep 5
    cmd_start
}

# Команда: Обновление
cmd_update() {
    info "=== Обновление приложения ==="

    cd ${PROJECT_DIR}

    # Бэкап перед обновлением
    warn "Создание бэкапа перед обновлением..."
    cmd_backup

    # Пул изменений
    info "Получение обновлений из Git..."
    git pull origin main || error "Не удалось получить обновления"

    # Останавливаем контейнеры
    info "Остановка контейнеров..."
    docker compose -f ${DOCKER_COMPOSE_FILE} down

    # Пересборка образов
    info "Пересборка образов..."
    docker compose -f ${DOCKER_COMPOSE_FILE} build --no-cache

    # Запуск
    info "Запуск обновленной версии..."
    docker compose -f ${DOCKER_COMPOSE_FILE} up -d

    # Миграции
    sleep 10
    run_migrations

    # Очистка старых образов
    info "Очистка неиспользуемых образов..."
    docker image prune -f

    info "=== Обновление завершено ==="
    docker compose -f ${DOCKER_COMPOSE_FILE} ps
}

# Команда: Бэкап
cmd_backup() {
    info "=== Создание бэкапа ==="

    cd ${PROJECT_DIR}

    BACKUP_DIR="${PROJECT_DIR}/backups"
    DATE=$(date +"%Y%m%d_%H%M%S")

    # PostgreSQL бэкап
    info "Бэкап PostgreSQL..."
    docker exec eduplatform-postgres pg_dump -U eduplatform eduplatform_prod | \
        gzip > ${BACKUP_DIR}/postgres/backup_${DATE}.sql.gz

    # Redis бэкап
    info "Бэкап Redis..."
    docker exec eduplatform-redis redis-cli SAVE
    docker cp eduplatform-redis:/data/dump.rdb ${BACKUP_DIR}/redis/dump_${DATE}.rdb

    # Бэкап файлов storage
    info "Бэкап файлов storage..."
    tar -czf ${BACKUP_DIR}/storage_${DATE}.tar.gz backend/storage

    info "=== Бэкап завершен ==="
    info "PostgreSQL: ${BACKUP_DIR}/postgres/backup_${DATE}.sql.gz"
    info "Redis: ${BACKUP_DIR}/redis/dump_${DATE}.rdb"
    info "Storage: ${BACKUP_DIR}/storage_${DATE}.tar.gz"
}

# Команда: Восстановление
cmd_restore() {
    if [[ -z "$2" ]]; then
        error "Укажите дату бэкапа: ./deploy.sh restore YYYYMMDD_HHMMSS"
    fi

    DATE=$2
    BACKUP_DIR="${PROJECT_DIR}/backups"

    info "=== Восстановление из бэкапа ${DATE} ==="

    # Останавливаем приложение
    warn "Остановка приложения..."
    docker compose -f ${DOCKER_COMPOSE_FILE} stop backend celery-worker

    # Восстанавливаем PostgreSQL
    if [[ -f "${BACKUP_DIR}/postgres/backup_${DATE}.sql.gz" ]]; then
        info "Восстановление PostgreSQL..."
        gunzip < ${BACKUP_DIR}/postgres/backup_${DATE}.sql.gz | \
            docker exec -i eduplatform-postgres psql -U eduplatform eduplatform_prod
    fi

    # Восстанавливаем Redis
    if [[ -f "${BACKUP_DIR}/redis/dump_${DATE}.rdb" ]]; then
        info "Восстановление Redis..."
        docker compose -f ${DOCKER_COMPOSE_FILE} stop redis
        docker cp ${BACKUP_DIR}/redis/dump_${DATE}.rdb eduplatform-redis:/data/dump.rdb
        docker compose -f ${DOCKER_COMPOSE_FILE} start redis
    fi

    # Восстанавливаем storage
    if [[ -f "${BACKUP_DIR}/storage_${DATE}.tar.gz" ]]; then
        info "Восстановление storage..."
        tar -xzf ${BACKUP_DIR}/storage_${DATE}.tar.gz -C ${PROJECT_DIR}
    fi

    # Запускаем приложение
    info "Запуск приложения..."
    docker compose -f ${DOCKER_COMPOSE_FILE} start backend celery-worker

    info "=== Восстановление завершено ==="
}

# Команда: Логи
cmd_logs() {
    cd ${PROJECT_DIR}

    if [[ -z "$2" ]]; then
        # Все логи
        docker compose -f ${DOCKER_COMPOSE_FILE} logs -f
    else
        # Логи конкретного сервиса
        docker compose -f ${DOCKER_COMPOSE_FILE} logs -f "$2"
    fi
}

# Команда: Статус
cmd_status() {
    info "=== Статус сервисов ==="

    cd ${PROJECT_DIR}
    docker compose -f ${DOCKER_COMPOSE_FILE} ps

    echo ""
    info "=== Health Check ==="

    # Backend
    if docker inspect --format='{{.State.Health.Status}}' eduplatform-backend 2>/dev/null; then
        info "Backend: $(docker inspect --format='{{.State.Health.Status}}' eduplatform-backend)"
    fi

    # Frontend
    if docker inspect --format='{{.State.Health.Status}}' eduplatform-frontend 2>/dev/null; then
        info "Frontend: $(docker inspect --format='{{.State.Health.Status}}' eduplatform-frontend)"
    fi

    # PostgreSQL
    if docker inspect --format='{{.State.Health.Status}}' eduplatform-postgres 2>/dev/null; then
        info "PostgreSQL: $(docker inspect --format='{{.State.Health.Status}}' eduplatform-postgres)"
    fi

    # Redis
    if docker inspect --format='{{.State.Health.Status}}' eduplatform-redis 2>/dev/null; then
        info "Redis: $(docker inspect --format='{{.State.Health.Status}}' eduplatform-redis)"
    fi

    echo ""
    info "=== Использование ресурсов ==="
    docker stats --no-stream
}

# Команда: Очистка
cmd_cleanup() {
    info "=== Очистка системы ==="

    info "Удаление неиспользуемых образов..."
    docker image prune -af

    info "Удаление неиспользуемых контейнеров..."
    docker container prune -f

    info "Удаление неиспользуемых томов..."
    docker volume prune -f

    info "Удаление неиспользуемых сетей..."
    docker network prune -f

    info "Удаление старых бэкапов (>30 дней)..."
    find ${PROJECT_DIR}/backups -name "backup_*.sql.gz" -mtime +30 -delete
    find ${PROJECT_DIR}/backups -name "dump_*.rdb" -mtime +30 -delete
    find ${PROJECT_DIR}/backups -name "storage_*.tar.gz" -mtime +30 -delete

    info "=== Очистка завершена ==="
}

# Главная функция
main() {
    case "${1:-}" in
        install)
            cmd_install
            ;;
        start)
            cmd_start
            ;;
        stop)
            cmd_stop
            ;;
        restart)
            cmd_restart
            ;;
        update)
            cmd_update
            ;;
        backup)
            cmd_backup
            ;;
        restore)
            cmd_restore "$@"
            ;;
        logs)
            cmd_logs "$@"
            ;;
        status)
            cmd_status
            ;;
        cleanup)
            cmd_cleanup
            ;;
        *)
            echo "EduPlatform - Production Deployment Script"
            echo ""
            echo "Использование: $0 [command]"
            echo ""
            echo "Команды:"
            echo "  install   - Полная установка (первый раз)"
            echo "  start     - Запустить приложение"
            echo "  stop      - Остановить приложение"
            echo "  restart   - Перезапустить приложение"
            echo "  update    - Обновить приложение (git pull + rebuild)"
            echo "  backup    - Создать бэкап (PostgreSQL, Redis, Storage)"
            echo "  restore   - Восстановить из бэкапа (укажите дату)"
            echo "  logs      - Показать логи (все или конкретного сервиса)"
            echo "  status    - Показать статус и health check"
            echo "  cleanup   - Очистить неиспользуемые Docker ресурсы"
            echo ""
            echo "Примеры:"
            echo "  $0 install"
            echo "  $0 start"
            echo "  $0 logs backend"
            echo "  $0 backup"
            echo "  $0 restore 20231201_120000"
            exit 1
            ;;
    esac
}

# Запуск
main "$@"
