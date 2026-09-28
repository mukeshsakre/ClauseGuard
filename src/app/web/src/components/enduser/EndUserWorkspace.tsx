import React, { useState } from 'react';
import { 
  UploadCloud, 
  HelpCircle, 
  FileCheck2, 
  ShieldAlert, 
  BookOpen, 
  CheckCircle,
  LayoutDashboard
} from 'lucide-react';
import { 
  EndUserTab, 
  ContractDocument, 
  QuestionVerdict, 
  SweepViolation, 
  PolicyRule 
} from '../../types';
import { ExecutiveOverview } from '../dashboard/ExecutiveOverview';
import { ContractUploadIngestion } from './ContractUploadIngestion';
import { AskQuestion } from './AskQuestion';
import { AnswerView } from './AnswerView';
import { BatchSweep } from './BatchSweep';
import { PolicyRulesetViewer } from './PolicyRulesetViewer';

interface EndUserWorkspaceProps {
  contracts: ContractDocument[];
  onAddContract: (contract: ContractDocument) => void;
  activeVerdict: QuestionVerdict;
  onRunQuery: (query: string, scope: 'single' | 'portfolio', contractId?: string) => void;
  isEvaluating: boolean;
  violations: SweepViolation[];
  onUpdateViolationStatus: (id: string, status: SweepViolation['status']) => void;
  rulesets: PolicyRule[];
  activeTab?: EndUserTab;
  onSelectTab?: (tab: EndUserTab) => void;
}

export const EndUserWorkspace: React.FC<EndUserWorkspaceProps> = ({
  contracts,
  onAddContract,
  activeVerdict,
  onRunQuery,
  isEvaluating,
  violations,
  onUpdateViolationStatus,
  rulesets,
  activeTab: controlledActiveTab,
  onSelectTab
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<EndUserTab>(controlledActiveTab || 'overview');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const setActiveTab = (tab: EndUserTab) => {
    setInternalActiveTab(tab);
    onSelectTab?.(tab);
  };
  const [preselectedContractId, setPreselectedContractId] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUploadSimulate = (fileName: string) => {
    const newDoc: ContractDocument = {
      id: `CTR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      name: fileName.replace('.pdf', ''),
      counterparty: fileName.split('_')[0] || 'Enterprise Vendor',
      category: 'Master Services',
      status: 'indexed',
      uploadDate: new Date().toISOString().split('T')[0],
      size: '2.4 MB',
      pageCount: 36,
      chunkCount: 144,
      extractedClausesCount: 82,
      riskScore: 'Low',
      governingLaw: 'Delaware, USA',
      effectiveDate: '2026-07-01',
      expiryDate: '2029-06-30',
      hash: `sha256:${Math.random().toString(16).substring(2, 34)}`
    };
    onAddContract(newDoc);
    showToast(`Indexed "${newDoc.name}" into vector collection.`);
  };

  const handleContractSelectForQuery = (contractId: string) => {
    setPreselectedContractId(contractId);
    setActiveTab('ask_question');
  };

  const handleExecuteQuery = (query: string, scope: 'single' | 'portfolio', contractId?: string) => {
    onRunQuery(query, scope, contractId);
    setActiveTab('answer_view');
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-65px)] bg-[#F5F4F0]">
      {/* Sub-navigation bar with clean pill tab buttons */}
      <div className="bg-[#F5F4F0] border-b border-zinc-200/80 px-6 py-2">
        <div className="max-w-[1520px] mx-auto flex items-center justify-between overflow-x-auto gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-white/80 rounded-2xl border border-zinc-200/80 shadow-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('upload_ingestion')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'upload_ingestion'
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>1. Upload & Ingestion</span>
            </button>

            <button
              onClick={() => setActiveTab('ask_question')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'ask_question'
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>2. Ask-a-Question</span>
            </button>

            <button
              onClick={() => setActiveTab('answer_view')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'answer_view'
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>3. Answer View</span>
            </button>

            <button
              onClick={() => setActiveTab('batch_sweep')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'batch_sweep'
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>4. Batch Sweep</span>
            </button>

            <button
              onClick={() => setActiveTab('policy_rulesets')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'policy_rulesets'
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>5. Policy Rulesets</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Partition: TEN-ACME-01</span>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-16 right-6 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-fade-in border border-zinc-800">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-[1520px] w-full mx-auto">
        {activeTab === 'overview' && (
          <ExecutiveOverview
            onNavigateTab={(tab) => setActiveTab(tab)}
            contractsCount={contracts.length}
            violationsCount={violations.length}
          />
        )}

        {activeTab === 'upload_ingestion' && (
          <ContractUploadIngestion
            contracts={contracts}
            onUploadSimulate={handleUploadSimulate}
            onSelectContractToQuery={handleContractSelectForQuery}
          />
        )}

        {activeTab === 'ask_question' && (
          <AskQuestion
            contracts={contracts}
            selectedContractId={preselectedContractId}
            onExecuteQuery={handleExecuteQuery}
            isEvaluating={isEvaluating}
          />
        )}

        {activeTab === 'answer_view' && (
          <AnswerView
            verdictData={activeVerdict}
            onBackToQuery={() => setActiveTab('ask_question')}
            onOpenContractDoc={(cid) => {
              setPreselectedContractId(cid);
              setActiveTab('upload_ingestion');
            }}
          />
        )}

        {activeTab === 'batch_sweep' && (
          <BatchSweep
            violations={violations}
            rulesets={rulesets}
            onUpdateViolationStatus={onUpdateViolationStatus}
          />
        )}

        {activeTab === 'policy_rulesets' && (
          <PolicyRulesetViewer rules={rulesets} />
        )}
      </main>
    </div>
  );
};
