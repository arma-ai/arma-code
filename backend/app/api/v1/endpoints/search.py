"""Web search endpoints for finding educational materials.
With AI answer fallback when no materials found."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.dependencies import get_current_active_user
from app.infrastructure.database.models.user import User
from app.schemas.search import SearchRequest, SearchResponse
from app.domain.services.web_search_service import WebSearchService

logger = logging.getLogger(__name__)

router = APIRouter()


class AIAnswerResponse(BaseModel):
    """Response with AI answer and optional search results."""
    query: str
    ai_answer: str
    results: list = []
    total_results: int = 0


@router.post("", response_model=SearchResponse)
async def search_web(
    search_request: SearchRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Search the web for educational materials.

    Searches for PDFs, YouTube videos, and web articles based on the query.
    Returns structured results that can be imported as materials.
    
    If no materials found, returns AI-generated answer directly.

    Args:
        search_request: Search parameters (query, types, limit)
        current_user: Current authenticated user

    Returns:
        SearchResponse: Search results grouped by type
    """
    try:
        search_service = WebSearchService()
        
        # First try to find materials
        results = await search_service.search(
            query=search_request.query,
            types=search_request.types,
            limit=search_request.limit
        )
        
        # If materials found, return them
        if results:
            return SearchResponse(
                query=search_request.query,
                results=results,
                total_results=len(results)
            )
        
        # No materials found - get AI answer directly
        logger.info(f"[Search] No materials found for '{search_request.query[:50]}...', getting AI answer")
        ai_answer = await search_service.get_ai_answer(search_request.query)
        
        return SearchResponse(
            query=search_request.query,
            results=[],
            total_results=0,
            ai_answer=ai_answer  # type: ignore
        )

    except Exception as e:
        logger.error(f"[Search] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )

