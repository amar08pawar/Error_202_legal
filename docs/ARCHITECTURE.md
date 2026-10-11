# NayaSetu Architecture Specification — Phase 3: Legal Document Analysis MVP

## 1. System Overview

**NayaSetu** is an Indian court-document intelligence web application designed to ingest, process, and analyze complex judicial documents (orders, judgments, FIRs, charge sheets, and petitions).

The current architecture encompasses:
1. **In-Memory Digital Extraction**: High-speed, C-accelerated text extraction using PyMuPDF (`fitz`) with zero permanent disk persistence.
2. **Selective OCR Framework**: Targeted routing for sparse or scanned pages (`char_count < OCR_THRESHOLD_CHARS`) to Tesseract OCR, with graceful degradation when the host executable is absent.
3. **Normalized Full-Text & Evidence Grounding**: Continuous representation preserving page boundaries and linking verified snippets to source pages.
4. **Legal Entity Extraction**: Automated parsing of court jurisdiction, case registration, petitioner/appellant, respondent/state, order date, and document classification.
5. **Statutory Provisions & Operative Holding**: Extraction of cited sections (IPC, CrPC, BNS, POCSO, NDPS, Constitution) and dispositive outcomes (*Bail Granted*, *Dismissed*, etc.).
6. **Zero-Hallucination Fallback & Grounded Q&A**: Document-grounded synthesis and interactive question answering anchored to verbatim text passages.
7. **Interactive Frontend Workflow**: Step-by-step progress tracking (`Upload PDF` → `Extract & OCR` → `Legal Analysis` → `Summary, Evidence & Q&A`).

```mermaid
flowchart TD
    Client["React 18 + Vite Frontend (Port 5174 / 5173)"]
    API["FastAPI Backend (Port 8000)"]
    PDFService["PDF Service (pdf_service.py)"]
    PyMuPDF["PyMuPDF (fitz)"]
    OCRService["OCR Service (ocr_service.py)"]
    Tesseract["Tesseract OCR Binary (Optional)"]
    AnalysisService["Analysis Service (analysis_service.py)"]

    Client -->|1. GET /api/health| API
    API -->|Check binary availability| OCRService
    Client -->|2. POST /api/documents/extract| API
    API -->|In-memory stream| PDFService
    PDFService -->|Page text| PyMuPDF
    PDFService -->|Selective OCR if sparse| OCRService
    OCRService -.->|Image render & OCR| Tesseract
    API -->|DocumentExtractionResponse| Client
    Client -->|3. POST /api/documents/analyze| API
    API -->|Extract legal entities & disposition| AnalysisService
    API -->|LegalAnalysisResponse| Client
    Client -->|4. POST /api/documents/ask| API
    API -->|Grounded Q&A strictly from doc| AnalysisService
    API -->|QAResponse (Answer + Citations)| Client
```

---

## 2. Component Architecture

### A. Frontend Layer (`frontend/`)
- **Technology**: React 18, Vite 5, TypeScript, Tailwind CSS, Lucide React.
- **Components**:
  - `Header`: Navigation, branding, and real-time backend connectivity badge.
  - `HealthStatusBadge`: Polls `GET /api/health` displaying API status and OCR engine readiness (`Active` vs `Binary Unset`).
  - `DocumentUpload`: Drag-and-drop / file picker PDF dropzone with client-side file size and format validation (15 MB limit).
  - `ExtractedDocumentViewer`:
    - **Workflow Progress Breadcrumb**: Visual 4-step progress tracker.
    - **Tab 1: Case Overview & AI Analysis**: Displays plain-language summary, key legal findings, structured fact grid, parties, cited statutes, and interactive Grounded Q&A.
    - **Tab 2: Page by Page**: Page navigation with search filter, extraction method badges, and text viewer.
    - **Tab 3: Normalized Full Text**: Continuous transcript with full-text copy button.
    - **Tab 4: Evidence References**: Grounded passage anchors with character offsets.
  - `LegalAnalysisViewer`: Renders structured case facts, confidence badges, operative rulings, intelligence provider notes, and interactive Q&A assistant.
- **Service Layer**:
  - `src/services/api.ts`: Typed fetch client for health check, document extraction, analysis, and Q&A.

### B. Backend Layer (`backend/app/`)
- **Framework**: FastAPI with Uvicorn ASGI server.
- **Configuration** (`app/core/config.py`):
  - `MAX_UPLOAD_SIZE_BYTES`: Upload limit (default 15 MB).
  - `OCR_THRESHOLD_CHARS`: Threshold for sparse-page OCR (default 30 characters).
  - `TESSERACT_CMD`: Path to Tesseract executable.
  - `OCR_LANGUAGES`: OCR languages (default `eng`).
  - `ALLOWED_ORIGINS`: CORS origins supporting ports 5173, 5174, and 5175.
- **Data Models** (`app/schemas/`):
  - `document.py`: `ExtractionMethod`, `OCRStatus`, `EvidenceReference`, `PageExtraction`, `DocumentExtractionResponse`, `HealthResponse`.
  - `analysis.py`: `ExtractedEntity[T]`, `LegalAnalysisResponse`, `QARequest`, `QAResponse`.
- **Services** (`app/services/`):
  - `pdf_service.py`: In-memory PDF stream processing, magic header validation, selective OCR routing, and normalized text assembly.
  - `ocr_service.py`: Executable path resolution, high-DPI in-memory page pixmap rendering, and safe degradation when host binary is absent.
  - `analysis_service.py`: Judicial entity extractors, statutory section parsers, disposition matchers, plain-language summarization, provider mode detection, and document-grounded Q&A.
- **API Routes** (`app/api/routes/`):
  - `documents.py`: `POST /api/documents/extract`
  - `analysis.py`: `POST /api/documents/analyze`, `POST /api/documents/ask`

---

## 3. Five-Phase Product Roadmap

| Phase | Title | Status | Details |
|---|---|---|---|
| **Phase 1** | Foundation & PDF Processing | **Implemented & Verified** | In-memory PyMuPDF extraction, validation, error handling, tests pass. |
| **Phase 2** | OCR & Normalized Evidence | **Partially Implemented / Verified (Selectable Text)** | Selective routing implemented; Tesseract host binary missing so scanned-PDF OCR is **Not Verified**. |
| **Phase 3** | Legal Document Analysis MVP | **Implemented & Verified** | Judicial entities, statutes, disposition, grounded Q&A, workflow UI. Extractive fallback active (no LLM keys configured). |
| **Phase 4** | Cloud Persistence & History | **Planned (Not Implemented)** | Firebase Authentication and Cloud Firestore persistent document storage not yet implemented. |
| **Phase 5** | Cloud Deployment & Multilingual | **Planned / Not Verified** | Containerized deployment and Indic language packs planned for future release. |
