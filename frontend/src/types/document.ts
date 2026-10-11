export type ExtractionMethod = 'selectable_text' | 'ocr';

export type OCRStatus = 'not_required' | 'completed' | 'unavailable' | 'failed';

export interface EvidenceReference {
  page_number: number;
  passage: string;
  start_char?: number | null;
  end_char?: number | null;
  extraction_method: ExtractionMethod;
}

export interface HealthStatus {
  status: string;
  app_name: string;
  version: string;
  ocr_available: boolean;
}

export interface PageExtraction {
  page_number: number;
  text: string;
  char_count: number;
  requires_ocr: boolean;
  extraction_method: ExtractionMethod;
  ocr_status: OCRStatus;
  ocr_error_message?: string | null;
}

export interface DocumentExtractionResponse {
  filename: string;
  file_size_bytes: number;
  total_pages: number;
  pages_requiring_ocr: number[];
  has_ocr_needed_pages: boolean;
  ocr_completed_pages: number[];
  ocr_unavailable: boolean;
  pages: PageExtraction[];
  normalized_full_text: string;
  sample_evidence_references: EvidenceReference[];
}

export interface ApiErrorResponse {
  detail: string;
}
