"""
Web Search Service using Tavily API.
Searches for educational materials: PDFs, YouTube videos, and articles.
"""
import logging
import re
from typing import List, Optional
from urllib.parse import urlparse

from tavily import TavilyClient

from app.core.config import settings
from app.schemas.search import SearchResult, SearchResultType

logger = logging.getLogger(__name__)


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
        """Search for PDF documents."""
        try:
            # Search specifically for PDFs
            search_query = f"{query} filetype:pdf"
            response = self.client.search(
                query=search_query,
                search_depth="advanced",
                max_results=limit,
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

            logger.info(f"[WebSearch] Found {len(results)} PDF results")
            return results[:limit]

        except Exception as e:
            logger.error(f"[WebSearch] Error searching PDFs: {str(e)}")
            return []

    async def _search_youtube(self, query: str, limit: int) -> List[SearchResult]:
        """Search for YouTube videos."""
        try:
            # Search specifically for YouTube videos
            search_query = f"{query} site:youtube.com"
            response = self.client.search(
                query=search_query,
                search_depth="basic",
                max_results=limit * 2,  # Get more to filter
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

            logger.info(f"[WebSearch] Found {len(results)} YouTube results")
            return results[:limit]

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

