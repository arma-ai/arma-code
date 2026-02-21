"""
Document format text extractors.

Handles extraction from: DOCX, DOC, TXT, RTF, ODT, EPUB, Markdown, HTML.
"""
import logging
from pathlib import Path

import ebooklib
import markdown
import mammoth
from bs4 import BeautifulSoup
from docx import Document
from ebooklib import epub
from odf import text as odf_text, teletype
from odf.opendocument import load as odf_load
from striprtf.striprtf import rtf_to_text

logger = logging.getLogger(__name__)


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
        doc = Document(file_path)
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
        full_text = '\n\n'.join(paragraphs)

        if not full_text.strip():
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

        html = markdown.markdown(md_content)
        soup = BeautifulSoup(html, 'html.parser')
        full_text = soup.get_text(separator='\n\n', strip=True)

        if not full_text.strip():
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

        for script in soup(["script", "style"]):
            script.decompose()

        full_text = soup.get_text(separator='\n\n', strip=True)

        if not full_text.strip():
            raise ValueError("No text could be extracted from HTML")

        logger.info(f"Successfully extracted text from HTML, length: {len(full_text)} characters")
        return full_text

    except Exception as e:
        logger.error(f"Error extracting HTML text: {str(e)}")
        raise ValueError(f"Failed to extract text from HTML: {str(e)}")
