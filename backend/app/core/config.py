"""Core application configuration and settings."""
import os
from typing import List


class Settings:
    APP_NAME: str = "NayaSetu"
    VERSION: str = "1.0.0"

    # Default to 15 MB
    MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(15 * 1024 * 1024)))

    # Threshold for considering text extraction sufficient vs requiring OCR
    OCR_THRESHOLD_CHARS: int = int(os.getenv("OCR_THRESHOLD_CHARS", "30"))

    # OCR Configuration
    TESSERACT_CMD: str = os.getenv("TESSERACT_CMD", "")
    OCR_LANGUAGES: str = os.getenv("OCR_LANGUAGES", "eng")

    # Allowed CORS Origins (supports Vite default and fallback ports)
    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        raw = os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175"
        )
        return [origin.strip() for origin in raw.split(",") if origin.strip()]


settings = Settings()
