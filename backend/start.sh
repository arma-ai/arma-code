#!/bin/bash
# Startup script for EduPlatform Backend
# This script ensures all environment variables are loaded correctly

set -e

cd "$(dirname "$0")"

# Load .env file explicitly
export $(grep -v '^#' .env | xargs)

# Start uvicorn
echo "Starting EduPlatform Backend..."
echo "API Docs: http://localhost:8000/docs"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
