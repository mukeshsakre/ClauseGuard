import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sliders
} from 'lucide-react';
import { GuardrailRule, GuardrailViolationLog } from '../../types';

interface GuardrailSettingsProps {
  rules: GuardrailRule[];
  violations: GuardrailViolationLog[];
  onToggleRule: (id: string) => void;
  onUpdateThreshold: (id: string, newThreshold: number) => void;
}

export const GuardrailSettings: React.FC<GuardrailSettingsProps> = ({
  rules,
  violations,
  onToggleRule,
  onUpdateThreshold
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'history'>('rules');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">AI Guardrail Governance</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure citation grounding minimums, hallucination blocks, PII redactions, and prompt jailbreak defense.
          </p>
        </div>

        <div className="flex items-center p-1 bg-white rounded-xl border border-zinc-200/80 shadow-xs text-xs font-semibold text-zinc-600">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'rules' ? 'bg-zinc-950 text-white shadow-xs font-bold' : 'hover:text-zinc-950'
            }`}
          >
            Guardrail Policies ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'history' ? 'bg-zinc-950 text-white shadow-xs font-bold' : 'hover:text-zinc-950'
            }`}
          >
            Violation Audit Log ({violations.length})
          </button>
        </div>
      </div>

      {activeTab === 'rules' && (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-5 rounded-2xl border bg-white shadow-xs transition-all ${
                rule.enabled ? 'border-zinc-200/80' : 'border-zinc-200/40 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    rule.enabled ? 'bg-[#E2EBE1] text-[#2C5234]' : 'bg-zinc-100 text-zinc-400'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-zinc-950">{rule.name}</h3>
                      <span className="text-[10px] font-mono text-zinc-400">{rule.id}</span>
                    </div>
                    <span className="text-xs text-zinc-500 font-medium">{rule.type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right font-mono text-xs">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase">Violations (24h)</div>
                    <div className="text-zinc-900 font-bold">{rule.violations24h}</div>
                  </div>

                  {/* Toggle button */}
                  <button
                    type="button"
                    onClick={() => onToggleRule(rule.id)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      rule.enabled ? 'bg-zinc-950' : 'bg-zinc-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        rule.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Description & Threshold Slider */}
              <div className="mt-3 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <p className="text-zinc-600 text-xs leading-relaxed max-w-xl font-medium">
                  {rule.description}
                </p>

                <div className="flex items-center gap-3 bg-zinc-50 px-3.5 py-2 rounded-xl border border-zinc-200/80 shrink-0">
                  <span className="text-xs font-bold text-zinc-700">Threshold:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.01"
                    disabled={!rule.enabled}
                    value={rule.threshold}
                    onChange={(e) => onUpdateThreshold(rule.id, parseFloat(e.target.value))}
                    className="w-24 accent-zinc-900 cursor-pointer"
                  />
                  <span className="font-mono text-zinc-950 font-bold text-xs">
                    {rule.threshold.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-xs border border-zinc-200/60 overflow-hidden">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-white text-xs">
            <span className="font-bold text-zinc-900 uppercase tracking-wider">Guardrail Interceptions & Remediations</span>
            <span className="text-xs text-emerald-700 font-semibold">Zero data leaks to end users</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-[#FAF9F6] text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-4">Violation ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Triggered Guardrail</th>
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Snippet Evaluated</th>
                  <th className="py-3 px-4">Action Enforced</th>
                  <th className="py-3 px-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                {violations.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-zinc-900">{v.id}</td>
                    <td className="py-3 px-4 text-zinc-500">{v.timestamp}</td>
                    <td className="py-3 px-4 font-sans text-zinc-900 font-bold">{v.triggeredGuardrail}</td>
                    <td className="py-3 px-4 font-sans text-zinc-600 font-medium">{v.tenantName}</td>
                    <td className="py-3 px-4 text-zinc-700 truncate max-w-xs font-sans font-medium">
                      "{v.queryOrOutputSnippet}"
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        v.actionTaken.includes('Blocked') ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        v.actionTaken.includes('Redacted') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-zinc-100 text-zinc-700 border border-zinc-200'
                      }`}>
                        {v.actionTaken}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-800 font-bold">{v.score.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
