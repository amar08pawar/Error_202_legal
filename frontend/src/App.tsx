import React, { useState } from 'react';
import { Header } from './components/Header';
import { DocumentUpload } from './components/DocumentUpload';
import { ExtractedDocumentViewer } from './components/ExtractedDocumentViewer';
import { DocumentHistoryModal } from './components/DocumentHistoryModal';
import { DocumentExtractionResponse } from './types/document';
import { LegalAnalysisResponse } from './types/analysis';
import { FileSearch, Cpu, History, Database, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [extractedData, setExtractedData] = useState<DocumentExtractionResponse | null>(null);
  const [initialAnalysis, setInitialAnalysis] = useState<LegalAnalysisResponse | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  const handleSelectHistoryItem = (
    analysis: LegalAnalysisResponse,
    extraction: DocumentExtractionResponse
  ) => {
    setExtractedData(extraction);
    setInitialAnalysis(analysis);
    setIsHistoryOpen(false);
  };

  const handleReset = () => {
    setExtractedData(null);
    setInitialAnalysis(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header onOpenHistory={() => setIsHistoryOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!extractedData ? (
          <div className="space-y-8">
            {/* Hero / Intro Banner */}
            <div className="text-center max-w-3xl mx-auto pt-4 pb-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-800 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Legal RAG Classification & Intelligence MVP</span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
                Indian Court Document Intelligence
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                In-memory digital extraction, statutory RAG retrieval, multi-parameter categorization, and SQLite persistence for Indian court orders, FIRs, and petitions.
              </p>

              <div className="mt-4 flex items-center justify-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm transition"
                >
                  <History className="w-4 h-4 text-indigo-700" />
                  <span>Open Document History</span>
                </button>
              </div>
            </div>

            {/* Document Upload Area */}
            <DocumentUpload
              onExtractionSuccess={(data) => {
                setExtractedData(data);
                setInitialAnalysis(null);
              }}
            />

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-6">
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-start space-x-3.5">
                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Legal RAG Retrieval</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Contextual retrieval over Indian statutes (IPC, CrPC, Constitution) and landmark Supreme Court bail precedents.
                  </p>
                </div>
              </div>

              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-start space-x-3.5">
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
                  <FileSearch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Multi-Parameter Classification</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Independent categorization of Case Category, Document Type, Procedural Stage, Outcome, and Preliminary Statutory Seriousness.
                  </p>
                </div>
              </div>

              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-start space-x-3.5">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Persistent SQLite Storage</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Automatic local persistence surviving restarts, with structured history inspection, reopening, and deletion.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ExtractedDocumentViewer
            documentData={extractedData}
            initialAnalysis={initialAnalysis}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Document History Modal */}
      <DocumentHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectDocument={handleSelectHistoryItem}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© 2026 NayaSetu. Indian Legal Tech Innovation Prototype.</p>
          <div className="flex items-center space-x-4">
            <span>FastAPI + PyMuPDF + Legal RAG</span>
            <span>•</span>
            <span>React + Vite + TypeScript</span>
            <span>•</span>
            <span>SQLite Local Storage</span>
            <span>•</span>
            <span className="font-semibold text-indigo-700">RAG Classification MVP</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
