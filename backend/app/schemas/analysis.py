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


class RetrievedLegalSource(BaseModel):
    """External legal knowledge retrieved from the legal RAG knowledge base."""
    source_id: str = Field(..., description="Unique statutory or precedent identifier")
    title: str = Field(..., description="Formal title of statute or legal precedent")
    act_or_authority: str = Field(..., description="Enacting statute or court authority")
    text: str = Field(..., description="Authoritative statutory definition or legal principle")
    relevance_score: float = Field(..., description="Retrieval similarity/relevance score between 0.0 and 1.0")
    source_url_or_ref: Optional[str] = Field(None, description="Official reference citation or gazette link")
    punishment_info: Optional[str] = Field(None, description="Statutory penalty or custody guideline if applicable")


class StatutorySeverityAssessment(BaseModel):
    """Preliminary statutory seriousness assessment grounded in retrieved statutory law."""
    offence_name: Optional[str] = Field(None, description="Identified alleged offence")
    cited_section: Optional[str] = Field(None, description="Cited statutory section")
    statutory_provision: Optional[str] = Field(None, description="Statutory provision title")
    severity_tier: str = Field("Not Assessed", description="Severity tier: Capital / Life, Serious (7+ Years), Moderate (< 7 Years), Summary / Minor, or Not Assessed")
    applicable_punishment: Optional[str] = Field(None, description="Authoritative statutory punishment from retrieved sources")
    criteria_explanation: str = Field(..., description="Explanation of statutory criteria used")
    confidence: str = Field("medium", description="Assessment confidence")
    disclaimer: str = Field(
        "Statutory seriousness is a preliminary legal taxonomy reference based on maximum statutory penalties under Indian law; it is not a finding of guilt and does not evaluate personal character or predict dangerousness.",
        description="Mandatory legal disclaimer"
    )


class LegalAnalysisResponse(BaseModel):
    """Structured legal intelligence summary for Indian court documents."""
    document_id: Optional[str] = Field(None, description="Unique persistent identifier for saved analysis")
    court_name: ExtractedEntity[str] = Field(..., description="Name of the court or tribunal")
    case_number: ExtractedEntity[str] = Field(..., description="Case, petition, appeal, or FIR number")
    case_category: ExtractedEntity[str] = Field(..., description="Legal category: Civil, Criminal, Constitutional, Other, or Uncertain")
    document_type: ExtractedEntity[str] = Field(..., description="Classification of document: Bail Order, Judgment, Petition, Appeal, FIR, Charge Sheet, Notice or Interim Order, Other, or Uncertain")
    procedural_stage: ExtractedEntity[str] = Field(..., description="Procedural stage: Investigation, Bail proceedings, Trial, Appeal, Writ proceedings, Final disposition, Interim proceedings, or Unknown")
    case_outcome: ExtractedEntity[str] = Field(..., description="Operative outcome: Granted, Rejected, Dismissed, Disposed, Partially Allowed, or Not Determined")
    petitioner: ExtractedEntity[str] = Field(..., description="Petitioner, Appellant, or Applicant")
    respondent: ExtractedEntity[str] = Field(..., description="Respondent, Opposite Party, or State")
    order_date: ExtractedEntity[str] = Field(..., description="Date of order, judgment, or filing")
    cited_sections: List[ExtractedEntity[str]] = Field(default_factory=list, description="Statutory sections cited (IPC, CrPC, etc.)")
    disposition: ExtractedEntity[str] = Field(..., description="Operative ruling or holding (e.g. Bail Granted, Dismissed)")
    plain_language_summary: str = Field(..., description="Concise, plain-language legal summary grounded in document")
    key_findings: List[str] = Field(default_factory=list, description="Key bulleted takeaways from the document")
    statutory_severity: Optional[StatutorySeverityAssessment] = Field(None, description="Preliminary statutory seriousness assessment")
    retrieved_legal_sources: List[RetrievedLegalSource] = Field(default_factory=list, description="External legal sources retrieved from knowledge base via RAG")
    analysis_provider: str = Field("extractive_fallback", description="Provider used: extractive_fallback, legal_rag_hybrid, gemini, or openai")
    provider_notes: Optional[str] = Field(None, description="Operational notes and limitations of the active intelligence provider")


class DocumentHistoryItem(BaseModel):
    """Summary item for previously processed and saved legal documents."""
    document_id: str = Field(..., description="Persistent document ID")
    filename: str = Field(..., description="Original filename")
    upload_timestamp: str = Field(..., description="Timestamp when processed")
    total_pages: int = Field(..., description="Total pages in PDF")
    case_category: Optional[str] = Field(None, description="Classified case category")
    document_type: Optional[str] = Field(None, description="Classified document type")
    procedural_stage: Optional[str] = Field(None, description="Procedural stage")
    case_outcome: Optional[str] = Field(None, description="Classified outcome")
    court_name: Optional[str] = Field(None, description="Court name")
    case_number: Optional[str] = Field(None, description="Case number")
    summary_preview: Optional[str] = Field(None, description="Preview snippet of summary")


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
