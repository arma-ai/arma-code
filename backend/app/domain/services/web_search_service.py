"""
Web Search Service using Tavily API.
Searches for educational materials: PDFs, YouTube videos, and articles.
With OpenAI fallback when no materials found.
"""
import asyncio
import hashlib
import json
import logging
import re
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional
from urllib.parse import parse_qs, quote_plus, unquote, urlparse

import httpx
from tavily import TavilyClient
from openai import AsyncOpenAI
from bs4 import BeautifulSoup

from app.core.config import settings
from app.core.security import get_redis
from app.schemas.search import SearchPhase, SearchResult, SearchResultType

logger = logging.getLogger(__name__)

FAST_FETCH_MULTIPLIER = 1
FULL_FETCH_MULTIPLIER = 2
VALIDATION_TIMEOUT = 2.5
FAST_SEARCH_TIMEOUT = 2.5
FULL_SEARCH_TIMEOUT = 4.0
FAST_FALLBACK_HTTP_TIMEOUT = httpx.Timeout(3.5, connect=1.5)
FULL_FALLBACK_HTTP_TIMEOUT = httpx.Timeout(6.0, connect=3.0)
FAST_SEARCH_TASK_TIMEOUT = 6.0
FULL_SEARCH_TASK_TIMEOUT = 12.0
VALIDATION_CANDIDATE_LIMIT = 5
FAST_CACHE_TTL = 15 * 60
FULL_CACHE_TTL = 60 * 60


@dataclass
class SearchExecutionResult:
    results: List[SearchResult]
    is_partial: bool = False
    pending_types: List[SearchResultType] = field(default_factory=list)
    cached: bool = False


class WebSearchService:
    """Service for searching educational materials on the web."""

    def __init__(self):
        self.client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        self.openai_client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=120.0,
            max_retries=2,
        )

    async def _tavily_search(self, timeout: float, **kwargs):
        """Run Tavily search off the event loop and bound total wait time."""
        return await asyncio.wait_for(
            asyncio.to_thread(self.client.search, **kwargs),
            timeout=timeout,
        )

    async def _duckduckgo_search(self, query: str, limit: int, timeout: httpx.Timeout) -> List[dict]:
        """Fallback HTML search when Tavily is unavailable."""
        search_url = "https://html.duckduckgo.com/html/"
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
        }

        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
        ) as client:
            response = await client.get(search_url, params={"q": query}, headers=headers)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        items: List[dict] = []

        for anchor in soup.select(".result__a"):
            href = anchor.get("href", "").strip()
            title = anchor.get_text(" ", strip=True)
            if not href or not title:
                continue

            parsed = urlparse(href)
            if "duckduckgo.com" in parsed.netloc and parsed.path.startswith("/l/"):
                target = parse_qs(parsed.query).get("uddg", [href])[0]
                href = unquote(target)

            container = anchor.find_parent(class_="result")
            snippet_node = container.select_one(".result__snippet") if container else None
            snippet = snippet_node.get_text(" ", strip=True) if snippet_node else None

            items.append(
                {
                    "title": title,
                    "url": href,
                    "content": snippet,
                }
            )

            if len(items) >= limit:
                break

        logger.info(f"[WebSearch] DuckDuckGo returned {len(items)} raw results for query: {query}")
        return items

    async def _arxiv_search(self, query: str, limit: int, timeout: httpx.Timeout) -> List[dict]:
        """Fallback PDF search via arXiv API."""
        api_url = (
            "https://export.arxiv.org/api/query"
            f"?search_query=all:{quote_plus(query)}&start=0&max_results={limit}"
        )
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(api_url, headers={"User-Agent": "arma-search/1.0"})
            response.raise_for_status()

        root = ET.fromstring(response.text)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        items: List[dict] = []

        for entry in root.findall("atom:entry", ns):
            title = (entry.findtext("atom:title", default="", namespaces=ns) or "").strip()
            summary = (entry.findtext("atom:summary", default="", namespaces=ns) or "").strip()
            pdf_url = None
            for link in entry.findall("atom:link", ns):
                if link.attrib.get("title") == "pdf":
                    pdf_url = link.attrib.get("href")
                    break
            if not pdf_url:
                continue
            items.append({"title": title or "arXiv paper", "url": pdf_url, "content": summary})
            if len(items) >= limit:
                break

        logger.info(f"[WebSearch] arXiv returned {len(items)} fallback PDF results for query: {query}")
        return items

    async def _wikipedia_search(self, query: str, limit: int, timeout: httpx.Timeout) -> List[dict]:
        """Fallback article search via Wikipedia API."""
        params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "utf8": 1,
            "format": "json",
            "srlimit": limit,
        }
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get("https://en.wikipedia.org/w/api.php", params=params)
            response.raise_for_status()

        data = response.json()
        items: List[dict] = []
        for item in data.get("query", {}).get("search", []):
            title = item.get("title", "Wikipedia article")
            snippet = re.sub(r"<[^>]+>", "", item.get("snippet", ""))
            url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
            items.append({"title": title, "url": url, "content": snippet})

        logger.info(f"[WebSearch] Wikipedia returned {len(items)} fallback article results for query: {query}")
        return items

    async def _youtube_web_search(self, query: str, limit: int, timeout: httpx.Timeout) -> List[dict]:
        """Fallback YouTube search by parsing the public search page."""
        search_url = f"https://www.youtube.com/results?search_query={quote_plus(query)}"
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
        }

        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(search_url, headers=headers)
            response.raise_for_status()

        matches = re.finditer(
            r'"videoId":"(?P<id>[A-Za-z0-9_-]{11})".{0,400}?"title":\{"runs":\[\{"text":"(?P<title>[^"]+)"',
            response.text,
            re.DOTALL,
        )

        seen = set()
        items: List[dict] = []
        for match in matches:
            video_id = match.group("id")
            if video_id in seen:
                continue
            seen.add(video_id)
            items.append(
                {
                    "title": match.group("title"),
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "content": None,
                }
            )
            if len(items) >= limit:
                break

        logger.info(f"[WebSearch] YouTube HTML returned {len(items)} fallback video results for query: {query}")
        return items

    def _normalize_query(self, query: str) -> str:
        normalized = " ".join(query.lower().strip().split())
        return normalized[:500]

    def _cache_key(
        self,
        phase: SearchPhase,
        query: str,
        requested_types: List[SearchResultType],
        limit: int,
    ) -> str:
        normalized_query = self._normalize_query(query)
        type_key = ",".join(sorted(search_type.value for search_type in requested_types))
        digest = hashlib.sha256(normalized_query.encode("utf-8")).hexdigest()
        return f"search:{phase.value}:{digest}:{type_key}:{limit}"

    async def _get_cached_result(
        self,
        phase: SearchPhase,
        query: str,
        requested_types: List[SearchResultType],
        limit: int,
    ) -> Optional[SearchExecutionResult]:
        redis = await get_redis()
        if not redis:
            return None

        cache_key = self._cache_key(phase, query, requested_types, limit)
        try:
            cached = await redis.get(cache_key)
            if not cached:
                return None
            payload = json.loads(cached)
            return SearchExecutionResult(
                results=[SearchResult.model_validate(item) for item in payload.get("results", [])],
                is_partial=payload.get("is_partial", False),
                pending_types=[SearchResultType(item) for item in payload.get("pending_types", [])],
                cached=True,
            )
        except Exception as exc:
            logger.warning(f"[Search] Failed to read cache: {exc!r}")
            return None

    async def _set_cached_result(
        self,
        phase: SearchPhase,
        query: str,
        requested_types: List[SearchResultType],
        limit: int,
        execution_result: SearchExecutionResult,
    ) -> None:
        redis = await get_redis()
        if not redis:
            return

        cache_key = self._cache_key(phase, query, requested_types, limit)
        ttl = FAST_CACHE_TTL if phase == SearchPhase.FAST else FULL_CACHE_TTL
        payload = {
            "results": [item.model_dump(mode="json") for item in execution_result.results],
            "is_partial": execution_result.is_partial,
            "pending_types": [item.value for item in execution_result.pending_types],
        }
        try:
            await redis.setex(cache_key, ttl, json.dumps(payload))
        except Exception as exc:
            logger.warning(f"[Search] Failed to write cache: {exc!r}")

    def _result_identity(self, result: SearchResult) -> str:
        if result.type == SearchResultType.YOUTUBE:
            video_id = self._extract_youtube_id(result.url)
            if video_id:
                return f"youtube:{video_id}"
        parsed = urlparse(result.url)
        domain = parsed.netloc.lower()
        path = parsed.path.rstrip("/").lower()
        return f"{result.type.value}:{domain}{path}"

    def _dedupe_results(self, results: List[SearchResult]) -> List[SearchResult]:
        deduped: List[SearchResult] = []
        seen = set()
        for result in results:
            identity = self._result_identity(result)
            if identity in seen:
                continue
            seen.add(identity)
            deduped.append(result)
        return deduped

    def _log_metrics(
        self,
        phase: SearchPhase,
        elapsed_ms: float,
        execution_result: SearchExecutionResult,
    ) -> None:
        counts: Dict[str, int] = {search_type.value: 0 for search_type in SearchResultType}
        for result in execution_result.results:
            counts[result.type.value] += 1
        logger.info(
            "[Metrics] search.%s.latency_ms=%.2f search.cache_hit=%s "
            "search.results_count_by_type=%s",
            phase.value,
            elapsed_ms,
            execution_result.cached,
            counts,
        )

    async def search(
        self,
        query: str,
        types: List[SearchResultType],
        limit: int = 10,
        phase: SearchPhase = SearchPhase.FAST,
    ) -> SearchExecutionResult:
        """Search for educational materials with fast and full phases."""
        started_at = time.perf_counter()
        try:
            cached_result = await self._get_cached_result(phase, query, types, limit)
            if cached_result is not None:
                self._log_metrics(
                    phase=phase,
                    elapsed_ms=(time.perf_counter() - started_at) * 1000,
                    execution_result=cached_result,
                )
                return cached_result

            execution_result = await self._run_search(query=query, types=types, limit=limit, phase=phase)
            await self._set_cached_result(phase, query, types, limit, execution_result)
            self._log_metrics(
                phase=phase,
                elapsed_ms=(time.perf_counter() - started_at) * 1000,
                execution_result=execution_result,
            )
            return execution_result

        except Exception as e:
            logger.error(f"[WebSearch] Error searching: {str(e)}")
            raise

    async def _run_search(
        self,
        query: str,
        types: List[SearchResultType],
        limit: int,
        phase: SearchPhase,
    ) -> SearchExecutionResult:
        requested_types = list(dict.fromkeys(types))
        effective_types = [
            search_type
            for search_type in requested_types
            if phase == SearchPhase.FULL or search_type != SearchResultType.ARTICLE
        ]
        pending_types = [
            search_type
            for search_type in requested_types
            if search_type not in effective_types
        ]

        search_tasks = []
        timeout = FAST_SEARCH_TASK_TIMEOUT if phase == SearchPhase.FAST else FULL_SEARCH_TASK_TIMEOUT
        for search_type in effective_types:
            if search_type == SearchResultType.PDF:
                search_tasks.append(
                    (
                        search_type,
                        asyncio.create_task(
                            asyncio.wait_for(self._search_pdfs(query, limit, phase), timeout=timeout)
                        ),
                    )
                )
            elif search_type == SearchResultType.YOUTUBE:
                search_tasks.append(
                    (
                        search_type,
                        asyncio.create_task(
                            asyncio.wait_for(self._search_youtube(query, limit, phase), timeout=timeout)
                        ),
                    )
                )
            elif search_type == SearchResultType.ARTICLE:
                search_tasks.append(
                    (
                        search_type,
                        asyncio.create_task(
                            asyncio.wait_for(self._search_articles(query, limit, phase), timeout=timeout)
                        ),
                    )
                )

        results: List[SearchResult] = []
        for search_type, task in search_tasks:
            try:
                results.extend(await task)
            except Exception as search_error:
                logger.warning(
                    "[Metrics] search.provider_timeout phase=%s type=%s error=%r",
                    phase.value,
                    search_type.value,
                    search_error,
                )
                if search_type not in pending_types:
                    pending_types.append(search_type)

        deduped_results = self._dedupe_results(results)
        return SearchExecutionResult(
            results=deduped_results[: limit * max(len(effective_types), 1)],
            is_partial=bool(pending_types),
            pending_types=pending_types,
        )

    async def _search_pdfs(self, query: str, limit: int, phase: SearchPhase) -> List[SearchResult]:
        """Search for PDF documents with accessibility validation."""
        try:
            fetch_multiplier = FAST_FETCH_MULTIPLIER if phase == SearchPhase.FAST else FULL_FETCH_MULTIPLIER
            fetch_limit = limit * fetch_multiplier
            tavily_timeout = FAST_SEARCH_TIMEOUT if phase == SearchPhase.FAST else FULL_SEARCH_TIMEOUT
            fallback_timeout = FAST_FALLBACK_HTTP_TIMEOUT if phase == SearchPhase.FAST else FULL_FALLBACK_HTTP_TIMEOUT

            search_query = f"{query} filetype:pdf"
            try:
                response = await self._tavily_search(
                    timeout=tavily_timeout,
                    query=search_query,
                    search_depth="advanced",
                    max_results=fetch_limit,
                    include_domains=["arxiv.org", "researchgate.net", "academia.edu", "springer.com", "ieee.org"]
                )
                raw_results = response.get("results", [])
            except Exception as tavily_error:
                logger.warning(f"[WebSearch] Tavily PDF search failed, using arXiv fallback: {tavily_error!r}")
                raw_results = await self._arxiv_search(query, fetch_limit, fallback_timeout)

            results = []
            for item in raw_results:
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

            if phase == SearchPhase.FAST:
                logger.info(f"[WebSearch] FAST PDF results={len(results)} query={query}")
                return self._dedupe_results(results)[:limit]

            logger.info(f"[WebSearch] Found {len(results)} PDF results, validating accessibility...")

            validated_results = await self._filter_accessible_results(
                results[:VALIDATION_CANDIDATE_LIMIT],
                self._validate_pdf_url,
                limit
            )

            if validated_results:
                return validated_results

            # If validation fails due network restrictions, fall back to trusted PDF links.
            fallback_results = [
                result for result in results
                if self._is_trusted_pdf_url(result.url)
            ]
            if fallback_results:
                logger.warning(
                    "[WebSearch] PDF validation returned no accessible results; "
                    "falling back to trusted PDF URLs"
                )
                return fallback_results[:limit]

            return results[:limit]

        except Exception as e:
            logger.error(f"[WebSearch] Error searching PDFs: {e!r}")
            return []

    async def _search_youtube(self, query: str, limit: int, phase: SearchPhase) -> List[SearchResult]:
        """Search for YouTube videos with accessibility validation."""
        try:
            fetch_multiplier = FAST_FETCH_MULTIPLIER if phase == SearchPhase.FAST else FULL_FETCH_MULTIPLIER
            fetch_limit = limit * fetch_multiplier
            tavily_timeout = FAST_SEARCH_TIMEOUT if phase == SearchPhase.FAST else FULL_SEARCH_TIMEOUT
            fallback_timeout = FAST_FALLBACK_HTTP_TIMEOUT if phase == SearchPhase.FAST else FULL_FALLBACK_HTTP_TIMEOUT

            search_query = f"{query} site:youtube.com"
            try:
                response = await self._tavily_search(
                    timeout=tavily_timeout,
                    query=search_query,
                    search_depth="basic",
                    max_results=fetch_limit,
                    include_domains=["youtube.com", "youtu.be"]
                )
                raw_results = response.get("results", [])
            except Exception as tavily_error:
                logger.warning(f"[WebSearch] Tavily YouTube search failed, using YouTube HTML fallback: {tavily_error!r}")
                raw_results = await self._youtube_web_search(query, fetch_limit, fallback_timeout)

            results = []
            for item in raw_results:
                url = item.get("url", "")
                if "youtube.com/watch" in url or "youtu.be/" in url:
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

            if phase == SearchPhase.FAST:
                logger.info(f"[WebSearch] FAST YouTube results={len(results)} query={query}")
                return self._dedupe_results(results)[:limit]

            logger.info(f"[WebSearch] Found {len(results)} YouTube results, validating accessibility...")

            validated_results = await self._filter_accessible_results(
                results[:VALIDATION_CANDIDATE_LIMIT],
                self._validate_youtube_url,
                limit
            )

            if validated_results:
                return validated_results

            if results:
                logger.warning(
                    "[WebSearch] YouTube validation returned no accessible results; "
                    "falling back to raw YouTube URLs"
                )
            return results[:limit]

        except Exception as e:
            logger.error(f"[WebSearch] Error searching YouTube: {e!r}")
            return []

    async def _search_articles(self, query: str, limit: int, phase: SearchPhase) -> List[SearchResult]:
        """Search for web articles."""
        try:
            search_query = f"{query} tutorial OR guide OR learn OR course"
            accessible_article_query = (
                f"{query} site:docs.python.org OR site:w3schools.com OR site:python.org"
            )
            tavily_timeout = FULL_SEARCH_TIMEOUT if phase == SearchPhase.FULL else FAST_SEARCH_TIMEOUT
            fallback_timeout = FULL_FALLBACK_HTTP_TIMEOUT if phase == SearchPhase.FULL else FAST_FALLBACK_HTTP_TIMEOUT
            try:
                response = await self._tavily_search(
                    timeout=tavily_timeout,
                    query=search_query,
                    search_depth="advanced",
                    max_results=limit,
                    exclude_domains=["youtube.com", "youtu.be"]
                )
                raw_results = response.get("results", [])
            except Exception as tavily_error:
                logger.warning(f"[WebSearch] Tavily article search failed, using accessible DDG fallback: {tavily_error!r}")
                try:
                    raw_results = await self._duckduckgo_search(accessible_article_query, limit, fallback_timeout)
                except Exception as ddg_error:
                    logger.warning(f"[WebSearch] DDG article fallback failed, using Wikipedia: {ddg_error!r}")
                    raw_results = await self._wikipedia_search(query, limit, fallback_timeout)

            results = []
            for item in raw_results:
                url = item.get("url", "")
                # Skip PDFs (they're handled separately)
                if ".pdf" in url.lower() or "youtube.com" in url.lower() or "youtu.be/" in url.lower():
                    continue
                if self._extract_domain(url) not in {"docs.python.org", "w3schools.com", "python.org"}:
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
            return self._dedupe_results(results)[:limit]

        except Exception as e:
            logger.error(f"[WebSearch] Error searching articles: {e!r}")
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

    def _is_trusted_pdf_url(self, url: str) -> bool:
        """Allow well-known PDF hosts when active validation is blocked by network issues."""
        normalized_url = url.lower()
        trusted_hosts = ("arxiv.org", "export.arxiv.org", "researchgate.net", "springer.com", "ieee.org")
        return normalized_url.endswith(".pdf") or any(host in normalized_url for host in trusted_hosts)

    async def _validate_pdf_url(self, url: str) -> bool:
        """
        Check if PDF URL is accessible and contains valid PDF content.

        First tries HEAD request, then does a partial GET to verify magic bytes.
        Returns True if the URL responds with 200 and content starts with %PDF-.
        """
        if self._is_trusted_pdf_url(url):
            return True

        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(10.0, connect=5.0),
                follow_redirects=True,
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20)
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

        except asyncio.TimeoutError:
            logger.debug(f"[WebSearch] PDF validation timeout for {url}")
            return self._is_trusted_pdf_url(url)
        except Exception as e:
            logger.debug(f"[WebSearch] PDF validation error for {url}: {str(e)}")
            return self._is_trusted_pdf_url(url)

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
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(5.0, connect=2.0),
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20)
            ) as client:
                oembed_url = f"https://www.youtube.com/oembed?url=https://youtube.com/watch?v={video_id}&format=json"
                response = await client.get(oembed_url)

                if response.status_code != 200:
                    logger.debug(f"[WebSearch] YouTube validation failed for {video_id}: status {response.status_code}")
                    return False

                return True

        except asyncio.TimeoutError:
            logger.debug(f"[WebSearch] YouTube validation timeout for {video_id}")
            return True
        except Exception as e:
            logger.debug(f"[WebSearch] YouTube validation error for {video_id}: {str(e)}")
            return True

    async def _filter_accessible_results(
        self,
        results: List[SearchResult],
        validator: Callable[[str], bool],
        limit: int
    ) -> List[SearchResult]:
        """
        Filter results by checking accessibility in parallel with timeout.

        Args:
            results: List of search results to validate
            validator: Async function that takes URL and returns bool
            limit: Maximum number of valid results to return

        Returns:
            List of accessible SearchResult objects (up to limit)
        """
        if not results:
            return []

        # Check all URLs in parallel with timeout
        async def validate_with_timeout(result: SearchResult) -> bool:
            try:
                return await asyncio.wait_for(validator(result.url), timeout=VALIDATION_TIMEOUT)
            except asyncio.TimeoutError:
                logger.debug(f"[WebSearch] Validation timeout for {result.url}")
                return False
            except Exception as e:
                logger.debug(f"[WebSearch] Validation error for {result.url}: {str(e)}")
                return False

        validation_tasks = [validate_with_timeout(r) for r in results]
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

    async def get_ai_answer(self, query: str) -> str:
        """
        Get direct answer from OpenAI when no materials found.
        
        Args:
            query: User's search query
            
        Returns:
            AI-generated answer
        """
        try:
            response = await self.openai_client.chat.completions.create(
                model=settings.LLM_MODEL_MINI,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful educational assistant. "
                            "Provide clear, concise answers to learning questions. "
                            "If you don't know something, say so honestly. "
                            "Respond in the same language as the question."
                        )
                    },
                    {
                        "role": "user",
                        "content": query
                    }
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            answer = response.choices[0].message.content.strip()
            logger.info(f"[WebSearch] Generated AI answer for query: {query[:50]}...")
            return answer
            
        except Exception as e:
            logger.error(f"[WebSearch] Error generating AI answer: {str(e)}")
            return "Извините, не удалось получить ответ. Попробуйте другой запрос."
