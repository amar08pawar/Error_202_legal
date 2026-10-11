export interface ExtractedEntity<T = string> {
  value: T | null;
  page_number: number | null;
  passage: string | null;
  confidence: 'high' | 'medium' | 'not_found' | string;
}

export interface LegalAnalysisResponse {
  court_name: ExtractedEntity<string>;
  case_number: ExtractedEntity<string>;
  document_type: ExtractedEntity<string>;
  petitioner: ExtractedEntity<string>;
  respondent: ExtractedEntity<string>;
  order_date: ExtractedEntity<string>;
  cited_sections: ExtractedEntity<string>[];
  disposition: ExtractedEntity<string>;
  plain_language_summary: string;
  key_findings: string[];
  analysis_provider: string;
  provider_notes?: string;
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
