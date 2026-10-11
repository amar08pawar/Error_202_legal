import { DocumentExtractionResponse, HealthStatus } from '../types/document';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function fetchHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Backend health check failed (${response.status})`);
  }

  return response.json();
}

export async function extractDocument(file: File): Promise<DocumentExtractionResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/documents/extract`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `Extraction failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorMessage = errJson.detail;
      }
    } catch {
      // If error response is not JSON
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
