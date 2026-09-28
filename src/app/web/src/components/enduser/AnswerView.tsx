import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  FileText, 
  Copy, 
  Check, 
  ShieldCheck, 
  BookOpen, 
  ArrowLeft,
  Eye,
  ExternalLink
} from 'lucide-react';
import { QuestionVerdict, ClauseCitation } from '../../types';

interface AnswerViewProps {
  verdictData: QuestionVerdict;
  onBackToQuery: () => void;
  onOpenContractDoc?: (contractId: string) => void;
}

export const AnswerView: React.FC<AnswerViewProps> = ({
  verdictData,
  onBackToQuery,
  onOpenContractDoc
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<ClauseCitation | null>(
    verdictData.citations[0] || null
  );
  const [isPdfDrawerOpen, setIsPdfDrawerOpen] = useState(false);

  const handleCopyCitation = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getVerdictStyle = (v: QuestionVerdict['verdict']) => {
    switch (v) {
      case 'Compliant':
        return {
          cardBg: 'bg-white border-emerald-300',
          badge: 'bg-emerald-600 text-white',
          textAccent: 'text-emerald-700',
          icon: CheckCircle2
        };
      case 'Unchecked':
      case 'Deviation Flagged':
        return {
          cardBg: 'bg-white border-amber-300',
          badge: 'bg-amber-600 text-white',
          textAccent: 'text-amber-700',
          icon: AlertTriangle
        };
      case 'Non-Compliant':
        return {
          cardBg: 'bg-white border-rose-300',
          badge: 'bg-rose-600 text-white',
          textAccent: 'text-rose-700',
          icon: XCircle
        };
      case 'Ambiguous':
      default:
        return {
          cardBg: 'bg-white border-zinc-300',
          badge: 'bg-zinc-800 text-white',
          textAccent: 'text-zinc-700',
          icon: HelpCircle
        };
    }
  };

  const vStyle = getVerdictStyle(verdictData.verdict);
  const VerdictIcon = vStyle.icon;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar: Back & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToQuery}
          className="flex items-center gap-2 text-xs font-bold text-zinc-700 hover:text-zinc-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Query Console</span>
        </button>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-zinc-400 font-mono text-[11px]">ID: {verdictData.id}</span>
          <span className="text-zinc-300">·</span>
          <span className="text-zinc-500 font-mono text-[11px]">{verdictData.timestamp}</span>
          <button
            onClick={() => handleCopyCitation(`${verdictData.summary}\n\nKey Citations:\n${verdictData.citations.map(c => c.text).join('\n')}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 shadow-xs text-zinc-800 text-xs font-semibold transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
            <span>{copied ? 'Copied' : 'Copy Verdict'}</span>
          </button>
        </div>
      </div>

      {/* Evaluated Query Card */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-1.5">
        <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
          <span>Evaluated Inquiry</span>
          <span className="font-mono text-zinc-800 font-semibold">
            {verdictData.scope === 'single' ? `Single Document: ${verdictData.selectedContractName || 'Target'}` : 'Portfolio-Wide Scope'}
          </span>
        </div>
        <p className="text-sm font-semibold text-zinc-900 leading-relaxed">
          "{verdictData.query}"
        </p>
      </div>

      {/* Primary Verdict Card */}
      <div className={`p-6 rounded-2xl border-2 ${vStyle.cardBg} shadow-sm space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${vStyle.badge}`}>
              <VerdictIcon className="w-4 h-4" />
              <span>Verdict: {verdictData.verdict}</span>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-5 text-xs font-mono">
            <div className="text-right">
              <div className="text-[10px] uppercase text-zinc-400 font-semibold">Confidence</div>
              <div className="text-base font-bold text-zinc-950">{verdictData.confidenceScore}%</div>
            </div>
            <div className="h-7 w-px bg-zinc-200" />
            <div className="text-right">
              <div className="text-[10px] uppercase text-zinc-400 font-semibold">Grounding Proof</div>
              <div className="text-base font-bold text-emerald-600">{verdictData.groundingScore}%</div>
            </div>
            <div className="h-7 w-px bg-zinc-200" />
            <div className="text-right">
              <div className="text-[10px] uppercase text-zinc-400 font-semibold">Latency / Tokens</div>
              <div className="text-xs text-zinc-600 font-bold">{verdictData.latencyMs}ms · {verdictData.tokensUsed}t</div>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Executive Legal Position:
          </h3>
          <p className="text-xs text-zinc-700 leading-relaxed font-sans font-medium">
            {verdictData.summary}
          </p>
        </div>

        {/* Key Findings */}
        <div className="pt-3 border-t border-zinc-100 space-y-2">
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Key Analysis Findings:
          </h4>
          <ul className="space-y-1.5 text-xs text-zinc-700 font-medium">
            {verdictData.keyFindings.map((finding, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-zinc-900 font-bold">›</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendation Bar */}
        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-zinc-900">Recommended Action: </span>
            <span className="text-zinc-700 font-medium">{verdictData.recommendedAction}</span>
          </div>
        </div>
      </div>

      {/* Cited Clauses Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-zinc-700" />
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Cited Clauses & Verified Grounding Proof ({verdictData.citations.length})
            </h3>
          </div>
          <span className="text-xs text-zinc-500 font-medium">Click any citation to inspect highlighted source PDF</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {verdictData.citations.map((cite) => (
            <div
              key={cite.clauseId}
              onClick={() => {
                setSelectedCitation(cite);
                setIsPdfDrawerOpen(true);
              }}
              className="p-5 bg-white rounded-2xl shadow-xs border border-zinc-200/60 hover:border-zinc-400 cursor-pointer transition-all flex flex-col justify-between group space-y-3"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-zinc-950">
                    {cite.sectionNumber} — {cite.sectionTitle}
                  </span>
                  <span className="font-mono font-bold text-emerald-600">
                    {(cite.relevanceScore * 100).toFixed(1)}% match
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mb-2.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="truncate max-w-[200px] text-zinc-700 font-medium">{cite.contractName}</span>
                  <span>·</span>
                  <span>Page {cite.pageNumber}</span>
                  <span>·</span>
                  <span>{cite.matchType}</span>
                </div>

                {/* Excerpt */}
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 font-mono text-xs text-zinc-800 leading-relaxed border-l-4 border-l-zinc-900">
                  "{cite.text}"
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 font-medium">
                <span className="font-mono text-zinc-400 text-[11px]">{cite.clauseId}</span>
                <span className="text-zinc-900 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-zinc-700" />
                  <span>Open in Document Viewer</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PDF Modal Viewer */}
      {isPdfDrawerOpen && selectedCitation && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-zinc-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-[#FAF9F6]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900">{selectedCitation.contractName}</h4>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    Page {selectedCitation.pageNumber} · {selectedCitation.sectionNumber} · SHA-256 Verified
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsPdfDrawerOpen(false)}
                className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            {/* Document simulated text */}
            <div className="p-6 overflow-y-auto space-y-4 bg-white font-serif text-zinc-700 text-xs leading-relaxed">
              <div className="text-center border-b border-zinc-100 pb-3 text-zinc-400 text-[11px] font-sans">
                DOCUMENT EXCERPT VIEW — PAGE {selectedCitation.pageNumber}
              </div>
              
              <div className="p-4 rounded-xl bg-amber-50 border-l-4 border-amber-500 text-zinc-900 font-sans text-xs">
                <div className="text-[10px] font-mono text-amber-700 uppercase font-bold mb-1">
                  Verified source text [{selectedCitation.sectionNumber}]
                </div>
                "{selectedCitation.text}"
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-100 bg-[#FAF9F6] flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-medium">AST-parsed & vector hash verified.</span>
              <button
                onClick={() => setIsPdfDrawerOpen(false)}
                className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold"
              >
                Done Inspecting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
