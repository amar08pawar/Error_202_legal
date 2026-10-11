export interface ExtractedEntity<T = string> {
  value: T | null;
  page_number: number | null;
  passage: string | null;
  confidence: 'high' | 'medium' | 'not_found' | string;
}

export interface RetrievedLegalSource {
  source_id: string;
  title: string;
  act_or_authority: string;
  text: string;
  relevance_score: number;
  source_url_or_ref?: string | null;
  punishment_info?: string | null;
}

export interface StatutorySeverityAssessment {
  offence_name?: string | null;
  cited_section?: string | null;
  statutory_provision?: string | null;
  severity_tier: 'Capital / Life' | 'Serious (7+ Years)' | 'Moderate (< 7 Years)' | 'Summary / Minor' | 'Not Assessed' | string;
  applicable_punishment?: string | null;
  criteria_explanation: string;
  confidence: string;
  disclaimer: string;
}

export interface LegalAnalysisResponse {
  document_id?: string | null;
  court_name: ExtractedEntity<string>;
  case_number: ExtractedEntity<string>;
  case_category?: ExtractedEntity<string>;
  document_type: ExtractedEntity<string>;
  procedural_stage?: ExtractedEntity<string>;
  case_outcome?: ExtractedEntity<string>;
  petitioner: ExtractedEntity<string>;
  respondent: ExtractedEntity<string>;
  order_date: ExtractedEntity<string>;
  cited_sections: ExtractedEntity<string>[];
  disposition: ExtractedEntity<string>;
  plain_language_summary: string;
  key_findings: string[];
  statutory_severity?: StatutorySeverityAssessment | null;
  retrieved_legal_sources?: RetrievedLegalSource[];
  analysis_provider: string;
  provider_notes?: string;
}

export interface DocumentHistoryItem {
  document_id: string;
  filename: string;
  upload_timestamp: string;
  total_pages: number;
  case_category?: string | null;
  document_type?: string | null;
  procedural_stage?: string | null;
  case_outcome?: string | null;
  court_name?: string | null;
  case_number?: string | null;
  summary_preview?: string | null;
}

export interface QARequest {
  question: string;
  pages: any[];
}

export interface QAResponse {
  question: string;
  answer: string;
  cited_pages: number[];
  evidence_snippets: string[];
  is_found_in_doc: boolean;
}
