#!/usr/bin/env python3
"""
Тестовый скрипт для проверки извлечения текста из различных форматов документов.

Использование:
    python test_document_extraction.py <file_path>

Примеры:
    python test_document_extraction.py document.pdf
    python test_document_extraction.py document.docx
    python test_document_extraction.py document.txt
    python test_document_extraction.py document.rtf
    python test_document_extraction.py document.odt
"""

import sys
import os
import logging
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.infrastructure.utils.text_extraction import extract_text_from_document

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def detect_file_type(file_path: str) -> str:
    """
    Detect file type from extension.

    Args:
        file_path: Path to file

    Returns:
        File type (pdf, docx, txt, etc.)
    """
    suffix = Path(file_path).suffix.lower()

    # Remove leading dot
    if suffix.startswith('.'):
        suffix = suffix[1:]

    return suffix


def test_document_extraction(file_path: str):
    """
    Тестирует извлечение текста из документа.

    Args:
        file_path: Path to document
    """
    print(f"\n{'='*60}")
    print(f"Testing document extraction for: {file_path}")
    print(f"{'='*60}\n")

    # Check if file exists
    if not os.path.exists(file_path):
        print(f"✗ ERROR: File not found: {file_path}")
        return

    # Detect file type
    file_type = detect_file_type(file_path)
    print(f"Detected file type: {file_type.upper()}")
    print(f"File size: {os.path.getsize(file_path)} bytes")
    print(f"\n{'-'*60}\n")

    try:
        # Extract text
        text = extract_text_from_document(file_path, file_type)

        # Print results
        print(f"\n{'='*60}")
        print("✓ SUCCESS!")
        print(f"{'='*60}")
        print(f"\nExtracted text length: {len(text)} characters")
        print(f"\nFirst 500 characters:")
        print("-" * 60)
        print(text[:500])
        print("-" * 60)
        print(f"\nLast 500 characters:")
        print("-" * 60)
        print(text[-500:])
        print("-" * 60)

        # Word count
        words = text.split()
        print(f"\nApproximate word count: {len(words)}")

        # Line count
        lines = text.split('\n')
        print(f"Line count: {len(lines)}")

    except Exception as e:
        print(f"\n{'='*60}")
        print("✗ FAILED!")
        print(f"{'='*60}")
        print(f"\nError: {str(e)}")
        print(f"\nError type: {type(e).__name__}")
        import traceback
        print("\nFull traceback:")
        traceback.print_exc()


def print_supported_formats():
    """Print all supported document formats."""
    supported = [
        ("PDF", "application/pdf", ".pdf"),
        ("DOCX", "Word 2007+", ".docx"),
        ("DOC", "Word 97-2003", ".doc"),
        ("TXT", "Plain text", ".txt"),
        ("RTF", "Rich Text Format", ".rtf"),
        ("ODT", "OpenDocument Text", ".odt"),
        ("EPUB", "E-book", ".epub"),
        ("MD", "Markdown", ".md"),
        ("HTML", "Web page", ".html, .htm"),
    ]

    print("\n" + "="*60)
    print("SUPPORTED DOCUMENT FORMATS")
    print("="*60)
    print(f"\n{'Format':<10} {'Description':<20} {'Extension':<15}")
    print("-"*60)
    for fmt, desc, ext in supported:
        print(f"{fmt:<10} {desc:<20} {ext:<15}")
    print("="*60 + "\n")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python test_document_extraction.py <file_path>")
        print("\nExamples:")
        print('  python test_document_extraction.py document.pdf')
        print('  python test_document_extraction.py document.docx')
        print('  python test_document_extraction.py document.txt')
        print('  python test_document_extraction.py document.rtf')
        print('  python test_document_extraction.py document.odt')
        print('  python test_document_extraction.py document.epub')
        print('  python test_document_extraction.py document.md')
        print('  python test_document_extraction.py document.html')

        print_supported_formats()
        sys.exit(1)

    file_path = sys.argv[1]
    test_document_extraction(file_path)


if __name__ == "__main__":
    main()
