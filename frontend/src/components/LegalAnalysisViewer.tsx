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
  ShieldAlert,
  Layers,
  Database,
  Gavel,
  Info,
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

  const getCategoryColor = (cat: string | null | undefined) => {
    if (!cat) return 'bg-slate-100 text-slate-700 border-slate-200';
    const c = cat.toLowerCase();
    if (c.includes('criminal')) return 'bg-rose-100 text-rose-800 border-rose-300';
    if (c.includes('civil')) return 'bg-sky-100 text-sky-800 border-sky-300';
    if (c.includes('constitutional')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (c.includes('other')) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-slate-100 text-slate-600 border-slate-300';
  };

  const getStageColor = (stage: string | null | undefined) => {
    if (!stage) return 'bg-slate-100 text-slate-700 border-slate-200';
    const s = stage.toLowerCase();
    if (s.includes('bail')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (s.includes('trial')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (s.includes('appeal')) return 'bg-sky-100 text-sky-800 border-sky-300';
    if (s.includes('investigation')) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (s.includes('writ')) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (s.includes('final')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (s.includes('interim')) return 'bg-teal-100 text-teal-800 border-teal-300';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const getOutcomeColor = (outcome: string | null | undefined) => {
    if (!outcome) return 'bg-slate-100 text-slate-700 border-slate-200';
    const o = outcome.toLowerCase();
    if (o.includes('granted') || o.includes('allowed')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
    if (o.includes('rejected') || o.includes('dismissed')) {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    if (o.includes('disposed')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }
    return 'bg-amber-100 text-amber-800 border-amber-300';
  };

  const getSeverityBadgeClass = (tier: string | null | undefined) => {
    if (!tier) return 'bg-slate-100 text-slate-700 border-slate-300';
    const t = tier.toLowerCase();
    if (t.includes('capital') || t.includes('life')) return 'bg-red-900 text-white border-red-950';
    if (t.includes('serious') || t.includes('7+')) return 'bg-rose-100 text-rose-800 border-rose-300';
    if (t.includes('moderate') || t.includes('< 7')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (t.includes('summary') || t.includes('minor')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const quickQuestions = [
    'What is the case category and document type?',
    'What is the procedural stage of this matter?',
    'What was the court outcome or decision?',
    'Which court heard this matter?',
    'Who are the parties involved?',
    'What legal sections are cited?',
  ];

  return (
    <div className="space-y-6">
      {/* 1. Plain Language Summary Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md border border-indigo-900/50">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-indigo-800/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-800/60 rounded-lg text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold tracking-tight">
                  Plain-Language Case Summary & Legal Intelligence
                </h3>
                {analysis.document_id && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-800/80 text-indigo-200 border border-indigo-700">
                    <Database className="w-3 h-3 mr-1 text-emerald-400" />
                    Saved: {analysis.document_id.slice(0, 16)}...
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200">
                Extracted legal facts verified directly from document text and Indian statutory knowledge
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Extractive Grounding
            </span>
            {analysis.retrieved_legal_sources && analysis.retrieved_legal_sources.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                <Gavel className="w-3.5 h-3.5 mr-1 text-amber-400" />
                Legal RAG Active ({analysis.retrieved_legal_sources.length} Sources)
              </span>
            )}
          </div>
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

      {/* 2. Structured Multi-Parameter Classification Grid (6-Card) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Multi-Parameter Legal Classification</span>
          </h4>
          <span className="text-[11px] text-slate-400">Independent classification parameters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* A. Case Category */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Category</span>
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-1">
                <span
                  className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${getCategoryColor(
                    analysis.case_category?.value
                  )}`}
                >
                  {analysis.case_category?.value || 'Uncertain'}
                </span>
              </div>
            </div>
            {analysis.case_category?.page_number ? (
              <span className="mt-2 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-medium w-fit">
                Page {analysis.case_category.page_number}
              </span>
            ) : (
              <span className="mt-2 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded font-medium w-fit">
                Taxonomy
              </span>
            )}
          </div>

          {/* B. Document Type */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Doc Type</span>
                <FileText className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2 mt-1">
                {analysis.document_type.value || 'Uncertain'}
              </p>
            </div>
            {analysis.document_type.page_number ? (
              <span className="mt-2 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-medium w-fit">
                Page {analysis.document_type.page_number}
              </span>
            ) : (
              <span className="mt-2 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium w-fit">
                Classified
              </span>
            )}
          </div>

          {/* C. Procedural Stage */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Proc. Stage</span>
                <Layers className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-1">
                <span
                  className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${getStageColor(
                    analysis.procedural_stage?.value
                  )}`}
                >
                  {analysis.procedural_stage?.value || 'Unknown'}
                </span>
              </div>
            </div>
            {analysis.procedural_stage?.page_number ? (
              <span className="mt-2 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-medium w-fit">
                Page {analysis.procedural_stage.page_number}
              </span>
            ) : (
              <span className="mt-2 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded font-medium w-fit">
                Procedural
              </span>
            )}
          </div>

          {/* D. Case Outcome */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Outcome</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-1">
                <span
                  className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${getOutcomeColor(
                    analysis.case_outcome?.value || analysis.disposition.value
                  )}`}
                >
                  {analysis.case_outcome?.value || analysis.disposition.value || 'Not Determined'}
                </span>
              </div>
            </div>
            {(analysis.case_outcome?.page_number || analysis.disposition.page_number) ? (
              <span className="mt-2 text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium w-fit">
                Page {analysis.case_outcome?.page_number || analysis.disposition.page_number}
              </span>
            ) : (
              <span className="mt-2 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded font-medium w-fit">
                Ruling
              </span>
            )}
          </div>

          {/* E. Court Name */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Court Name</span>
                <Scale className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2 mt-1">
                {analysis.court_name.value || 'Not specified'}
              </p>
            </div>
            {analysis.court_name.page_number ? (
              <span className="mt-2 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-medium w-fit">
                Page {analysis.court_name.page_number}
              </span>
            ) : (
              <span className="mt-2 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded font-medium w-fit">
                Jurisdiction
              </span>
            )}
          </div>

          {/* F. Case Number */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Case Number</span>
                <FileText className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2 mt-1">
                {analysis.case_number.value || 'Not specified'}
              </p>
            </div>
            {analysis.case_number.page_number ? (
              <span className="mt-2 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-medium w-fit">
                Page {analysis.case_number.page_number}
              </span>
            ) : (
              <span className="mt-2 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded font-medium w-fit">
                Registry
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Preliminary Statutory Severity & Alleged Offence Assessment (Priority 3.F) */}
      {analysis.statutory_severity && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-rose-50 rounded-lg text-rose-700">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Alleged Offence & Preliminary Statutory Severity
                </h4>
                <p className="text-[11px] text-slate-500">
                  Objective statutory evaluation based on maximum penal provisions cited in document
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-medium">Statutory Seriousness Tier:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${getSeverityBadgeClass(
                  analysis.statutory_severity.severity_tier
                )}`}
              >
                {analysis.statutory_severity.severity_tier}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Applicable Punishment & Provisions */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                Statutory Punishment Information
              </span>
              <p className="text-xs font-semibold text-slate-800">
                {analysis.statutory_severity.applicable_punishment || 'Statutory punishment not determined from cited sections'}
              </p>
              {(analysis.statutory_severity.cited_section || analysis.statutory_severity.statutory_provision) && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium mb-1">
                    Relevant Statutory Provision:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold inline-block">
                    {analysis.statutory_severity.statutory_provision || analysis.statutory_severity.cited_section}
                  </span>
                </div>
              )}
            </div>

            {/* Criteria & Offence Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 md:col-span-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                Evaluation Criteria & Context
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {analysis.statutory_severity.criteria_explanation}
              </p>
              {analysis.statutory_severity.offence_name && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium mb-0.5">
                    Identified Alleged Offence:
                  </span>
                  <p className="text-xs text-slate-800 font-semibold">
                    {analysis.statutory_severity.offence_name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Mandatory Non-Guilt Disclaimer Warning */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="font-semibold text-amber-950">Statutory Notice: </strong>
              {analysis.statutory_severity.disclaimer}
            </div>
          </div>
        </div>
      )}

      {/* 4. External Legal RAG Knowledge Base Sources (Priority 2 & 4) */}
      {analysis.retrieved_legal_sources && analysis.retrieved_legal_sources.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-700">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  External Legal Knowledge Base Sources (RAG)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Retrieved Indian statutes, sections, and benchmark precedents — strictly distinguished from document evidence
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
              {analysis.retrieved_legal_sources.length} Contextual Sources Retrieved
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {analysis.retrieved_legal_sources.map((src, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-slate-50/60 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded">
                      {src.act_or_authority}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      {Math.round(src.relevance_score * 100)}% Match
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-slate-900 leading-snug mt-1.5">
                    {src.title}
                  </h5>

                  <div className="mt-2.5 p-2 rounded bg-white border border-slate-200 text-[11px] font-mono text-slate-700 leading-relaxed">
                    "{src.text}"
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700">Source: </span>
                  <span className="font-mono text-[10px] text-slate-500">{src.source_id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Parties & Cited Statutes */}
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

        {/* Cited Legal Sections & Document Evidence */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-indigo-700" />
              <h4 className="text-sm font-bold text-slate-900">
                Cited Statutory Provisions in Document ({analysis.cited_sections.length})
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
                      Page {sec.page_number}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {analysis.disposition.passage && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-1">
                Operative Document Evidence (Page {analysis.disposition.page_number}):
              </span>
              <p className="font-mono text-slate-600 text-[11px] leading-relaxed">
                "{analysis.disposition.passage}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 6. Grounded Document Q&A Assistant */}
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
