# NayaSetu — Indian Court Document Intelligence

NayaSetu is an intelligent document processing web platform tailored for the Indian judicial system. It ingests, extracts, analyzes, and structures court orders, judgments, FIRs, charge sheets, and petitions.

> **Current Status**: **Legal RAG Classification MVP**.
> In this phase, NayaSetu connects in-memory PyMuPDF extraction to multi-parameter legal classification (Category, Document Type, Procedural Stage, Outcome, Cited Statutes, and Preliminary Statutory Severity). It features a local Legal RAG retrieval adapter, IPC-to-BNS statutory bridging, code-checked citation validation, persistent local SQLite history, and document-grounded Q&A with zero-hallucination citations.

---

## 1. Five-Phase Product Roadmap

| Phase | Milestone | Status | Details & Current Verification |
|---|---|---|---|
| **Phase 1** | Foundation & PDF Processing | **Implemented & Verified** | In-memory PyMuPDF extraction per page, file validation, health checks, error handling, 100% test pass. |
| **Phase 2** | Selective OCR & Evidence Foundation | **Partially Implemented / Verified (Selectable Text)** | Selective routing and normalized text models pass. Tesseract OS binary is missing on host, so real scanned-PDF OCR remains **Not Verified**. |
| **Phase 3** | Legal Document Analysis & RAG MVP | **Implemented & Verified** | Multi-parameter classification, statutory severity assessment with disclaimers, external legal RAG knowledge retrieval, and grounded Q&A verified. |
| **Phase 4** | Persistent Storage & History | **Implemented Locally & Verified (SQLite)** | Persistent local SQLite document storage (`backend/data/nayasetu_history.db`) surviving restarts; document history inspection, reopening, and deletion endpoints. Firebase Auth/Firestore remains future cloud scope. |
| **Phase 5** | Cloud Deployment & Multilingual | **Planned / Not Verified** | Containerized deployment and Indic language packs planned for future release; deployment is **not yet verified**. |

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

### Backend
- **Language**: Python 3.14.2 (Python 3.10+ compatible)
- **API Framework**: FastAPI 0.110.0
- **ASGI Server**: Uvicorn 0.27.1
- **PDF Text Engine**: PyMuPDF (`fitz`) 1.28.2
- **OCR Framework**: pytesseract 0.3.13 & Pillow 12.0.0 (wrapping Tesseract OCR)
- **Validation**: Pydantic 2.12.5
- **File Upload Handler**: python-multipart 0.0.9
- **Testing**: pytest 9.0.2 & HTTPX 0.27.0

---

## 3. Current Limitations & Operational State

- **Selectable-Text PDF Extraction**: Fully tested and verified using PyMuPDF in RAM.
- **Tesseract Host Dependency**: The Python library `pytesseract` is installed, but the standalone Tesseract OS executable is not installed on the server host. Pages requiring OCR report `ocr_status: "unavailable"` safely; real scanned-PDF OCR remains **unverified** until Tesseract is installed.
- **AI Intelligence Provider**: No external LLM API key (`GEMINI_API_KEY` or `OPENAI_API_KEY`) is configured in the environment. Legal analysis runs in **verified extractive fallback mode**, extracting entities and answering queries strictly from verbatim document text without generative hallucination.
- **Persistence**: No database or cloud storage (Firebase / Firestore) is integrated. Uploaded documents are processed entirely in-memory with zero disk persistence.
- **Deployment**: Local execution on Windows (FastAPI + Vite) is tested; containerized cloud deployment is not yet verified.

---

## 4. Installation & Local Setup (Windows PowerShell)

Navigate to the project root:
```powershell
cd C:\Users\Lenovo\OneDrive\Desktop\NayaSetu\Error_202_legal
```

### Terminal 1: Backend Setup & Launch

```powershell
cd backend

# Install dependencies
python -m pip install -r requirements.txt

# Start FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API is accessible at `http://127.0.0.1:8000`. Interactive Swagger documentation is at `http://127.0.0.1:8000/docs`.

### Terminal 2: Frontend Setup & Launch

```powershell
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open your browser at `http://localhost:5174` (or `http://localhost:5173`) to access NayaSetu.

---

## 5. API Endpoints & Upload-to-Analysis Workflow

### Workflow Overview
```text
1. Upload PDF  ──►  2. Extract & OCR  ──►  3. Analyze Legal Facts  ──►  4. Summary, Evidence & Q&A
```

### Endpoints

#### 1. Service Health Check
- **Route**: `GET /api/health`
- **Response**:
  ```json
  {
    "status": "healthy",
    "app_name": "NayaSetu",
    "version": "1.0.0",
    "ocr_available": false
  }
  ```

#### 2. Document Extraction
- **Route**: `POST /api/documents/extract`
- **Content-Type**: `multipart/form-data` (Field: `file`)
- **Response**: `DocumentExtractionResponse` containing total pages, per-page text, character counts, extraction method, OCR status, and normalized full text.

#### 3. Legal Document Analysis
- **Route**: `POST /api/documents/analyze`
- **Content-Type**: `application/json` (Payload: `DocumentExtractionResponse`)
- **Extracted Fields**:
  - `court_name`: Court or tribunal jurisdiction (e.g. *High Court of Delhi*).
  - `case_number`: Registration number (e.g. *Bail Appln. 2104/2024*).
  - `petitioner` & `respondent`: Named legal parties with source page numbers.
  - `order_date`: Decision or filing date.
  - `document_type`: Legal classification (*Bail Order*, *Judgment*, etc.).
  - `cited_sections`: Statutory provisions cited (*Section 439 CrPC*, *Section 420 IPC*).
  - `disposition`: Operative judicial holding (*Bail Granted*, *Dismissed*).
  - `plain_language_summary`: Verified, readable synthesis.
  - `key_findings`: Bulleted legal takeaways with page links.
  - `analysis_provider`: Active intelligence provider (`extractive_fallback`).
  - `provider_notes`: Operational mode and limitations notice.

#### 4. Grounded Document Q&A
- **Route**: `POST /api/documents/ask`
- **Content-Type**: `application/json`
- **Payload**: `{ "question": "Was bail granted?", "pages": [...] }`
- **Response**: `QAResponse` containing grounded answer, cited page numbers, and verbatim evidence snippets. Out-of-document queries return `is_found_in_doc: false`.

---

## 6. Synthetic Test Data & Verification

A synthetic test PDF fixture is provided in the repository for end-to-end verification:
- **File**: `test_data/sample_delhi_high_court_bail_order.pdf`
- **Purpose**: Strictly synthetic test data modeled after an Indian High Court bail order. Contains no real personal or sensitive legal facts.
- **Testing in UI**: Drag and drop this file on the home screen at `http://localhost:5174/` to test extraction, legal analysis, and Q&A.

---

## 7. Automated Test Results

### Backend Tests (`pytest`)
```powershell
cd backend
python -m pytest
```
- **23 passed**, **1 skipped** (optional standalone Tesseract binary OCR test).
- Covers PDF validation, PyMuPDF extraction, multi-parameter classification (Category, Doc Type, Procedural Stage, Outcome), cited statutes, statutory seriousness with disclaimers, legal RAG retrieval, grounded Q&A, and persistent SQLite history.

### Frontend Build (`npm run build`)
```powershell
cd frontend
npm run build
```
- TypeScript check (`tsc`) passed with 0 errors.
- Vite production bundle built successfully.

---

## 8. Legal RAG Architecture & Upstream Attribution

NayaSetu integrates an authoritative statutory knowledge base and retrieval layer informed by open-source Indian legal NLP research:

- **Upstream Reference**: [https://github.com/goyashek/bns-legal-rag](https://github.com/goyashek/bns-legal-rag) by [@goyashek](https://github.com/goyashek) (MIT License).
- **Integrated Capabilities**:
  1. **IPC ↔ BNS & CrPC ↔ BNSS Cross-Statute Bridge**: Maps older penal and procedural sections in judicial orders to modern 2023 enacted codes (e.g. IPC 420 $\rightarrow$ BNS 318(4), CrPC 439 $\rightarrow$ BNSS 483).
  2. **Deterministic Code-Checked Citation Validator**: Validates all generated and extracted statutory citations directly in Python against retrieved context chunks and document text, preventing AI citation hallucinations.
  3. **Authoritative Knowledge Base**: Covers key Indian penal provisions (IPC/BNS), procedural bail laws (CrPC/BNSS), constitutional articles, and landmark Supreme Court bail jurisprudence (*Satender Kumar Antil v. CBI*).
- **Integration Architecture Report**: See [`docs/LEGAL_RAG_INTEGRATION.md`](docs/LEGAL_RAG_INTEGRATION.md) for full architectural details, license compliance, and comparison of integrated versus referenced components.
