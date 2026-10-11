import React, { useState, useEffect } from 'react';
import { DocumentExtractionResponse, PageExtraction } from '../types/document';
import { LegalAnalysisResponse } from '../types/analysis';
import { analyzeDocument } from '../services/api';
import { LegalAnalysisViewer } from './LegalAnalysisViewer';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  BookOpen,
  Cpu,
  Layers,
  FileCheck,
  Sparkles,
  Loader2,
  Scale,
} from 'lucide-react';

interface ExtractedDocumentViewerProps {
  documentData: DocumentExtractionResponse;
  initialAnalysis?: LegalAnalysisResponse | null;
  onReset: () => void;
}

type ActiveViewTab = 'analysis' | 'pages' | 'normalized' | 'evidence';

export const ExtractedDocumentViewer: React.FC<ExtractedDocumentViewerProps> = ({
  documentData,
  initialAnalysis,
  onReset,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('analysis');
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Analysis state
  const [analysis, setAnalysis] = useState<LegalAnalysisResponse | null>(initialAnalysis || null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const activePage: PageExtraction = documentData.pages[currentPageIndex] || documentData.pages[0];

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await analyzeDocument(documentData);
      setAnalysis(res);
      setActiveTab('analysis');
    } catch (err: any) {
      setAnalysisError(err.message || 'Failed to analyze document.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (initialAnalysis) {
      setAnalysis(initialAnalysis);
    } else {
      handleRunAnalysis();
    }
  }, [documentData, initialAnalysis]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const filteredPageNumbers = searchQuery.trim()
    ? documentData.pages
        .filter((p) => p.text.toLowerCase().includes(searchQuery.toLowerCase()))
        .map((p) => p.page_number)
    : documentData.pages.map((p) => p.page_number);

  const selectableCount = documentData.pages.filter(
    (p) => p.extraction_method === 'selectable_text' && !p.requires_ocr
  ).length;

  return (
    <div className="space-y-6">
      {/* Workflow Progress Breadcrumb */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3.5 flex items-center justify-between text-xs overflow-x-auto gap-2">
        <div className="flex items-center space-x-2 min-w-fit">
          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">✓</div>
          <span className="font-semibold text-slate-700">1. Upload PDF</span>
        </div>
        <span className="text-slate-300">→</span>
        <div className="flex items-center space-x-2 min-w-fit">
          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">✓</div>
          <span className="font-semibold text-slate-700">2. Extract & OCR</span>
        </div>
        <span className="text-slate-300">→</span>
        <div className="flex items-center space-x-2 min-w-fit">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${analysis ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-900 text-white'}`}>
            {analysis ? '✓' : '3'}
          </div>
          <span className={`font-semibold ${analysis ? 'text-slate-700' : 'text-indigo-900'}`}>3. Legal Analysis</span>
        </div>
        <span className="text-slate-300">→</span>
        <div className="flex items-center space-x-2 min-w-fit">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${analysis ? 'bg-indigo-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
            4
          </div>
          <span className={`font-semibold ${analysis ? 'text-indigo-900' : 'text-slate-400'}`}>4. Summary, Evidence & Q&A</span>
        </div>
      </div>

      {/* Top Summary Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 break-all">
                {documentData.filename}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                <span>{formatFileSize(documentData.file_size_bytes)}</span>
                <span>•</span>
                <span className="font-semibold text-slate-700">
                  {documentData.total_pages} {documentData.total_pages === 1 ? 'Page' : 'Pages'}
                </span>
                <span>•</span>
                <span className="text-indigo-700 font-medium">
                  {selectableCount} Digital Text
                  {documentData.ocr_completed_pages.length > 0 &&
                    `, ${documentData.ocr_completed_pages.length} OCR Processed`}
                  {documentData.ocr_unavailable &&
                    `, ${documentData.pages_requiring_ocr.length - documentData.ocr_completed_pages.length} OCR Pending`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-900 hover:bg-indigo-800 rounded-lg flex items-center space-x-2 transition shadow-sm disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{analysis ? 'Re-Analyze Legal Facts' : 'Analyze Legal Facts'}</span>
                </>
              )}
            </button>

            <button
              onClick={onReset}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center space-x-2 transition"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
              <span>Upload Another</span>
            </button>
          </div>
        </div>

        {/* OCR Status Alerts */}
        {documentData.ocr_completed_pages.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-emerald-900 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-900">
                Tesseract OCR Processed on {documentData.ocr_completed_pages.length}{' '}
                {documentData.ocr_completed_pages.length === 1 ? 'Page' : 'Pages'}
              </p>
              <p className="text-xs text-emerald-800 mt-0.5">
                Pages [{documentData.ocr_completed_pages.map((p) => `Page ${p}`).join(', ')}] were
                scanned or lacked digital text; optical character recognition was successfully executed.
              </p>
            </div>
          </div>
        )}

        {documentData.ocr_unavailable && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-amber-900 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">
                Tesseract OCR Engine Unavailable for Scanned Pages
              </p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Pages [{documentData.pages_requiring_ocr.map((p) => `Page ${p}`).join(', ')}] have
                sparse or scanned text and require OCR. The standalone Tesseract OCR binary is not
                installed or configured on the server host. Selectable digital text was extracted
                normally.
              </p>
            </div>
          </div>
        )}

        {analysisError && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>Analysis Error: {analysisError}</span>
          </div>
        )}

        {/* View Selection Tabs */}
        <div className="flex items-center space-x-2 mt-5 pt-4 border-t border-slate-100 flex-wrap gap-y-2">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition ${
              activeTab === 'analysis'
                ? 'bg-indigo-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Case Overview & AI Analysis</span>
          </button>

          <button
            onClick={() => setActiveTab('pages')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition ${
              activeTab === 'pages'
                ? 'bg-indigo-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Page by Page</span>
          </button>

          <button
            onClick={() => setActiveTab('normalized')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition ${
              activeTab === 'normalized'
                ? 'bg-indigo-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Normalized Full Text</span>
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition ${
              activeTab === 'evidence'
                ? 'bg-indigo-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Evidence References ({documentData.sample_evidence_references.length})</span>
          </button>
        </div>
      </div>

      {/* TAB: Legal Analysis & Case Overview */}
      {activeTab === 'analysis' && (
        <div>
          {analysis ? (
            <LegalAnalysisViewer analysis={analysis} pages={documentData.pages} />
          ) : isAnalyzing ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-700" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-bold text-slate-900">
                  Extracting Legal Intelligence...
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Scanning pages for court name, case number, petitioner/respondent parties, order dates, cited legal statutes, and operative disposition.
                </p>
              </div>
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>Zero-Hallucination Extractive Fallback Engine</span>
              </div>
            </div>
          ) : analysisError ? (
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-bold text-red-900">Analysis Could Not Complete</h3>
                <p className="text-xs text-red-600 mt-1">{analysisError}</p>
              </div>
              <div>
                <button
                  onClick={handleRunAnalysis}
                  className="px-5 py-2.5 rounded-xl bg-indigo-900 text-white font-semibold text-xs hover:bg-indigo-800 transition shadow-sm inline-flex items-center space-x-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Legal Analysis</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto">
                <Scale className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-bold text-slate-900">
                  Ready to Analyze Legal Document
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Extract court jurisdiction, case registration, parties, order dates, cited legal statutes, operative holding, and ask grounded questions without hallucinations.
                </p>
              </div>
              <div>
                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className="px-6 py-2.5 rounded-xl bg-indigo-900 text-white font-semibold text-sm hover:bg-indigo-800 transition shadow-sm inline-flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Run Legal Analysis Now</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Page by Page View */}
      {activeTab === 'pages' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Page List Sidebar */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Document Pages ({documentData.total_pages})
              </h3>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {documentData.pages.map((page, idx) => {
                const isMatch = filteredPageNumbers.includes(page.page_number);
                if (searchQuery.trim() && !isMatch) return null;

                const isOcrCompleted = page.ocr_status === 'completed';
                const isOcrUnavailable = page.ocr_status === 'unavailable';
                const isOcrFailed = page.ocr_status === 'failed';

                return (
                  <button
                    key={page.page_number}
                    onClick={() => setCurrentPageIndex(idx)}
                    className={`w-full text-left p-3 rounded-xl text-xs transition flex items-center justify-between ${
                      currentPageIndex === idx
                        ? 'bg-indigo-900 text-white shadow-sm'
                        : 'hover:bg-slate-100 text-slate-700 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">Page {page.page_number}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          currentPageIndex === idx
                            ? 'bg-indigo-800 text-indigo-100'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {page.char_count} chars
                      </span>
                    </div>

                    {isOcrCompleted && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          currentPageIndex === idx
                            ? 'bg-emerald-400 text-emerald-950'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        OCR
                      </span>
                    )}

                    {isOcrUnavailable && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          currentPageIndex === idx
                            ? 'bg-amber-400 text-amber-950'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                        title="Tesseract executable missing"
                      >
                        No OCR
                      </span>
                    )}

                    {isOcrFailed && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          currentPageIndex === idx
                            ? 'bg-red-400 text-red-950'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        Error
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Page Text Viewer */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <span className="text-base font-bold text-slate-900">
                  Page {activePage.page_number} of {documentData.total_pages}
                </span>

                {activePage.extraction_method === 'ocr' ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                    <Cpu className="w-3 h-3 text-emerald-600 mr-1" />
                    Tesseract OCR Extracted
                  </span>
                ) : activePage.ocr_status === 'unavailable' ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600 mr-1" />
                    Scanned Page (OCR Unavailable)
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Native Selectable Text
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCopy(`page-${activePage.page_number}`, activePage.text)}
                  disabled={!activePage.text.trim()}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center space-x-1.5 disabled:opacity-40"
                >
                  {copiedItem === `page-${activePage.page_number}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Page Text</span>
                    </>
                  )}
                </button>

                <div className="flex items-center space-x-1 border-l border-slate-200 pl-2">
                  <button
                    disabled={currentPageIndex === 0}
                    onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <button
                    disabled={currentPageIndex === documentData.pages.length - 1}
                    onClick={() =>
                      setCurrentPageIndex((prev) =>
                        Math.min(documentData.pages.length - 1, prev + 1)
                      )
                    }
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next Page"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Page Text Area */}
            <div className="p-6 flex-1 bg-slate-50/50">
              {activePage.ocr_status === 'unavailable' && !activePage.text.trim() ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-dashed border-amber-300">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />
                  <h4 className="text-sm font-semibold text-slate-800">
                    OCR Engine Not Available on Host
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mt-1">
                    {activePage.ocr_error_message ||
                      'This scanned page could not be transcribed because Tesseract executable was not found. Install Tesseract OCR to extract scanned text.'}
                  </p>
                </div>
              ) : !activePage.text.trim() ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-dashed border-slate-300">
                  <FileText className="w-10 h-10 text-slate-400 mb-2" />
                  <h4 className="text-sm font-semibold text-slate-700">Page Content Empty</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    No characters were detected on this page.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-inner font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text min-h-[300px] max-h-[600px] overflow-y-auto">
                  {activePage.text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Normalized Full Text View */}
      {activeTab === 'normalized' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Normalized Full Document Representation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Standardized continuous text structure preserving page markers for subsequent legal analysis.
              </p>
            </div>
            <button
              onClick={() => handleCopy('normalized-full', documentData.normalized_full_text)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center space-x-1.5"
            >
              {copiedItem === 'normalized-full' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied Full Text!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Full Document</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-6 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[650px] overflow-y-auto">
            {documentData.normalized_full_text || 'No text extracted from document.'}
          </div>
        </div>
      )}

      {/* TAB: Evidence References View */}
      {activeTab === 'evidence' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Basic Evidence References ({documentData.sample_evidence_references.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Grounded citations linking verified excerpts to source page numbers and character offsets.
            </p>
          </div>

          {documentData.sample_evidence_references.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No substantive evidence passages identified in this document.
            </div>
          ) : (
            <div className="space-y-3 max-h-[650px] overflow-y-auto">
              {documentData.sample_evidence_references.map((ref, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800">
                        Reference #{idx + 1} • Page {ref.page_number}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          ref.extraction_method === 'ocr'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {ref.extraction_method === 'ocr' ? 'OCR Derived' : 'Selectable Text'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                      <span>Offsets: [{ref.start_char ?? 0}..{ref.end_char ?? 'end'}]</span>
                      <button
                        onClick={() => handleCopy(`ref-${idx}`, ref.passage)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600 transition"
                        title="Copy passage"
                      >
                        {copiedItem === `ref-${idx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="font-mono text-xs text-slate-800 bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    "{ref.passage}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
