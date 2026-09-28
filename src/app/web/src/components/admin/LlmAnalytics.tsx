import React from 'react';
import { 
  Coins, 
  Clock, 
  Database, 
  TrendingUp, 
  Layers
} from 'lucide-react';
import { LLMCallMetric } from '../../types';

interface LlmAnalyticsProps {
  metrics: LLMCallMetric[];
}

export const LlmAnalytics: React.FC<LlmAnalyticsProps> = ({ metrics }) => {
  const totalCalls = metrics.reduce((acc, m) => acc + m.callsCount, 0);
  const totalSpend = metrics.reduce((acc, m) => acc + m.totalCostUsd, 0);
  const totalTokens = metrics.reduce((acc, m) => acc + m.promptTokens + m.completionTokens, 0);
  const avgCostPerQuery = totalSpend / (totalCalls || 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">LLM Call Analytics & Cost Governance</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Track token usage, cost per query, latency percentiles, and per-tenant resource utilization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-600 bg-white px-3 py-1.5 rounded-full border border-zinc-200/80 shadow-xs">
            Billing Period: September 2026
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-600" />
            <span>Avg Cost / Query</span>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-950">
            ${avgCostPerQuery.toFixed(4)}
          </div>
          <div className="text-xs text-emerald-600 font-semibold">-14% vs Gemini 1.0</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-600" />
            <span>Total MTD Spend</span>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-950">
            ${totalSpend.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-500 font-medium">Budget: $2,500/mo</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Total Tokens</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {(totalTokens / 1000000).toFixed(2)}M
          </div>
          <div className="text-xs text-zinc-500 font-medium">85% Prompt · 15% Comp</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-600" />
            <span>Latency (p50 / p95)</span>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-950">
            760ms / 1.4s
          </div>
          <div className="text-xs text-emerald-600 font-semibold">SLA &lt; 2.0s</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-purple-600" />
            <span>Cache Hit Rate</span>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-700">
            44.8%
          </div>
          <div className="text-xs text-purple-600 font-medium">Redis Semantic KV</div>
        </div>
      </div>

      {/* Hourly Throughput Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-zinc-200/60 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-zinc-900 uppercase tracking-wider">Hourly Query Throughput & Cost Profile</span>
          <span className="font-mono text-zinc-400">24-hour moving window</span>
        </div>

        <div className="grid grid-cols-12 gap-2 h-28 items-end pt-4 border-b border-zinc-100 pb-2">
          {[42, 68, 85, 34, 92, 110, 140, 125, 98, 76, 112, 134].map((val, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 group relative">
              <div 
                className="w-full bg-zinc-900 hover:bg-zinc-700 rounded-t-lg transition-all"
                style={{ height: `${(val / 150) * 100}%` }}
              />
              <span className="text-[9px] font-mono text-zinc-400">{idx * 2}h</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
          <span>Peak load at 14:00 UTC (140 queries/hr)</span>
          <span className="text-emerald-700 font-bold font-mono">0 error rate across all calls</span>
        </div>
      </div>

      {/* Per-Tenant Breakdown */}
      <div className="bg-white rounded-2xl shadow-xs border border-zinc-200/60 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-white text-xs">
          <span className="font-bold text-zinc-900 uppercase tracking-wider">Per-Tenant Multi-Tenant Usage & Billing</span>
          <span className="text-xs text-zinc-400 font-medium">3 active enterprise tenants</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-[#FAF9F6] text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">Tenant Name & ID</th>
                <th className="py-3 px-4 text-right">Inference Calls</th>
                <th className="py-3 px-4 text-right">Prompt Tokens</th>
                <th className="py-3 px-4 text-right">Completion Tokens</th>
                <th className="py-3 px-4 text-right">Cache Hit %</th>
                <th className="py-3 px-4 text-right">Avg Latency</th>
                <th className="py-3 px-4 text-right">MTD Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
              {metrics.map((m) => (
                <tr key={m.tenantId} className="hover:bg-zinc-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-sans font-bold text-zinc-900">{m.tenantName}</div>
                    <div className="text-[10px] text-zinc-400">{m.tenantId}</div>
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-700 font-medium">
                    {m.callsCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-500">
                    {(m.promptTokens / 1000).toLocaleString()}k
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-500">
                    {(m.completionTokens / 1000).toLocaleString()}k
                  </td>
                  <td className="py-3 px-4 text-right text-purple-700 font-bold">
                    {m.cacheHitRate.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-700">
                    {m.avgLatencyMs}ms
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">
                    ${m.totalCostUsd.toFixed(2)}
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
