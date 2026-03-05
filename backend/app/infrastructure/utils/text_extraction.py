"""
Utilities for extracting text from various document formats.
Supported formats: PDF, DOCX, DOC, TXT, RTF, ODT, EPUB, MD, HTML, YouTube

This module acts as a facade — actual implementations live in:
- youtube_extractor.py: YouTube transcript extraction
- document_extractors.py: DOCX, TXT, RTF, ODT, EPUB, Markdown, HTML
"""
import logging
import re
from pathlib import Path

import pdfplumber

from app.core.config import settings

# Re-export YouTube extractor functions (backward compatibility)
from app.infrastructure.utils.youtube_extractor import (
    extract_youtube_video_id,
    download_youtube_audio,
    compress_audio,
    split_audio_file,
    transcribe_audio_with_whisper,
    extract_text_from_youtube,
)

# Re-export document extractor functions (backward compatibility)
from app.infrastructure.utils.document_extractors import (
    extract_text_from_docx,
    extract_text_from_txt,
    extract_text_from_rtf,
    extract_text_from_odt,
    extract_text_from_epub,
    extract_text_from_markdown,
    extract_text_from_html,
)

logger = logging.getLogger(__name__)

# Expose all public names for star-imports
__all__ = [
    # YouTube
    'extract_youtube_video_id',
    'download_youtube_audio',
    'compress_audio',
    'split_audio_file',
    'transcribe_audio_with_whisper',
    'extract_text_from_youtube',
    # Documents
    'extract_text_from_pdf',
    'extract_text_from_docx',
    'extract_text_from_txt',
    'extract_text_from_rtf',
    'extract_text_from_odt',
    'extract_text_from_epub',
    'extract_text_from_markdown',
    'extract_text_from_html',
    # Utilities
    'normalize_text',
    'extract_text_from_document',
]


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text from PDF file using pdfplumber.

    Args:
        file_path: Path to PDF file

    Returns:
        Extracted text from all pages

    Raises:
        ValueError: If file not found or cannot be read
    """
    logger.info(f"Extracting text from PDF: {file_path}")

    path = Path(file_path)
    if not path.exists():
        raise ValueError(f"PDF file not found: {file_path}")

    try:
        text_chunks = []

        with pdfplumber.open(file_path) as pdf:
            total_pages = len(pdf.pages)
            logger.info(f"PDF has {total_pages} pages")

            for page_num, page in enumerate(pdf.pages, 1):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text_chunks.append(page_text)
                        logger.debug(f"Extracted text from page {page_num}/{total_pages}")
                except Exception as e:
                    logger.warning(f"Failed to extract text from page {page_num}: {str(e)}")
                    continue

        full_text = '\n\n'.join(text_chunks)

        if not full_text.strip():
            raise ValueError("No text could be extracted from PDF")

        logger.info(f"Successfully extracted text from PDF, length: {len(full_text)} characters")
        return full_text

    except Exception as e:
        logger.error(f"Error extracting PDF text: {str(e)}")
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")


def normalize_text(text: str) -> str:
    """
    Normalize extracted text by removing excessive whitespace and formatting issues.

    Args:
        text: Raw extracted text

    Returns:
        Normalized text
    """
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    text = re.sub(r'\n-\s*\n', '\n', text)
    text = re.sub(r'\n\d+\s*\n', '\n', text)

    return text.strip()


def extract_text_from_document(file_path: str, file_type: str) -> str:
    """
    Universal text extraction function that dispatches to appropriate extractor.

    Args:
        file_path: Path to document file
        file_type: Type of document (pdf, docx, txt, rtf, odt, epub, md, html)

    Returns:
        Extracted text

    Raises:
        ValueError: If file type not supported or extraction fails
    """
    file_type = file_type.lower()

    extractors = {
        'pdf': extract_text_from_pdf,
        'docx': extract_text_from_docx,
        'doc': extract_text_from_docx,
        'txt': extract_text_from_txt,
        'rtf': extract_text_from_rtf,
        'odt': extract_text_from_odt,
        'epub': extract_text_from_epub,
        'md': extract_text_from_markdown,
        'markdown': extract_text_from_markdown,
        'html': extract_text_from_html,
        'htm': extract_text_from_html,
    }

    extractor = extractors.get(file_type)
    if not extractor:
        raise ValueError(f"Unsupported file type: {file_type}. Supported: {', '.join(extractors.keys())}")

    return extractor(file_path)
