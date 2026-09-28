import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Play, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  XCircle, 
  Info, 
  CheckCircle2,
  ChevronRight,
  Filter
} from 'lucide-react';
import { SweepViolation, PolicyRule } from '../../types';
import { runSweep } from '../../api/client';

interface BatchSweepProps {
  violations: SweepViolation[];
  rulesets: PolicyRule[];
  onUpdateViolationStatus: (id: string, newStatus: SweepViolation['status']) => void;
}

export const BatchSweep: React.FC<BatchSweepProps> = ({
  violations,
  rulesets,
  onUpdateViolationStatus
}) => {
  const [selectedRuleset, setSelectedRuleset] = useState('Enterprise Risk Standard v3.4 (2026)');
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepProgress, setSweepProgress] = useState(100);
  const [severityFilter, setSeverityFilter] = useState<'All' | 'Critical' | 'Major' | 'Minor'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Under Review' | 'Remediated' | 'Waived'>('All');
  const [activeViolationDetail, setActiveViolationDetail] = useState<SweepViolation | null>(violations[0] || null);

  const handleRunSweep = () => {
    setIsSweeping(true);
    setSweepProgress(40);
    void runSweep()
      .then(() => {
        window.dispatchEvent(new Event('clauseguard-refresh'));
        setSweepProgress(100);
      })
      .catch(() => setSweepProgress(0))
      .finally(() => setIsSweeping(false));
  };

  const filteredViolations = violations.filter((v) => {
    const matchesSev = severityFilter === 'All' ? true : v.severity === severityFilter;
    const matchesStat = statusFilter === 'All' ? true : v.status === statusFilter;
    return matchesSev && matchesStat;
  });

  const criticalCount = violations.filter(v => v.severity === 'Critical').length;
  const majorCount = violations.filter(v => v.severity === 'Major').length;
  const minorCount = violations.filter(v => v.severity === 'Minor').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Batch Compliance Sweep</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Audit entire contract portfolios against corporate policy rulesets to flag and remediate compliance variances.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Ruleset Select */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-zinc-200/80 shadow-xs text-xs font-semibold text-zinc-800">
            <span className="text-zinc-500 font-medium">Ruleset:</span>
            <select
              value={selectedRuleset}
              onChange={(e) => setSelectedRuleset(e.target.value)}
              className="bg-transparent outline-none cursor-pointer pr-1"
            >
              <option value="Enterprise Risk Standard v3.4 (2026)">Enterprise Risk Standard v3.4 (2026)</option>
              <option value="Commercial Operations Standard v2.1">Commercial Operations v2.1</option>
              <option value="InfoSec Vendor Security Standard v4.0">InfoSec Vendor Security v4.0</option>
            </select>
          </div>

          <button
            onClick={handleRunSweep}
            disabled={isSweeping}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            {isSweeping ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sweeping ({sweepProgress}%)...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Batch Sweep</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Stats Cards - matching OptiFlow style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Contracts Audited</div>
          <div className="text-2xl font-bold text-zinc-950 font-mono">128</div>
          <div className="text-xs text-emerald-600 font-semibold">100% portfolio sweep</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Critical Violations</div>
          <div className="text-2xl font-bold text-rose-600 font-mono">{criticalCount}</div>
          <div className="text-xs text-rose-500 font-medium">Requires immediate amendment</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Major Variances</div>
          <div className="text-2xl font-bold text-amber-600 font-mono">{majorCount}</div>
          <div className="text-xs text-amber-600 font-medium">Super-cap & liability gaps</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Minor Notes</div>
          <div className="text-2xl font-bold text-zinc-700 font-mono">{minorCount}</div>
          <div className="text-xs text-zinc-500 font-medium">Renewal window notes</div>
        </div>
      </div>

      {/* Violations Report Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-zinc-200/60 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider mr-1">Severity:</span>
            <div className="flex items-center p-1 bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-600">
              {(['All', 'Critical', 'Major', 'Minor'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    severityFilter === sev
                      ? 'bg-white text-zinc-950 shadow-xs font-bold'
                      : 'hover:text-zinc-950'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            <span className="text-zinc-300 mx-1 hidden sm:inline">|</span>

            <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider mr-1">Status:</span>
            <div className="flex items-center p-1 bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-600">
              {(['All', 'Open', 'Under Review', 'Remediated', 'Waived'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    statusFilter === st
                      ? 'bg-white text-zinc-950 shadow-xs font-bold'
                      : 'hover:text-zinc-950'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => alert('Exporting signed compliance audit bundle (CSV + SHA256 Hashes)...')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-zinc-600" />
            <span>Export Audit Bundle</span>
          </button>
        </div>

        {/* Violations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-[#FAF9F6] text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">Contract / Counterparty</th>
                <th className="py-3 px-4">Policy Rule Violated</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4">Variance Summary</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredViolations.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => setActiveViolationDetail(v)}
                  className={`hover:bg-zinc-50/80 transition-colors cursor-pointer ${
                    activeViolationDetail?.id === v.id ? 'bg-[#F9F8F5]' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-zinc-900 truncate max-w-xs">{v.contractName}</div>
                    <div className="text-[11px] text-zinc-500 font-medium">{v.counterparty}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-zinc-900">{v.ruleTitle}</div>
                    <div className="text-[10px] font-mono text-zinc-400">{v.ruleId}</div>
                  </td>
                  <td className="py-3 px-4">
                    {v.severity === 'Critical' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                        <XCircle className="w-3 h-3" /> Critical
                      </span>
                    )}
                    {v.severity === 'Major' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                        <AlertTriangle className="w-3 h-3" /> Major
                      </span>
                    )}
                    {v.severity === 'Minor' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold text-[11px] border border-zinc-200">
                        <Info className="w-3 h-3" /> Minor
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-700 font-medium">{v.sectionRef}</td>
                  <td className="py-3 px-4 text-zinc-700 max-w-sm truncate font-medium">
                    {v.varianceDescription}
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={v.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdateViolationStatus(v.id, e.target.value as any)}
                      className="bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-900 outline-none cursor-pointer"
                    >
                      <option value="Open">Open</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Remediated">Remediated</option>
                      <option value="Waived">Waived</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveViolationDetail(v);
                      }}
                      className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl text-xs font-bold transition-colors"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remediation Plan Drawer */}
      {activeViolationDetail && (
        <div className="p-6 bg-white border border-zinc-200/60 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Violation Remediation Plan: {activeViolationDetail.id}
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-zinc-600">{activeViolationDetail.contractName}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1.5">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Detected Clause Excerpt:</span>
              <p className="font-mono text-zinc-800 text-xs leading-relaxed">
                "{activeViolationDetail.detectedClause}"
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1.5">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Policy Requirement:</span>
              <p className="text-zinc-800 text-xs leading-relaxed font-sans font-medium">
                {activeViolationDetail.policyRequirement}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-zinc-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-zinc-900">Remediation Suggestion: </span>
              <span className="text-zinc-700 font-medium">{activeViolationDetail.remediationSuggestion}</span>
            </div>
            <button
              onClick={() => onUpdateViolationStatus(activeViolationDetail.id, 'Remediated')}
              className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
            >
              Mark Remediated
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
