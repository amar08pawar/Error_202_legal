"""Legal document analysis and QA API routes."""
from fastapi import APIRouter
from app.schemas.document import DocumentExtractionResponse
from app.schemas.analysis import (
    LegalAnalysisResponse,
    QARequest,
    QAResponse,
)
from app.services.analysis_service import (
    analyze_document_content,
    answer_document_question,
)

router = APIRouter(prefix="/documents", tags=["Analysis"])


@router.post(
    "/analyze",
    response_model=LegalAnalysisResponse,
    summary="Analyze extracted legal document",
    description="Extracts court name, case number, parties, dates, cited sections, disposition, and plain-language summary with page-linked evidence."
)
async def analyze_document(document: DocumentExtractionResponse) -> LegalAnalysisResponse:
    """Analyze structured document pages."""
    return analyze_document_content(document)


@router.post(
    "/ask",
    response_model=QAResponse,
    summary="Ask a question about the document",
    description="Returns an answer strictly grounded in the document text with page citations, preventing AI hallucinations."
)
async def ask_document(req: QARequest) -> QAResponse:
    """Answer question about uploaded document."""
    return answer_document_question(req.question, req.pages)
