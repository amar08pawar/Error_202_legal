"""Persistent local SQLite document storage and history service for NayaSetu."""
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Tuple

from app.schemas.analysis import DocumentHistoryItem, LegalAnalysisResponse
from app.schemas.document import DocumentExtractionResponse

# Storage directory and database path
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BACKEND_DIR / "data"
DB_PATH = DATA_DIR / "nayasetu_history.db"


def _get_connection() -> sqlite3.Connection:
    """Ensure data directory exists and return SQLite connection with row factory."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize SQLite tables for persistent analysis history."""
    conn = _get_connection()
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS document_records (
                    document_id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    upload_timestamp TEXT NOT NULL,
                    total_pages INTEGER NOT NULL,
                    case_category TEXT,
                    document_type TEXT,
                    procedural_stage TEXT,
                    case_outcome TEXT,
                    court_name TEXT,
                    case_number TEXT,
                    petitioner TEXT,
                    respondent TEXT,
                    order_date TEXT,
                    summary TEXT,
                    full_analysis_json TEXT NOT NULL,
                    extraction_data_json TEXT
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_records_timestamp ON document_records(upload_timestamp DESC)")
    finally:
        conn.close()


def save_document_analysis(
    analysis: LegalAnalysisResponse,
    extraction: DocumentExtractionResponse,
    custom_id: Optional[str] = None
) -> str:
    """Save an analyzed document and its extraction payload into SQLite local storage."""
    init_db()
    doc_id = custom_id or f"doc_{uuid.uuid4().hex[:12]}"
    analysis.document_id = doc_id

    timestamp = datetime.now(timezone.utc).isoformat()
    analysis_json = analysis.model_dump_json()
    extraction_json = extraction.model_dump_json()

    court = analysis.court_name.value if analysis.court_name else None
    case_num = analysis.case_number.value if analysis.case_number else None
    cat = analysis.case_category.value if analysis.case_category else None
    dtype = analysis.document_type.value if analysis.document_type else None
    stage = analysis.procedural_stage.value if analysis.procedural_stage else None
    outcome = analysis.case_outcome.value if analysis.case_outcome else None
    pet = analysis.petitioner.value if analysis.petitioner else None
    resp = analysis.respondent.value if analysis.respondent else None
    odate = analysis.order_date.value if analysis.order_date else None

    conn = _get_connection()
    try:
        with conn:
            conn.execute("""
                INSERT OR REPLACE INTO document_records (
                    document_id, filename, upload_timestamp, total_pages,
                    case_category, document_type, procedural_stage, case_outcome,
                    court_name, case_number, petitioner, respondent, order_date,
                    summary, full_analysis_json, extraction_data_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                extraction.filename,
                timestamp,
                extraction.total_pages,
                cat,
                dtype,
                stage,
                outcome,
                court,
                case_num,
                pet,
                resp,
                odate,
                analysis.plain_language_summary,
                analysis_json,
                extraction_json
            ))
    finally:
        conn.close()

    return doc_id


def list_history_documents(limit: int = 50) -> List[DocumentHistoryItem]:
    """Retrieve list of saved analyses sorted by upload timestamp."""
    init_db()
    conn = _get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT document_id, filename, upload_timestamp, total_pages,
                   case_category, document_type, procedural_stage, case_outcome,
                   court_name, case_number, summary
            FROM document_records
            ORDER BY upload_timestamp DESC
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        items: List[DocumentHistoryItem] = []
        for row in rows:
            summary = row["summary"] or ""
            preview = (summary[:150] + "...") if len(summary) > 150 else summary
            items.append(DocumentHistoryItem(
                document_id=row["document_id"],
                filename=row["filename"],
                upload_timestamp=row["upload_timestamp"],
                total_pages=row["total_pages"],
                case_category=row["case_category"],
                document_type=row["document_type"],
                procedural_stage=row["procedural_stage"],
                case_outcome=row["case_outcome"],
                court_name=row["court_name"],
                case_number=row["case_number"],
                summary_preview=preview
            ))
        return items
    finally:
        conn.close()


def get_history_document(document_id: str) -> Optional[Tuple[LegalAnalysisResponse, DocumentExtractionResponse]]:
    """Retrieve full analysis and extraction data for a saved document ID."""
    init_db()
    conn = _get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT full_analysis_json, extraction_data_json
            FROM document_records
            WHERE document_id = ?
        """, (document_id,))
        row = cursor.fetchone()
        if not row:
            return None

        analysis_dict = json.loads(row["full_analysis_json"])
        extraction_dict = json.loads(row["extraction_data_json"]) if row["extraction_data_json"] else None

        analysis = LegalAnalysisResponse.model_validate(analysis_dict)
        extraction = DocumentExtractionResponse.model_validate(extraction_dict) if extraction_dict else None
        return analysis, extraction
    finally:
        conn.close()


def delete_history_document(document_id: str) -> bool:
    """Safely delete a document record from persistent storage."""
    init_db()
    conn = _get_connection()
    try:
        with conn:
            cursor = conn.execute("DELETE FROM document_records WHERE document_id = ?", (document_id,))
            return cursor.rowcount > 0
    finally:
        conn.close()
