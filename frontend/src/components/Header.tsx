import React from 'react';
import { Scale, BookOpen } from 'lucide-react';
import { HealthStatusBadge } from './HealthStatusBadge';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-900 flex items-center justify-center text-amber-400 shadow-sm">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                NayaSetu
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                Phase 2
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Indian Court Document Intelligence & OCR
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <HealthStatusBadge />
          <div className="hidden md:flex items-center text-xs text-slate-500 border-l border-slate-200 pl-4 space-x-1">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>PyMuPDF + Tesseract</span>
          </div>
        </div>
      </div>
    </header>
  );
};
