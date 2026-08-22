import os
import re
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

def sanitize_filename(filename: str) -> str:
    # Remove path traversal and unsafe characters
    clean_name = os.path.basename(filename)
    clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean_name)
    return clean_name

class StorageService:
    def __init__(self):
        self.driver = settings.STORAGE_DRIVER
        self.local_base_path = Path(settings.LOCAL_STORAGE_PATH)
        self.local_base_path.mkdir(parents=True, exist_ok=True)

    def save_file(self, upload_file: UploadFile, subfolder: str = "raw") -> tuple[str, int]:
        clean_name = sanitize_filename(upload_file.filename or "upload.csv")
        file_id = str(uuid.uuid4())
        saved_filename = f"{file_id}_{clean_name}"
        
        target_dir = self.local_base_path / subfolder
        target_dir.mkdir(parents=True, exist_ok=True)
        file_path = target_dir / saved_filename
        
        file_size = 0
        with open(file_path, "wb") as buffer:
            while chunk := upload_file.file.read(1024 * 1024):
                file_size += len(chunk)
                if file_size > 100 * 1024 * 1024: # 100MB limit
                    buffer.close()
                    file_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File size exceeds maximum allowed limit of 100MB"
                    )
                buffer.write(chunk)
                
        return str(file_path), file_size

    def read_file(self, storage_path: str) -> bytes:
        if not os.path.exists(storage_path):
            raise HTTPException(status_code=404, detail="File not found in storage")
        with open(storage_path, "rb") as f:
            return f.read()

storage_service = StorageService()
