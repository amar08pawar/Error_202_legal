"""Service layer exports."""
from app.services.pdf_service import (
    extract_pdf_data,
    validate_pdf_bytes,
    PDFProcessingError,
    PDFEmptyError,
    PDFSizeExceededError,
    PDFInvalidFormatError,
    PDFPasswordProtectedError,
    PDFCorruptError,
)

from app.services.ocr_service import (
    ocr_page,
    is_tesseract_available,
    resolve_tesseract_cmd,
)

__all__ = [
    "extract_pdf_data",
    "validate_pdf_bytes",
    "PDFProcessingError",
    "PDFEmptyError",
    "PDFSizeExceededError",
    "PDFInvalidFormatError",
    "PDFPasswordProtectedError",
    "PDFCorruptError",
    "ocr_page",
    "is_tesseract_available",
    "resolve_tesseract_cmd",
]
