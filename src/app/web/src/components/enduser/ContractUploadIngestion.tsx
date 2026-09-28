import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  RefreshCw, 
  AlertTriangle, 
  Search, 
  ChevronRight, 
  Cpu, 
  SlidersHorizontal,
  FileCheck2,
  ExternalLink
} from 'lucide-react';
import { ContractDocument } from '../../types';

interface ContractUploadProps {
  contracts: ContractDocument[];
  onUploadSimulate: (fileName: string) => void;
  onSelectContractToQuery: (contractId: string) => void;
}

export const ContractUploadIngestion: React.FC<ContractUploadProps> = ({
  contracts,
  onUploadSimulate,
  onSelectContractToQuery
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'indexed' | 'parsing' | 'failed'>('all');
  const [ocrEngine, setOcrEngine] = useState<'cloud-vision' | 'paddle-ocr' | 'tesseract-v5'>('cloud-vision');
  const [isUploading, setIsUploading] = useState(false);
  const [activeDocForDetail, setActiveDocForDetail] = useState<ContractDocument | null>(contracts[0] || null);

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.counterparty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' ? true : c.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const handleSimulateDrop = (presetName?: string) => {
    setIsUploading(true);
    const fileName = presetName || `Enterprise_Cloud_SLA_${Math.floor(1000 + Math.random() * 9000)}.pdf`;
    setTimeout(() => {
      onUploadSimulate(fileName);
      setIsUploading(false);
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Contract Upload & Ingestion</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            OCR parsing, clause segmentation (AST), vector embedding (text-embedding-004), and tamper-evident SHA-256 verification.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Engine Selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-zinc-200/80 shadow-xs text-xs">
            <Cpu className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-500 text-[11px] font-medium">Engine:</span>
            <select
              value={ocrEngine}
              onChange={(e) => setOcrEngine(e.target.value as any)}
              className="bg-transparent font-semibold text-zinc-800 outline-none cursor-pointer"
            >
              <option value="cloud-vision">Google Vision OCR</option>
              <option value="paddle-ocr">PaddleOCR v4</option>
              <option value="tesseract-v5">Tesseract v5 Local</option>
            </select>
          </div>

          <button
            onClick={() => handleSimulateDrop()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            <UploadCloud className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
            <span>{isUploading ? 'Ingesting Document...' : 'Upload Contract'}</span>
          </button>
        </div>
      </div>

      {/* Upload Zone & Pipeline Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Upload Dropzone */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-xs border border-zinc-200/60 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Document Dropzone</span>
              <span className="text-[11px] text-zinc-400">PDF, DOCX up to 50MB</span>
            </div>

            <div
              onClick={() => handleSimulateDrop('AWS_Master_Enterprise_Addendum.pdf')}
              className="border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#FAF9F6] group"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#E2EBE1] text-[#2C5234] flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-zinc-800">Click to upload or drag files here</p>
              <p className="text-[11px] text-zinc-500 mt-1">Automatic clause AST segmentation & vector indexing</p>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="pt-3 border-t border-zinc-100">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Quick Ingest Samples:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleSimulateDrop('Microsoft_Enterprise_EA_2026.pdf')}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-[11px] font-medium text-zinc-800 transition-colors"
              >
                + Microsoft EA Security
              </button>
              <button
                type="button"
                onClick={() => handleSimulateDrop('Salesforce_Hyperforce_DPA.pdf')}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-[11px] font-medium text-zinc-800 transition-colors"
              >
                + Salesforce DPA
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Ingestion Stepper */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 shadow-xs border border-zinc-200/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Multi-Stage Ingestion Pipeline</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Workers Active (8/8)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { stage: '1. Ingestion', desc: 'SHA-256 & OCR extract', status: 'done', metric: '100%' },
                { stage: '2. Normalization', desc: 'Headers & clean tables', status: 'done', metric: '100%' },
                { stage: '3. AST Chunking', desc: 'Clause hierarchy splits', status: 'done', metric: '512t max' },
                { stage: '4. Embeddings', desc: 'text-embedding-004', status: 'done', metric: '768d' },
                { stage: '5. Verification', desc: 'Grounding graph sync', status: 'active', metric: 'Ready' }
              ].map((st, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#FAF9F6] border border-zinc-200/60 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900">{st.stage}</span>
                      {st.status === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 text-zinc-600 animate-spin" />
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight mt-1">{st.desc}</p>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-zinc-700 text-right">
                    {st.metric}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Job Bar */}
          <div className="mt-4 p-3 bg-zinc-50 rounded-xl border border-zinc-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-zinc-700 shrink-0" />
              <span className="font-medium text-zinc-600">Active worker:</span>
              <span className="font-bold text-zinc-900 truncate max-w-xs">Twilio Segment Customer Data Retention Rider.pdf</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-28 bg-zinc-200 rounded-full h-2 overflow-hidden">
                <div className="bg-zinc-900 h-2 rounded-full w-[68%]" />
              </div>
              <span className="font-mono text-zinc-900 font-bold text-xs">68%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ingested Contracts Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-zinc-200/60 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search contract, counterparty, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white w-64 transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center p-1 bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-600">
              {(['all', 'indexed', 'parsing', 'failed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1 rounded-lg uppercase text-[10px] tracking-wider transition-all ${
                    selectedFilter === filter
                      ? 'bg-white text-zinc-950 shadow-xs font-bold'
                      : 'hover:text-zinc-950'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs font-medium text-zinc-500">
            Showing <span className="font-bold text-zinc-900">{filteredContracts.length}</span> of {contracts.length} contracts
          </div>
        </div>

        {/* Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-[#FAF9F6] text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">Contract / Title</th>
                <th className="py-3 px-4">Counterparty</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Pages / Chunks</th>
                <th className="py-3 px-4">Governing Law</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredContracts.map((contract) => (
                <tr
                  key={contract.id}
                  onClick={() => setActiveDocForDetail(contract)}
                  className={`hover:bg-zinc-50/80 transition-colors cursor-pointer ${
                    activeDocForDetail?.id === contract.id ? 'bg-[#F9F8F5]' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900 truncate max-w-xs">{contract.name}</div>
                        <div className="text-[10px] font-mono text-zinc-400">{contract.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-zinc-800">{contract.counterparty}</td>
                  <td className="py-3 px-4 text-zinc-600 font-medium">{contract.category}</td>
                  <td className="py-3 px-4">
                    {contract.status === 'indexed' && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Indexed
                      </span>
                    )}
                    {contract.status === 'parsing' && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold text-[11px] border border-amber-200">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Ingesting
                      </span>
                    )}
                    {contract.status === 'failed' && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold text-[11px] border border-rose-200">
                        <AlertTriangle className="w-3 h-3" /> Error
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-zinc-700 font-medium">
                    {contract.pageCount}p · {contract.chunkCount}c
                  </td>
                  <td className="py-3 px-4 text-zinc-600 text-[11px] truncate max-w-[130px]">
                    {contract.governingLaw}
                  </td>
                  <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                    {contract.uploadDate}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectContractToQuery(contract.id);
                      }}
                      className="px-3 py-1 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-colors"
                    >
                      Ask Question
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Contract Inspection Drawer */}
      {activeDocForDetail && (
        <div className="p-5 bg-white border border-zinc-200/60 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Selected Contract:</span>
              <span className="font-bold text-zinc-900 text-sm">{activeDocForDetail.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 font-mono">
              <span>SHA-256: <span className="text-zinc-800 font-semibold">{activeDocForDetail.hash.slice(0, 24)}...</span></span>
              <span>·</span>
              <span>Clauses Extracted: <span className="text-emerald-600 font-bold">{activeDocForDetail.extractedClausesCount}</span></span>
              <span>·</span>
              <span>Effective: <span className="text-zinc-800">{activeDocForDetail.effectiveDate}</span></span>
              <span>·</span>
              <span>Expiry: <span className="text-zinc-800">{activeDocForDetail.expiryDate}</span></span>
            </div>
          </div>

          <button
            onClick={() => onSelectContractToQuery(activeDocForDetail.id)}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl text-xs font-bold transition-colors shrink-0"
          >
            <span>Query Document</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
