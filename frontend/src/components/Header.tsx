import React from 'react';
import { Scale, BookOpen, History } from 'lucide-react';
import { HealthStatusBadge } from './HealthStatusBadge';

interface HeaderProps {
  onOpenHistory?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHistory }) => {
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
                RAG MVP
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Indian Court Document Intelligence & RAG Classification
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 flex items-center space-x-1.5 transition shadow-sm"
              title="View saved document classifications"
            >
              <History className="w-3.5 h-3.5 text-indigo-700" />
              <span>Document History</span>
            </button>
          )}
          <HealthStatusBadge />
          <div className="hidden md:flex items-center text-xs text-slate-500 border-l border-slate-200 pl-3 space-x-1">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>RAG & Legal AI</span>
          </div>
        </div>
      </div>
    </header>
  );
};
