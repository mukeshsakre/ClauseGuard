import React, { useState } from 'react';
import { 
  Scale, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Globe
} from 'lucide-react';
import { PolicyRule } from '../../types';
import { createRule } from '../../api/client';

interface PolicyRulesetViewerProps {
  rules: PolicyRule[];
}

export const PolicyRulesetViewer: React.FC<PolicyRulesetViewerProps> = ({ rules }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeRule, setActiveRule] = useState<PolicyRule | null>(rules[0] || null);
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [severity, setSeverity] = useState('Major');
  const [saveError, setSaveError] = useState('');

  const categories = ['All', ...Array.from(new Set(rules.map((r) => r.category)))];

  const filteredRules = rules.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.mandatoryStandard.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' ? true : r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Policy Ruleset Viewer</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Audit golden corporate policies, mandatory standards, approved fallback positions, and automated redlines.
          </p>
        </div>

        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void createRule(title, statement, severity)
              .then(() => {
                setTitle('');
                setStatement('');
                setSaveError('');
                window.dispatchEvent(new Event('clauseguard-refresh'));
              })
              .catch((error: unknown) => setSaveError(error instanceof Error ? error.message : 'Could not save the rule'));
          }}
        >
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Rule title" className="bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-xs" required />
          <input value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="Words that must appear in the contract" className="bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-xs w-72" required />
          <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="bg-white border border-zinc-200 rounded-xl px-2 py-1.5 text-xs">
            <option>Critical</option>
            <option>Major</option>
            <option>Minor</option>
          </select>
          <button type="submit" className="px-3 py-1.5 rounded-xl bg-zinc-950 text-white text-xs font-semibold">Save rule</button>
          {saveError && <span className="text-xs text-rose-600">{saveError}</span>}
        </form>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-zinc-200/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mr-1">Domain:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:text-zinc-950'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search policy rule or standard..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white w-64 transition-all font-medium"
          />
        </div>
      </div>

      {/* Master-Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Rules List Column */}
        <div className="lg:col-span-5 space-y-3">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              onClick={() => setActiveRule(rule)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all shadow-xs ${
                activeRule?.id === rule.id
                  ? 'bg-white border-zinc-900 ring-2 ring-zinc-900/10'
                  : 'bg-white border-zinc-200/60 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono text-zinc-500 font-semibold">{rule.id}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  rule.riskLevel === 'Critical' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                  rule.riskLevel === 'High' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-zinc-100 text-zinc-700 border border-zinc-200'
                }`}>
                  {rule.riskLevel} Risk
                </span>
              </div>

              <h4 className="text-xs font-bold text-zinc-950 leading-snug">{rule.title}</h4>
              <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed font-medium">
                {rule.mandatoryStandard}
              </p>

              <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="font-medium text-zinc-600">{rule.category}</span>
                <span>Updated {rule.lastUpdated}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Rule Inspector */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200/60 p-6 shadow-xs space-y-5">
          {activeRule ? (
            <>
              {/* Header */}
              <div className="pb-3 border-b border-zinc-100">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span className="font-mono font-semibold text-zinc-700">{activeRule.id} · {activeRule.category}</span>
                  <span className="font-medium">{activeRule.activeRuleset}</span>
                </div>
                <h3 className="text-base font-bold text-zinc-950 mt-1">{activeRule.title}</h3>
                <div className="text-xs text-zinc-500 mt-0.5 font-mono">{activeRule.standardClauseName}</div>
              </div>

              {/* Mandatory Requirement */}
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mandatory Contractual Standard</span>
                </div>
                <p className="text-xs text-zinc-800 leading-relaxed font-sans font-medium">
                  {activeRule.mandatoryStandard}
                </p>
              </div>

              {/* Approved Negotiated Fallbacks */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <Scale className="w-4 h-4 text-zinc-600" />
                  <span>Approved Negotiated Fallbacks ({activeRule.acceptableFallbacks.length})</span>
                </div>
                <div className="space-y-2">
                  {activeRule.acceptableFallbacks.map((fb, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60 text-xs text-zinc-800 flex items-start gap-2.5">
                      <span className="font-mono font-bold text-zinc-500 text-xs mt-0.5">{idx + 1}.</span>
                      <span className="font-medium">{fb}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prohibited Terms / Redlines */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  <span>Strictly Prohibited Terms (Automated Redlines)</span>
                </div>
                <div className="space-y-2">
                  {activeRule.prohibitedTerms.map((pt, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                      <span className="font-bold text-rose-600 mt-0.5">✕</span>
                      <span className="font-medium">{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Jurisdictions & Metadata */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-zinc-400" />
                  <span>Jurisdictions:</span>
                  <span className="text-zinc-800 font-bold">{activeRule.applicableJurisdictions.join(', ')}</span>
                </div>
                <span className="font-mono text-zinc-400">SHA-256 Hash Verified</span>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-zinc-400 text-xs">
              Select a policy rule to inspect details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
