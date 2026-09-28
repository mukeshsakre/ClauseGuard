import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Layers, 
  FileText, 
  ArrowRight,
  ShieldCheck, 
  Globe,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { ContractDocument } from '../../types';

interface AskQuestionProps {
  contracts: ContractDocument[];
  selectedContractId?: string;
  onExecuteQuery: (query: string, scope: 'single' | 'portfolio', contractId?: string) => void;
  isEvaluating: boolean;
}

export const AskQuestion: React.FC<AskQuestionProps> = ({
  contracts,
  selectedContractId,
  onExecuteQuery,
  isEvaluating
}) => {
  const [scope, setScope] = useState<'single' | 'portfolio'>(selectedContractId ? 'single' : 'single');
  const [chosenContractId, setChosenContractId] = useState<string>(selectedContractId || contracts[0]?.id || '');
  const [queryText, setQueryText] = useState(
    'What is the aggregate limitation of liability cap and does it exclude gross negligence or data breach indemnification?'
  );

  const samplePresets = [
    {
      label: 'Limitation of Liability Super-Cap',
      scope: 'single' as const,
      text: 'What is the aggregate limitation of liability cap and does it exclude gross negligence or data breach indemnification?'
    },
    {
      label: 'Portfolio Cross-Border Transfer & SCCs',
      scope: 'portfolio' as const,
      text: 'Across our entire vendor portfolio, which contracts permit cross-border transfer of EU personal data without standard contractual clauses (SCCs)?'
    },
    {
      label: 'Uncapped IP Indemnification',
      scope: 'single' as const,
      text: 'Does the vendor provide uncapped third-party intellectual property infringement indemnification including defense legal costs?'
    },
    {
      label: 'Auto-Renewal Notice Windows',
      scope: 'portfolio' as const,
      text: 'List all active vendor agreements requiring more than 60 days advance written notice to prevent automatic renewal.'
    }
  ];

  const handleSelectPreset = (preset: typeof samplePresets[0]) => {
    setScope(preset.scope);
    setQueryText(preset.text);
    if (preset.scope === 'single' && !chosenContractId && contracts[0]) {
      setChosenContractId(contracts[0].id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    onExecuteQuery(queryText, scope, scope === 'single' ? chosenContractId : undefined);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Ask-a-Question Engine</h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Execute grounded natural language queries with dense vector search, AST clause cross-attention, and policy validation.
        </p>
      </div>

      {/* Scope Selector Card */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Evaluation Scope:</span>
          
          <div className="flex items-center p-1 bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-600">
            <button
              type="button"
              onClick={() => setScope('single')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                scope === 'single'
                  ? 'bg-white text-zinc-950 shadow-xs font-bold'
                  : 'hover:text-zinc-950'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Single Contract</span>
            </button>
            <button
              type="button"
              onClick={() => setScope('portfolio')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                scope === 'portfolio'
                  ? 'bg-white text-zinc-950 shadow-xs font-bold'
                  : 'hover:text-zinc-950'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Portfolio-Wide ({contracts.length} Agreements)</span>
            </button>
          </div>
        </div>

        {scope === 'single' ? (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700">Target Contract Document:</label>
            <select
              value={chosenContractId}
              onChange={(e) => setChosenContractId(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 font-semibold focus:outline-none focus:border-zinc-900 focus:bg-white transition-all cursor-pointer"
            >
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.counterparty} ({c.chunkCount} chunks, {c.category})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/60 text-xs text-zinc-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E4E4EE] text-[#363559] flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <span className="font-medium">
                Searching across all <span className="font-bold text-zinc-900">{contracts.length} active enterprise contracts</span> in your tenant partition.
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Isolated: TEN-ACME-01
            </span>
          </div>
        )}
      </div>

      {/* Query Textarea & Action Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-xs border border-zinc-200/60 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <Search className="w-4 h-4 text-zinc-500" />
            <span>Legal or Compliance Inquiry</span>
          </label>
          <span className="text-xs font-mono font-semibold text-zinc-500">Gemini-1.5-Pro (v2.4.1)</span>
        </div>

        <textarea
          rows={3}
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="Ask any contract question (e.g. 'What are the termination for convenience terms and refund obligations?')..."
          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white leading-relaxed font-sans font-medium transition-all"
        />

        {/* Real-time RAG Tunables Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 text-xs text-zinc-500">
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Top-K: <span className="font-bold text-zinc-900">12</span></span>
            <span>·</span>
            <span>Dense/BM25: <span className="font-bold text-zinc-900">70/30</span></span>
            <span>·</span>
            <span>Cutoff: <span className="font-bold text-zinc-900">0.65</span></span>
            <span>·</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1 font-sans">
              <ShieldCheck className="w-3.5 h-3.5" />
              Guardrail Active
            </span>
          </div>

          <button
            type="submit"
            disabled={isEvaluating || !queryText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
          >
            {isEvaluating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating Legal Sources...</span>
              </>
            ) : (
              <>
                <span>Execute Synthesis</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Suggested Inquiry Presets */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-3">
        <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
          Suggested Compliance Inquiries:
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {samplePresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className="text-left p-3.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 hover:border-zinc-300 transition-all group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-zinc-900 group-hover:text-zinc-950">
                  {preset.label}
                </span>
                <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700">
                  {preset.scope}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed">
                {preset.text}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
