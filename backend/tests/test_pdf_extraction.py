"""Automated tests for PDF extraction service and API endpoint."""
import io
import fitz
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.pdf_service import extract_pdf_data, PDFEmptyError, PDFInvalidFormatError

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
    # PyMuPDF doc.save / tobytes encryption permissions
    # In PyMuPDF, to encrypt on save: doc.save(..., encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw="owner", user_pw="secret123")
    buf = io.BytesIO()
    doc.save(buf, encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw="admin", user_pw=password)
    pdf_bytes = buf.getvalue()
    doc.close()
    return pdf_bytes


def test_valid_pdf_extraction_endpoint():
    """Test POST /api/documents/extract with a valid 2-page text PDF."""
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
    assert data["pages"][0]["page_number"] == 1
    assert "High Court of Delhi" in data["pages"][0]["text"]
    assert not data["pages"][0]["requires_ocr"]

    assert data["pages"][1]["page_number"] == 2
    assert "settlement arrived" in data["pages"][1]["text"]
    assert not data["pages"][1]["requires_ocr"]
    assert data["has_ocr_needed_pages"] is False
    assert len(data["pages_requiring_ocr"]) == 0


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


def test_scanned_pdf_flags_ocr_requirement():
    """Verify that pages with no selectable text are flagged as requiring OCR."""
    pdf_bytes = create_blank_pdf(num_pages=2)

    response = client.post(
        "/api/documents/extract",
        files={"file": ("scanned_fir.pdf", pdf_bytes, "application/pdf")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_pages"] == 2
    assert data["has_ocr_needed_pages"] is True
    assert data["pages_requiring_ocr"] == [1, 2]
    assert data["pages"][0]["requires_ocr"] is True
    assert data["pages"][1]["requires_ocr"] is True
    # Verify we did NOT pretend OCR was performed
    assert data["pages"][0]["text"].strip() == ""


def test_mixed_pages_ocr_flagging():
    """Verify that a document with one text page and one blank page flags only the blank page."""
    valid_text = "This is a detailed legal order with substantial selectable text content exceeding the OCR threshold."
    pdf_bytes = create_text_pdf([valid_text, ""])  # page 1 has text, page 2 is blank

    response = client.post(
        "/api/documents/extract",
        files={"file": ("mixed.pdf", pdf_bytes, "application/pdf")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_pages"] == 2
    assert data["has_ocr_needed_pages"] is True
    assert data["pages_requiring_ocr"] == [2]
    assert data["pages"][0]["requires_ocr"] is False
    assert data["pages"][1]["requires_ocr"] is True


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
    """Directly test service functions for pure unit testing."""
    with pytest.raises(PDFEmptyError):
        extract_pdf_data(b"", "empty.pdf")

    with pytest.raises(PDFInvalidFormatError):
        extract_pdf_data(b"not a pdf content", "invalid.pdf")
