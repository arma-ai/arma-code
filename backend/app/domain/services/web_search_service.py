"""
Web Search Service using Tavily API.
Searches for educational materials: PDFs, YouTube videos, and articles.
"""
import asyncio
import logging
import re
from typing import Callable, List, Optional
from urllib.parse import urlparse

import httpx
from tavily import TavilyClient

from app.core.config import settings
from app.schemas.search import SearchResult, SearchResultType

logger = logging.getLogger(__name__)

# Multiplier for fetching extra results to filter
VALIDATION_FETCH_MULTIPLIER = 3


class WebSearchService:
    """Service for searching educational materials on the web."""

    def __init__(self):
        self.client = TavilyClient(api_key=settings.TAVILY_API_KEY)

    async def search(
        self,
        query: str,
        types: List[SearchResultType],
        limit: int = 10
    ) -> List[SearchResult]:
        """
        Search for educational materials.

        Args:
            query: Search query (topic to learn)
            types: Types of results to search for
            limit: Maximum results per type

        Returns:
            List of SearchResult objects
        """
        results: List[SearchResult] = []

        try:
            # Search for each type
            if SearchResultType.PDF in types:
                pdf_results = await self._search_pdfs(query, limit)
                results.extend(pdf_results)

            if SearchResultType.YOUTUBE in types:
                youtube_results = await self._search_youtube(query, limit)
                results.extend(youtube_results)

            if SearchResultType.ARTICLE in types:
                article_results = await self._search_articles(query, limit)
                results.extend(article_results)

            logger.info(f"[WebSearch] Found {len(results)} results for query: {query}")
            return results

        except Exception as e:
            logger.error(f"[WebSearch] Error searching: {str(e)}")
            raise

    async def _search_pdfs(self, query: str, limit: int) -> List[SearchResult]:
        """Search for PDF documents with accessibility validation."""
        try:
            # Fetch more results to account for inaccessible URLs
            fetch_limit = limit * VALIDATION_FETCH_MULTIPLIER

            # Search specifically for PDFs
            search_query = f"{query} filetype:pdf"
            response = self.client.search(
                query=search_query,
                search_depth="advanced",
                max_results=fetch_limit,
                include_domains=["arxiv.org", "researchgate.net", "academia.edu", "springer.com", "ieee.org"]
            )

            results = []
            for item in response.get("results", []):
                url = item.get("url", "")
                # Filter only PDF URLs or known PDF sources
                if ".pdf" in url.lower() or "arxiv.org" in url or "researchgate" in url:
                    results.append(SearchResult(
                        title=item.get("title", "Untitled PDF"),
                        url=url,
                        description=item.get("content", "")[:300] if item.get("content") else None,
                        type=SearchResultType.PDF,
                        source=self._extract_domain(url),
                        published_date=item.get("published_date")
                    ))

            logger.info(f"[WebSearch] Found {len(results)} PDF results, validating accessibility...")

            # Validate URLs and filter inaccessible ones
            validated_results = await self._filter_accessible_results(
                results,
                self._validate_pdf_url,
                limit
            )

            return validated_results

        except Exception as e:
            logger.error(f"[WebSearch] Error searching PDFs: {str(e)}")
            return []

    async def _search_youtube(self, query: str, limit: int) -> List[SearchResult]:
        """Search for YouTube videos with accessibility validation."""
        try:
            # Fetch more results to account for inaccessible videos
            fetch_limit = limit * VALIDATION_FETCH_MULTIPLIER

            # Search specifically for YouTube videos
            search_query = f"{query} site:youtube.com"
            response = self.client.search(
                query=search_query,
                search_depth="basic",
                max_results=fetch_limit,
                include_domains=["youtube.com", "youtu.be"]
            )

            results = []
            for item in response.get("results", []):
                url = item.get("url", "")
                # Filter only YouTube URLs
                if "youtube.com/watch" in url or "youtu.be/" in url:
                    # Extract video ID for thumbnail
                    video_id = self._extract_youtube_id(url)
                    thumbnail = f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg" if video_id else None

                    results.append(SearchResult(
                        title=item.get("title", "Untitled Video"),
                        url=url,
                        description=item.get("content", "")[:300] if item.get("content") else None,
                        type=SearchResultType.YOUTUBE,
                        thumbnail_url=thumbnail,
                        source="YouTube",
                        published_date=item.get("published_date")
                    ))

            logger.info(f"[WebSearch] Found {len(results)} YouTube results, validating accessibility...")

            # Validate URLs and filter inaccessible ones
            validated_results = await self._filter_accessible_results(
                results,
                self._validate_youtube_url,
                limit
            )

            return validated_results

        except Exception as e:
            logger.error(f"[WebSearch] Error searching YouTube: {str(e)}")
            return []

    async def _search_articles(self, query: str, limit: int) -> List[SearchResult]:
        """Search for web articles."""
        try:
            # Search for educational articles
            search_query = f"{query} tutorial OR guide OR learn OR course"
            response = self.client.search(
                query=search_query,
                search_depth="advanced",
                max_results=limit,
                exclude_domains=["youtube.com", "youtu.be"]
            )

            results = []
            for item in response.get("results", []):
                url = item.get("url", "")
                # Skip PDFs (they're handled separately)
                if ".pdf" in url.lower():
                    continue

                results.append(SearchResult(
                    title=item.get("title", "Untitled Article"),
                    url=url,
                    description=item.get("content", "")[:300] if item.get("content") else None,
                    type=SearchResultType.ARTICLE,
                    source=self._extract_domain(url),
                    published_date=item.get("published_date")
                ))

            logger.info(f"[WebSearch] Found {len(results)} article results")
            return results[:limit]

        except Exception as e:
            logger.error(f"[WebSearch] Error searching articles: {str(e)}")
            return []

    def _extract_domain(self, url: str) -> Optional[str]:
        """Extract domain from URL."""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc
            # Remove www. prefix
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except Exception:
            return None

    def _extract_youtube_id(self, url: str) -> Optional[str]:
        """Extract YouTube video ID from URL."""
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})',
            r'youtube\.com\/embed\/([a-zA-Z0-9_-]{11})',
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    async def _validate_pdf_url(self, url: str) -> bool:
        """
        Check if PDF URL is accessible and contains valid PDF content.

        First tries HEAD request, then does a partial GET to verify magic bytes.
        Returns True if the URL responds with 200 and content starts with %PDF-.
        """
        try:
            async with httpx.AsyncClient(
                timeout=15.0,
                follow_redirects=True,
                limits=httpx.Limits(max_connections=10)
            ) as client:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/pdf,*/*"
                }

                # First try HEAD to check status
                response = await client.head(url, headers=headers)

                if response.status_code != 200:
                    logger.debug(f"[WebSearch] PDF validation failed for {url}: status {response.status_code}")
                    return False

                content_type = response.headers.get("content-type", "").lower()

                # If content-type clearly indicates PDF, trust it
                if "pdf" in content_type:
                    return True

                # If URL ends with .pdf but content-type is uncertain, verify with partial GET
                if url.lower().endswith(".pdf") or "octet-stream" in content_type:
                    # Fetch first 10 bytes to check magic bytes
                    response = await client.get(
                        url,
                        headers={**headers, "Range": "bytes=0-9"}
                    )

                    if response.status_code in (200, 206):
                        content = response.content
                        if content.startswith(b'%PDF-'):
                            return True
                        # Check if it's HTML (error page)
                        if b'<!DOCTYPE' in content or b'<html' in content.lower():
                            logger.debug(f"[WebSearch] PDF validation failed for {url}: got HTML instead of PDF")
                            return False

                logger.debug(f"[WebSearch] PDF validation failed for {url}: content-type {content_type}")
                return False

        except Exception as e:
            logger.debug(f"[WebSearch] PDF validation error for {url}: {str(e)}")
            return False

    async def _validate_youtube_url(self, url: str) -> bool:
        """
        Check if YouTube video is accessible via oEmbed API.

        The oEmbed API returns 200 for public videos and 401/404 for
        private/deleted/unavailable videos.
        """
        video_id = self._extract_youtube_id(url)
        if not video_id:
            logger.debug(f"[WebSearch] YouTube validation failed: no video ID in {url}")
            return False

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                oembed_url = f"https://www.youtube.com/oembed?url=https://youtube.com/watch?v={video_id}&format=json"
                response = await client.get(oembed_url)

                if response.status_code != 200:
                    logger.debug(f"[WebSearch] YouTube validation failed for {video_id}: status {response.status_code}")
                    return False

                return True

        except Exception as e:
            logger.debug(f"[WebSearch] YouTube validation error for {video_id}: {str(e)}")
            return False

    async def _filter_accessible_results(
        self,
        results: List[SearchResult],
        validator: Callable[[str], bool],
        limit: int
    ) -> List[SearchResult]:
        """
        Filter results by checking accessibility in parallel.

        Args:
            results: List of search results to validate
            validator: Async function that takes URL and returns bool
            limit: Maximum number of valid results to return

        Returns:
            List of accessible SearchResult objects (up to limit)
        """
        if not results:
            return []

        # Check all URLs in parallel
        validation_tasks = [validator(r.url) for r in results]
        checks = await asyncio.gather(*validation_tasks, return_exceptions=True)

        # Filter valid results
        valid_results = []
        for result, is_valid in zip(results, checks):
            # Treat exceptions as invalid
            if is_valid is True:
                valid_results.append(result)
                if len(valid_results) >= limit:
                    break

        logger.info(f"[WebSearch] Validated {len(valid_results)}/{len(results)} results as accessible")
        return valid_results

