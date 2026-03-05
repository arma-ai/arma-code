#!/bin/bash
# Script to test all API endpoints

API_URL="http://localhost:8000"
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}Testing EduPlatform API Endpoints${NC}\n"

# Test health
echo -n "Health check: "
HEALTH=$(curl -s ${API_URL}/health)
if echo "$HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

# Test root
echo -n "Root endpoint: "
ROOT=$(curl -s ${API_URL}/)
if echo "$ROOT" | grep -q "EduPlatform API"; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

# Test Swagger docs
echo -n "Swagger docs: "
DOCS=$(curl -s ${API_URL}/docs 2>&1)
if echo "$DOCS" | grep -q "Swagger"; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo -e "\n${BOLD}Available Endpoints (from Swagger):${NC}"
echo "  Auth:"
echo "    POST /api/v1/auth/register"
echo "    POST /api/v1/auth/login"
echo "    GET  /api/v1/auth/me"
echo ""
echo "  Materials:"
echo "    GET    /api/v1/materials"
echo "    POST   /api/v1/materials"
echo "    GET    /api/v1/materials/{id}"
echo "    PUT    /api/v1/materials/{id}"
echo "    DELETE /api/v1/materials/{id}"
echo "    POST   /api/v1/materials/{id}/process"
echo "    POST   /api/v1/materials/{id}/regenerate/summary"
echo "    POST   /api/v1/materials/{id}/regenerate/notes"
echo "    POST   /api/v1/materials/{id}/regenerate/flashcards"
echo "    POST   /api/v1/materials/{id}/regenerate/quiz"
echo "    POST   /api/v1/materials/{id}/tutor"
echo "    GET    /api/v1/materials/{id}/tutor/history"
echo ""
echo "  Quiz:"
echo "    GET  /api/v1/quiz/materials/{id}/quiz"
echo "    POST /api/v1/quiz/check"
echo "    POST /api/v1/quiz/attempt"
echo "    POST /api/v1/quiz/attempts/save"
echo "    GET  /api/v1/quiz/materials/{id}/quiz/attempts"
echo "    GET  /api/v1/quiz/materials/{id}/quiz/statistics"
echo ""
echo "  Flashcards:"
echo "    GET  /api/v1/flashcards/materials/{id}"
echo ""
echo -e "\n${BOLD}Swagger UI available at:${NC} ${API_URL}/docs"
echo -e "${BOLD}ReDoc available at:${NC} ${API_URL}/redoc"
