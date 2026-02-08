"""
Utilities for extracting text from various document formats
Supported formats: PDF, DOCX, DOC, TXT, RTF, ODT, EPUB, MD, HTML, YouTube
"""
import logging
from typing import Optional, List
from pathlib import Path
import re
import tempfile
import os
from xml.etree.ElementTree import ParseError as XMLParseError

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
from pydub import AudioSegment

from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize OpenAI client
openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)

# Whisper API limits
WHISPER_MAX_FILE_SIZE = 24 * 1024 * 1024  # 24 MB (safe margin from 25 MB limit)
WHISPER_TARGET_BITRATE = "48k"  # Target bitrate for compression


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
    Download audio from YouTube video with multiple fallback strategies.

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

    # Strategy 1: iOS client (most reliable, bypasses most restrictions)
    # Note: No ffmpeg postprocessing - use raw audio format for Whisper
    ydl_opts_ios = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',  # Prefer m4a (no conversion needed)
        'outtmpl': os.path.join(output_path, '%(id)s.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['ios'],  # iOS only - most reliable
                'skip': ['hls', 'dash'],
            }
        },
        'socket_timeout': 30,
        'retries': 5,
        'fragment_retries': 5,
        'nocheckcertificate': True,
    }

    # Strategy 2: Android client with enhanced headers
    ydl_opts_android = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',  # Prefer m4a (no conversion needed)
        'outtmpl': os.path.join(output_path, '%(id)s.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
        'http_headers': {
            'User-Agent': 'com.google.android.youtube/19.51.37 (Linux; U; Android 14) gzip',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        'extractor_args': {
            'youtube': {
                'player_client': ['android'],
                'skip': ['hls', 'dash'],
            }
        },
        'socket_timeout': 30,
        'retries': 5,
        'fragment_retries': 5,
        'nocheckcertificate': True,
    }

    # Strategy 3: Web client with cookies (fallback)
    ydl_opts_web = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',  # Prefer m4a (no conversion needed)
        'outtmpl': os.path.join(output_path, '%(id)s.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
        },
        'extractor_args': {
            'youtube': {
                'player_client': ['web'],
                'skip': ['hls', 'dash'],
            }
        },
        'socket_timeout': 30,
        'retries': 5,
        'fragment_retries': 5,
        'nocheckcertificate': True,
        'age_limit': None,
        'geo_bypass': True,
    }

    # Try each strategy in order
    strategies = [
        ('iOS client', ydl_opts_ios),
        ('Android client', ydl_opts_android),
        ('Web client', ydl_opts_web),
    ]

    last_error = None
    for strategy_name, ydl_opts in strategies:
        try:
            logger.info(f"Attempting download with {strategy_name}...")
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                video_id = info['id']

                # Find the downloaded file (extension may vary: m4a, webm, opus, etc.)
                # Check for common audio extensions
                possible_exts = ['m4a', 'webm', 'opus', 'mp4', 'mp3', 'ogg']
                audio_file = None

                for ext in possible_exts:
                    potential_file = os.path.join(output_path, f"{video_id}.{ext}")
                    if os.path.exists(potential_file):
                        audio_file = potential_file
                        break

                # If not found by extension, search directory
                if not audio_file:
                    for filename in os.listdir(output_path):
                        if filename.startswith(video_id):
                            audio_file = os.path.join(output_path, filename)
                            break

                if not audio_file or not os.path.exists(audio_file):
                    raise ValueError(f"Downloaded file not found in {output_path}")

                logger.info(f"✓ Successfully downloaded audio using {strategy_name}: {audio_file}")
                return audio_file

        except Exception as e:
            logger.warning(f"✗ {strategy_name} failed: {str(e)}")
            last_error = e
            continue

    # All strategies failed
    logger.error(f"All download strategies failed. Last error: {str(last_error)}")
    raise ValueError(f"Failed to download audio after trying all strategies: {str(last_error)}")


def compress_audio(input_path: str, output_path: str, bitrate: str = WHISPER_TARGET_BITRATE) -> str:
    """
    Compress audio file to reduce size.

    Args:
        input_path: Path to input audio file
        output_path: Path to save compressed audio
        bitrate: Target bitrate (default: 48k)

    Returns:
        Path to compressed audio file

    Raises:
        ValueError: If compression fails
    """
    try:
        logger.info(f"Compressing audio: {input_path} -> {output_path} (bitrate: {bitrate})")

        # Load audio file
        audio = AudioSegment.from_file(input_path)

        # Export with compression
        audio.export(
            output_path,
            format="mp3",
            bitrate=bitrate,
            parameters=["-ac", "1"]  # Convert to mono to save space
        )

        # Get file sizes
        original_size = os.path.getsize(input_path)
        compressed_size = os.path.getsize(output_path)
        compression_ratio = (1 - compressed_size / original_size) * 100

        logger.info(f"✓ Compressed: {original_size / 1024 / 1024:.2f} MB -> {compressed_size / 1024 / 1024:.2f} MB ({compression_ratio:.1f}% reduction)")

        return output_path

    except Exception as e:
        logger.error(f"Failed to compress audio: {str(e)}")
        raise ValueError(f"Audio compression failed: {str(e)}")


def split_audio_file(input_path: str, output_dir: str, max_size_bytes: int = WHISPER_MAX_FILE_SIZE) -> List[str]:
    """
    Split audio file into chunks if it exceeds max size.

    Args:
        input_path: Path to input audio file
        output_dir: Directory to save chunks
        max_size_bytes: Maximum size per chunk in bytes

    Returns:
        List of paths to audio chunks (or [input_path] if no split needed)

    Raises:
        ValueError: If splitting fails
    """
    try:
        file_size = os.path.getsize(input_path)

        # If file is small enough, no splitting needed
        if file_size <= max_size_bytes:
            logger.info(f"File size {file_size / 1024 / 1024:.2f} MB is within limit, no splitting needed")
            return [input_path]

        logger.info(f"File size {file_size / 1024 / 1024:.2f} MB exceeds limit, splitting...")

        # Load audio
        audio = AudioSegment.from_file(input_path)
        duration_ms = len(audio)

        # Calculate chunk duration based on file size
        # Estimate: bytes_per_ms = file_size / duration_ms
        bytes_per_ms = file_size / duration_ms
        chunk_duration_ms = int(max_size_bytes / bytes_per_ms * 0.9)  # 90% to be safe

        # Split audio into chunks
        chunks = []
        chunk_paths = []

        for i, start_ms in enumerate(range(0, duration_ms, chunk_duration_ms)):
            end_ms = min(start_ms + chunk_duration_ms, duration_ms)
            chunk = audio[start_ms:end_ms]

            chunk_path = os.path.join(output_dir, f"chunk_{i:03d}.mp3")
            chunk.export(chunk_path, format="mp3")
            chunk_paths.append(chunk_path)

            chunk_size = os.path.getsize(chunk_path)
            logger.info(f"Created chunk {i + 1}: {chunk_size / 1024 / 1024:.2f} MB ({start_ms / 1000:.1f}s - {end_ms / 1000:.1f}s)")

        logger.info(f"✓ Split into {len(chunk_paths)} chunks")
        return chunk_paths

    except Exception as e:
        logger.error(f"Failed to split audio: {str(e)}")
        raise ValueError(f"Audio splitting failed: {str(e)}")


def transcribe_audio_with_whisper(audio_file_path: str) -> str:
    """
    Transcribe audio file using OpenAI Whisper API with automatic compression and chunking.

    Strategy:
    1. Check file size
    2. If > 24 MB -> compress to 48k bitrate
    3. If still > 24 MB after compression -> split into chunks
    4. Transcribe each chunk
    5. Combine results

    Args:
        audio_file_path: Path to audio file

    Returns:
        Transcribed text

    Raises:
        ValueError: If transcription fails
    """
    logger.info(f"Transcribing audio with Whisper API: {audio_file_path}")

    temp_files_to_cleanup = []

    try:
        original_size = os.path.getsize(audio_file_path)
        logger.info(f"Original audio file size: {original_size / 1024 / 1024:.2f} MB")

        current_file = audio_file_path

        # Step 1: Compress if file is too large
        if original_size > WHISPER_MAX_FILE_SIZE:
            logger.info(f"File exceeds {WHISPER_MAX_FILE_SIZE / 1024 / 1024:.0f} MB limit, compressing...")

            # Create compressed file in same directory
            file_dir = os.path.dirname(audio_file_path)
            compressed_path = os.path.join(file_dir, "compressed_audio.mp3")

            compress_audio(audio_file_path, compressed_path)
            temp_files_to_cleanup.append(compressed_path)

            current_file = compressed_path
            compressed_size = os.path.getsize(compressed_path)
            logger.info(f"Compressed file size: {compressed_size / 1024 / 1024:.2f} MB")

        # Step 2: Check if we need to split
        current_size = os.path.getsize(current_file)

        if current_size > WHISPER_MAX_FILE_SIZE:
            logger.info(f"File still exceeds limit after compression, splitting into chunks...")

            # Split into chunks
            file_dir = os.path.dirname(current_file)
            chunk_paths = split_audio_file(current_file, file_dir)
            temp_files_to_cleanup.extend(chunk_paths)

            # Transcribe each chunk
            logger.info(f"Transcribing {len(chunk_paths)} chunks...")
            transcripts = []

            for i, chunk_path in enumerate(chunk_paths, 1):
                logger.info(f"Transcribing chunk {i}/{len(chunk_paths)}...")

                with open(chunk_path, 'rb') as audio_file:
                    chunk_transcript = openai_client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="text"
                    )

                transcripts.append(chunk_transcript)
                logger.info(f"✓ Chunk {i} transcribed: {len(chunk_transcript)} characters")

            # Combine all transcripts
            full_transcript = " ".join(transcripts)
            logger.info(f"✓ All chunks transcribed successfully: {len(full_transcript)} total characters")

        else:
            # File is small enough, transcribe directly
            logger.info(f"File size is within limit, transcribing directly...")

            with open(current_file, 'rb') as audio_file:
                full_transcript = openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )

            logger.info(f"✓ Successfully transcribed: {len(full_transcript)} characters")

        return full_transcript

    except Exception as e:
        logger.error(f"Error transcribing audio with Whisper: {str(e)}")
        raise ValueError(f"Failed to transcribe audio: {str(e)}")

    finally:
        # Cleanup temporary files
        for temp_file in temp_files_to_cleanup:
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                    logger.debug(f"Cleaned up temporary file: {temp_file}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to cleanup {temp_file}: {cleanup_error}")


def extract_text_from_youtube(url: str, language: str = 'ru') -> str:
    """
    Extract transcript from YouTube video.

    Multi-tier fallback strategy:
    1. Try to get subtitles in preferred languages (ru, en)
    2. Try to get any available transcript and translate to English
    3. If subtitles unavailable, download audio and use Whisper API
    4. If all fail, raise error

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

        transcript = None
        
        # Step 1a: Try manual transcripts in preferred languages first (most accurate)
        try:
            transcript = transcript_list.find_manually_created_transcript([language, 'en', 'ru'])
            logger.info(f"Found manual transcript in language: {transcript.language_code}")
        except Exception:
            pass
        
        # Step 1b: Try auto-generated transcripts in preferred languages
        if transcript is None:
            try:
                transcript = transcript_list.find_generated_transcript([language, 'en', 'ru'])
                logger.info(f"Found auto-generated transcript in language: {transcript.language_code}")
            except Exception:
                pass
        
        # Step 1c: Try to get ANY available transcript and translate to English
        if transcript is None:
            logger.info("Preferred languages not found, trying any available transcript with translation...")
            try:
                # Get all available transcripts
                available_transcripts = list(transcript_list)
                if available_transcripts:
                    # Get the first available transcript
                    any_transcript = available_transcripts[0]
                    logger.info(f"Found transcript in {any_transcript.language_code}, translating to English...")
                    # Translate to English
                    transcript = any_transcript.translate('en')
                    logger.info(f"Successfully translated from {any_transcript.language_code} to English")
            except Exception as translate_error:
                logger.warning(f"Translation failed: {str(translate_error)}")
        
        if transcript is None:
            raise NoTranscriptFound(video_id, ['ru', 'en'], None)

        # Fetch and combine transcript with validation
        try:
            transcript_data = transcript.fetch()

            # Check if transcript data is valid
            if not transcript_data or len(transcript_data) == 0:
                raise ValueError("Transcript data is empty")

            # Extract text from transcript
            full_text = ' '.join([entry.get('text', '') for entry in transcript_data if entry.get('text')])

            # Validate extracted text
            if not full_text or len(full_text.strip()) < 10:
                raise ValueError(f"Extracted text too short: {len(full_text)} characters")

            logger.info(f"✓ Strategy 1 successful: Extracted {len(full_text)} characters from subtitles")
            return full_text

        except (XMLParseError, ValueError) as fetch_error:
            logger.warning(f"Failed to fetch transcript data: {str(fetch_error)}")
            # Raise to trigger fallback to Whisper
            raise NoTranscriptFound(video_id, ['ru', 'en'], None)

    except (TranscriptsDisabled, NoTranscriptFound, XMLParseError, ValueError) as e:
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
