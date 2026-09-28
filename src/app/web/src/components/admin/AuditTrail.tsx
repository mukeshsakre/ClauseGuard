import React, { useState } from 'react';
import { 
  FileCheck2, 
  Search, 
  Download, 
  CheckCircle2, 
  Copy
} from 'lucide-react';
import { AuditEntry } from '../../types';

interface AuditTrailProps {
  entries: AuditEntry[];
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ entries }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'All' | 'Config' | 'Security' | 'DataAccess' | 'Audit'>('All');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const filteredEntries = entries.filter((e) => {
    const matchesSev = severityFilter === 'All' ? true : e.severity === severityFilter;
    const matchesSearch = e.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.actorEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.targetResource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.digestHash.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSev && matchesSearch;
  });

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Immutable Audit Trail</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Strict append-only regulatory proof satisfying SOX, SOC2 Type II, and GDPR Article 30 accountability mandates.
          </p>
        </div>

        <button
          onClick={() => alert('Exporting cryptographic audit bundle with SHA-256 signatures...')}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Signed Audit Bundle</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-zinc-200/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mr-1">Event Category:</span>
          {(['All', 'Config', 'Security', 'DataAccess', 'Audit'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                severityFilter === sev
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:text-zinc-950'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search actor, action, hash, resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white w-64 transition-all font-medium"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-[#FAF9F6] text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Target Resource / Event Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Origin IP</th>
                <th className="py-3 px-4 text-right">Cryptographic Digest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
              {filteredEntries.map((e) => (
                <tr key={e.id} className="hover:bg-zinc-50/80 transition-colors">
                  <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">{e.timestamp}</td>
                  <td className="py-3 px-4 font-sans">
                    <div className="font-bold text-zinc-900">{e.actorEmail}</div>
                    <div className="text-[10px] text-zinc-400 font-medium">{e.actorRole}</div>
                  </td>
                  <td className="py-3 px-4 font-bold text-zinc-900">{e.action}</td>
                  <td className="py-3 px-4 font-sans text-zinc-700 max-w-sm truncate font-medium">
                    {e.targetResource}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      e.severity === 'Security' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      e.severity === 'Config' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                      e.severity === 'DataAccess' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-zinc-100 text-zinc-700 border border-zinc-200'
                    }`}>
                      {e.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-400">{e.ipAddress}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleCopyHash(e.digestHash)}
                      className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-950 font-medium"
                      title="Click to copy SHA256 digest"
                    >
                      <span className="font-mono">{e.digestHash.slice(0, 10)}...</span>
                      {copiedHash === e.digestHash ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
