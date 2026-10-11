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


def test_categorization_supported_criminal_bail_order(sample_bail_doc):
    """Test classification of supported criminal bail order into category, doc type, and outcome."""
    response = client.post("/api/documents/analyze", json=sample_bail_doc.model_dump())
    assert response.status_code == 200
    data = response.json()

    # Case category
    assert data["case_category"]["value"] == "Criminal"
    assert data["case_category"]["confidence"] == "high"
    assert data["case_category"]["page_number"] in [1, 2]
    assert len(data["case_category"]["passage"]) > 0

    # Document type
    assert data["document_type"]["value"] == "Bail Order"
    assert data["document_type"]["confidence"] == "high"
    assert data["document_type"]["page_number"] == 1

    # Case outcome
    assert data["case_outcome"]["value"] == "Granted"
    assert data["case_outcome"]["confidence"] == "high"
    assert data["case_outcome"]["page_number"] == 2
    assert "admitted to bail" in data["case_outcome"]["passage"].lower()


def test_categorization_insufficient_evidence_uncertain():
    """Test that documents with insufficient legal facts return Uncertain / Not Determined."""
    doc = DocumentExtractionResponse(
        filename="short_note.pdf",
        file_size_bytes=80,
        total_pages=1,
        pages=[
            PageExtraction(
                page_number=1,
                text="Internal administrative circular regarding office timings and meeting rooms.",
                char_count=77,
                requires_ocr=False,
                extraction_method=ExtractionMethod.SELECTABLE_TEXT,
                ocr_status=OCRStatus.NOT_REQUIRED
            )
        ],
        pages_requiring_ocr=[],
        has_ocr_needed_pages=False,
        ocr_completed_pages=[],
        ocr_unavailable=False,
        normalized_full_text="Internal administrative circular regarding office timings and meeting rooms.",
        sample_evidence_references=[]
    )

    response = client.post("/api/documents/analyze", json=doc.model_dump())
    assert response.status_code == 200
    data = response.json()

    assert data["case_category"]["value"] == "Uncertain"
    assert data["case_category"]["confidence"] == "not_found"
    assert data["document_type"]["value"] == "Uncertain"
    assert data["case_outcome"]["value"] == "Not Determined"
    assert data["case_outcome"]["confidence"] == "not_found"


def test_document_mentions_bail_but_is_appeal():
    """Verify document mentioning bail in background is classified as Appeal, not Bail Order."""
    text_p1 = (
        "IN THE HIGH COURT OF DELHI AT NEW DELHI\n"
        "CRIMINAL APPEAL NO. 412/2023\n"
        "Rajesh Kumar ... Appellant\n"
        "versus\n"
        "State of NCT of Delhi ... Respondent\n"
        "This appeal is directed against the impugned judgment of conviction. "
        "While the appellant had previously sought bail pending trial from the trial court, "
        "in this appeal under Section 374 CrPC, the appellant challenges his conviction under Section 302 IPC."
    )
    text_p2 = (
        "Having examined the witness testimony and forensic report, this Court finds no infirmity in the trial court judgment. "
        "Accordingly, the appeal is dismissed."
    )
    doc = DocumentExtractionResponse(
        filename="criminal_appeal.pdf",
        file_size_bytes=2048,
        total_pages=2,
        pages=[
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
        ],
        pages_requiring_ocr=[],
        has_ocr_needed_pages=False,
        ocr_completed_pages=[],
        ocr_unavailable=False,
        normalized_full_text=f"--- [Page 1] ---\n{text_p1}\n\n--- [Page 2] ---\n{text_p2}",
        sample_evidence_references=[]
    )

    response = client.post("/api/documents/analyze", json=doc.model_dump())
    assert response.status_code == 200
    data = response.json()

    assert data["case_category"]["value"] == "Criminal"
    assert data["document_type"]["value"] == "Appeal"
    assert data["document_type"]["value"] != "Bail Order"
    assert data["case_outcome"]["value"] == "Dismissed"
    assert data["case_outcome"]["page_number"] == 2


def test_prayer_requested_bail_distinguished_from_actual_rejection():
    """Verify that a petitioner's prayer for bail is NOT mistaken for a granted outcome when the court rejects it."""
    text = (
        "IN THE HIGH COURT OF BOMBAY\n"
        "BAIL APPLN. NO. 980/2024\n"
        "Petitioner: Anil Deshmukh\n"
        "versus\n"
        "Respondent: State of Maharashtra\n"
        "The applicant prayed that regular bail be granted to him during the pendency of the trial under Section 439 CrPC.\n"
        "Having considered the serious nature of the economic offence, this Court finds no merit. "
        "The bail application is rejected."
    )
    doc = DocumentExtractionResponse(
        filename="rejected_bail.pdf",
        file_size_bytes=1024,
        total_pages=1,
        pages=[
            PageExtraction(
                page_number=1,
                text=text,
                char_count=len(text),
                requires_ocr=False,
                extraction_method=ExtractionMethod.SELECTABLE_TEXT,
                ocr_status=OCRStatus.NOT_REQUIRED
            )
        ],
        pages_requiring_ocr=[],
        has_ocr_needed_pages=False,
        ocr_completed_pages=[],
        ocr_unavailable=False,
        normalized_full_text=text,
        sample_evidence_references=[]
    )

    response = client.post("/api/documents/analyze", json=doc.model_dump())
    assert response.status_code == 200
    data = response.json()

    assert data["case_category"]["value"] == "Criminal"
    assert data["document_type"]["value"] == "Bail Order"
    assert data["case_outcome"]["value"] == "Rejected"
    assert data["case_outcome"]["value"] != "Granted"
    assert data["disposition"]["value"] == "Bail Rejected"
    assert "rejected" in data["case_outcome"]["passage"].lower()


def test_outcome_not_determined_when_interim_notice_only():
    """Verify that interim notices and adjournments return Not Determined outcome."""
    text = (
        "IN THE HIGH COURT OF GUJARAT AT AHMEDABAD\n"
        "CIVIL APPEAL NO. 110/2024\n"
        "Patel Traders ... Appellant\n"
        "versus\n"
        "Gujarat State Corp ... Respondent\n"
        "Issue notice to the respondents returnable on 18.11.2024. Matter adjourned."
    )
    doc = DocumentExtractionResponse(
        filename="notice_order.pdf",
        file_size_bytes=800,
        total_pages=1,
        pages=[
            PageExtraction(
                page_number=1,
                text=text,
                char_count=len(text),
                requires_ocr=False,
                extraction_method=ExtractionMethod.SELECTABLE_TEXT,
                ocr_status=OCRStatus.NOT_REQUIRED
            )
        ],
        pages_requiring_ocr=[],
        has_ocr_needed_pages=False,
        ocr_completed_pages=[],
        ocr_unavailable=False,
        normalized_full_text=text,
        sample_evidence_references=[]
    )

    response = client.post("/api/documents/analyze", json=doc.model_dump())
    assert response.status_code == 200
    data = response.json()

    assert data["case_category"]["value"] == "Civil"
    assert data["document_type"]["value"] == "Appeal"
    assert data["case_outcome"]["value"] == "Not Determined"
    assert data["disposition"]["value"] == "Pending / Order Reserved"


def test_evidence_references_point_to_valid_extracted_pages(sample_bail_doc):
    """Verify evidence references for all classification decisions link to valid pages."""
    response = client.post("/api/documents/analyze", json=sample_bail_doc.model_dump())
    assert response.status_code == 200
    data = response.json()

    valid_pages = {1, 2}

    if data["case_category"]["page_number"] is not None:
        assert data["case_category"]["page_number"] in valid_pages
        assert len(data["case_category"]["passage"]) > 0

    if data["document_type"]["page_number"] is not None:
        assert data["document_type"]["page_number"] in valid_pages
        assert len(data["document_type"]["passage"]) > 0

    if data["case_outcome"]["page_number"] is not None:
        assert data["case_outcome"]["page_number"] in valid_pages
        assert len(data["case_outcome"]["passage"]) > 0


def test_procedural_stage_classification(sample_bail_doc):
    """Test procedural stage classification for bail proceedings."""
    response = client.post("/api/documents/analyze", json=sample_bail_doc.model_dump())
    assert response.status_code == 200
    data = response.json()

    assert data["procedural_stage"]["value"] == "Bail proceedings"
    assert data["procedural_stage"]["confidence"] == "high"


def test_legal_rag_retrieval_and_statutory_severity(sample_bail_doc):
    """Test legal RAG retrieval and statutory seriousness evaluation for Section 420 IPC."""
    response = client.post("/api/documents/analyze", json=sample_bail_doc.model_dump())
    assert response.status_code == 200
    data = response.json()

    # RAG retrieved sources
    assert "retrieved_legal_sources" in data
    assert len(data["retrieved_legal_sources"]) >= 1
    top_source = data["retrieved_legal_sources"][0]
    assert "source_id" in top_source
    assert "title" in top_source
    assert top_source["relevance_score"] > 0

    # Statutory severity assessment
    assert data["statutory_severity"] is not None
    sev = data["statutory_severity"]
    assert sev["severity_tier"] == "Serious (7+ Years)"
    assert "420" in sev["cited_section"]
    assert "7 years" in sev["applicable_punishment"].lower()
    # Check mandatory disclaimer
    assert "not a finding of guilt" in sev["disclaimer"].lower()


def test_document_history_persistence_and_retrieval(sample_bail_doc):
    """Test that analyzed documents are saved to persistent history and can be reopened."""
    response = client.post("/api/documents/analyze", json=sample_bail_doc.model_dump())
    assert response.status_code == 200
    data = response.json()
    doc_id = data["document_id"]
    assert doc_id is not None

    # 1. List history
    hist_resp = client.get("/api/documents/history")
    assert hist_resp.status_code == 200
    hist_items = hist_resp.json()
    assert any(item["document_id"] == doc_id for item in hist_items)

    # 2. Reopen specific document
    detail_resp = client.get(f"/api/documents/history/{doc_id}")
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert detail_data["analysis"]["document_id"] == doc_id
    assert detail_data["analysis"]["court_name"]["value"] is not None
    assert detail_data["extraction"]["filename"] == "bail_order.pdf"

    # 3. Delete from history
    del_resp = client.delete(f"/api/documents/history/{doc_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

    # 4. Confirm deleted
    check_del = client.get(f"/api/documents/history/{doc_id}")
    assert check_del.status_code == 404


def test_bns_bridge_and_citation_validator():
    """Verify BNS/BNSS cross-statute bridge and deterministic citation validator inspired by goyashek/bns-legal-rag."""
    from app.services.legal_rag_service import (
        bridge_old_statute_to_bns,
        validate_citations_against_retrieved_sources,
        RetrievedLegalSource,
    )
    from app.schemas.analysis import ExtractedEntity

    # 1. Test IPC to BNS bridge
    ipc_bridge = bridge_old_statute_to_bns("Section 420 IPC")
    assert ipc_bridge is not None
    assert ipc_bridge["bns_section"] == "318(4)"
    assert "Bharatiya Nyaya Sanhita" in ipc_bridge["enacted_statute"]

    crpc_bridge = bridge_old_statute_to_bns("Section 439 CrPC")
    assert crpc_bridge is not None
    assert crpc_bridge["bnss_section"] == "483"

    # 2. Test Deterministic Citation Validator
    mock_sources = [
        RetrievedLegalSource(
            source_id="IND-STATUTE-CRPC-439",
            title="Section 439 CrPC (Section 483 BNSS)",
            act_or_authority="CrPC / BNSS",
            text="Special powers regarding bail under Section 439.",
            relevance_score=0.9
        )
    ]
    doc_sections = [ExtractedEntity(value="Section 420", page_number=1, passage="Section 420 IPC", confidence="high")]

    # Case A: Answer cites valid sections (439 and 420)
    valid_answer = "Under Section 439 CrPC and Section 420 IPC, bail is granted."
    is_valid, verified, unverified = validate_citations_against_retrieved_sources(valid_answer, mock_sources, doc_sections)
    assert is_valid is True
    assert len(unverified) == 0
    assert any("439" in v for v in verified)

    # Case B: Answer cites ungrounded section (Section 307 which is absent from context)
    invalid_answer = "The applicant is also charged under Section 307 of IPC."
    is_valid, verified, unverified = validate_citations_against_retrieved_sources(invalid_answer, mock_sources, doc_sections)
    assert is_valid is False
    assert any("307" in u for u in unverified)
