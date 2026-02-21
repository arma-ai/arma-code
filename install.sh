#!/bin/bash
###############################################################################
# EduPlatform - Unified Install & Launch Script
# Installs dependencies, prompts for API keys, and launches the project
# 
# Usage: ./install.sh
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend"
FRONTEND_DIR="${SCRIPT_DIR}/Arma AI-Powered EdTech Interface Design"

# Files
ENV_FILE="${SCRIPT_DIR}/.env"
BACKEND_ENV="${BACKEND_DIR}/.env"
FRONTEND_ENV="${FRONTEND_DIR}/.env.local"

# PIDs
BACKEND_PID=""
FRONTEND_PID=""
CELERY_PID=""

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { echo -e "${CYAN}>>>${NC} $1"; }

show_banner() {
    echo ""
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║         🚀 EduPlatform - Install & Launch                    ║"
    echo "║         AI-Powered Educational Platform                      ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

show_welcome() {
    echo "Welcome to EduPlatform!"
    echo ""
    echo "This script will:"
    echo "  1. Check system requirements"
    echo "  2. Install all dependencies"
    echo "  3. Prompt for API keys"
    echo "  4. Setup database"
    echo "  5. Launch all services"
    echo ""
    echo "Required API Keys:"
    echo "  • OpenAI API Key (for AI features)"
    echo "  • Tavily API Key (for web search) - Optional"
    echo ""
    echo "Get your keys:"
    echo "  OpenAI: https://platform.openai.com/api-keys"
    echo "  Tavily: https://tavily.com/"
    echo ""
}

check_requirements() {
    log_step "Checking system requirements..."
    
    local missing=0
    
    # Python
    if command -v python3 &> /dev/null; then
        log_success "Python 3: $(python3 --version)"
    else
        log_error "Python 3 not found! Install from https://python.org"
        missing=1
    fi
    
    # Node.js
    if command -v node &> /dev/null; then
        log_success "Node.js: $(node --version)"
    else
        log_error "Node.js not found! Install from https://nodejs.org"
        missing=1
    fi
    
    # npm
    if command -v npm &> /dev/null; then
        log_success "npm: $(npm --version)"
    else
        log_error "npm not found!"
        missing=1
    fi
    
    # pip
    if command -v pip3 &> /dev/null; then
        log_success "pip3: $(pip3 --version)"
    elif command -v pip &> /dev/null; then
        log_success "pip: $(pip --version)"
    else
        log_warn "pip not found"
    fi
    
    # Docker (optional)
    if command -v docker &> /dev/null; then
        log_success "Docker: $(docker --version)"
    else
        log_warn "Docker not found (optional, will use local services)"
    fi
    
    if [ $missing -ne 0 ]; then
        log_error "Some requirements are missing!"
        return 1
    fi
    
    log_success "All requirements met!"
    return 0
}

prompt_api_keys() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              🔑 API Keys Configuration                       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    # OpenAI API Key
    echo -n "Enter your OpenAI API Key (required): "
    read -r OPENAI_KEY
    while [ -z "$OPENAI_KEY" ]; do
        log_warn "OpenAI API Key is required!"
        echo -n "Enter your OpenAI API Key: "
        read -r OPENAI_KEY
    done
    
    # Tavily API Key (optional)
    echo -n "Enter your Tavily API Key (optional, press Enter to skip): "
    read -r TAVILY_KEY
    
    # Generate secure secrets
    log_info "Generating secure secrets..."
    SECRET_KEY=$(openssl rand -hex 32)
    JWT_SECRET_KEY=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
    
    echo ""
    log_success "API keys configured!"
}

create_env_files() {
    log_step "Creating environment files..."
    
    # Create root .env
    cat > "$ENV_FILE" << EOF
# Database
POSTGRES_USER=eduplatform
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=eduplatform_dev

# Redis
REDIS_URL=redis://localhost:6379/0

# OpenAI
OPENAI_API_KEY=${OPENAI_KEY}

# Tavily (Web Search)
TAVILY_API_KEY=${TAVILY_KEY:-your-tavily-key-here}

# JWT Secrets
SECRET_KEY=${SECRET_KEY}
JWT_SECRET_KEY=${JWT_SECRET_KEY}

# App
APP_ENV=development
DEBUG=True
EOF
    log_success "Created: .env"
    
    # Create backend/.env
    cp "$ENV_FILE" "$BACKEND_ENV"
    log_success "Created: backend/.env"
    
    # Create frontend/.env.local
    cat > "$FRONTEND_ENV" << 'EOF'
# Backend API URL
VITE_API_URL=http://localhost:8000/api/v1

# App Configuration
VITE_APP_NAME=Arma AI EdTech
EOF
    log_success "Created: frontend/.env.local"
    
    echo ""
    log_warn "IMPORTANT: Keep your .env files secure! Never commit them to Git."
}

install_backend() {
    log_step "Installing Backend dependencies..."
    
    cd "$BACKEND_DIR"
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        log_info "Creating Python virtual environment..."
        python3 -m venv venv
        log_success "Virtual environment created"
    else
        log_info "Virtual environment exists"
    fi
    
    # Activate and upgrade pip
    source venv/bin/activate
    pip install --upgrade pip -q
    
    # Install requirements
    if [ -f "requirements.txt" ]; then
        log_info "Installing Python packages..."
        pip install -r requirements.txt -q
        log_success "Backend dependencies installed"
    else
        log_error "requirements.txt not found!"
        return 1
    fi
    
    cd "$SCRIPT_DIR"
}

install_frontend() {
    log_step "Installing Frontend dependencies..."
    
    cd "$FRONTEND_DIR"
    
    # Install npm packages
    if [ -f "package.json" ]; then
        log_info "Installing Node.js packages..."
        npm install --silent
        log_success "Frontend dependencies installed"
    else
        log_error "package.json not found!"
        return 1
    fi
    
    cd "$SCRIPT_DIR"
}

setup_database() {
    log_step "Setting up Database..."
    
    # Check if PostgreSQL is running
    if sudo systemctl is-active postgresql &> /dev/null; then
        log_success "PostgreSQL is running"
    else
        log_warn "PostgreSQL not running. Starting..."
        sudo systemctl start postgresql || {
            log_error "Failed to start PostgreSQL!"
            return 1
        }
        log_success "PostgreSQL started"
    fi
    
    # Read password from .env if it exists, otherwise use generated one
    if [ -f "$BACKEND_ENV" ]; then
        log_info "Reading database password from backend/.env..."
        DB_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$BACKEND_ENV" | cut -d'=' -f2)
    fi
    
    # Create user and database
    log_info "Creating database user and database..."
    sudo -u postgres psql -c "CREATE USER eduplatform WITH PASSWORD '${DB_PASSWORD}' CREATEDB;" 2>/dev/null || {
        # If user exists, update password
        log_info "Updating user password..."
        sudo -u postgres psql -c "ALTER USER eduplatform WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || log_warn "Could not update user password"
    }
    
    sudo -u postgres psql -c "CREATE DATABASE eduplatform_dev OWNER eduplatform;" 2>/dev/null || log_warn "Database already exists"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE eduplatform_dev TO eduplatform;" 2>/dev/null || true
    
    # Enable pgvector extension
    log_info "Enabling pgvector extension..."
    sudo -u postgres psql -d eduplatform_dev -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || log_warn "Extension may already exist"
    
    # Check Redis
    log_info "Checking Redis..."
    if redis-cli ping &> /dev/null 2>&1; then
        log_success "Redis is running"
    else
        log_warn "Redis not running. Starting..."
        redis-server --daemonize yes || {
            log_error "Failed to start Redis!"
            return 1
        }
        sleep 2
        log_success "Redis started"
    fi
    
    log_success "Database setup complete!"
}

run_migrations() {
    log_step "Running database migrations..."
    
    cd "$BACKEND_DIR"
    source venv/bin/activate
    
    log_info "Applying Alembic migrations..."
    alembic upgrade head || {
        log_warn "Migration failed or already applied"
    }
    
    # Create admin user
    if [ -f "create_admin.py" ]; then
        log_info "Creating admin user..."
        python create_admin.py 2>/dev/null || log_warn "Admin user already exists"
    fi
    
    cd "$SCRIPT_DIR"
    log_success "Migrations complete!"
}

start_backend() {
    log_step "Starting Backend server..."
    
    cd "$BACKEND_DIR"
    source venv/bin/activate
    
    # Check if already running
    if curl -s http://localhost:8000/health &> /dev/null; then
        log_info "Backend already running on port 8000"
        return 0
    fi
    
    # Kill any existing process
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    sleep 1
    
    # Start uvicorn
    log_info "Starting FastAPI server on port 8000..."
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    echo $BACKEND_PID > /tmp/eduplatform_backend.pid
    
    # Wait for startup
    sleep 5
    
    # Verify
    if curl -s http://localhost:8000/health &> /dev/null; then
        log_success "Backend started: http://localhost:8000"
    else
        log_warn "Backend is starting..."
    fi
    
    cd "$SCRIPT_DIR"
}

start_frontend() {
    log_step "Starting Frontend server..."
    
    cd "$FRONTEND_DIR"
    
    # Check if already running
    if curl -s http://localhost:3000 &> /dev/null; then
        log_info "Frontend already running on port 3000"
        return 0
    fi
    
    # Kill any existing process
    pkill -f "vite" 2>/dev/null || true
    sleep 1
    
    # Start vite
    log_info "Starting Vite dev server on port 3000..."
    npm run dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > /tmp/eduplatform_frontend.pid
    
    # Wait for startup
    sleep 5
    
    cd "$SCRIPT_DIR"
    log_success "Frontend started: http://localhost:3000"
}

start_celery() {
    log_step "Starting Celery worker..."
    
    cd "$BACKEND_DIR"
    source venv/bin/activate
    
    # Check if already running
    if pgrep -f "celery" &> /dev/null; then
        log_info "Celery already running"
        return 0
    fi
    
    # Start celery
    log_info "Starting Celery worker..."
    celery -A app.infrastructure.queue.celery_app worker --loglevel=info --concurrency=2 &
    CELERY_PID=$!
    echo $CELERY_PID > /tmp/eduplatform_celery.pid
    
    cd "$SCRIPT_DIR"
    log_success "Celery worker started"
}

show_status() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              📊 Service Status                               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Backend
    if curl -s http://localhost:8000/health &> /dev/null; then
        echo -e "  Backend:     ${GREEN}✅ RUNNING${NC} (http://localhost:8000)"
        echo -e "               Swagger: ${BLUE}http://localhost:8000/docs${NC}"
    else
        echo -e "  Backend:     ${RED}❌ NOT RUNNING${NC}"
    fi
    
    # Frontend
    if curl -s http://localhost:3000 &> /dev/null; then
        echo -e "  Frontend:    ${GREEN}✅ RUNNING${NC} (http://localhost:3000)"
    else
        echo -e "  Frontend:    ${RED}❌ NOT RUNNING${NC}"
    fi
    
    # PostgreSQL
    if sudo systemctl is-active postgresql &> /dev/null; then
        echo -e "  PostgreSQL:  ${GREEN}✅ RUNNING${NC}"
    else
        echo -e "  PostgreSQL:  ${RED}❌ NOT RUNNING${NC}"
    fi
    
    # Redis
    if redis-cli ping &> /dev/null 2>&1; then
        echo -e "  Redis:       ${GREEN}✅ RUNNING${NC}"
    else
        echo -e "  Redis:       ${RED}❌ NOT RUNNING${NC}"
    fi
    
    # Celery
    if pgrep -f "celery" &> /dev/null; then
        echo -e "  Celery:      ${GREEN}✅ RUNNING${NC}"
    else
        echo -e "  Celery:      ${RED}❌ NOT RUNNING${NC}"
    fi
    
    echo ""
}

show_urls() {
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              🌐 Available URLs                               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Frontend:       http://localhost:3000"
    echo "  Backend API:    http://localhost:8000"
    echo "  Swagger (API):  http://localhost:8000/docs"
    echo "  ReDoc:          http://localhost:8000/redoc"
    echo "  Health Check:   http://localhost:8000/health"
    echo "  Metrics:        http://localhost:8000/metrics"
    echo ""
    echo "  Default Admin:"
    echo "  Email:    admin@example.com"
    echo "  Password: admin123"
    echo ""
}

stop_all() {
    log_step "Stopping all services..."
    
    # Stop by PID
    [ -f /tmp/eduplatform_backend.pid ] && kill $(cat /tmp/eduplatform_backend.pid) 2>/dev/null || true
    [ -f /tmp/eduplatform_frontend.pid ] && kill $(cat /tmp/eduplatform_frontend.pid) 2>/dev/null || true
    [ -f /tmp/eduplatform_celery.pid ] && kill $(cat /tmp/eduplatform_celery.pid) 2>/dev/null || true
    
    # Stop by process name
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "celery" 2>/dev/null || true
    
    # Remove PID files
    rm -f /tmp/eduplatform_*.pid
    
    log_success "All services stopped"
}

install_all() {
    show_banner
    show_welcome
    
    # 1. Check requirements
    check_requirements || exit 1
    echo ""
    
    # 2. Prompt for API keys
    prompt_api_keys
    echo ""
    
    # 3. Create env files
    create_env_files
    echo ""
    
    # 4. Install Backend
    install_backend
    echo ""
    
    # 5. Install Frontend
    install_frontend
    echo ""
    
    # 6. Setup Database
    setup_database
    echo ""
    
    # 7. Run Migrations
    run_migrations
    echo ""
    
    # 8. Start Services
    log_step "Starting all services..."
    echo ""
    
    start_backend
    start_frontend
    start_celery
    
    echo ""
    show_status
    show_urls
    
    log_success "════════════════════════════════════════════════════════"
    log_success "  INSTALLATION AND LAUNCH COMPLETE!"
    log_success "════════════════════════════════════════════════════════"
    echo ""
    log_info "To stop all services: ./cleanup.sh stop"
    log_info "Documentation: See README.md"
    echo ""
}

# Main function
main() {
    case "${1:-install}" in
        install|"")
            install_all
            ;;
        stop)
            stop_all
            ;;
        status)
            show_status
            ;;
        *)
            echo "Usage: $0 [install|stop|status]"
            echo ""
            echo "Commands:"
            echo "  install  - Install and launch (default)"
            echo "  stop     - Stop all services"
            echo "  status   - Show service status"
            exit 1
            ;;
    esac
}

# Run
main "$@"
