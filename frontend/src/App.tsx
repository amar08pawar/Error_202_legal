import React, { useState } from 'react';
import { Header } from './components/Header';
import { DocumentUpload } from './components/DocumentUpload';
import { ExtractedDocumentViewer } from './components/ExtractedDocumentViewer';
import { DocumentExtractionResponse } from './types/document';
import { ShieldCheck, FileSearch, Cpu } from 'lucide-react';

export const App: React.FC = () => {
  const [extractedData, setExtractedData] = useState<DocumentExtractionResponse | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!extractedData ? (
          <div className="space-y-8">
            {/* Hero / Intro Banner */}
            <div className="text-center max-w-2xl mx-auto pt-4 pb-2">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
                Indian Court Document Intelligence
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600">
                Fast, secure in-memory PDF extraction and structure analysis for Indian judicial orders, FIRs, and legal petitions.
              </p>
            </div>

            {/* Document Upload Area */}
            <DocumentUpload onExtractionSuccess={(data) => setExtractedData(data)} />

            {/* Feature Highlights for Phase 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-6">
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-start space-x-3.5">
                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">PyMuPDF High-Speed Engine</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    C-accelerated in-memory digital text extraction with zero permanent disk persistence.
                  </p>
                </div>
              </div>

              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-start space-x-3.5">
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
                  <FileSearch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Intelligent OCR Detection</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Scanned and handwritten pages with sparse text are accurately flagged for OCR.
                  </p>
                </div>
              </div>

              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-start space-x-3.5">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Strict Judicial Privacy</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Uploaded documents are evaluated strictly in RAM with immediate resource disposal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ExtractedDocumentViewer
            documentData={extractedData}
            onReset={() => setExtractedData(null)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© 2026 NayaSetu. Built for Indian Legal Tech Innovation.</p>
          <div className="flex items-center space-x-4">
            <span>FastAPI + PyMuPDF</span>
            <span>•</span>
            <span>React + Vite + TypeScript</span>
            <span>•</span>
            <span className="font-semibold text-indigo-700">Phase 1 Complete</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
