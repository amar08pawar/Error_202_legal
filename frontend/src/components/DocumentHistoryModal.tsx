import React, { useEffect, useState } from 'react';
import { DocumentHistoryItem, LegalAnalysisResponse } from '../types/analysis';
import { DocumentExtractionResponse } from '../types/document';
import { fetchDocumentHistory, fetchHistoryDocument, deleteHistoryDocument } from '../services/api';
import {
  History,
  X,
  FileText,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Database,
  Clock,
} from 'lucide-react';

interface DocumentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument: (analysis: LegalAnalysisResponse, extraction: DocumentExtractionResponse) => void;
}

export const DocumentHistoryModal: React.FC<DocumentHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectDocument,
}) => {
  const [historyItems, setHistoryItems] = useState<DocumentHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchDocumentHistory();
      setHistoryItems(items);
    } catch (err: any) {
      setError(err.message || 'Failed to load document history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const handleOpenDoc = async (docId: string) => {
    setActionLoadingId(docId);
    try {
      const data = await fetchHistoryDocument(docId);
      if (data && data.analysis && data.extraction) {
        onSelectDocument(data.analysis, data.extraction);
        onClose();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reopen document.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved analysis record from local history?')) {
      return;
    }
    setActionLoadingId(docId);
    try {
      await deleteHistoryDocument(docId);
      setHistoryItems((prev) => prev.filter((item) => item.document_id !== docId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete record.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getCategoryBadgeClass = (cat: string | null | undefined) => {
    if (!cat) return 'bg-slate-100 text-slate-700 border-slate-200';
    const c = cat.toLowerCase();
    if (c.includes('criminal')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (c.includes('civil')) return 'bg-sky-50 text-sky-700 border-sky-200';
    if (c.includes('constitutional')) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const getOutcomeBadgeClass = (out: string | null | undefined) => {
    if (!out) return 'bg-slate-100 text-slate-700 border-slate-200';
    const o = out.toLowerCase();
    if (o.includes('granted') || o.includes('allowed')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (o.includes('rejected') || o.includes('dismissed')) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Document History & Local Storage
              </h3>
              <p className="text-xs text-slate-500">
                Previously processed court documents stored persistently in SQLite
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
              <p className="text-xs">Loading saved analysis records...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && historyItems.length === 0 && (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <History className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No saved documents found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Upload and analyze a PDF document. Its full legal classification and evidence references will be saved here automatically.
              </p>
            </div>
          )}

          {!loading && !error && historyItems.length > 0 && (
            <div className="space-y-3">
              {historyItems.map((item) => (
                <div
                  key={item.document_id}
                  onClick={() => handleOpenDoc(item.document_id)}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer bg-white group flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                          {item.filename}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({item.total_pages} {item.total_pages === 1 ? 'page' : 'pages'})
                        </span>
                      </div>
                      {item.court_name && (
                        <p className="text-xs text-slate-600 font-medium">
                          {item.court_name} {item.case_number ? `· ${item.case_number}` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={(e) => handleDelete(item.document_id, e)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Reopen analysis"
                      >
                        {actionLoadingId === item.document_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ExternalLink className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {item.summary_preview && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.summary_preview}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                    <div className="flex items-center space-x-2">
                      {item.case_category && (
                        <span className={`px-2 py-0.5 rounded-md font-semibold border ${getCategoryBadgeClass(item.case_category)}`}>
                          {item.case_category}
                        </span>
                      )}
                      {item.document_type && (
                        <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.document_type}
                        </span>
                      )}
                      {item.case_outcome && (
                        <span className={`px-2 py-0.5 rounded-md font-semibold border ${getOutcomeBadgeClass(item.case_outcome)}`}>
                          {item.case_outcome}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.upload_timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Click any record to reopen its complete classification, summary, and citations.</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
