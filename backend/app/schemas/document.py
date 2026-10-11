"""Pydantic schemas for request and response validation."""
from typing import List
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str = Field(..., description="Service status indicator")
    app_name: str = Field(..., description="Application name")
    version: str = Field(..., description="Application version")


class PageExtraction(BaseModel):
    """Extracted text details for an individual document page."""
    page_number: int = Field(..., description="1-based page number")
    text: str = Field(..., description="Extracted selectable text from the page")
    char_count: int = Field(..., description="Number of extracted characters")
    requires_ocr: bool = Field(
        ...,
        description="Indicates if the page has sparse or no selectable text and requires OCR processing"
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
    pages: List[PageExtraction] = Field(
        ...,
        description="List of extracted text and metadata per page"
    )
    has_ocr_needed_pages: bool = Field(
        ...,
        description="Whether any pages in this document require OCR processing"
    )
