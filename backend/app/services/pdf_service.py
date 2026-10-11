"""Service layer for PDF validation and text extraction using PyMuPDF."""
from typing import List, Tuple
import fitz  # PyMuPDF
from app.core.config import settings
from app.schemas.document import PageExtraction, DocumentExtractionResponse


class PDFProcessingError(Exception):
    """Base exception for PDF validation and extraction errors."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class PDFEmptyError(PDFProcessingError):
    """Raised when an uploaded PDF file has zero bytes."""
    def __init__(self, message: str = "Uploaded PDF file is empty."):
        super().__init__(message, status_code=400)


class PDFSizeExceededError(PDFProcessingError):
    """Raised when an uploaded file exceeds the maximum allowed size."""
    def __init__(self, max_size_bytes: int):
        max_mb = max_size_bytes / (1024 * 1024)
        super().__init__(
            f"File size exceeds the maximum allowed limit of {max_mb:.1f} MB.",
            status_code=413
        )


class PDFInvalidFormatError(PDFProcessingError):
    """Raised when file content does not match the PDF specification."""
    def __init__(self, message: str = "Invalid file format. The file is not a valid PDF document."):
        super().__init__(message, status_code=400)


class PDFPasswordProtectedError(PDFProcessingError):
    """Raised when a PDF is encrypted or requires a password to open."""
    def __init__(self, message: str = "The PDF document is password-protected or encrypted. Please remove password protection before uploading."):
        super().__init__(message, status_code=400)


class PDFCorruptError(PDFProcessingError):
    """Raised when a PDF structure is damaged or unreadable."""
    def __init__(self, message: str = "The PDF document is corrupt or unreadable."):
        super().__init__(message, status_code=400)


def validate_pdf_bytes(pdf_bytes: bytes, filename: str) -> None:
    """
    Validate raw byte content for size, non-emptiness, and magic header.
    Does not rely on client-supplied MIME type or extension alone.
    """
    if not pdf_bytes or len(pdf_bytes) == 0:
        raise PDFEmptyError("The uploaded file is empty (0 bytes).")

    if len(pdf_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise PDFSizeExceededError(settings.MAX_UPLOAD_SIZE_BYTES)

    # Validate PDF magic header (%PDF-)
    # A valid PDF must start with %PDF- (standard allows up to 1024 bytes offset for binary headers)
    header_chunk = pdf_bytes[:1024]
    if b"%PDF-" not in header_chunk:
        raise PDFInvalidFormatError("File header does not match a valid PDF format (%PDF- missing).")


def extract_pdf_data(pdf_bytes: bytes, filename: str) -> DocumentExtractionResponse:
    """
    Open PDF safely in-memory using PyMuPDF and extract selectable text per page.
    Flags pages with sparse or empty text as requiring OCR.
    Guarantees document closure in finally block without filesystem persistence.
    """
    validate_pdf_bytes(pdf_bytes, filename)

    doc = None
    try:
        # Open from in-memory stream, avoiding saving file to disk
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        raise PDFCorruptError("Unable to open or parse the PDF document. The file may be corrupt.") from None

    try:
        # Check password protection or encryption
        if doc.is_encrypted or doc.needs_pass:
            raise PDFPasswordProtectedError()

        total_pages = len(doc)
        if total_pages == 0:
            raise PDFInvalidFormatError("The PDF document contains no pages.")

        pages_extracted: List[PageExtraction] = []
        pages_requiring_ocr: List[int] = []

        for page_idx in range(total_pages):
            page_num = page_idx + 1  # 1-based page number
            page = doc.load_page(page_idx)
            text = page.get_text("text") or ""
            stripped_text = text.strip()
            char_count = len(stripped_text)

            requires_ocr = char_count < settings.OCR_THRESHOLD_CHARS
            if requires_ocr:
                pages_requiring_ocr.append(page_num)

            pages_extracted.append(
                PageExtraction(
                    page_number=page_num,
                    text=text,
                    char_count=char_count,
                    requires_ocr=requires_ocr
                )
            )

        return DocumentExtractionResponse(
            filename=filename,
            file_size_bytes=len(pdf_bytes),
            total_pages=total_pages,
            pages_requiring_ocr=pages_requiring_ocr,
            pages=pages_extracted,
            has_ocr_needed_pages=len(pages_requiring_ocr) > 0
        )
    finally:
        if doc is not None:
            doc.close()
