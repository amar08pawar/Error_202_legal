import { DocumentExtractionResponse, HealthStatus } from '../types/document';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

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

export async function analyzeDocument(document: DocumentExtractionResponse): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/documents/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(document),
  });

  if (!response.ok) {
    let errorMessage = `Analysis failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorMessage = errJson.detail;
      }
    } catch {
      // Non-JSON error
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function askQuestion(question: string, pages: any[]): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/documents/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ question, pages }),
  });

  if (!response.ok) {
    let errorMessage = `Question answering failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorMessage = errJson.detail;
      }
    } catch {
      // Non-JSON error
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchDocumentHistory(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/documents/history`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch history (${response.status})`);
  }

  return response.json();
}

export async function fetchHistoryDocument(documentId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/documents/history/${documentId}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch saved document (${response.status})`);
  }

  return response.json();
}

export async function deleteHistoryDocument(documentId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/documents/history/${documentId}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete saved document (${response.status})`);
  }

  return response.json();
}
