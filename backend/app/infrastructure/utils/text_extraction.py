"""
Utilities for extracting text from various document formats
Supported formats: PDF, DOCX, DOC, TXT, RTF, ODT, EPUB, MD, HTML, YouTube
"""
import logging
from typing import Optional
from pathlib import Path
import re
import tempfile
import os

import pdfplumber
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
import yt_dlp
from openai import OpenAI
from docx import Document
import mammoth
from striprtf.striprtf import rtf_to_text
from odf import text as odf_text, teletype
from odf.opendocument import load as odf_load
import ebooklib
from ebooklib import epub
import markdown
from bs4 import BeautifulSoup

from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize OpenAI client
openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)


def extract_youtube_video_id(url: str) -> Optional[str]:
    """
    Extract video ID from YouTube URL.

    Supports formats:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID

    Args:
        url: YouTube URL

    Returns:
        Video ID or None if not found
    """
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})',
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    return None


def download_youtube_audio(url: str, output_path: Optional[str] = None) -> str:
    """
    Download audio from YouTube video.

    Args:
        url: YouTube video URL
        output_path: Optional path to save audio file

    Returns:
        Path to downloaded audio file

    Raises:
        ValueError: If download fails
    """
    logger.info(f"Downloading audio from YouTube URL: {url}")

    if output_path is None:
        output_path = tempfile.mkdtemp()

    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': os.path.join(output_path, '%(id)s.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            video_id = info['id']
            audio_file = os.path.join(output_path, f"{video_id}.mp3")

            logger.info(f"Successfully downloaded audio to: {audio_file}")
            return audio_file

    except Exception as e:
        logger.error(f"Error downloading YouTube audio: {str(e)}")
        raise ValueError(f"Failed to download audio: {str(e)}")


def transcribe_audio_with_whisper(audio_file_path: str) -> str:
    """
    Transcribe audio file using OpenAI Whisper API.

    Args:
        audio_file_path: Path to audio file

    Returns:
        Transcribed text

    Raises:
        ValueError: If transcription fails
    """
    logger.info(f"Transcribing audio with Whisper API: {audio_file_path}")

    try:
        with open(audio_file_path, 'rb') as audio_file:
            transcript = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )

        logger.info(f"Successfully transcribed audio, length: {len(transcript)} characters")
        return transcript

    except Exception as e:
        logger.error(f"Error transcribing audio with Whisper: {str(e)}")
        raise ValueError(f"Failed to transcribe audio: {str(e)}")


def extract_text_from_youtube(url: str, language: str = 'ru') -> str:
    """
    Extract transcript from YouTube video.

    Three-tier fallback strategy:
    1. Try to get subtitles (manual or auto-generated)
    2. If subtitles unavailable, download audio and use Whisper API
    3. If both fail, raise error

    Args:
        url: YouTube video URL
        language: Preferred language code (default: 'ru')

    Returns:
        Extracted transcript text

    Raises:
        ValueError: If video ID cannot be extracted or transcript not available
    """
    logger.info(f"Extracting transcript from YouTube URL: {url}")

    # Extract video ID
    video_id = extract_youtube_video_id(url)
    if not video_id:
        raise ValueError(f"Could not extract video ID from URL: {url}")

    logger.info(f"Extracted video ID: {video_id}")

    # Strategy 1: Try to get subtitles
    try:
        logger.info("Strategy 1: Attempting to get subtitles...")
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        # Try manual transcripts first (more accurate)
        try:
            transcript = transcript_list.find_manually_created_transcript([language, 'en'])
            logger.info(f"Found manual transcript in language: {transcript.language_code}")
        except:
            # Fall back to auto-generated
            transcript = transcript_list.find_generated_transcript([language, 'en'])
            logger.info(f"Found auto-generated transcript in language: {transcript.language_code}")

        # Fetch and combine transcript
        transcript_data = transcript.fetch()
        full_text = ' '.join([entry['text'] for entry in transcript_data])

        logger.info(f"✓ Strategy 1 successful: Extracted {len(full_text)} characters from subtitles")
        return full_text

    except (TranscriptsDisabled, NoTranscriptFound) as e:
        logger.warning(f"Strategy 1 failed: {str(e)}")
        logger.info("Strategy 2: Attempting to use Whisper API...")

        # Strategy 2: Download audio and use Whisper
        temp_dir = None
        audio_file = None

        try:
            # Create temporary directory
            temp_dir = tempfile.mkdtemp()
            logger.info(f"Created temporary directory: {temp_dir}")

            # Download audio
            audio_file = download_youtube_audio(url, temp_dir)

            # Transcribe with Whisper
            full_text = transcribe_audio_with_whisper(audio_file)

            logger.info(f"✓ Strategy 2 successful: Extracted {len(full_text)} characters via Whisper")
            return full_text

        except Exception as whisper_error:
            logger.error(f"Strategy 2 failed: {str(whisper_error)}")
            raise ValueError(
                f"Failed to extract transcript using both subtitles and Whisper API. "
                f"Subtitles error: {str(e)}. Whisper error: {str(whisper_error)}"
            )

        finally:
            # Cleanup: Remove temporary audio file and directory
            if audio_file and os.path.exists(audio_file):
                try:
                    os.remove(audio_file)
                    logger.info(f"Cleaned up audio file: {audio_file}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to cleanup audio file: {cleanup_error}")

            if temp_dir and os.path.exists(temp_dir):
                try:
                    os.rmdir(temp_dir)
                    logger.info(f"Cleaned up temporary directory: {temp_dir}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to cleanup temp directory: {cleanup_error}")

    except Exception as e:
        logger.error(f"Unexpected error extracting YouTube transcript: {str(e)}")
        raise ValueError(f"Failed to extract transcript: {str(e)}")


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
    # Remove excessive line breaks (more than 2)
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Remove excessive spaces
    text = re.sub(r' {2,}', ' ', text)

    # Remove page numbers and isolated dashes
    text = re.sub(r'\n-\s*\n', '\n', text)
    text = re.sub(r'\n\d+\s*\n', '\n', text)

    return text.strip()


# ==================== Document Format Extractors ====================


def extract_text_from_docx(file_path: str) -> str:
    """
    Extract text from DOCX file.

    Args:
        file_path: Path to DOCX file

    Returns:
        Extracted text

    Raises:
        ValueError: If file not found or cannot be read
    """
    logger.info(f"Extracting text from DOCX: {file_path}")

    path = Path(file_path)
    if not path.exists():
        raise ValueError(f"DOCX file not found: {file_path}")

    try:
        # Try python-docx first (better structure preservation)
        doc = Document(file_path)
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
        full_text = '\n\n'.join(paragraphs)

        if not full_text.strip():
            # Fallback to mammoth (HTML conversion)
            logger.info("python-docx returned empty text, trying mammoth...")
            with open(file_path, "rb") as docx_file:
                result = mammoth.extract_raw_text(docx_file)
                full_text = result.value

        if not full_text.strip():
            raise ValueError("No text could be extracted from DOCX")

        logger.info(f"Successfully extracted text from DOCX, length: {len(full_text)} characters")
        return full_text

    except Exception as e:
        logger.error(f"Error extracting DOCX text: {str(e)}")
        raise ValueError(f"Failed to extract text from DOCX: {str(e)}")


def extract_text_from_txt(file_path: str) -> str:
    """
    Extract text from TXT file.

    Args:
        file_path: Path to TXT file

    Returns:
        Extracted text

    Raises:
        ValueError: If file not found or cannot be read
    """
    logger.info(f"Extracting text from TXT: {file_path}")

    path = Path(file_path)
    if not path.exists():
        raise ValueError(f"TXT file not found: {file_path}")

    try:
        # Try different encodings
        encodings = ['utf-8', 'utf-8-sig', 'cp1251', 'latin1', 'ascii']

        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    full_text = f.read()

                if full_text.strip():
                    logger.info(f"Successfully read TXT with encoding: {encoding}")
                    break
            except UnicodeDecodeError:
                continue
        else:
            raise ValueError("Could not decode TXT file with any supported encoding")

        if not full_text.strip():
            raise ValueError("TXT file is empty")

        logger.info(f"Successfully extracted text from TXT, length: {len(full_text)} characters")
        return full_text

    except Exception as e:
        logger.error(f"Error extracting TXT text: {str(e)}")
        raise ValueError(f"Failed to extract text from TXT: {str(e)}")


def extract_text_from_rtf(file_path: str) -> str:
    """
    Extract text from RTF file.

    Args:
        file_path: Path to RTF file

    Returns:
        Extracted text

    Raises:
        ValueError: If file not found or cannot be read
    """
    logger.info(f"Extracting text from RTF: {file_path}")

    path = Path(file_path)
    if not path.exists():
        raise ValueError(f"RTF file not found: {file_path}")

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            rtf_content = f.read()

        full_text = rtf_to_text(rtf_content)

        if not full_text.strip():
            raise ValueError("No text could be extracted from RTF")

        logger.info(f"Successfully extracted text from RTF, length: {len(full_text)} characters")
        return full_text

    except Exception as e:
        logger.error(f"Error extracting RTF text: {str(e)}")
        raise ValueError(f"Failed to extract text from RTF: {str(e)}")


def extract_text_from_odt(file_path: str) -> str:
    """
    Extract text from ODT file (OpenDocument Text).

    Args:
        file_path: Path to ODT file

    Returns:
        Extracted text

    Raises:
        ValueError: If file not found or cannot be read
    """
    logger.info(f"Extracting text from ODT: {file_path}")

    path = Path(file_path)
    if not path.exists():
        raise ValueError(f"ODT file not found: {file_path}")

    try:
        doc = odf_load(file_path)
        all_paras = doc.getElementsByType(odf_text.P)

        paragraphs = []
        for para in all_paras:
            text_content = teletype.extractText(para)
            if text_content.strip():
                paragraphs.append(text_content)

        full_text = '\n\n'.join(paragraphs)

        if not full_text.strip():
            raise ValueError("No text could be extracted from ODT")

        logger.info(f"Successfully extracted text from ODT, length: {len(full_text)} characters")
        return full_text

    except Exception as e:
        logger.error(f"Error extracting ODT text: {str(e)}")
        raise ValueError(f"Failed to extract text from ODT: {str(e)}")


def extract_text_from_epub(file_path: str) -> str:
    """
    Extract text from EPUB file.

    Args:
        file_path: Path to EPUB file

    Returns:
        Extracted text

    Raises:
        ValueError: If file not found or cannot be read
    """
    logger.info(f"Extracting text from EPUB: {file_path}")

    path = Path(file_path)
    if not path.exists():
        raise ValueError(f"EPUB file not found: {file_path}")

    try:
        book = epub.read_epub(file_path)
        chapters = []

        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                # Parse HTML content
                soup = BeautifulSoup(item.get_content(), 'html.parser')
                text = soup.get_text(separator='\n\n', strip=True)
                if text:
                    chapters.append(text)

        full_text = '\n\n'.join(chapters)

        if not full_text.strip():
            raise ValueError("No text could be extracted from EPUB")

        logger.info(f"Successfully extracted text from EPUB, length: {len(full_text)} characters")
        return full_text

    except Exception as e:
        logger.error(f"Error extracting EPUB text: {str(e)}")
        raise ValueError(f"Failed to extract text from EPUB: {str(e)}")


def extract_text_from_markdown(file_path: str) -> str:
    """
    Extract text from Markdown file.

    Args:
        file_path: Path to MD file

    Returns:
        Extracted text (plain text, not HTML)

    Raises:
        ValueError: If file not found or cannot be read
    """
    logger.info(f"Extracting text from Markdown: {file_path}")

    path = Path(file_path)
    if not path.exists():
        raise ValueError(f"Markdown file not found: {file_path}")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            md_content = f.read()

        # Convert markdown to HTML
        html = markdown.markdown(md_content)

        # Extract plain text from HTML
        soup = BeautifulSoup(html, 'html.parser')
        full_text = soup.get_text(separator='\n\n', strip=True)

        if not full_text.strip():
            # Fallback to raw markdown (without conversion)
            full_text = md_content

        if not full_text.strip():
            raise ValueError("Markdown file is empty")

        logger.info(f"Successfully extracted text from Markdown, length: {len(full_text)} characters")
        return full_text

    except Exception as e:
        logger.error(f"Error extracting Markdown text: {str(e)}")
        raise ValueError(f"Failed to extract text from Markdown: {str(e)}")


def extract_text_from_html(file_path: str) -> str:
    """
    Extract text from HTML file.

    Args:
        file_path: Path to HTML file

    Returns:
        Extracted plain text

    Raises:
        ValueError: If file not found or cannot be read
    """
    logger.info(f"Extracting text from HTML: {file_path}")

    path = Path(file_path)
    if not path.exists():
        raise ValueError(f"HTML file not found: {file_path}")

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            html_content = f.read()

        soup = BeautifulSoup(html_content, 'html.parser')

        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()

        # Extract text
        full_text = soup.get_text(separator='\n\n', strip=True)

        if not full_text.strip():
            raise ValueError("No text could be extracted from HTML")

        logger.info(f"Successfully extracted text from HTML, length: {len(full_text)} characters")
        return full_text

    except Exception as e:
        logger.error(f"Error extracting HTML text: {str(e)}")
        raise ValueError(f"Failed to extract text from HTML: {str(e)}")


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
        'doc': extract_text_from_docx,  # DOC treated as DOCX (mammoth handles both)
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
