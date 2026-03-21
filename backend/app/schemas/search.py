"""
Search schemas for web search functionality.
"""
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field


class SearchResultType(str, Enum):
    """Type of search result."""
    PDF = "pdf"
    YOUTUBE = "youtube"
    ARTICLE = "article"


class SearchPhase(str, Enum):
    """Search response phase."""
    FAST = "fast"
    FULL = "full"


class SearchRequest(BaseModel):
    """Request schema for web search."""
    query: str = Field(..., min_length=1, max_length=500, description="Search query")
    types: List[SearchResultType] = Field(
        default=[SearchResultType.PDF, SearchResultType.YOUTUBE, SearchResultType.ARTICLE],
        description="Types of results to search for"
    )
    limit: int = Field(default=10, ge=1, le=50, description="Maximum results per type")
    phase: SearchPhase = Field(default=SearchPhase.FAST, description="Search phase")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "query": "machine learning basics",
                "types": ["pdf", "youtube", "article"],
                "limit": 10,
                "phase": "fast"
            }
        }
    )


class SearchResult(BaseModel):
    """Single search result."""
    title: str = Field(..., description="Title of the resource")
    url: str = Field(..., description="URL to the resource")
    description: Optional[str] = Field(None, description="Brief description")
    type: SearchResultType = Field(..., description="Type of resource")
    thumbnail_url: Optional[str] = Field(None, description="Thumbnail image URL")
    source: Optional[str] = Field(None, description="Source domain or channel")
    published_date: Optional[str] = Field(None, description="Publication date if available")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Introduction to Machine Learning - PDF",
                "url": "https://example.com/ml-intro.pdf",
                "description": "A comprehensive guide to ML basics",
                "type": "pdf",
                "thumbnail_url": None,
                "source": "example.com",
                "published_date": "2024-01-15"
            }
        }
    )


class SearchResponse(BaseModel):
    """Response schema for web search."""
    query: str = Field(..., description="Original search query")
    results: List[SearchResult] = Field(default=[], description="Search results")
    total_results: int = Field(default=0, description="Total number of results found")
    ai_answer: Optional[str] = Field(None, description="AI-generated answer when no materials found")
    is_partial: bool = Field(default=False, description="Whether more results may arrive in a later phase")
    pending_types: List[SearchResultType] = Field(default=[], description="Result types not included yet")
    cached: bool = Field(default=False, description="Whether the response was served from cache")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "query": "machine learning basics",
                "results": [],
                "total_results": 0,
                "ai_answer": "Machine learning is a subset of AI that...",
                "is_partial": True,
                "pending_types": ["article"],
                "cached": False
            }
        }
    )
