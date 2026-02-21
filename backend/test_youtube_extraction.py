#!/usr/bin/env python3
"""
Тестовый скрипт для проверки извлечения текста из YouTube видео.

Использование:
    python test_youtube_extraction.py <youtube_url>

Примеры:
    python test_youtube_extraction.py "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    python test_youtube_extraction.py "https://youtu.be/dQw4w9WgXcQ"
"""

import sys
import os
import logging

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.infrastructure.utils.text_extraction import extract_text_from_youtube

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def test_youtube_extraction(url: str):
    """
    Тестирует извлечение текста из YouTube видео.

    Args:
        url: YouTube URL
    """
    print(f"\n{'='*60}")
    print(f"Testing YouTube extraction for: {url}")
    print(f"{'='*60}\n")

    try:
        # Extract text
        text = extract_text_from_youtube(url, language='ru')

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

    except Exception as e:
        print(f"\n{'='*60}")
        print("✗ FAILED!")
        print(f"{'='*60}")
        print(f"\nError: {str(e)}")
        print(f"\nError type: {type(e).__name__}")
        import traceback
        print("\nFull traceback:")
        traceback.print_exc()


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python test_youtube_extraction.py <youtube_url>")
        print("\nExamples:")
        print('  python test_youtube_extraction.py "https://www.youtube.com/watch?v=dQw4w9WgXcQ"')
        print('  python test_youtube_extraction.py "https://youtu.be/dQw4w9WgXcQ"')
        sys.exit(1)

    url = sys.argv[1]
    test_youtube_extraction(url)


if __name__ == "__main__":
    main()
