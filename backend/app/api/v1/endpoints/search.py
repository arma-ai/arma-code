"""Web search endpoints for finding educational materials."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import get_current_active_user
from app.infrastructure.database.models.user import User
from app.schemas.search import SearchRequest, SearchResponse
from app.domain.services.web_search_service import WebSearchService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("", response_model=SearchResponse)
async def search_web(
    search_request: SearchRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Search the web for educational materials.

    Searches for PDFs, YouTube videos, and web articles based on the query.
    Returns structured results that can be imported as materials.

    Args:
        search_request: Search parameters (query, types, limit)
        current_user: Current authenticated user

    Returns:
        SearchResponse: Search results grouped by type
    """
    try:
        search_service = WebSearchService()
        results = await search_service.search(
            query=search_request.query,
            types=search_request.types,
            limit=search_request.limit
        )

        return SearchResponse(
            query=search_request.query,
            results=results,
            total_results=len(results)
        )

    except Exception as e:
        logger.error(f"[Search] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )

