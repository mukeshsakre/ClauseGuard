import React, { useState } from 'react';
import { 
  Sliders, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Zap, 
  Search
} from 'lucide-react';
import { ComponentTunables } from '../../types';

interface ComponentSettingsProps {
  initialTunables: ComponentTunables;
  onSaveTunables: (tunables: ComponentTunables) => void;
}

export const ComponentSettings: React.FC<ComponentSettingsProps> = ({
  initialTunables,
  onSaveTunables
}) => {
  const [tunables, setTunables] = useState<ComponentTunables>({ ...initialTunables });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTunables(tunables);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    setTunables({ ...initialTunables });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">RAG Component Tunables</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Hot-reload vector top-k, sparse/dense fusion weights, reranker cutoff, and semantic cache TTL without redeploying.
          </p>
        </div>

        <div>
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Hot-reloaded across 8 workers
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Retrieval & Fusion Parameters */}
        <div className="p-6 bg-white rounded-2xl shadow-xs border border-zinc-200/60 space-y-5">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-wider pb-3 border-b border-zinc-100">
            <Search className="w-4 h-4 text-zinc-500" />
            <span>Hybrid Search & Retrieval Tunables</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Top-K */}
            <div className="space-y-2 bg-zinc-50 p-4 rounded-xl border border-zinc-200/60">
              <div className="flex items-center justify-between">
                <label className="font-bold text-zinc-900">Retrieval Top-K Candidates</label>
                <span className="font-mono text-zinc-950 font-bold text-sm">{tunables.retrievalTopK}</span>
              </div>
              <input
                type="range"
                min="4"
                max="50"
                step="1"
                value={tunables.retrievalTopK}
                onChange={(e) => setTunables({ ...tunables, retrievalTopK: parseInt(e.target.value) })}
                className="w-full accent-zinc-900 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500 font-medium">
                Initial candidate chunks fetched from Qdrant before reranking.
              </p>
            </div>

            {/* Fusion Weight */}
            <div className="space-y-2 bg-zinc-50 p-4 rounded-xl border border-zinc-200/60">
              <div className="flex items-center justify-between">
                <label className="font-bold text-zinc-900">Dense vs BM25 Alpha</label>
                <span className="font-mono text-emerald-700 font-bold text-sm">
                  {(tunables.denseWeight * 100).toFixed(0)}% / {((1 - tunables.denseWeight) * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={tunables.denseWeight}
                onChange={(e) => setTunables({ ...tunables, denseWeight: parseFloat(e.target.value) })}
                className="w-full accent-zinc-900 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500 font-medium">
                High dense weight favors semantics; high BM25 favors exact keywords.
              </p>
            </div>

            {/* Reranker Cutoff */}
            <div className="space-y-2 bg-zinc-50 p-4 rounded-xl border border-zinc-200/60">
              <div className="flex items-center justify-between">
                <label className="font-bold text-zinc-900">Reranker Score Cutoff (BGE-Large)</label>
                <span className="font-mono text-zinc-950 font-bold text-sm">{tunables.rerankScoreThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="0.95"
                step="0.05"
                value={tunables.rerankScoreThreshold}
                onChange={(e) => setTunables({ ...tunables, rerankScoreThreshold: parseFloat(e.target.value) })}
                className="w-full accent-zinc-900 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500 font-medium">
                Minimum cross-attention score required to insert a chunk into prompt.
              </p>
            </div>

            {/* Cache TTL */}
            <div className="space-y-2 bg-zinc-50 p-4 rounded-xl border border-zinc-200/60">
              <div className="flex items-center justify-between">
                <label className="font-bold text-zinc-900">Redis Cache TTL</label>
                <span className="font-mono text-purple-700 font-bold text-sm">{tunables.cacheTtlSeconds}s</span>
              </div>
              <input
                type="range"
                min="300"
                max="86400"
                step="300"
                value={tunables.cacheTtlSeconds}
                onChange={(e) => setTunables({ ...tunables, cacheTtlSeconds: parseInt(e.target.value) })}
                className="w-full accent-zinc-900 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500 font-medium">
                Time-to-live for identical question semantic caches.
              </p>
            </div>
          </div>
        </div>

        {/* Inference Hyperparameters */}
        <div className="p-6 bg-white rounded-2xl shadow-xs border border-zinc-200/60 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-wider pb-3 border-b border-zinc-100">
            <Zap className="w-4 h-4 text-amber-600" />
            <span>Inference Hyperparameters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="space-y-2 bg-zinc-50 p-4 rounded-xl border border-zinc-200/60">
              <div className="flex items-center justify-between">
                <label className="font-bold text-zinc-900">Temperature (Determinism)</label>
                <span className="font-mono text-zinc-950 font-bold text-sm">{tunables.temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.5"
                step="0.05"
                value={tunables.temperature}
                onChange={(e) => setTunables({ ...tunables, temperature: parseFloat(e.target.value) })}
                className="w-full accent-zinc-900 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500 font-medium">
                0.0 produces mathematically reproducible legal answers.
              </p>
            </div>

            <div className="space-y-2 bg-zinc-50 p-4 rounded-xl border border-zinc-200/60">
              <div className="flex items-center justify-between">
                <label className="font-bold text-zinc-900">Max Context Window Tokens</label>
                <span className="font-mono text-zinc-950 font-bold text-sm">
                  {(tunables.maxContextTokens / 1000).toFixed(0)}k tokens
                </span>
              </div>
              <input
                type="range"
                min="8000"
                max="128000"
                step="8000"
                value={tunables.maxContextTokens}
                onChange={(e) => setTunables({ ...tunables, maxContextTokens: parseInt(e.target.value) })}
                className="w-full accent-zinc-900 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500 font-medium">
                Caps payload passed into Gemini-1.5-Pro / Claude context buffer.
              </p>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-800 cursor-pointer hover:bg-zinc-100 transition-colors">
              <input
                type="checkbox"
                checked={tunables.enableHybridSearch}
                onChange={(e) => setTunables({ ...tunables, enableHybridSearch: e.target.checked })}
                className="accent-zinc-900 rounded"
              />
              <span>Reciprocal Rank Fusion</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-800 cursor-pointer hover:bg-zinc-100 transition-colors">
              <input
                type="checkbox"
                checked={tunables.enableExactPhraseBoost}
                onChange={(e) => setTunables({ ...tunables, enableExactPhraseBoost: e.target.checked })}
                className="accent-zinc-900 rounded"
              />
              <span>Exact Clause Boost (+25%)</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-800 cursor-pointer hover:bg-zinc-100 transition-colors">
              <input
                type="checkbox"
                checked={tunables.strictGroundingEnforcement}
                onChange={(e) => setTunables({ ...tunables, strictGroundingEnforcement: e.target.checked })}
                className="accent-zinc-900 rounded"
              />
              <span>Strict Grounding Enforcer</span>
            </label>
          </div>
        </div>

        {/* Live Config Preview */}
        <div className="p-4 bg-zinc-900 text-white rounded-2xl shadow-xs font-mono text-xs">
          <div className="text-[10px] uppercase font-bold text-zinc-400 mb-2">Live Hot-Reload Configuration Preview</div>
          <pre className="text-zinc-300 overflow-x-auto">{JSON.stringify(tunables, null, 2)}</pre>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Deploy & Hot-Reload Config</span>
          </button>
        </div>
      </form>
    </div>
  );
};
