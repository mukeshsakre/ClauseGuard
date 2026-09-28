import React, { useState } from 'react';
import { 
  Workflow, 
  RotateCw, 
  FileWarning, 
  CheckCircle2, 
  AlertOctagon,
  UploadCloud,
  FileText,
  RefreshCw,
  Search,
  ExternalLink,
  Cpu,
  Layers,
  Check,
  Clock
} from 'lucide-react';
import { IngestionJob, ContractDocument } from '../../types';
import { uploadFile, uploadText } from '../../api/client';

interface IngestionPipelineProps {
  jobs: IngestionJob[];
  onRetryJob: (jobId: string) => void;
  contracts?: ContractDocument[];
  onAddContract?: (doc: ContractDocument) => void;
}

export const IngestionPipeline: React.FC<IngestionPipelineProps> = ({ 
  jobs, 
  onRetryJob,
  contracts = [],
  onAddContract
}) => {
  const [selectedJob, setSelectedJob] = useState<IngestionJob | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'upload_ingest' | 'worker_queue' | 'contracts_registry'>('upload_ingest');

  // Ingestion Upload States
  const [isDragging, setIsDragging] = useState(false);
  const [selectedOcrEngine, setSelectedOcrEngine] = useState('Google Vision OCR v2');
  const [enableAstChunking, setEnableAstChunking] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [searchContract, setSearchContract] = useState('');

  const handleRetry = (id: string) => {
    setRetryingId(id);
    setTimeout(() => {
      onRetryJob(id);
      setRetryingId(null);
    }, 600);
  };

  const finishUpload = (name: string) => {
    setIsProcessing(false);
    setUploadSuccessMessage(`Indexed "${name}". Refresh the contract list from the server.`);
    window.dispatchEvent(new Event('clauseguard-refresh'));
    setTimeout(() => setUploadSuccessMessage(null), 4000);
  };

  const handleUploadFile = async (file: File) => {
    setIsProcessing(true);
    try {
      await uploadFile(file);
      finishUpload(file.name);
    } catch (error) {
      setIsProcessing(false);
      setUploadSuccessMessage(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleSample = async (name: string, text: string) => {
    setIsProcessing(true);
    try {
      await uploadText(name, text);
      finishUpload(name);
    } catch (error) {
      setIsProcessing(false);
      setUploadSuccessMessage(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const filteredContracts = contracts.filter(c => 
    c.name.toLowerCase().includes(searchContract.toLowerCase()) ||
    c.counterparty.toLowerCase().includes(searchContract.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Ingestion Pipeline & Operations</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Administer contract document upload, asynchronous OCR workers, AST parsing, and tenant vector indexing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-zinc-800 bg-white px-3 py-1.5 rounded-full border border-zinc-200/80 shadow-xs">
            Worker Pool: 8 Active Nodes · Redis
          </span>
        </div>
      </div>

      {/* Segmented Sub-Tab Switcher */}
      <div className="flex items-center gap-2 p-1 bg-white rounded-2xl border border-zinc-200/80 shadow-xs w-fit">
        <button
          onClick={() => setActiveSubTab('upload_ingest')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'upload_ingest'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Ingest Contracts</span>
        </button>

        <button
          onClick={() => setActiveSubTab('worker_queue')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'worker_queue'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950'
          }`}
        >
          <Workflow className="w-3.5 h-3.5" />
          <span>Worker Queue ({jobs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('contracts_registry')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'contracts_registry'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Indexed Registry ({contracts.length})</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Queue Depth</div>
          <div className="text-2xl font-bold text-zinc-950 font-mono">14 jobs</div>
          <div className="text-xs text-zinc-500 font-medium">Avg wait: 4.2s</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Ingested (24h)</div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">412 docs</div>
          <div className="text-xs text-emerald-600 font-semibold">99.2% OCR success</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">AST Exceptions</div>
          <div className="text-2xl font-bold text-rose-600 font-mono">2 errors</div>
          <div className="text-xs text-rose-600 font-medium">Quarantined for manual review</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/60 space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">P95 Parse Latency</div>
          <div className="text-2xl font-bold text-zinc-950 font-mono">1.84s</div>
          <div className="text-xs text-zinc-500 font-medium">Chunk size: 512 tokens</div>
        </div>
      </div>

      {/* SUB-VIEW 1: Upload & Ingestion */}
      {activeSubTab === 'upload_ingest' && (
        <div className="space-y-6">
          {uploadSuccessMessage && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccessMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Drag & Drop Upload Zone */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-200/90 p-7 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-zinc-600" />
                Upload Legal Agreement for Ingestion
              </h2>

              <input
                id="contract-file-input"
                type="file"
                accept=".pdf,.docx,.txt,.md"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUploadFile(file);
                }}
              />
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const files = e.dataTransfer.files;
                  if (files.length > 0) void handleUploadFile(files[0]);
                }}
                className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-zinc-950 bg-zinc-50 scale-[0.99]' 
                    : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50/50'
                }`}
                onClick={() => document.getElementById('contract-file-input')?.click()}
              >
                <div className="w-14 h-14 rounded-2xl bg-white border border-zinc-200 shadow-xs flex items-center justify-center mx-auto mb-4">
                  {isProcessing ? (
                    <RefreshCw className="w-6 h-6 text-zinc-950 animate-spin" />
                  ) : (
                    <UploadCloud className="w-6 h-6 text-zinc-700" />
                  )}
                </div>

                <div className="text-sm font-bold text-zinc-900">
                  {isProcessing ? 'Parsing AST structure and generating vector embeddings...' : 'Click to select or drag & drop contracts here'}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Supports PDF, DOCX, TXT · Up to 50MB per file · Auto-OCR & Clause Segmentation
                </p>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-700">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200">PDF</span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200">DOCX</span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200">TXT</span>
                </div>
              </div>

              {/* Sample Upload Quick Action */}
              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-zinc-500">Quick Test Samples:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void handleSample('Security notice sample', 'Vendor shall notify Customer of a security incident within 48 hours.')}
                    className="px-3 py-1 rounded-xl border border-zinc-200 hover:bg-zinc-50 font-semibold text-zinc-700"
                  >
                    + Ingest Salesforce Rider
                  </button>
                  <button
                    onClick={() => void handleSample('Renewal sample', 'The agreement renews for successive 12 month terms unless either party gives notice.')}
                    className="px-3 py-1 rounded-xl border border-zinc-200 hover:bg-zinc-50 font-semibold text-zinc-700"
                  >
                    + Ingest CrowdStrike Exhibit
                  </button>
                </div>
              </div>
            </div>

            {/* Ingestion Settings */}
            <div className="bg-white rounded-3xl border border-zinc-200/90 p-6 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-600" />
                Pipeline Configurations
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1.5">OCR Extraction Engine</label>
                  <select
                    value={selectedOcrEngine}
                    onChange={(e) => setSelectedOcrEngine(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white font-medium text-zinc-800 outline-none"
                  >
                    <option value="Google Vision OCR v2">Google Cloud Vision OCR v2 (Recommended)</option>
                    <option value="PaddleOCR-Legal">PaddleOCR Legal v4 (Local High-Throughput)</option>
                    <option value="Tesseract-v5">Tesseract v5.3 LayoutLM (Fallback)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div>
                    <span className="font-bold text-zinc-900 block">AST Clause Segmentation</span>
                    <span className="text-[11px] text-zinc-500">Detect legal headers & clause hierarchy</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableAstChunking}
                    onChange={(e) => setEnableAstChunking(e.target.checked)}
                    className="w-4 h-4 accent-zinc-950 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500">
                    <span>Dense Embedding Model:</span>
                    <span className="text-zinc-900 font-mono">text-embedding-004</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500">
                    <span>Target Vector Collection:</span>
                    <span className="text-zinc-900 font-mono">qdrant_acme_eu_contracts</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500">
                    <span>Chunk Boundary Token Cap:</span>
                    <span className="text-zinc-900 font-mono">512 Tokens (Overlap 64)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Worker Queue */}
      {activeSubTab === 'worker_queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-xs border border-zinc-200/90 space-y-4">
            <h2 className="text-base font-bold text-zinc-950 flex items-center justify-between">
              <span>Active Async Ingestion Jobs</span>
              <span className="text-xs font-mono text-zinc-400 font-normal">Streaming via WebSocket</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 font-bold">Job ID</th>
                    <th className="py-2.5 font-bold">Document</th>
                    <th className="py-2.5 font-bold">Stage</th>
                    <th className="py-2.5 font-bold">Progress</th>
                    <th className="py-2.5 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                  {jobs.map((job) => (
                    <tr 
                      key={job.id} 
                      onClick={() => setSelectedJob(job)}
                      className={`hover:bg-zinc-50 cursor-pointer transition-colors ${selectedJob?.id === job.id ? 'bg-zinc-50/80' : ''}`}
                    >
                      <td className="py-3 font-mono text-zinc-900 font-bold">{job.id}</td>
                      <td className="py-3 max-w-[200px] truncate text-zinc-900">{job.fileName}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          job.stage === 'Complete' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : job.stage === 'Failed'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {job.stage === 'Failed' && <FileWarning className="w-3 h-3 text-rose-600" />}
                          {job.stage === 'Complete' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {job.stage}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${job.stage === 'Failed' ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-zinc-500 font-mono">{job.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3">
                        {job.stage === 'Failed' ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRetry(job.id); }}
                            disabled={retryingId === job.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 text-white font-semibold text-[11px] hover:bg-zinc-800 disabled:opacity-50"
                          >
                            <RotateCw className={`w-3 h-3 ${retryingId === job.id ? 'animate-spin' : ''}`} />
                            <span>Retry</span>
                          </button>
                        ) : (
                          <span className="text-zinc-400 text-[11px]">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Job Details Drawer */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-zinc-200/90 space-y-4">
            <h3 className="text-sm font-bold text-zinc-950">Job Execution Details</h3>
            {selectedJob ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-1">
                  <div className="text-[11px] font-bold text-zinc-400 uppercase">Document Name</div>
                  <div className="font-bold text-zinc-900">{selectedJob.fileName}</div>
                  <div className="text-[11px] font-mono text-zinc-500">ID: {selectedJob.id}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500">Tenant:</span>
                    <span className="font-bold text-zinc-900">{selectedJob.tenantName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500">Chunks Processed:</span>
                    <span className="font-mono font-bold text-zinc-900">{selectedJob.chunksProcessed} / {selectedJob.totalChunks}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500">Retry Count:</span>
                    <span className="font-mono font-bold text-zinc-900">{selectedJob.retryCount}</span>
                  </div>
                </div>

                {selectedJob.errorMessage && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                    <div className="font-bold flex items-center gap-1.5 text-rose-700">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      Parser Exception
                    </div>
                    <p className="mt-1 font-mono text-[11px] leading-tight text-rose-800">{selectedJob.errorMessage}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-zinc-400 text-xs">
                Select an ingestion job to inspect stack traces and chunking progress.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Contracts Registry */}
      {activeSubTab === 'contracts_registry' && (
        <div className="bg-white rounded-3xl border border-zinc-200/90 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-zinc-950">Active Tenant Ingested Contracts</h2>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search indexed contracts..."
                value={searchContract}
                onChange={(e) => setSearchContract(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 font-bold">Contract ID</th>
                  <th className="py-2.5 font-bold">Agreement Title</th>
                  <th className="py-2.5 font-bold">Counterparty</th>
                  <th className="py-2.5 font-bold">Category</th>
                  <th className="py-2.5 font-bold">Clauses</th>
                  <th className="py-2.5 font-bold">Risk Score</th>
                  <th className="py-2.5 font-bold">Hash Digest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                {filteredContracts.map((doc) => (
                  <tr key={doc.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-3 font-mono text-zinc-900 font-bold">{doc.id}</td>
                    <td className="py-3 font-semibold text-zinc-950">{doc.name}</td>
                    <td className="py-3 text-zinc-600">{doc.counterparty}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[11px] font-semibold">
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-zinc-900">{doc.extractedClausesCount} clauses</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        doc.riskScore === 'Low' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : doc.riskScore === 'Medium'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {doc.riskScore} Risk
                      </span>
                    </td>
                    <td className="py-3 font-mono text-[10px] text-zinc-400 truncate max-w-[120px]" title={doc.hash}>
                      {doc.hash.slice(0, 16)}...
                    </td>
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
