import React, { useState } from 'react';
import { 
  AdminTab,
  ModelConfig,
  IngestionJob,
  SystemLog,
  LLMCallMetric,
  GuardrailRule,
  GuardrailViolationLog,
  ComponentTunables,
  UserAccount,
  AuditEntry,
  ContractDocument
} from '../../types';
import { ModelManagement } from './ModelManagement';
import { IngestionPipeline } from './IngestionPipeline';
import { LogsTracking } from './LogsTracking';
import { LlmAnalytics } from './LlmAnalytics';
import { GuardrailSettings } from './GuardrailSettings';
import { ComponentSettings } from './ComponentSettings';
import { UserTenantManagement } from './UserTenantManagement';
import { AuditTrail } from './AuditTrail';
import { 
  Cpu, 
  Workflow, 
  Terminal, 
  BarChart3, 
  ShieldAlert, 
  Sliders, 
  Users, 
  FileCheck2,
  CheckCircle2
} from 'lucide-react';

interface AdminConsoleProps {
  models: ModelConfig[];
  onSwapModel: (modelId: string) => void;
  onRollback: (modelId: string) => void;
  jobs: IngestionJob[];
  onRetryJob: (jobId: string) => void;
  logs: SystemLog[];
  metrics: LLMCallMetric[];
  guardrails: GuardrailRule[];
  guardrailViolations: GuardrailViolationLog[];
  onToggleGuardrail: (id: string) => void;
  onUpdateGuardrailThreshold: (id: string, threshold: number) => void;
  tunables: ComponentTunables;
  onSaveTunables: (newTunables: ComponentTunables) => void;
  users: UserAccount[];
  selectedTenant: string;
  auditTrail: AuditEntry[];
  contracts?: ContractDocument[];
  onAddContract?: (contract: ContractDocument) => void;
  activeTab?: AdminTab;
  onSelectTab?: (tab: AdminTab) => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  models,
  onSwapModel,
  onRollback,
  jobs,
  onRetryJob,
  logs,
  metrics,
  guardrails,
  guardrailViolations,
  onToggleGuardrail,
  onUpdateGuardrailThreshold,
  tunables,
  onSaveTunables,
  users,
  selectedTenant,
  auditTrail,
  contracts = [],
  onAddContract,
  activeTab: controlledActiveTab,
  onSelectTab
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<AdminTab>(controlledActiveTab || 'model_management');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const setActiveTab = (tab: AdminTab) => {
    setInternalActiveTab(tab);
    onSelectTab?.(tab);
  };

  const navItems = [
    { id: 'model_management' as AdminTab, label: '1. Model Management', icon: Cpu },
    { id: 'ingestion_pipeline' as AdminTab, label: '2. Ingestion Pipeline', icon: Workflow },
    { id: 'logs_errors' as AdminTab, label: '3. Logs & Traces', icon: Terminal },
    { id: 'llm_analytics' as AdminTab, label: '4. LLM Analytics', icon: BarChart3 },
    { id: 'guardrail_settings' as AdminTab, label: '5. Guardrails', icon: ShieldAlert },
    { id: 'component_settings' as AdminTab, label: '6. Component Tunables', icon: Sliders },
    { id: 'user_tenant' as AdminTab, label: '7. Users & Tenants', icon: Users },
    { id: 'audit_trail' as AdminTab, label: '8. Audit Trail', icon: FileCheck2 },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-65px)] bg-[#F5F4F0]">
      {/* Sub-navigation bar with clean pill tab buttons */}
      <div className="bg-[#F5F4F0] border-b border-zinc-200/80 px-6 py-2">
        <div className="max-w-[1520px] mx-auto flex items-center justify-between overflow-x-auto gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-white/80 rounded-2xl border border-zinc-200/80 shadow-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-zinc-950 text-white shadow-xs font-bold'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden xl:flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Gateway Nominal</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-[1520px] w-full mx-auto">
        {activeTab === 'model_management' && (
          <ModelManagement
            models={models}
            onSwapModel={onSwapModel}
            onRollback={onRollback}
          />
        )}

        {activeTab === 'ingestion_pipeline' && (
          <IngestionPipeline
            jobs={jobs}
            onRetryJob={onRetryJob}
            contracts={contracts}
            onAddContract={onAddContract}
          />
        )}

        {activeTab === 'logs_errors' && (
          <LogsTracking logs={logs} />
        )}

        {activeTab === 'llm_analytics' && (
          <LlmAnalytics metrics={metrics} />
        )}

        {activeTab === 'guardrail_settings' && (
          <GuardrailSettings
            rules={guardrails}
            violations={guardrailViolations}
            onToggleRule={onToggleGuardrail}
            onUpdateThreshold={onUpdateGuardrailThreshold}
          />
        )}

        {activeTab === 'component_settings' && (
          <ComponentSettings
            initialTunables={tunables}
            onSaveTunables={onSaveTunables}
          />
        )}

        {activeTab === 'user_tenant' && (
          <UserTenantManagement
            users={users}
            selectedTenant={selectedTenant}
          />
        )}

        {activeTab === 'audit_trail' && (
          <AuditTrail entries={auditTrail} />
        )}
      </main>
    </div>
  );
};
