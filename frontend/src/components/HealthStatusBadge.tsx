import React, { useEffect, useState } from 'react';
import { fetchHealth } from '../services/api';
import { HealthStatus } from '../types/document';
import { CheckCircle2, AlertCircle, RefreshCw, Cpu } from 'lucide-react';

export const HealthStatusBadge: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const data = await fetchHealth();
      setHealth(data);
      setError(false);
    } catch {
      setError(true);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-2 text-xs">
      {loading && !health ? (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">
          <RefreshCw className="w-3 h-3 mr-1 animate-spin text-slate-500" />
          Checking API...
        </span>
      ) : error ? (
        <button
          onClick={checkHealth}
          title="Click to retry connecting to backend"
          className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
        >
          <AlertCircle className="w-3 h-3 mr-1 text-red-500" />
          Backend Offline (Retry)
        </button>
      ) : (
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
            API Connected
          </span>
          {health?.ocr_available ? (
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
              title="Tesseract OCR engine is detected and ready"
            >
              <Cpu className="w-3 h-3 mr-1 text-indigo-500" />
              OCR: Active
            </span>
          ) : (
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200"
              title="Tesseract OCR binary not detected on backend host. Selectable text extraction works, but OCR will report unavailable."
            >
              <Cpu className="w-3 h-3 mr-1 text-amber-500" />
              OCR: Binary Unset
            </span>
          )}
        </div>
      )}
    </div>
  );
};
