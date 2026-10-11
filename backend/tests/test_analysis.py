"""Automated tests for legal document analysis and grounded Q&A endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.document import PageExtraction, ExtractionMethod, OCRStatus, DocumentExtractionResponse

client = TestClient(app)


@pytest.fixture
def sample_bail_doc() -> DocumentExtractionResponse:
    text_p1 = (
        "IN THE HIGH COURT OF DELHI AT NEW DELHI\n"
        "BAIL APPLN. 2104/2024\n"
        "Petitioner: Ramesh Sharma\n"
        "versus\n"
        "Respondent: State of NCT of Delhi\n"
        "Dated: 14.08.2024\n"
        "The present application is filed under Section 439 of the Code of Criminal Procedure for grant of bail "
        "in FIR No. 112/2024 registered under Section 420 of the Indian Penal Code."
    )
    text_p2 = (
        "Heard learned counsel for parties. Considering the applicant has undergone custody of 6 months "
        "and investigation is complete, the applicant is admitted to bail on furnishing personal bond of Rs. 25,000/-. "
        "Petition stands disposed of."
    )
    pages = [
        PageExtraction(
            page_number=1,
            text=text_p1,
            char_count=len(text_p1),
            requires_ocr=False,
            extraction_method=ExtractionMethod.SELECTABLE_TEXT,
            ocr_status=OCRStatus.NOT_REQUIRED
        ),
        PageExtraction(
            page_number=2,
            text=text_p2,
            char_count=len(text_p2),
            requires_ocr=False,
            extraction_method=ExtractionMethod.SELECTABLE_TEXT,
            ocr_status=OCRStatus.NOT_REQUIRED
        )
    ]
    return DocumentExtractionResponse(
        filename="bail_order.pdf",
        file_size_bytes=4096,
        total_pages=2,
        pages_requiring_ocr=[],
        has_ocr_needed_pages=False,
        ocr_completed_pages=[],
        ocr_unavailable=False,
        pages=pages,
        normalized_full_text=f"--- [Page 1] ---\n{text_p1}\n\n--- [Page 2] ---\n{text_p2}",
        sample_evidence_references=[]
    )


def test_analyze_court_order_endpoint(sample_bail_doc):
    """Test POST /api/documents/analyze extracts structured judicial entities."""
    response = client.post("/api/documents/analyze", json=sample_bail_doc.model_dump())
    assert response.status_code == 200
    data = response.json()

    # Court Name
    assert data["court_name"]["value"] is not None
    assert "HIGH COURT OF DELHI" in data["court_name"]["value"].upper()
    assert data["court_name"]["page_number"] == 1

    # Case Number
    assert data["case_number"]["value"] is not None
    assert "2104/2024" in data["case_number"]["value"]

    # Parties
    assert "Ramesh Sharma" in data["petitioner"]["value"]
    assert "State of NCT of Delhi" in data["respondent"]["value"]

    # Date
    assert data["order_date"]["value"] == "14.08.2024"

    # Document Type & Disposition
    assert "Bail" in data["document_type"]["value"]
    assert data["disposition"]["value"] == "Bail Granted"
    assert data["disposition"]["page_number"] == 2

    # Cited Sections
    sec_values = [s["value"] for s in data["cited_sections"]]
    assert any("439" in s for s in sec_values)
    assert any("420" in s for s in sec_values)

    # Plain language summary & key findings
    assert "Ramesh Sharma" in data["plain_language_summary"]
    assert len(data["key_findings"]) >= 3


def test_analyze_missing_facts_are_labeled_without_hallucination():
    """Verify that when facts are not in the document, they are labeled not_found and not fabricated."""
    doc = DocumentExtractionResponse(
        filename="unstructured.pdf",
        file_size_bytes=100,
        total_pages=1,
        pages=[
            PageExtraction(
                page_number=1,
                text="General advisory note regarding workplace dispute resolution guidelines.",
                char_count=73,
                requires_ocr=False,
                extraction_method=ExtractionMethod.SELECTABLE_TEXT,
                ocr_status=OCRStatus.NOT_REQUIRED
            )
        ],
        pages_requiring_ocr=[],
        has_ocr_needed_pages=False,
        ocr_completed_pages=[],
        ocr_unavailable=False,
        normalized_full_text="General advisory note regarding workplace dispute resolution guidelines.",
        sample_evidence_references=[]
    )

    response = client.post("/api/documents/analyze", json=doc.model_dump())
    assert response.status_code == 200
    data = response.json()

    assert data["court_name"]["value"] is None
    assert data["court_name"]["confidence"] == "not_found"
    assert data["case_number"]["value"] is None
    assert data["case_number"]["confidence"] == "not_found"
    assert data["petitioner"]["value"] is None
    assert data["respondent"]["value"] is None


def test_grounded_qa_answers_from_document(sample_bail_doc):
    """Test POST /api/documents/ask provides grounded answers with page citations."""
    qa_payload = {
        "question": "Was bail granted to Ramesh Sharma?",
        "pages": [p.model_dump() for p in sample_bail_doc.pages]
    }
    response = client.post("/api/documents/ask", json=qa_payload)
    assert response.status_code == 200
    data = response.json()

    assert data["is_found_in_doc"] is True
    assert "Bail Granted" in data["answer"]
    assert 2 in data["cited_pages"]
    assert len(data["evidence_snippets"]) >= 1


def test_grounded_qa_rejects_unmentioned_information(sample_bail_doc):
    """Test that QA does not hallucinate answers to unrelated questions."""
    qa_payload = {
        "question": "What is the capital city of France?",
        "pages": [p.model_dump() for p in sample_bail_doc.pages]
    }
    response = client.post("/api/documents/ask", json=qa_payload)
    assert response.status_code == 200
    data = response.json()

    assert data["is_found_in_doc"] is False
    assert "not found" in data["answer"].lower()
    assert data["cited_pages"] == []
