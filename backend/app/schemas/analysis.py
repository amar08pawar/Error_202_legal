"""Pydantic schemas for Legal Document Analysis and Grounded Q&A."""
from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field
from app.schemas.document import PageExtraction

T = TypeVar("T")


class ExtractedEntity(BaseModel, Generic[T]):
    """Extracted legal fact with page-level grounding and confidence level."""
    value: Optional[T] = Field(None, description="Extracted value or null if not identified")
    page_number: Optional[int] = Field(None, description="1-based source page number where fact was detected")
    passage: Optional[str] = Field(None, description="Verbatim text passage supporting this extraction")
    confidence: str = Field("medium", description="Confidence status: high, medium, or not_found")


class LegalAnalysisResponse(BaseModel):
    """Structured legal intelligence summary for Indian court documents."""
    court_name: ExtractedEntity[str] = Field(..., description="Name of the court or tribunal")
    case_number: ExtractedEntity[str] = Field(..., description="Case, petition, appeal, or FIR number")
    document_type: ExtractedEntity[str] = Field(..., description="Classification of document (e.g. Bail Order, Judgment)")
    petitioner: ExtractedEntity[str] = Field(..., description="Petitioner, Appellant, or Applicant")
    respondent: ExtractedEntity[str] = Field(..., description="Respondent, Opposite Party, or State")
    order_date: ExtractedEntity[str] = Field(..., description="Date of order, judgment, or filing")
    cited_sections: List[ExtractedEntity[str]] = Field(default_factory=list, description="Statutory sections cited (IPC, CrPC, etc.)")
    disposition: ExtractedEntity[str] = Field(..., description="Operative ruling or holding (e.g. Bail Granted, Dismissed)")
    plain_language_summary: str = Field(..., description="Concise, plain-language legal summary grounded in document")
    key_findings: List[str] = Field(default_factory=list, description="Key bulleted takeaways from the document")
    analysis_provider: str = Field("extractive_fallback", description="Provider used: extractive_fallback, gemini, or openai")
    provider_notes: Optional[str] = Field(None, description="Operational notes and limitations of the active intelligence provider")


class QARequest(BaseModel):
    """Document Question & Answer request."""
    question: str = Field(..., description="User query about the document")
    pages: List[PageExtraction] = Field(..., description="Document pages for grounded context")


class QAResponse(BaseModel):
    """Grounded Question & Answer response."""
    question: str = Field(..., description="Original user query")
    answer: str = Field(..., description="Grounded answer based strictly on document text")
    cited_pages: List[int] = Field(default_factory=list, description="1-based page numbers containing supporting evidence")
    evidence_snippets: List[str] = Field(default_factory=list, description="Excerpts supporting the answer")
    is_found_in_doc: bool = Field(True, description="False if question cannot be answered from document content")
