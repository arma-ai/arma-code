"""Web search endpoints for finding educational materials.
With AI answer fallback when no materials found."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.dependencies import get_current_active_user
from app.infrastructure.database.models.user import User
from app.schemas.search import SearchPhase, SearchRequest, SearchResponse
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
        search_result = await search_service.search(
            query=search_request.query,
            types=search_request.types,
            limit=search_request.limit,
            phase=search_request.phase,
        )

        if search_result.results:
            return SearchResponse(
                query=search_request.query,
                results=search_result.results,
                total_results=len(search_result.results),
                is_partial=search_result.is_partial,
                pending_types=search_result.pending_types,
                cached=search_result.cached,
            )

        if search_request.phase == SearchPhase.FAST:
            return SearchResponse(
                query=search_request.query,
                results=[],
                total_results=0,
                is_partial=search_result.is_partial,
                pending_types=search_result.pending_types,
                cached=search_result.cached,
            )

        logger.info(f"[Search] No materials found for '{search_request.query[:50]}...', getting AI answer")
        ai_answer = await search_service.get_ai_answer(search_request.query)

        return SearchResponse(
            query=search_request.query,
            results=[],
            total_results=0,
            ai_answer=ai_answer,  # type: ignore
            is_partial=search_result.is_partial,
            pending_types=search_result.pending_types,
            cached=search_result.cached,
        )

    except Exception as e:
        logger.error(f"[Search] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )
