"""Automated tests for PDF extraction service, OCR processing, and API endpoints."""
import io
from unittest.mock import patch
import pymupdf as fitz
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.document import ExtractionMethod, OCRStatus
from app.services.pdf_service import extract_pdf_data, PDFEmptyError, PDFInvalidFormatError
from app.services.ocr_service import is_tesseract_available

client = TestClient(app)


def create_text_pdf(pages_text: list[str]) -> bytes:
    """Helper to programmatically create an in-memory PDF with specified text per page."""
    doc = fitz.open()
    for text in pages_text:
        page = doc.new_page()
        if text:
            page.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_blank_pdf(num_pages: int = 1) -> bytes:
    """Helper to create a PDF with pages containing zero text (simulating scanned/empty PDF)."""
    doc = fitz.open()
    for _ in range(num_pages):
        doc.new_page()
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_encrypted_pdf(password: str = "secret123") -> bytes:
    """Helper to create an encrypted/password-protected PDF."""
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), "Confidential legal proceeding", fontsize=12)
    buf = io.BytesIO()
    doc.save(buf, encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw="admin", user_pw=password)
    pdf_bytes = buf.getvalue()
    doc.close()
    return pdf_bytes


def test_valid_selectable_pdf_extraction():
    """Test POST /api/documents/extract with a valid 2-page text PDF (no OCR required)."""
    sample_text_p1 = "High Court of Delhi - Criminal Appeal No. 1204 of 2024. Order reserved."
    sample_text_p2 = "The petition stands disposed of in terms of the settlement arrived between parties."

    pdf_bytes = create_text_pdf([sample_text_p1, sample_text_p2])

    response = client.post(
        "/api/documents/extract",
        files={"file": ("order.pdf", pdf_bytes, "application/pdf")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "order.pdf"
    assert data["total_pages"] == 2
    assert len(data["pages"]) == 2

    # Page 1 checks
    assert data["pages"][0]["page_number"] == 1
    assert "High Court of Delhi" in data["pages"][0]["text"]
    assert not data["pages"][0]["requires_ocr"]
    assert data["pages"][0]["extraction_method"] == ExtractionMethod.SELECTABLE_TEXT.value
    assert data["pages"][0]["ocr_status"] == OCRStatus.NOT_REQUIRED.value

    # Page 2 checks
    assert data["pages"][1]["page_number"] == 2
    assert "settlement arrived" in data["pages"][1]["text"]
    assert not data["pages"][1]["requires_ocr"]
    assert data["pages"][1]["extraction_method"] == ExtractionMethod.SELECTABLE_TEXT.value
    assert data["pages"][1]["ocr_status"] == OCRStatus.NOT_REQUIRED.value

    # Document summary checks
    assert data["has_ocr_needed_pages"] is False
    assert len(data["pages_requiring_ocr"]) == 0
    assert len(data["ocr_completed_pages"]) == 0
    assert data["ocr_unavailable"] is False

    # Normalized text checks
    assert "--- [Page 1] ---" in data["normalized_full_text"]
    assert "--- [Page 2] ---" in data["normalized_full_text"]

    # Evidence references checks
    assert len(data["sample_evidence_references"]) >= 1
    ref1 = data["sample_evidence_references"][0]
    assert ref1["page_number"] == 1
    assert "High Court of Delhi" in ref1["passage"]
    assert ref1["extraction_method"] == ExtractionMethod.SELECTABLE_TEXT.value


def test_ocr_processing_when_engine_available():
    """Verify that a scanned page uses OCR when the OCR engine successfully processes it."""
    pdf_bytes = create_blank_pdf(num_pages=1)
    mocked_ocr_text = "IN THE COURT OF CHIEF JUDICIAL MAGISTRATE, PUNE\nFIR No. 45/2024"

    with patch("app.services.pdf_service.ocr_page") as mock_ocr:
        mock_ocr.return_value = (mocked_ocr_text, True, "OCR completed successfully")

        response = client.post(
            "/api/documents/extract",
            files={"file": ("scanned_fir.pdf", pdf_bytes, "application/pdf")}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_pages"] == 1
        assert data["has_ocr_needed_pages"] is True
        assert data["pages_requiring_ocr"] == [1]
        assert data["ocr_completed_pages"] == [1]

        page = data["pages"][0]
        assert page["page_number"] == 1
        assert page["requires_ocr"] is True
        assert page["extraction_method"] == ExtractionMethod.OCR.value
        assert page["ocr_status"] == OCRStatus.COMPLETED.value
        assert "CHIEF JUDICIAL MAGISTRATE" in page["text"]
        assert page["char_count"] == len(mocked_ocr_text.strip())

        # Check evidence reference from OCR
        assert len(data["sample_evidence_references"]) == 1
        assert data["sample_evidence_references"][0]["extraction_method"] == ExtractionMethod.OCR.value
        assert "CHIEF JUDICIAL MAGISTRATE" in data["sample_evidence_references"][0]["passage"]


def test_ocr_unavailable_behavior():
    """Verify clean handling when OCR is required but Tesseract executable is not installed."""
    pdf_bytes = create_blank_pdf(num_pages=1)

    with patch("app.services.pdf_service.ocr_page") as mock_ocr:
        mock_ocr.return_value = (
            "",
            False,
            "Tesseract OCR is not installed or accessible on this system."
        )

        response = client.post(
            "/api/documents/extract",
            files={"file": ("scanned_notice.pdf", pdf_bytes, "application/pdf")}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["has_ocr_needed_pages"] is True
        assert data["pages_requiring_ocr"] == [1]
        assert data["ocr_completed_pages"] == []
        assert data["ocr_unavailable"] is True

        page = data["pages"][0]
        assert page["requires_ocr"] is True
        assert page["ocr_status"] == OCRStatus.UNAVAILABLE.value
        assert "not installed" in page["ocr_error_message"].lower()
        # Verify text was NOT fabricated
        assert page["text"].strip() == ""


def test_mixed_pdf_preserves_page_ordering_and_methods():
    """Verify document with both selectable text and scanned pages preserves 1-based order."""
    page1_text = "Page 1: Digital order sheet from Supreme Court of India."
    pdf_bytes = create_text_pdf([page1_text, ""])  # Page 1 text, Page 2 blank/scanned

    mocked_p2_ocr = "Page 2: Handwritten affidavit annexure transcription."

    def mock_ocr_dispatcher(page, lang=None):
        return (mocked_p2_ocr, True, "OCR completed successfully")

    with patch("app.services.pdf_service.ocr_page", side_effect=mock_ocr_dispatcher):
        response = client.post(
            "/api/documents/extract",
            files={"file": ("mixed_court_record.pdf", pdf_bytes, "application/pdf")}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_pages"] == 2
        assert data["has_ocr_needed_pages"] is True
        assert data["pages_requiring_ocr"] == [2]
        assert data["ocr_completed_pages"] == [2]

        # Verify page 1 is selectable text
        p1 = data["pages"][0]
        assert p1["page_number"] == 1
        assert p1["extraction_method"] == ExtractionMethod.SELECTABLE_TEXT.value
        assert p1["ocr_status"] == OCRStatus.NOT_REQUIRED.value
        assert "Supreme Court of India" in p1["text"]

        # Verify page 2 is OCR
        p2 = data["pages"][1]
        assert p2["page_number"] == 2
        assert p2["extraction_method"] == ExtractionMethod.OCR.value
        assert p2["ocr_status"] == OCRStatus.COMPLETED.value
        assert "Handwritten affidavit" in p2["text"]


def test_empty_upload_rejected():
    """Verify that an empty (0 bytes) upload is rejected with 400 Bad Request."""
    response = client.post(
        "/api/documents/extract",
        files={"file": ("empty.pdf", b"", "application/pdf")}
    )
    assert response.status_code == 400
    data = response.json()
    assert "empty" in data["detail"].lower()


def test_invalid_pdf_data_rejected():
    """Verify that a non-PDF file pretending to be a PDF is safely rejected."""
    corrupted_data = b"This is just a plain text file, not a valid PDF document."
    response = client.post(
        "/api/documents/extract",
        files={"file": ("fake.pdf", corrupted_data, "application/pdf")}
    )
    assert response.status_code == 400
    data = response.json()
    assert "invalid" in data["detail"].lower() or "pdf" in data["detail"].lower()


def test_password_protected_pdf_rejected():
    """Verify that a password protected PDF is caught with a clean error message."""
    encrypted_bytes = create_encrypted_pdf(password="secret123")

    response = client.post(
        "/api/documents/extract",
        files={"file": ("confidential.pdf", encrypted_bytes, "application/pdf")}
    )

    assert response.status_code == 400
    data = response.json()
    assert "password" in data["detail"].lower() or "encrypted" in data["detail"].lower()


def test_service_level_validation():
    """Directly test service functions for unit testing."""
    with pytest.raises(PDFEmptyError):
        extract_pdf_data(b"", "empty.pdf")

    with pytest.raises(PDFInvalidFormatError):
        extract_pdf_data(b"not a pdf content", "invalid.pdf")


@pytest.mark.skipif(
    not is_tesseract_available()[0],
    reason="Tesseract OCR executable is not installed on this host environment"
)
def test_real_tesseract_engine_integration():
    """Integration test with actual Tesseract binary (runs only when Tesseract is installed)."""
    pdf_bytes = create_blank_pdf(num_pages=1)
    response = client.post(
        "/api/documents/extract",
        files={"file": ("test_real.pdf", pdf_bytes, "application/pdf")}
    )
    assert response.status_code == 200
