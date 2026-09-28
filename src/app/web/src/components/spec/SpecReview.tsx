import React from 'react';
import { 
  Layers, 
  Terminal, 
  ArrowRight, 
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Workflow,
  BookOpen,
  User,
  Sliders,
  Sparkles
} from 'lucide-react';
import { NavigationTab, AdminTab } from '../../types';

interface SpecReviewProps {
  onNavigateToTab: (tab: NavigationTab, adminSubTab?: AdminTab) => void;
  onNavigateToLogin: () => void;
}

export const SpecReview: React.FC<SpecReviewProps> = ({
  onNavigateToTab,
  onNavigateToLogin
}) => {
  const coreScreens = [
    {
      tabId: 'dashboard' as NavigationTab,
      name: '1. Dashboard (Claude-Style Ask-a-Question & File Chat)',
      goal: 'Conversational legal query interface with chat sessions, file uploads, pinned chats, and grounded legal verdicts.',
      elements: [
        'Left collapsible session sidebar with "Start new analysis" and session search (⌘K)',
        'Pinned chat sessions and categorized chronological recents (Today, Yesterday, Previous 7 Days)',
        'Interactive file attachment support (PDF, DOCX, TXT) directly within user prompts',
        'Scope switch between Single Target Agreement and Entire Portfolio Knowledge Base',
        'Verdict Banner (Compliant / Non-Compliant / Deviation Flagged) with confidence & grounding metrics',
        'Interactive Cited Clause cards with exact section title, contract link, page number, and "Copy Clause"'
      ]
    },
    {
      tabId: 'batch_sweep' as NavigationTab,
      name: '2. Batch Compliance Sweep',
      goal: 'Execute automated compliance audits against the entire contract repository and generate actionable violation remediation reports.',
      elements: [
        'Policy Ruleset selector and automated portfolio sweep trigger with progress monitor',
        'Summary KPI cards (Evaluated Agreements, Critical Violations, Major Variances, Clean Pass %)',
        'Violation audit table with severity flags (Critical, Major, Minor) and status filters',
        'Slide-over remediation plan drawer with clause side-by-side comparison and waiver approvals'
      ]
    },
    {
      tabId: 'policy_rulesets' as NavigationTab,
      name: '3. Policy Ruleset Viewer',
      goal: 'Inspect active legal and compliance standard rulesets, mandatory contract clauses, fallback options, and prohibited redline terms.',
      elements: [
        'Enterprise ruleset catalog with category filters (Liability, Data Privacy, IP, Term & Termination)',
        'Mandatory standard language guidelines with jurisdiction applicability',
        'Acceptable fallback positions for counterparty negotiation',
        'Prohibited redline terms with instant alert highlights'
      ]
    },
    {
      tabId: 'user_profile' as NavigationTab,
      name: '4. User Profile & Access Rights',
      goal: 'Allow authenticated users to review identity credentials, department scope, assigned tenant namespace, and granular RBAC permissions.',
      elements: [
        'User credentials card (Full Name, Corporate Email, Role, Department, User Type)',
        'Tenant namespace isolation status (AES-256 cryptographic segregation)',
        'Granular RBAC permission matrix (Ingestion, Compliance Sweeps, Admin Tunables)',
        'Hardware Multi-Factor Authentication (FIDO2 WebAuthn / Okta Verify status)',
        'API Keys & integration tokens management with copy and revoke controls'
      ]
    }
  ];

  const adminScreens = [
    {
      subTabId: 'model_management' as AdminTab,
      name: '1. Model Management',
      goal: 'Configure active LLM and embedding model slots, evaluate latency/cost metrics, and execute zero-downtime rollbacks.',
      elements: [
        'Primary Reasoning LLM and Dense Embedding active production slots',
        'Model version history and provider configuration (Gemini 1.5 Pro, Claude 3.5 Sonnet, BAA Fine-Tuned)',
        'Canary staging (10%) and instant promotion/rollback controls',
        'Real-time P50 latency and cost per 1k token tracking'
      ]
    },
    {
      subTabId: 'ingestion_pipeline' as AdminTab,
      name: '2. Ingestion Pipeline & Operations',
      goal: 'Manage contract document upload, asynchronous OCR workers, AST chunking queues, and tenant vector registries.',
      elements: [
        'Contract Upload & Ingestion drag-and-drop zone (PDF/DOCX/TXT) with OCR engine selection',
        'Active asynchronous background worker queue with progress bars and Redis broker telemetry',
        'Failed job inspection drawer with AST parser stack trace exception logs',
        'Indexed tenant contracts registry with hash digests, clause counts, and risk scores'
      ]
    },
    {
      subTabId: 'logs_errors' as AdminTab,
      name: '3. Logs & Traces',
      goal: 'Search, filter, and inspect structured system logs across ingestion workers, vector databases, and LLM gateways.',
      elements: [
        'Searchable log stream with regex query support',
        'Severity level pills (FATAL, ERROR, WARN, INFO)',
        'Component filters (IngestionWorker, VectorDB-Qdrant, Reranker-BGE, LLM-Gateway)',
        'Trace ID inspector with JSON metadata formatting and copy capability'
      ]
    },
    {
      subTabId: 'llm_analytics' as AdminTab,
      name: '4. LLM Analytics',
      goal: 'Monitor enterprise LLM token usage, cost per query, latency percentiles, and per-tenant resource consumption.',
      elements: [
        'Aggregate metrics (Total Tokens, Monthly Cost, P95 Latency, Cache Hit Rate %)',
        'Per-tenant resource consumption breakdown table',
        'Token breakdown bars (Prompt vs. Completion vs. Cached Tokens)',
        'Model efficiency cost comparisons'
      ]
    },
    {
      subTabId: 'guardrail_settings' as AdminTab,
      name: '5. Guardrails',
      goal: 'Configure and enforce input/output safety boundaries, citation grounding thresholds, and PII redactions.',
      elements: [
        'Active guardrail policies list with enable/disable toggle switches',
        'Adjustable sensitivity sliders (Citation Grounding, Hallucination Block, PII Masking)',
        '24-hour violation trigger counters',
        'Recent violation audit log with intercepted text snippets and remediation actions'
      ]
    },
    {
      subTabId: 'component_settings' as AdminTab,
      name: '6. Component Tunables',
      goal: 'Dynamically configure RAG retrieval parameters, dense/sparse fusion weights, and cache TTL in runtime.',
      elements: [
        'Retrieval Top-K slider (1 to 50 documents)',
        'Hybrid search dense vs. BM25 weight slider (0% to 100%)',
        'Cross-encoder rerank score cutoff threshold',
        'Cache TTL and maximum context token controls with live JSON diff preview'
      ]
    },
    {
      subTabId: 'user_tenant' as AdminTab,
      name: '7. Users & Tenants',
      goal: 'Oversee enterprise tenant segregation, user roles, security access levels, and cryptographic isolation.',
      elements: [
        'Multi-tenant namespace isolation verification panel',
        'Dedicated vector collection segregation monitor',
        'User roster table with role badges, MFA enforcement, and activity tracking',
        'Add user and tenant switching controls'
      ]
    },
    {
      subTabId: 'audit_trail' as AdminTab,
      name: '8. Audit Trail',
      goal: 'Provide an immutable, tamper-evident log of all user queries, administrative actions, and configuration changes.',
      elements: [
        'Tamper-evident event stream with SHA-256 verification hashes',
        'Actor email, assigned role, client IP address, and timestamp metadata',
        'Severity classification (Security, Config, DataAccess, Audit)',
        'Export audit log as certified CSV memo'
      ]
    }
  ];

  return (
    <div className="max-w-[1520px] mx-auto px-6 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-8 border border-zinc-200/90 shadow-xs">
        <div>
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
            ARCHITECTURAL SPECIFICATION & SYSTEM DESIGN
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mt-1">
            ClauseGuard UI/UX Interface Specification
          </h1>
          <p className="text-sm text-zinc-600 mt-1 max-w-2xl leading-relaxed">
            Comprehensive system layout for the Claude-inspired Ask-a-Question dashboard, batch compliance sweeps, policy rulesets, user profile, and 8 operational admin concerns.
          </p>
        </div>

        <button
          onClick={onNavigateToLogin}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-950 text-white font-semibold text-xs hover:bg-zinc-800 transition-all shadow-xs shrink-0"
        >
          <span>Open Sign In Portal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* SECTION 1: Core User Workspaces */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-zinc-950 text-white shadow-xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-950">End-User Core Workspaces & Dashboard</h2>
            <p className="text-xs text-zinc-500">Claude-style chat interface, portfolio compliance sweeps, policy catalog, and profile view.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coreScreens.map((screen, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-zinc-950">{screen.name}</h3>
                  <button
                    onClick={() => onNavigateToTab(screen.tabId)}
                    className="flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:text-emerald-700 transition-colors"
                  >
                    <span>Launch</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-zinc-600 italic mb-4 font-medium">"{screen.goal}"</p>

                <div className="space-y-1.5 text-xs text-zinc-600">
                  {screen.elements.map((el, elIdx) => (
                    <div key={elIdx} className="flex items-start gap-2">
                      <span className="text-zinc-400 mt-1">•</span>
                      <span>{el}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-zinc-100 flex justify-end">
                <button
                  onClick={() => onNavigateToTab(screen.tabId)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors flex items-center gap-1.5"
                >
                  <span>Open Screen in Prototype</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: Admin Operations */}
      <div className="space-y-4 pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-zinc-950 text-white shadow-xs">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-950">Admin Operations (8 Concerns)</h2>
            <p className="text-xs text-zinc-500">Ingestion pipeline with upload, models, logs, analytics, guardrails, tunables, users, and audit trail.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {adminScreens.map((screen, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-zinc-200/80 p-5 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-zinc-950 truncate">{screen.name}</h3>
                  <button
                    onClick={() => onNavigateToTab('admin_operations', screen.subTabId)}
                    className="text-zinc-500 hover:text-zinc-950 transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-zinc-500 italic mb-3">"{screen.goal}"</p>

                <div className="space-y-1.5 text-[11px] text-zinc-600">
                  {screen.elements.map((el, elIdx) => (
                    <div key={elIdx} className="flex items-start gap-1.5">
                      <span className="text-zinc-400">•</span>
                      <span>{el}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 flex justify-end">
                <button
                  onClick={() => onNavigateToTab('admin_operations', screen.subTabId)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors flex items-center gap-1"
                >
                  <span>Launch Tab</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
