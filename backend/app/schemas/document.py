"""Pydantic schemas for request, response, normalized document, and evidence validation."""
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class ExtractionMethod(str, Enum):
    """Method used to extract textual content from a page."""
    SELECTABLE_TEXT = "selectable_text"
    OCR = "ocr"


class OCRStatus(str, Enum):
    """Execution status of the OCR engine for an individual page."""
    NOT_REQUIRED = "not_required"
    COMPLETED = "completed"
    UNAVAILABLE = "unavailable"
    FAILED = "failed"


class EvidenceReference(BaseModel):
    """Evidence passage reference tying an excerpt to its 1-based page source and character boundaries."""
    page_number: int = Field(..., description="1-based source page number where the passage appears")
    passage: str = Field(..., description="Verbatim excerpt or passage text from the document")
    start_char: Optional[int] = Field(None, description="Starting 0-based character offset within the page text")
    end_char: Optional[int] = Field(None, description="Ending character offset within the page text")
    extraction_method: ExtractionMethod = Field(
        default=ExtractionMethod.SELECTABLE_TEXT,
        description="Whether this evidence passage originated from selectable text or OCR"
    )


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str = Field(..., description="Service status indicator")
    app_name: str = Field(..., description="Application name")
    version: str = Field(..., description="Application version")
    ocr_available: bool = Field(default=False, description="Whether Tesseract OCR engine executable is accessible")


class PageExtraction(BaseModel):
    """Extracted text details for an individual document page."""
    page_number: int = Field(..., description="1-based page number")
    text: str = Field(..., description="Extracted text from the page (selectable or OCR-derived)")
    char_count: int = Field(..., description="Number of extracted characters")
    requires_ocr: bool = Field(
        ...,
        description="Indicates if the page had sparse or no selectable text requiring OCR"
    )
    extraction_method: ExtractionMethod = Field(
        default=ExtractionMethod.SELECTABLE_TEXT,
        description="Method used to acquire this page's text (selectable_text or ocr)"
    )
    ocr_status: OCRStatus = Field(
        default=OCRStatus.NOT_REQUIRED,
        description="Outcome of OCR processing for this page (not_required, completed, unavailable, failed)"
    )
    ocr_error_message: Optional[str] = Field(
        None,
        description="Safe, sanitized message explaining why OCR failed or was unavailable"
    )


class DocumentExtractionResponse(BaseModel):
    """Response containing extracted content from an uploaded PDF document."""
    filename: str = Field(..., description="Original filename of the uploaded document")
    file_size_bytes: int = Field(..., description="Size of the document in bytes")
    total_pages: int = Field(..., description="Total number of pages in the PDF")
    pages_requiring_ocr: List[int] = Field(
        default_factory=list,
        description="1-based page numbers flagged as having insufficient text and requiring OCR"
    )
    has_ocr_needed_pages: bool = Field(
        ...,
        description="Whether any pages in this document require OCR processing"
    )
    ocr_completed_pages: List[int] = Field(
        default_factory=list,
        description="1-based page numbers where OCR was successfully performed"
    )
    ocr_unavailable: bool = Field(
        default=False,
        description="True if OCR was required on any page but Tesseract was not installed/configured"
    )
    pages: List[PageExtraction] = Field(
        ...,
        description="List of extracted text and metadata per page in original page order"
    )
    normalized_full_text: str = Field(
        default="",
        description="Continuous document text preserving page markers for downstream legal analysis"
    )
    sample_evidence_references: List[EvidenceReference] = Field(
        default_factory=list,
        description="Structured evidence references identifying key passages and source pages"
    )
