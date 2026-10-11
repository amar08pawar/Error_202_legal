import React, { useState } from 'react';
import { DocumentExtractionResponse } from '../types/document';
import {
  FileText,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  BookOpen,
} from 'lucide-react';

interface ExtractedDocumentViewerProps {
  documentData: DocumentExtractionResponse;
  onReset: () => void;
}

export const ExtractedDocumentViewer: React.FC<ExtractedDocumentViewerProps> = ({
  documentData,
  onReset,
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedPage, setCopiedPage] = useState<number | null>(null);

  const activePage = documentData.pages[currentPageIndex];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCopyText = (pageNumber: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPage(pageNumber);
    setTimeout(() => setCopiedPage(null), 2000);
  };

  // Filter pages that match query if search is active
  const filteredPageNumbers = searchQuery.trim()
    ? documentData.pages
        .filter((p) => p.text.toLowerCase().includes(searchQuery.toLowerCase()))
        .map((p) => p.page_number)
    : documentData.pages.map((p) => p.page_number);

  return (
    <div className="space-y-6">
      {/* Top Summary Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
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
                <span className="text-emerald-700 font-medium">Text Extracted via PyMuPDF</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onReset}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center space-x-2 transition"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
              <span>Upload Another Document</span>
            </button>
          </div>
        </div>

        {/* OCR Status Notice if needed */}
        {documentData.has_ocr_needed_pages ? (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-amber-900 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">
                OCR Processing Required on {documentData.pages_requiring_ocr.length}{' '}
                {documentData.pages_requiring_ocr.length === 1 ? 'Page' : 'Pages'}
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Pages flagged: [
                {documentData.pages_requiring_ocr.map((p) => `Page ${p}`).join(', ')}
                ]. These pages contain scanned images, handwritten text, or lack selectable digital text.
                Phase 1 extracted native selectable text only; OCR engine execution will be connected in subsequent phases.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>All pages contain selectable text. No OCR fallback required for this document.</span>
          </div>
        )}
      </div>

      {/* Main Extracted Content Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Page List Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Document Pages ({documentData.total_pages})
            </h3>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search extracted text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {documentData.pages.map((page, idx) => {
              const isMatch = filteredPageNumbers.includes(page.page_number);
              if (searchQuery.trim() && !isMatch) return null;

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
                  {page.requires_ocr && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        currentPageIndex === idx
                          ? 'bg-amber-400 text-amber-950'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                      title="Page contains little or no selectable text and requires OCR"
                    >
                      Needs OCR
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Page Text Viewer */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          {/* Header of Active Page */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-base font-bold text-slate-900">
                Page {activePage.page_number} of {documentData.total_pages}
              </span>
              {activePage.requires_ocr ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600 mr-1" />
                  Sparse Text / OCR Required
                </span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Selectable Text Extracted
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleCopyText(activePage.page_number, activePage.text)}
                disabled={!activePage.text.trim()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center space-x-1.5 disabled:opacity-40"
              >
                {copiedPage === activePage.page_number ? (
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
            {activePage.requires_ocr && !activePage.text.trim() ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-dashed border-amber-300">
                <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />
                <h4 className="text-sm font-semibold text-slate-800">
                  No Selectable Text Found on Page {activePage.page_number}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mt-1">
                  This page appears to be a scanned image or handwritten court document.
                  In Phase 1, only native digital text is extracted.
                  This page has been flagged for OCR processing.
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
    </div>
  );
};
