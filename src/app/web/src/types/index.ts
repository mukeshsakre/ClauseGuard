export type ViewMode = 'login' | 'enduser' | 'admin' | 'spec_review';

export type NavigationTab = 
  | 'dashboard'
  | 'batch_sweep'
  | 'policy_rulesets'
  | 'admin_operations'
  | 'user_profile'
  | 'spec_review';

export type EndUserTab = 
  | 'overview'
  | 'upload_ingestion'
  | 'ask_question'
  | 'answer_view'
  | 'batch_sweep'
  | 'policy_rulesets';

export interface AttachedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  status: 'ready' | 'processing' | 'error';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  attachedFiles?: AttachedFile[];
  verdict?: QuestionVerdict;
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  updatedAt: string;
  isPinned: boolean;
  scope: 'single' | 'portfolio';
  contractId?: string;
  contractName?: string;
  messages: ChatMessage[];
}

export interface UserProfileInfo {
  name: string;
  email: string;
  role: string;
  userType: string;
  department: string;
  tenantName: string;
  tenantId: string;
  avatarUrl: string;
  accessRights: {
    category: string;
    permissions: { name: string; granted: boolean; description: string }[];
  }[];
  lastLogin: string;
  authProvider: string;
  mfaEnabled: boolean;
  apiKeysCount: number;
}

export type AdminTab =
  | 'model_management'
  | 'ingestion_pipeline'
  | 'logs_errors'
  | 'llm_analytics'
  | 'guardrail_settings'
  | 'component_settings'
  | 'user_tenant'
  | 'audit_trail';

export interface ContractDocument {
  id: string;
  name: string;
  counterparty: string;
  category: 'Master Services' | 'Data Processing (DPA)' | 'SLA / Hosting' | 'Non-Disclosure' | 'Licensing';
  status: 'indexed' | 'parsing' | 'embedding' | 'failed';
  uploadDate: string;
  size: string;
  pageCount: number;
  chunkCount: number;
  extractedClausesCount: number;
  riskScore: 'Low' | 'Medium' | 'High';
  governingLaw: string;
  effectiveDate: string;
  expiryDate: string;
  hash: string;
}

export interface ClauseCitation {
  clauseId: string;
  contractId: string;
  contractName: string;
  sectionNumber: string;
  sectionTitle: string;
  text: string;
  pageNumber: number;
  relevanceScore: number;
  matchType: 'Exact Semantic' | 'Dense Vector' | 'Hybrid BM25';
}

export interface QuestionVerdict {
  id: string;
  query: string;
  scope: 'single' | 'portfolio';
  selectedContractId?: string;
  selectedContractName?: string;
  verdict: 'Compliant' | 'Non-Compliant' | 'Unchecked' | 'Ambiguous' | 'Deviation Flagged';
  confidenceScore: number; // e.g. 96.4
  groundingScore: number; // e.g. 100%
  summary: string;
  keyFindings: string[];
  recommendedAction: string;
  citations: ClauseCitation[];
  timestamp: string;
  evaluatedModel: string;
  latencyMs: number;
  tokensUsed: number;
}

export interface SweepViolation {
  id: string;
  contractId: string;
  contractName: string;
  counterparty: string;
  ruleId: string;
  ruleTitle: string;
  severity: 'Critical' | 'Major' | 'Minor';
  detectedClause: string;
  sectionRef: string;
  policyRequirement: string;
  varianceDescription: string;
  remediationSuggestion: string;
  status: 'Open' | 'Under Review' | 'Remediated' | 'Waived';
}

export interface PolicyRule {
  id: string;
  category: string;
  title: string;
  standardClauseName: string;
  riskLevel: 'Critical' | 'High' | 'Medium';
  mandatoryStandard: string;
  acceptableFallbacks: string[];
  prohibitedTerms: string[];
  applicableJurisdictions: string[];
  activeRuleset: string;
  lastUpdated: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  role: 'Primary Reasoning LLM' | 'Fallback LLM' | 'Dense Embedding' | 'Reranker';
  provider: string;
  version: string;
  contextWindow: string;
  status: 'Active (Production)' | 'Staged (Canary 10%)' | 'Standby' | 'Deprecated';
  latencyP50: number;
  costPer1kTokens: number;
  lastTested: string;
}

export interface IngestionJob {
  id: string;
  fileName: string;
  tenantId: string;
  tenantName: string;
  stage: 'OCR Extraction' | 'AST Chunking' | 'Clause Classification' | 'Vector Indexing' | 'Complete' | 'Failed';
  progress: number;
  chunksProcessed: number;
  totalChunks: number;
  errorMessage?: string;
  startedAt: string;
  durationSec: number;
  retryCount: number;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  severity: 'FATAL' | 'ERROR' | 'WARN' | 'INFO';
  component: 'IngestionWorker' | 'VectorDB-Qdrant' | 'Reranker-BGE' | 'LLM-Gateway' | 'GuardrailEngine' | 'AuthFilter';
  message: string;
  traceId: string;
  tenantId: string;
  metadataJson: string;
}

export interface LLMCallMetric {
  tenantId: string;
  tenantName: string;
  callsCount: number;
  promptTokens: number;
  completionTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  cacheHitRate: number;
}

export interface GuardrailRule {
  id: string;
  name: string;
  type: 'Input Filter' | 'Grounding Verification' | 'Hallucination Block' | 'PII Masking' | 'Legal Jurisdiction Barrier';
  enabled: boolean;
  threshold: number;
  unit: string;
  description: string;
  violations24h: number;
  lastTriggered: string;
}

export interface GuardrailViolationLog {
  id: string;
  timestamp: string;
  queryOrOutputSnippet: string;
  triggeredGuardrail: string;
  tenantName: string;
  actionTaken: 'Blocked & Regenerated' | 'Redacted' | 'Warning Flagged';
  score: number;
}

export interface ComponentTunables {
  retrievalTopK: number;
  denseWeight: number; // 0.0 - 1.0 (BM25 is 1 - denseWeight)
  rerankScoreThreshold: number; // 0.0 - 1.0
  embeddingBatchSize: number;
  cacheTtlSeconds: number;
  maxContextTokens: number;
  temperature: number;
  enableHybridSearch: boolean;
  enableExactPhraseBoost: boolean;
  strictGroundingEnforcement: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'Global Admin' | 'Compliance Officer' | 'Legal Counsel' | 'Auditor (Read-Only)';
  tenantId: string;
  tenantName: string;
  mfaEnabled: boolean;
  lastActive: string;
  status: 'Active' | 'Invited' | 'Suspended';
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetResource: string;
  tenantName: string;
  ipAddress: string;
  digestHash: string;
  severity: 'Audit' | 'Security' | 'Config' | 'DataAccess';
}
