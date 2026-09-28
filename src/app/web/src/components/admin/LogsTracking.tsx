import React, { useState } from 'react';
import { 
  Terminal, 
  Search, 
  Code, 
  Copy,
  Check
} from 'lucide-react';
import { SystemLog } from '../../types';

function formatMetadata(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

interface LogsTrackingProps {
  logs: SystemLog[];
}

export const LogsTracking: React.FC<LogsTrackingProps> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'FATAL' | 'ERROR' | 'WARN' | 'INFO'>('ALL');
  const [componentFilter, setComponentFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  const components = ['ALL', 'LLM-Gateway', 'GuardrailEngine', 'VectorDB-Qdrant', 'IngestionWorker', 'AuthFilter'];

  const filteredLogs = logs.filter((l) => {
    const matchesSev = severityFilter === 'ALL' ? true : l.severity === severityFilter;
    const matchesComp = componentFilter === 'ALL' ? true : l.component === componentFilter;
    const matchesSearch = l.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.traceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.tenantId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSev && matchesComp && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Structured Logs & Tracing</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Query distributed telemetry, gateway latency breakdowns, and vector boundary assertions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-600 bg-white px-3 py-1.5 rounded-full border border-zinc-200/80 shadow-xs">
            {logs.length} stored events
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-zinc-200/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-600">
            {(['ALL', 'ERROR', 'WARN', 'INFO'] as const).map((sev) => (
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

          <select
            value={componentFilter}
            onChange={(e) => setComponentFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-800 font-semibold outline-none cursor-pointer"
          >
            {components.map((c) => (
              <option key={c} value={c}>
                {c === 'ALL' ? 'All Components' : c}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search trace ID, query, tenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white w-64 transition-all font-medium"
          />
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-zinc-200/60 overflow-hidden font-mono text-[11px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-[#FAF9F6] text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Component</th>
                <th className="py-3 px-4">Message</th>
                <th className="py-3 px-4">Trace ID</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-zinc-500 font-sans">
                    No log events for this tenant.
                  </td>
                </tr>
              )}
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`hover:bg-zinc-50/80 transition-colors cursor-pointer ${
                    selectedLog?.id === log.id ? 'bg-[#F9F8F5]' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.severity === 'ERROR' || log.severity === 'FATAL' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      log.severity === 'WARN' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-800 font-sans font-bold">{log.component}</td>
                  <td className="py-3 px-4 text-zinc-700 font-sans truncate max-w-md font-medium">{log.message}</td>
                  <td className="py-3 px-4 text-zinc-400">{log.traceId}</td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-zinc-600 hover:text-zinc-950 font-sans text-xs font-bold">
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Metadata Modal */}
      {selectedLog && (
        <div className="p-5 bg-white border border-zinc-200/80 rounded-2xl shadow-xs space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-zinc-600" />
              <span className="font-bold text-zinc-900 uppercase tracking-wider">
                Telemetry Log Payload: {selectedLog.id} ({selectedLog.traceId})
              </span>
            </div>
            <button onClick={() => setSelectedLog(null)} className="text-zinc-400 hover:text-zinc-900 font-bold">✕ Close</button>
          </div>

          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80 font-mono text-[11px] text-zinc-800 overflow-x-auto">
            <pre>{formatMetadata(selectedLog.metadataJson)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
