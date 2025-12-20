"""
API v1 Router - aggregates all endpoint routers
"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, materials, quiz, flashcards, search


api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(materials.router, prefix="/materials", tags=["Materials"])
api_router.include_router(quiz.router, prefix="/quiz", tags=["Quiz"])
api_router.include_router(flashcards.router, prefix="/flashcards", tags=["Flashcards"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])
