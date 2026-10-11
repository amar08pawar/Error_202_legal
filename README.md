# NayaSetu — Indian Court Document Intelligence

NayaSetu is an intelligent document processing web platform tailored for the Indian judicial system. It ingests, extracts, analyzes, and structures court orders, FIRs, charge sheets, and petitions.

> **Phase 1 Status**: Foundation & PDF Processing.
> In Phase 1, the platform performs high-speed in-memory PDF digital text extraction and identifies pages requiring OCR fallback. AI analysis, Firebase persistence, OCR engine execution, and external legal-data integrations are planned for future phases and **are not yet implemented**.

---

## 1. Technology Stack

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
- **Validation**: Pydantic 2.12.5
- **File Upload Handler**: python-multipart 0.0.9
- **Testing**: pytest 9.0.2 & HTTPX 0.27.0

---

## 2. Prerequisites and Tested Versions

| Tool | Tested Version | Minimum Required |
|---|---|---|
| **Python** | `3.14.2` | `3.10+` |
| **Node.js** | `v22.20.0` | `18.0+` |
| **npm** | `10.9.3` | `9.0+` |
| **OS** | Windows 10/11 (PowerShell) | Cross-platform |

---

## 3. Environment Configuration

### Backend Configuration
Copy `backend/.env.example` to `backend/.env` (optional, sane defaults are embedded):
```powershell
Copy-Item backend\.env.example backend\.env
```

Configurable variables:
- `HOST`: Server bind address (default: `127.0.0.1`)
- `PORT`: Server port (default: `8000`)
- `MAX_UPLOAD_SIZE_BYTES`: Upload ceiling in bytes (default: `15728640` = 15 MB)
- `OCR_THRESHOLD_CHARS`: Minimum characters per page to consider text extraction sufficient without OCR (default: `30`)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins (default: `http://localhost:5173,http://127.0.0.1:5173`)

### Frontend Configuration
Copy `frontend/.env.example` to `frontend/.env`:
```powershell
Copy-Item frontend\.env.example frontend\.env
```

Configurable variables:
- `VITE_API_BASE_URL`: Base URL of the running FastAPI backend (default: `http://localhost:8000`)

---

## 4. Installation & Local Setup (Windows PowerShell)

Open PowerShell and navigate to the repository directory:
```powershell
cd C:\Users\Lenovo\OneDrive\Desktop\NayaSetu\Error_202_legal
```

### Terminal 1: Backend Setup & Launch

```powershell
# Navigate to backend directory
cd backend

# Install pinned Python dependencies
python -m pip install -r requirements.txt

# Start the FastAPI server with hot-reload
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API is now running at `http://127.0.0.1:8000`. Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

### Terminal 2: Frontend Setup & Launch

Open a second PowerShell window:
```powershell
# Navigate to frontend directory
cd C:\Users\Lenovo\OneDrive\Desktop\NayaSetu\Error_202_legal\frontend

# Install dependencies (uses committed package-lock.json)
npm install

# Start Vite development server
npm run dev
```
Open your browser at `http://localhost:5173` to access NayaSetu.

---

## 5. API Endpoints

### 1. Health Check
- **Route**: `GET /api/health`
- **Description**: Returns basic application health status without exposing environment keys or secrets.
- **Sample Response (200 OK)**:
```json
{
  "status": "healthy",
  "app_name": "NayaSetu",
  "version": "1.0.0"
}
```

### 2. Document Text Extraction
- **Route**: `POST /api/documents/extract`
- **Content-Type**: `multipart/form-data`
- **Parameter**: `file` (Binary PDF file)
- **Validation**:
  - Maximum upload size enforced (default 15 MB).
  - Validates `%PDF-` magic header (rejects non-PDF files).
  - Rejects empty (0 bytes) or corrupted PDFs.
  - Rejects password-protected / encrypted PDFs with an informative message.
  - Zero disk storage: parsed strictly in RAM.
- **Sample Response (200 OK)**:
```json
{
  "filename": "delhi_high_court_order.pdf",
  "file_size_bytes": 104857,
  "total_pages": 2,
  "pages_requiring_ocr": [2],
  "has_ocr_needed_pages": true,
  "pages": [
    {
      "page_number": 1,
      "text": "IN THE HIGH COURT OF DELHI AT NEW DELHI\n...",
      "char_count": 842,
      "requires_ocr": false
    },
    {
      "page_number": 2,
      "text": "",
      "char_count": 0,
      "requires_ocr": true
    }
  ]
}
```

---

## 6. Running Automated Tests

Run backend tests using pytest from the `backend/` directory:
```powershell
cd backend
python -m pytest -v
```

The test suite covers:
- Service health endpoint integrity and secret leak prevention (`test_health.py`).
- Valid multi-page PDF text extraction with 1-based page indices (`test_pdf_extraction.py`).
- Empty (0-byte) file rejection.
- Invalid non-PDF data rejection.
- Scanned / sparse text detection (`requires_ocr` flagging).
- Mixed-page documents where only sparse pages trigger the OCR requirement flag.
- Password-protected / encrypted PDF rejection with safe error details.

---

## 7. Manual Integration Verification Checklist

1. **Start Backend**: Launch `uvicorn app.main:app --port 8000` in `backend/`.
2. **Start Frontend**: Launch `npm run dev` in `frontend/`.
3. **Verify Connectivity**: Navigate to `http://localhost:5173`. Check that the header displays the green pill: `API Connected (NayaSetu v1.0.0)`.
4. **Valid PDF Upload**:
   - Drag & drop or select a valid court order PDF.
   - Click **Extract Document Text**.
   - Verify page count, page-numbered extracted text, and character counter.
5. **Scanned PDF Check**:
   - Upload a scanned PDF without embedded text.
   - Verify that the amber alert triggers: `OCR Processing Required on Page(s) ...`.
6. **Error Handling**:
   - Attempt uploading a `.txt` or corrupted file renamed to `.pdf`.
   - Confirm clear error banner: `File header does not match a valid PDF format (%PDF- missing).`
7. **Reset Workflow**:
   - Click **Upload Another Document** to verify full UI state reset.

---

## 8. Current Limitations & Future Roadmap

- **Scanned Text OCR**: Phase 1 identifies pages requiring OCR but does not perform OCR. Tesseract or cloud vision OCR will be integrated in Phase 2.
- **Cloud Persistence**: Uploaded PDFs are parsed strictly in RAM and discarded immediately. Firebase Cloud Firestore and Storage persistence will be introduced in subsequent phases.
- **Legal Intelligence**: Named entity recognition, section mapping (IPC, CrPC, BNS), and automated legal summaries via LLM APIs will be integrated in Phase 3.

---

## 9. Dependency Management Protocol

- Always pin exact versions for Python direct dependencies in `backend/requirements.txt`.
- When updating or adding frontend dependencies, install via `npm install <package> --save` to automatically update `package.json` and generate `package-lock.json`.
- Never commit `.env`, credentials, or temporary storage artifacts.
