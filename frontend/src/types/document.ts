export interface HealthStatus {
  status: string;
  app_name: string;
  version: string;
}

export interface PageExtraction {
  page_number: number;
  text: string;
  char_count: number;
  requires_ocr: boolean;
}

export interface DocumentExtractionResponse {
  filename: string;
  file_size_bytes: number;
  total_pages: number;
  pages_requiring_ocr: number[];
  pages: PageExtraction[];
  has_ocr_needed_pages: boolean;
}

export interface ApiErrorResponse {
  detail: string;
}
