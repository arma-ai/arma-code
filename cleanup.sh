#!/bin/bash
###############################################################################
# EduPlatform - Cleanup Script
# Removes unnecessary files to keep the project clean
# 
# Usage: ./cleanup.sh
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         🧹 EduPlatform - Project Cleanup                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Confirm cleanup
log_warn "WARNING: This script will remove:"
echo ""
echo "  • Python caches (__pycache__, *.pyc)"
echo "  • pytest caches (.pytest_cache, .coverage)"
echo "  • Virtual environments (venv, .venv)"
echo "  • Node.js modules (node_modules)"
echo "  • Temporary files (*.tmp, *.bak, *.swp)"
echo "  • Redis dump files (dump.rdb)"
echo "  • Storage files (user uploads)"
echo ""
read -p "Continue? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Cleanup cancelled"
    exit 0
fi

echo ""
log_info "Starting cleanup..."
echo ""

cd "$SCRIPT_DIR"

# 1. Python caches
log_info "Removing Python caches..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "*.pyo" -delete 2>/dev/null || true
find . -name ".coverage" -delete 2>/dev/null || true
find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
log_success "Python caches removed"

# 2. Virtual environments
log_info "Removing virtual environments..."
rm -rf backend/venv 2>/dev/null || true
rm -rf backend/.venv 2>/dev/null || true
rm -rf venv 2>/dev/null || true
log_success "Virtual environments removed"

# 3. Node.js modules
log_info "Removing node_modules..."
rm -rf "Arma AI-Powered EdTech Interface Design/node_modules" 2>/dev/null || true
log_success "node_modules removed"

# 4. Runtime data
log_info "Removing runtime data..."
rm -f backend/dump.rdb 2>/dev/null || true
rm -rf backend/storage/* 2>/dev/null || true
log_success "Runtime data removed"

# 5. Temporary files
log_info "Removing temporary files..."
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name "*.bak" -delete 2>/dev/null || true
find . -name "*.swp" -delete 2>/dev/null || true
find . -name "*~" -delete 2>/dev/null || true
log_success "Temporary files removed"

# 6. IDE settings (optional)
log_warn "Remove IDE settings (.vscode, .idea)?"
read -p "  [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf .vscode 2>/dev/null || true
    rm -rf .idea 2>/dev/null || true
    log_success "IDE settings removed"
else
    log_info "IDE settings kept"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              ✅ CLEANUP COMPLETE                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

log_info "Files kept (not removed):"
echo ""
echo "  • .env files (contain secrets)"
echo "  • Documentation (README.md, etc.)"
echo "  • Configuration files"
echo "  • Source code"
echo ""

log_success "Project is now clean!"
log_info "To reinstall dependencies, run: ./install.sh"
echo ""
