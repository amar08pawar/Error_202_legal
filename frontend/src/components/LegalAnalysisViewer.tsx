import React, { useState } from 'react';
import { LegalAnalysisResponse, QAResponse } from '../types/analysis';
import { PageExtraction } from '../types/document';
import { askQuestion } from '../services/api';
import {
  Scale,
  Calendar,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
  Loader2,
  Sparkles,
  BookOpen,
  BookmarkCheck,
  Tag,
} from 'lucide-react';

interface LegalAnalysisViewerProps {
  analysis: LegalAnalysisResponse;
  pages: PageExtraction[];
}

export const LegalAnalysisViewer: React.FC<LegalAnalysisViewerProps> = ({
  analysis,
  pages,
}) => {
  const [question, setQuestion] = useState<string>('');
  const [qaLoading, setQaLoading] = useState<boolean>(false);
  const [qaHistory, setQaHistory] = useState<QAResponse[]>([]);
  const [qaError, setQaError] = useState<string | null>(null);

  const handleAsk = async (queryToAsk?: string) => {
    const q = (queryToAsk || question).trim();
    if (!q) return;

    setQaLoading(true);
    setQaError(null);

    try {
      const res = await askQuestion(q, pages);
      setQaHistory((prev) => [res, ...prev]);
      if (!queryToAsk) setQuestion('');
    } catch (err: any) {
      setQaError(err.message || 'Failed to query document.');
    } finally {
      setQaLoading(false);
    }
  };

  const getDispositionColor = (disp: string | null) => {
    if (!disp) return 'bg-slate-100 text-slate-700 border-slate-200';
    const d = disp.toLowerCase();
    if (d.includes('granted') || d.includes('allowed')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
    if (d.includes('rejected') || d.includes('dismissed')) {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    if (d.includes('disposed')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }
    return 'bg-amber-100 text-amber-800 border-amber-300';
  };

  const quickQuestions = [
    'Was bail granted in this case?',
    'Which court heard this matter?',
    'Who are the parties involved?',
    'What legal sections are cited?',
  ];

  return (
    <div className="space-y-6">
      {/* 1. Plain Language Summary Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-indigo-800/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-800/60 rounded-lg text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                Plain-Language Case Summary
              </h3>
              <p className="text-xs text-indigo-200">
                Extracted legal facts verified directly from document text
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            Extractive Grounding (Zero Hallucination)
          </span>
        </div>

        <p className="mt-4 text-sm text-slate-100 leading-relaxed font-sans">
          {analysis.plain_language_summary}
        </p>

        {analysis.key_findings.length > 0 && (
          <div className="mt-4 pt-4 border-t border-indigo-800/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              Key Legal Findings
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-200">
              {analysis.key_findings.map((finding, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.provider_notes && (
          <div className="mt-4 pt-3 border-t border-indigo-800/60 text-[11px] text-indigo-200/90 flex items-start space-x-2">
            <span className="font-semibold text-amber-300 flex-shrink-0">Intelligence Mode:</span>
            <span>{analysis.provider_notes}</span>
          </div>
        )}
      </div>

      {/* 2. Structured Case Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Court Name */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Court Name</span>
              <Scale className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-900 leading-snug">
              {analysis.court_name.value || 'Not specified in document'}
            </p>
          </div>
          {analysis.court_name.page_number && (
            <span className="mt-2 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-medium w-fit">
              Found on Page {analysis.court_name.page_number}
            </span>
          )}
        </div>

        {/* Case Number */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Case Number</span>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-900 leading-snug">
              {analysis.case_number.value || 'Not specified in document'}
            </p>
          </div>
          {analysis.case_number.page_number && (
            <span className="mt-2 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-medium w-fit">
              Found on Page {analysis.case_number.page_number}
            </span>
          )}
        </div>

        {/* Document Classification */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Document Type</span>
              <BookOpen className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-900 leading-snug">
              {analysis.document_type.value || 'Judicial Document'}
            </p>
          </div>
          <span className="mt-2 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium w-fit">
            Classification
          </span>
        </div>

        {/* Operative Disposition */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Operative Ruling</span>
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-1">
              <span
                className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${getDispositionColor(
                  analysis.disposition.value
                )}`}
              >
                {analysis.disposition.value || 'Pending / Reserved'}
              </span>
            </div>
          </div>
          {analysis.disposition.page_number && (
            <span className="mt-2 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium w-fit">
              Holding on Page {analysis.disposition.page_number}
            </span>
          )}
        </div>
      </div>

      {/* 3. Parties & Cited Statutes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parties Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Users className="w-4 h-4 text-indigo-700" />
            <h4 className="text-sm font-bold text-slate-900">Parties to the Proceeding</h4>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                Petitioner / Appellant / Applicant
              </span>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {analysis.petitioner.value || 'Not explicitly named in text'}
              </p>
              {analysis.petitioner.page_number && (
                <span className="text-[10px] text-blue-700 mt-1 inline-block">
                  Source: Page {analysis.petitioner.page_number}
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Respondent / State / Opposite Party
              </span>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {analysis.respondent.value || 'Not explicitly named in text'}
              </p>
              {analysis.respondent.page_number && (
                <span className="text-[10px] text-slate-500 mt-1 inline-block">
                  Source: Page {analysis.respondent.page_number}
                </span>
              )}
            </div>
          </div>

          {analysis.order_date.value && (
            <div className="flex items-center text-xs text-slate-500 space-x-2 pt-2 border-t border-slate-100">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Decided / Ordered on: <strong className="text-slate-700">{analysis.order_date.value}</strong></span>
            </div>
          )}
        </div>

        {/* Cited Legal Sections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-indigo-700" />
              <h4 className="text-sm font-bold text-slate-900">
                Cited Legal Sections ({analysis.cited_sections.length})
              </h4>
            </div>
          </div>

          {analysis.cited_sections.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No statutory sections explicitly detected in document text.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {analysis.cited_sections.map((sec, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center space-x-2"
                >
                  <span className="font-semibold">{sec.value}</span>
                  {sec.page_number && (
                    <span className="text-[10px] bg-indigo-200/70 text-indigo-800 px-1.5 py-0.2 rounded font-medium">
                      P.{sec.page_number}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {analysis.disposition.passage && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-1">
                Operative Text Excerpt (Page {analysis.disposition.page_number}):
              </span>
              <p className="font-mono text-slate-600 text-[11px] leading-relaxed">
                "{analysis.disposition.passage}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Grounded Document Q&A Assistant */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="pb-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-700">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Grounded Document Q&A
              </h4>
              <p className="text-xs text-slate-500">
                Ask questions answered strictly with verified document citations
              </p>
            </div>
          </div>
        </div>

        {/* Quick query chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Quick Questions
          </span>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAsk(q)}
                disabled={qaLoading}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition text-slate-700 font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input box */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Ask a question about this court document..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-slate-50/50"
          />
          <button
            type="button"
            disabled={!question.trim() || qaLoading}
            onClick={() => handleAsk()}
            className="px-5 py-2.5 rounded-xl bg-indigo-900 text-white font-semibold text-sm hover:bg-indigo-800 transition disabled:opacity-40 flex items-center space-x-2"
          >
            {qaLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Ask</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {qaError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{qaError}</span>
          </div>
        )}

        {/* Q&A History */}
        {qaHistory.length > 0 && (
          <div className="space-y-4 pt-2">
            {qaHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800">
                    Q: {item.question}
                  </p>
                  {item.cited_pages.length > 0 && (
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {item.cited_pages.map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800"
                        >
                          Page {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-900 leading-relaxed font-sans bg-white p-3 rounded-lg border border-slate-200">
                  {item.answer}
                </p>

                {item.evidence_snippets.length > 0 && (
                  <div className="text-[11px] text-slate-500 font-mono bg-slate-100 p-2.5 rounded border border-slate-200">
                    <span className="font-sans font-bold text-slate-700 block mb-0.5">
                      Supporting Evidence Passage:
                    </span>
                    "{item.evidence_snippets[0]}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
