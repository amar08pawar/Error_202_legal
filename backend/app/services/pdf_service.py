"""Service layer for PDF validation, text extraction, and Tesseract OCR integration."""
from typing import List, Tuple
import pymupdf as fitz  # PyMuPDF modern import to avoid fitz deprecation warning
from app.core.config import settings
from app.schemas.document import (
    ExtractionMethod,
    OCRStatus,
    EvidenceReference,
    PageExtraction,
    DocumentExtractionResponse,
)
from app.services.ocr_service import ocr_page, is_tesseract_available


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
    header_chunk = pdf_bytes[:1024]
    if b"%PDF-" not in header_chunk:
        raise PDFInvalidFormatError("File header does not match a valid PDF format (%PDF- missing).")


def build_evidence_references(pages: List[PageExtraction]) -> List[EvidenceReference]:
    """
    Construct basic evidence references from non-empty extracted pages.
    Identifies source page number, passage text, and character offsets.
    Does not fabricate claims or rely on external models.
    """
    references: List[EvidenceReference] = []
    for p in pages:
        stripped = p.text.strip()
        if not stripped:
            continue

        # Look for substantive paragraphs (>= 20 chars)
        candidate_blocks = [block.strip() for block in stripped.split("\n\n") if len(block.strip()) >= 20]
        if not candidate_blocks:
            candidate_blocks = [line.strip() for line in stripped.split("\n") if len(line.strip()) >= 20]

        if candidate_blocks:
            passage = candidate_blocks[0][:250]  # Take first substantive passage up to 250 chars
            start_pos = p.text.find(passage)
            end_pos = start_pos + len(passage) if start_pos != -1 else None

            references.append(
                EvidenceReference(
                    page_number=p.page_number,
                    passage=passage,
                    start_char=start_pos if start_pos != -1 else 0,
                    end_char=end_pos if start_pos != -1 else len(passage),
                    extraction_method=p.extraction_method,
                )
            )

    return references


def extract_pdf_data(pdf_bytes: bytes, filename: str) -> DocumentExtractionResponse:
    """
    Open PDF safely in-memory using PyMuPDF and extract text per page.
    For pages with sparse or no selectable text, triggers Tesseract OCR.
    Maintains original page ordering and clean memory release in finally blocks.
    """
    validate_pdf_bytes(pdf_bytes, filename)

    doc = None
    try:
        # Open strictly from in-memory stream, avoiding disk storage
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception:
        raise PDFCorruptError("Unable to open or parse the PDF document. The file may be corrupt.") from None

    try:
        # Validate encryption
        if doc.is_encrypted or doc.needs_pass:
            raise PDFPasswordProtectedError()

        total_pages = len(doc)
        if total_pages == 0:
            raise PDFInvalidFormatError("The PDF document contains no pages.")

        pages_extracted: List[PageExtraction] = []
        pages_requiring_ocr: List[int] = []
        ocr_completed_pages: List[int] = []
        has_any_ocr_unavailable = False

        normalized_sections: List[str] = []

        for page_idx in range(total_pages):
            page_num = page_idx + 1  # 1-based page number
            page = doc.load_page(page_idx)

            # 1. First extract selectable text
            raw_text = page.get_text("text") or ""
            stripped_text = raw_text.strip()
            char_count = len(stripped_text)

            requires_ocr = char_count < settings.OCR_THRESHOLD_CHARS

            final_text = raw_text
            extraction_method = ExtractionMethod.SELECTABLE_TEXT
            ocr_status = OCRStatus.NOT_REQUIRED
            ocr_error_message = None

            # 2. Trigger OCR only on pages that require it
            if requires_ocr:
                pages_requiring_ocr.append(page_num)

                ocr_result_text, ocr_success, ocr_msg = ocr_page(page)

                if ocr_success:
                    final_text = ocr_result_text
                    char_count = len(ocr_result_text.strip())
                    extraction_method = ExtractionMethod.OCR
                    ocr_status = OCRStatus.COMPLETED
                    ocr_completed_pages.append(page_num)
                else:
                    # OCR was required but could not be performed
                    final_text = raw_text  # Preserve whatever sparse text existed
                    char_count = len(stripped_text)
                    extraction_method = ExtractionMethod.SELECTABLE_TEXT

                    if "not installed" in ocr_msg.lower() or "not found" in ocr_msg.lower():
                        ocr_status = OCRStatus.UNAVAILABLE
                        has_any_ocr_unavailable = True
                    else:
                        ocr_status = OCRStatus.FAILED

                    ocr_error_message = ocr_msg

            pages_extracted.append(
                PageExtraction(
                    page_number=page_num,
                    text=final_text,
                    char_count=char_count,
                    requires_ocr=requires_ocr,
                    extraction_method=extraction_method,
                    ocr_status=ocr_status,
                    ocr_error_message=ocr_error_message,
                )
            )

            # Build normalized text block
            normalized_sections.append(
                f"--- [Page {page_num}] ---\n{final_text.strip()}"
            )

        # Assemble normalized full text representation
        normalized_full_text = "\n\n".join(normalized_sections)

        # Construct basic evidence passages
        sample_evidence = build_evidence_references(pages_extracted)

        return DocumentExtractionResponse(
            filename=filename,
            file_size_bytes=len(pdf_bytes),
            total_pages=total_pages,
            pages_requiring_ocr=pages_requiring_ocr,
            has_ocr_needed_pages=len(pages_requiring_ocr) > 0,
            ocr_completed_pages=ocr_completed_pages,
            ocr_unavailable=has_any_ocr_unavailable,
            pages=pages_extracted,
            normalized_full_text=normalized_full_text,
            sample_evidence_references=sample_evidence,
        )
    finally:
        if doc is not None:
            doc.close()
