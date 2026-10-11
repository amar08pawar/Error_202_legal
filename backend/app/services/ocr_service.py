"""Tesseract OCR service for processing scanned PDF pages."""
import io
import logging
import os
import shutil
from typing import Optional, Tuple
import pymupdf as fitz  # PyMuPDF modern import to avoid fitz deprecation warning
from PIL import Image
import pytesseract
from app.core.config import settings

logger = logging.getLogger(__name__)

# Standard installation paths for Tesseract on Windows
WINDOWS_COMMON_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
]


def resolve_tesseract_cmd() -> Optional[str]:
    """
    Resolve the path to the Tesseract executable using configuration, PATH,
    or common Windows install locations.
    """
    # 1. Explicitly configured via environment variable
    if settings.TESSERACT_CMD and os.path.isfile(settings.TESSERACT_CMD):
        return settings.TESSERACT_CMD

    # 2. Check if available on system PATH
    which_cmd = shutil.which("tesseract")
    if which_cmd:
        return which_cmd

    # 3. Check common Windows installation paths
    if os.name == "nt":
        for path in WINDOWS_COMMON_PATHS:
            if os.path.isfile(path):
                return path

    return None


def is_tesseract_available() -> Tuple[bool, str]:
    """
    Check whether Tesseract OCR executable is installed and functional.
    Returns (is_available, description_or_reason).
    """
    cmd = resolve_tesseract_cmd()
    if not cmd:
        return (
            False,
            "Tesseract OCR executable not found. Install Tesseract on your system and set TESSERACT_CMD if needed."
        )

    try:
        pytesseract.pytesseract.tesseract_cmd = cmd
        version = pytesseract.get_tesseract_version()
        return (True, f"Tesseract v{version}")
    except pytesseract.TesseractNotFoundError:
        return (
            False,
            "Tesseract executable was not found at configured path."
        )
    except Exception as exc:
        logger.warning("Tesseract check failed: %s", str(exc))
        return (
            False,
            "Tesseract OCR check failed."
        )


def ocr_page(page: fitz.Page, lang: Optional[str] = None) -> Tuple[str, bool, str]:
    """
    Perform OCR on a single PyMuPDF page rendered to a high-resolution pixmap.
    Returns:
        (extracted_text, success_bool, status_message)
    """
    cmd = resolve_tesseract_cmd()
    if not cmd:
        return (
            "",
            False,
            "Tesseract OCR is not installed or accessible on this system. Install Tesseract-OCR to enable OCR extraction."
        )

    pytesseract.pytesseract.tesseract_cmd = cmd
    language = lang or settings.OCR_LANGUAGES or "eng"

    pix = None
    try:
        # Render page to high-DPI in-memory pixmap for accurate optical character recognition
        pix = page.get_pixmap(dpi=300)
        img_bytes = pix.tobytes("png")
        image = Image.open(io.BytesIO(img_bytes))

        text = pytesseract.image_to_string(image, lang=language)
        cleaned_text = text.strip()
        return (cleaned_text, True, "OCR completed successfully")
    except pytesseract.TesseractNotFoundError:
        return (
            "",
            False,
            "Tesseract OCR binary was not found during execution."
        )
    except pytesseract.TesseractError:
        return (
            "",
            False,
            f"Tesseract OCR processing error for language '{language}'."
        )
    except Exception as exc:
        logger.error("Unexpected OCR processing error: %s", str(exc), exc_info=True)
        return (
            "",
            False,
            "An unexpected error occurred during page OCR processing."
        )
    finally:
        # Clean up pixmap resources
        pix = None
