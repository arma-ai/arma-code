"""
File storage utilities for handling uploads
"""
import logging
import os
import shutil
from pathlib import Path
from typing import Tuple
from uuid import uuid4
from fastapi import UploadFile

logger = logging.getLogger(__name__)


class FileStorageService:
    """
    Service for handling file uploads and storage.

    Files are stored in: ./storage/materials/{user_id}/{filename}
    """

    def __init__(self, base_storage_path: str = "./storage"):
        self.base_path = Path(base_storage_path)
        self.materials_path = self.base_path / "materials"

    def save_uploaded_file(
        self, file: UploadFile, user_id: str, original_filename: str
    ) -> Tuple[str, int]:
        """
        Save uploaded file to filesystem.

        Args:
            file: FastAPI UploadFile object
            user_id: User ID for organizing files
            original_filename: Original filename from upload

        Returns:
            Tuple of (file_path, file_size)

        Raises:
            ValueError: If file saving fails
        """
        try:
            # Create user directory if it doesn't exist
            user_dir = self.materials_path / user_id
            user_dir.mkdir(parents=True, exist_ok=True)

            # Generate unique filename to avoid collisions
            file_extension = Path(original_filename).suffix
            unique_filename = f"{uuid4()}{file_extension}"
            file_path = user_dir / unique_filename

            logger.info(f"Saving file to: {file_path}")

            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Get file size
            file_size = file_path.stat().st_size

            logger.info(f"File saved successfully, size: {file_size} bytes")

            # Return relative path from project root
            return str(file_path), file_size

        except Exception as e:
            logger.error(f"Error saving file: {str(e)}")
            raise ValueError(f"Failed to save file: {str(e)}")
        finally:
            # Close the file
            file.file.close()

    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from storage.

        Args:
            file_path: Path to file

        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                logger.info(f"Deleted file: {file_path}")
                return True
            else:
                logger.warning(f"File not found for deletion: {file_path}")
                return False
        except Exception as e:
            logger.error(f"Error deleting file: {str(e)}")
            return False

    def get_file_path(self, relative_path: str) -> Path:
        """
        Get absolute Path object from relative path.

        Args:
            relative_path: Relative path string

        Returns:
            Absolute Path object
        """
        return Path(relative_path).absolute()
