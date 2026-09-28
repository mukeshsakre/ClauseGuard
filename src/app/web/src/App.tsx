import { useCallback, useEffect, useState } from "react";
import { Activity, BookOpen, Check, ChevronDown, CircleAlert, FileText, LoaderCircle, LogOut, Plus, RefreshCw, Search, Shield, Upload, Workflow } from "lucide-react";
import {
  ApiAnswer, ApiDocument, ApiFamily, ApiFinding, ApiLog, ApiRule, ApiUser,
  ask, clearToken, createFamily, createTenant, getPipeline, hasToken, listAudit, listDocuments,
  listFamilies, listFindings, listLogs, listRules, listSweeps, listTraces, listUnits,
  listTenants, listUsers, login, logout, me, runSweep, savePipeline, saveToken,
  setFindingDisposition, setDocumentInForce, uploadDocument,
} from "./api/client";
import "./index.css";

type MainPage = "ask" | "sweeps" | "rules" | "admin";
type AdminPage = "ingestion" | "pipeline" | "logs" | "traces" | "audit" | "users" | "tenants";
type Unit = { id: string; name: string };

const OPTIONAL_STAGES = [
  ["hyde", "Query planning", "Plans focused search queries for the selected scope."],
  ["hybrid_search", "Hybrid retrieval", "Combines tenant scoped keyword and vector retrieval."],
] as const;
const MANDATORY_LABELS: Record<string, string> = {
  crag: "Evidence relevance gate",
  citation_verifier: "Citation verification",
  tenant_scope: "Tenant and document scope enforcement",
};

export default function App() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [authBusy, setAuthBusy] = useState(hasToken());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState<MainPage>("ask");
  const [adminPage, setAdminPage] = useState<AdminPage>("logs");
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [families, setFamilies] = useState<ApiFamily[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [rules, setRules] = useState<ApiRule[]>([]);
  const [findings, setFindings] = useState<ApiFinding[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [traces, setTraces] = useState<Array<Record<string, unknown>>>([]);
  const [audit, setAudit] = useState<Array<Record<string, unknown>>>([]);
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([]);
  const [sweeps, setSweeps] = useState<Array<Record<string, unknown>>>([]);
  const [pipelineVersion, setPipelineVersion] = useState(0);
  const [stages, setStages] = useState<Record<string, boolean>>({});
  const [mandatoryStages, setMandatoryStages] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    if (user?.role === "super_admin") {
      const result = await listTenants();
      setTenants(result.tenants);
      return;
    }
    const results = await Promise.allSettled([
      listDocuments(), listFamilies(), listUnits(), listRules(), listFindings(),
      listSweeps(), getPipeline(),
    ]);
    if (results[0].status === "fulfilled") setDocuments(results[0].value.documents);
    if (results[1].status === "fulfilled") setFamilies(results[1].value.families);
    if (results[2].status === "fulfilled") setUnits(results[2].value.business_units);
    if (results[3].status === "fulfilled") setRules(results[3].value.rules);
    if (results[4].status === "fulfilled") setFindings(results[4].value.findings);
    if (results[5].status === "fulfilled") setSweeps(results[5].value.sweeps);
    if (results[6].status === "fulfilled") {
      setPipelineVersion(results[6].value.version);
      setStages(results[6].value.stages);
      setMandatoryStages(results[6].value.mandatory_stages);
    }
  }, [user]);

  useEffect(() => {
    if (!hasToken()) { setAuthBusy(false); return; }
    me().then(setUser).catch(() => clearToken()).finally(() => setAuthBusy(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    void refresh().catch((reason: unknown) => setError(errorMessage(reason)));
  }, [user, refresh]);

  useEffect(() => {
    if (!user || page !== "admin") return;
    const loadAdmin = async () => {
      const [logsResult, tracesResult, auditResult] = await Promise.allSettled([
        listLogs(), listTraces(), listAudit(),
      ]);
      if (logsResult.status === "fulfilled") setLogs(logsResult.value.logs);
      if (tracesResult.status === "fulfilled") setTraces(tracesResult.value.traces);
      if (auditResult.status === "fulfilled") setAudit(auditResult.value.events);
      if (user.role === "super_admin") {
        const result = await listTenants().catch(() => null);
        if (result) setTenants(result.tenants);
      } else {
        const result = await listUsers().catch(() => null);
        if (result) setUsers(result.users);
      }
    };
    void loadAdmin();
  }, [user, page, adminPage]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setAuthBusy(true);
    try {
      const result = await login(email, password);
      saveToken(result.token);
      setUser(result.user);
      setPassword("");
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setAuthBusy(false); }
  };

  const signOut = async () => {
    await logout().catch(() => clearToken());
    setUser(null);
  };

  if (!user) return <SignIn email={email} password={password} setEmail={setEmail} setPassword={setPassword}
    error={authBusy ? "Checking session…" : error} busy={authBusy} onSubmit={signIn} />;

  const canAdmin = ["tenant_admin", "auditor", "super_admin"].includes(user.role);
  const canManageTenant = user.role === "tenant_admin";
  const nav: Array<[MainPage, string, typeof BookOpen]> = [
    ["ask", "Ask", Search], ["sweeps", "Portfolio sweeps", Workflow], ["rules", "Policy rules", Shield],
    ...(canAdmin ? [["admin", "Admin", Activity] as [MainPage, string, typeof BookOpen]] : []),
  ];

  return <div className="min-h-screen bg-[#F5F4F0] text-zinc-900">
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-[#F5F4F0]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-8">
          <div className="text-lg font-extrabold tracking-tight">Clause<span className="text-emerald-700">Guard</span></div>
          <nav className="flex gap-1">
            {nav.map(([id, label, Icon]) => <button key={id} onClick={() => setPage(id)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${page === id ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-white"}`}>
              <Icon size={16} />{label}</button>)}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="max-w-56 truncate text-right"><b>{user.name}</b><span className="ml-2 text-zinc-500">{user.role.replaceAll("_", " ")}</span></span>
          <button aria-label="Sign out" onClick={() => void signOut()} className="rounded-lg border bg-white p-2 hover:bg-zinc-100"><LogOut size={16}/></button>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-7xl space-y-5 p-5 md:p-8">
      {error && <Notice message={error} onClose={() => setError("")} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">{page === "admin" ? "Administration" : "Contract intelligence"}</p>
          <h1 className="mt-1 text-2xl font-bold">{pageTitle(page, adminPage)}</h1></div>
        <button onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold"><RefreshCw size={15}/> Refresh</button>
      </div>

      {page === "ask" && <AskPanel documents={documents} families={families} onAsk={async (...args) => ask(...args)} />}
      {page === "sweeps" && <SweepPanel sweeps={sweeps} findings={findings} run={runSweep} refresh={refresh} />}
      {page === "rules" && <RulesPanel rules={rules} />}
      {page === "admin" && <>
        <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
          {([ ...(canManageTenant ? [["ingestion", "Documents"] as [AdminPage,string], ["pipeline", "Pipeline controls"] as [AdminPage,string]] : []), ...(user.role === "super_admin" ? [["tenants", "Tenants"] as [AdminPage,string]] : [["users", "Users"] as [AdminPage,string]]), ["logs", "Logs"], ["traces", "Judgment traces"], ["audit", "Audit trail"] ] as Array<[AdminPage,string]>).map(([id, label]) =>
            <button key={id} onClick={() => setAdminPage(id)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${adminPage === id ? "bg-emerald-900 text-white" : "bg-white text-zinc-600"}`}>{label}</button>)}
        </div>
        {adminPage === "ingestion" && canManageTenant && <IngestionPanel documents={documents} families={families} units={units} refresh={refresh} onSetInForce={setDocumentInForce} />}
        {adminPage === "pipeline" && canManageTenant && <PipelinePanel version={pipelineVersion} stages={stages} mandatory={mandatoryStages} onSave={async (next) => {
          const result = await savePipeline(next); setStages(result.stages); setPipelineVersion(result.version);
        }} />}
        {adminPage === "logs" && <DataTable title="Operational logs" rows={logs as unknown as Array<Record<string, unknown>>} empty="No operational events have been recorded." />}
        {adminPage === "traces" && <DataTable title="Judgment traces" rows={traces} empty="No agent traces have been recorded." />}
        {adminPage === "audit" && <DataTable title="Audit trail" rows={audit} empty="No audit events have been recorded." />}
        {adminPage === "users" && <DataTable title="Tenant users" rows={users} empty="No tenant users were returned." />}
        {adminPage === "tenants" && user.role === "super_admin" && <TenantPanel tenants={tenants} onCreate={async (input) => { await createTenant(input); await refresh(); }} />}
      </>}
    </main>
  </div>;
}

function SignIn({ email, password, setEmail, setPassword, error, busy, onSubmit }: {
  email: string; password: string; setEmail: (value: string) => void; setPassword: (value: string) => void;
  error: string; busy: boolean; onSubmit: (event: React.FormEvent) => void;
}) {
  return <div className="flex min-h-screen items-center justify-center bg-[#F5F4F0] p-5">
    <form onSubmit={onSubmit} className="w-full max-w-md space-y-5 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div><div className="text-2xl font-extrabold">Clause<span className="text-emerald-700">Guard</span></div>
        <p className="mt-2 text-sm text-zinc-500">Sign in to your tenant workspace.</p></div>
      <label className="block text-sm font-semibold">Email or username<input className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 font-normal" type="text" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username"/></label>
      <label className="block text-sm font-semibold">Password<input className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 font-normal" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"/></label>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Please wait…" : "Sign in"}</button>
    </form>
  </div>;
}

function AskPanel({ documents, families, onAsk }: {
  documents: ApiDocument[]; families: ApiFamily[];
  onAsk: (question: string, scope: "document" | "family" | "portfolio", id?: string) => Promise<ApiAnswer>;
}) {
  const [scope, setScope] = useState<"document" | "family" | "portfolio">("document");
  const [scopeId, setScopeId] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ApiAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const options = scope === "document" ? documents.map(d => [d.id, `${d.name} · ${d.status}`]) : families.map(f => [f.id, f.vendor || "Unnamed contract family"]);
  useEffect(() => { if (options.length && !options.some(([id]) => id === scopeId)) setScopeId(options[0][0]); }, [scope, scopeId, documents, families]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setResult(null);
    try { setResult(await onAsk(question, scope, scope === "portfolio" ? undefined : scopeId)); }
    catch (e) { setResult({ status: "error", summary: errorMessage(e) }); }
    finally { setBusy(false); }
  };
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]">
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Question scope<select value={scope} onChange={e => { setScope(e.target.value as typeof scope); setResult(null); }} className="mt-1 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5">
          <option value="document">Selected document</option><option value="family">In-force contract family</option><option value="portfolio">Portfolio sweep findings</option>
        </select></label>
        {scope !== "portfolio" && <label className="text-sm font-semibold">{scope === "document" ? "Document" : "Contract family"}<select value={scopeId} onChange={e => setScopeId(e.target.value)} required className="mt-1 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5">
          {!options.length && <option value="">No {scope === "document" ? "documents" : "families"} available</option>}{options.map(([id,label]) => <option key={id} value={id}>{label}</option>)}
        </select></label>}
      </div>
      <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-950">{scopeDescription(scope)}</p>
      <label className="block text-sm font-semibold">Ask a contract question<textarea value={question} onChange={e => setQuestion(e.target.value)} rows={5} required maxLength={4000} placeholder="Ask about obligations, dates, notice periods, or contract terms…" className="mt-1 block w-full resize-y rounded-xl border border-zinc-300 px-3 py-3 font-normal" /></label>
      <button disabled={busy || !question.trim() || (scope !== "portfolio" && !scopeId)} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy && <LoaderCircle size={16} className="animate-spin"/>}Ask within this scope</button>
    </form>
    <section className="min-h-72 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold">Answer and evidence</h2>
      {!result ? <p className="mt-3 text-sm text-zinc-500">Verified answers and source citations will appear here.</p> : <div className="mt-4 space-y-4">
        <div className={`rounded-xl p-3 text-sm ${result.status === "answered" ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"}`}><b className="capitalize">{result.status.replaceAll("_", " ")}</b><p className="mt-1 whitespace-pre-wrap">{result.summary}</p></div>
        {(result.citations || []).map(c => <blockquote key={c.chunk_id} className="border-l-2 border-emerald-700 pl-3 text-sm"><p>“{c.quote}”</p><footer className="mt-2 text-xs text-zinc-500">{c.document_name} · page {c.page} · source {c.document_id}</footer></blockquote>)}
        {result.pipeline_version && <p className="text-xs text-zinc-500">Pipeline version {result.pipeline_version} · trace {result.id}</p>}
      </div>}
    </section>
  </div>;
}

function IngestionPanel({ documents, families, units, refresh, onSetInForce }: { documents: ApiDocument[]; families: ApiFamily[]; units: Unit[]; refresh: () => Promise<void>; onSetInForce: (id: string, inForce: boolean) => Promise<unknown> }) {
  const [familyId, setFamilyId] = useState(""); const [file, setFile] = useState<File | null>(null);
  const [vendor, setVendor] = useState(""); const [unitId, setUnitId] = useState(units[0]?.id || "");
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!families.some(f => f.id === familyId)) setFamilyId(families[0]?.id || ""); }, [families, familyId]);
  useEffect(() => { if (!units.some(u => u.id === unitId)) setUnitId(units[0]?.id || ""); }, [units, unitId]);
  const addFamily = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); try { const x = await createFamily(unitId, vendor); setFamilyId(x.family.id); setVendor(""); setMessage("Contract family created."); await refresh(); } catch (e) { setMessage(errorMessage(e)); } finally { setBusy(false); } };
  const upload = async (e: React.FormEvent) => { e.preventDefault(); if (!file || !familyId) return; setBusy(true); setMessage(""); try { await uploadDocument(file, familyId); setFile(null); setMessage("Document queued for ingestion."); await refresh(); } catch (e) { setMessage(errorMessage(e)); } finally { setBusy(false); } };
  return <div className="space-y-5">
    {message && <Notice message={message} onClose={() => setMessage("")} />}
    {!families.length && <form onSubmit={addFamily} className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4"><label className="text-sm font-semibold">Business unit<select className="mt-1 block rounded-lg border px-3 py-2" value={unitId} onChange={e => setUnitId(e.target.value)}>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label><label className="flex-1 text-sm font-semibold">Counterparty / family name<input className="mt-1 block w-full rounded-lg border px-3 py-2" value={vendor} onChange={e => setVendor(e.target.value)} required/></label><button disabled={busy || !unitId} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-bold text-white">Create family</button></form>}
    <form onSubmit={upload} className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4">
      <label className="min-w-56 flex-1 text-sm font-semibold">Contract family<select required value={familyId} onChange={e => setFamilyId(e.target.value)} className="mt-1 block w-full rounded-lg border bg-white px-3 py-2"><option value="">Choose family</option>{families.map(f => <option key={f.id} value={f.id}>{f.vendor || f.id}</option>)}</select></label>
      <label className="min-w-56 flex-1 text-sm font-semibold">PDF or DOCX<input required type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1 block w-full rounded-lg border bg-white p-1.5 text-sm" /></label>
      <button disabled={busy || !file || !familyId} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white"><Upload size={15}/>{busy ? "Working…" : "Upload document"}</button>
    </form>
    {families.length > 0 && <form onSubmit={addFamily} className="flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-zinc-300 p-4">
      <label className="text-sm font-semibold">Business unit<select className="mt-1 block rounded-lg border bg-white px-3 py-2" value={unitId} onChange={e => setUnitId(e.target.value)}>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
      <label className="flex-1 text-sm font-semibold">New contract family<input className="mt-1 block w-full rounded-lg border px-3 py-2" value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Counterparty name" required/></label>
      <button disabled={busy || !unitId} className="inline-flex items-center gap-1 rounded-lg border bg-white px-4 py-2 text-sm font-bold"><Plus size={15}/>Create family</button>
    </form>}
    <div className="overflow-hidden rounded-2xl border bg-white"><div className="border-b p-4"><h2 className="font-bold">Tenant documents</h2><p className="text-xs text-zinc-500">Statuses and metadata are read from the ingestion service.</p></div>
      <div className="divide-y">{documents.length ? documents.map(d => <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex items-center gap-3"><FileText className="text-emerald-800" size={18}/><div><p className="font-semibold">{d.name}</p><p className="text-xs text-zinc-500">{families.find(f => f.id === d.family_id)?.vendor || "Contract family"} · {d.page_count} pages · v{d.version}</p></div></div><div className="flex items-center gap-3"><span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold">{d.status.replaceAll("_", " ")}</span><label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={d.in_force} onChange={e => void onSetInForce(d.id, e.target.checked).then(refresh)} className="accent-emerald-800"/>In force</label></div></div>) : <Empty text="No documents have been uploaded for this tenant."/>}</div>
    </div>
  </div>;
}

function PipelinePanel({ version, stages, mandatory, onSave }: { version: number; stages: Record<string,boolean>; mandatory: string[]; onSave: (stages: Record<string,boolean>) => Promise<void> }) {
  const [draft, setDraft] = useState(stages); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(stages), [stages]);
  const save = async () => { setBusy(true); try { await onSave(draft); setMessage("A new pipeline configuration version is active."); } catch (e) { setMessage(errorMessage(e)); } finally { setBusy(false); } };
  return <div className="space-y-5">
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">Every request uses one configuration snapshot. Current tenant configuration: <b>v{version}</b>.</div>
    {message && <Notice message={message} onClose={() => setMessage("")} />}
    <section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Optional stages</h2><p className="mb-4 mt-1 text-sm text-zinc-500">Changes apply to future Ask requests and sweeps.</p><div className="divide-y">
      {OPTIONAL_STAGES.map(([key, label, description]) => <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-4"><span><b className="block text-sm">{label}</b><span className="text-sm text-zinc-500">{description}</span></span><input type="checkbox" checked={draft[key] ?? false} onChange={e => setDraft(old => ({ ...old, [key]: e.target.checked }))} className="h-5 w-5 accent-emerald-800"/></label>)}
      {[["graph_expansion", "Graph expansion"], ["reranker", "Evidence reranker"], ["semantic_cache", "Semantic answer cache"]].map(([key,label]) => <div key={key} className="flex justify-between gap-4 py-4 opacity-60"><span><b className="block text-sm">{label}</b><span className="text-sm text-zinc-500">Adapter is not installed in this deployment.</span></span><span className="rounded-full bg-zinc-100 px-3 py-1 text-xs">Unavailable</span></div>)}
    </div><button disabled={busy || JSON.stringify(draft) === JSON.stringify(stages)} onClick={() => void save()} className="mt-4 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Save configuration"}</button></section>
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold">Mandatory safety gates</h2><p className="mt-1 text-sm text-amber-900">These controls cannot be disabled per tenant.</p><div className="mt-3 flex flex-wrap gap-2">{mandatory.map(key => <span key={key} className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold"><Check size={13}/>{MANDATORY_LABELS[key] || key}</span>)}</div></section>
  </div>;
}

function SweepPanel({ sweeps, findings, run, refresh }: { sweeps: Array<Record<string,unknown>>; findings: ApiFinding[]; run: () => Promise<{sweep_id:string}>; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const start = async () => { setBusy(true); try { const result = await run(); setMessage(`Sweep ${result.sweep_id} queued.`); await refresh(); } catch (e) { setMessage(errorMessage(e)); } finally { setBusy(false); } };
  return <div className="space-y-5">{message && <Notice message={message} onClose={() => setMessage("")} />}
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5"><div><h2 className="font-bold">Rule-directed portfolio sweep</h2><p className="mt-1 text-sm text-zinc-500">Sweeps evaluate tenant contract families. Portfolio Ask reads these stored findings.</p></div><button onClick={() => void start()} disabled={busy} className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white">{busy ? "Starting…" : "Start sweep"}</button></section>
    <div className="grid gap-4 md:grid-cols-2"><section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Recent runs</h2><div className="mt-3 divide-y">{sweeps.length ? sweeps.map((s,i) => <div key={String(s.id || i)} className="flex justify-between py-3 text-sm"><span className="font-mono text-xs">{String(s.id || "")}</span><span className="capitalize">{String(s.status || "unknown")}</span></div>) : <Empty text="No sweep runs recorded."/>}</div></section>
    <section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Findings requiring review</h2><div className="mt-3 divide-y">{findings.length ? findings.map(f => <div key={f.id} className="py-3"><div className="flex justify-between gap-3 text-sm"><b className="capitalize">{f.verdict.replaceAll("_", " ")}</b><span className="text-xs text-zinc-500">{f.disposition}</span></div><p className="mt-1 text-sm text-zinc-600">{f.summary}</p><select value={f.disposition} onChange={e => void setFindingDisposition(f.id, e.target.value).then(refresh)} className="mt-2 rounded-lg border bg-white px-2 py-1 text-xs"><option value="open">Open</option><option value="confirmed">Confirmed</option><option value="false_positive">False positive</option><option value="risk_accepted">Risk accepted</option></select></div>) : <Empty text="No stored findings."/>}</div></section></div>
  </div>;
}

function RulesPanel({ rules }: { rules: ApiRule[] }) {
  return <div className="overflow-hidden rounded-2xl border bg-white"><div className="border-b p-5"><h2 className="font-bold">Tenant policy rules</h2><p className="mt-1 text-sm text-zinc-500">Rules are read from the authenticated tenant. Sweep findings remain unchecked if evidence or a typed evaluator is insufficient.</p></div><div className="divide-y">{rules.length ? rules.map(rule => <article key={rule.id} className="p-5"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{rule.title}</h3><span className="text-xs uppercase text-zinc-500">{rule.severity} · {rule.rule_type}</span></div><p className="mt-2 text-sm text-zinc-600">{rule.statement}</p></article>) : <Empty text="No policy rules have been configured."/>}</div></div>;
}

function TenantPanel({ tenants, onCreate }: {
  tenants: Array<{ id: string; name: string }>;
  onCreate: (input: { name: string; admin_email: string; admin_name: string; admin_password: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      await onCreate({ name, admin_name: adminName, admin_email: adminEmail, admin_password: adminPassword });
      setName(""); setAdminName(""); setAdminEmail(""); setAdminPassword("");
      setNotice("Tenant and tenant administrator created. The administrator can now sign in.");
    } catch (reason) { setNotice(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  return <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
    {notice && <div className="lg:col-span-2"><Notice message={notice} onClose={() => setNotice("")} /></div>}
    <form onSubmit={submit} className="space-y-3 rounded-2xl border bg-white p-5">
      <h2 className="font-bold">Create tenant workspace</h2>
      <label className="block text-sm font-semibold">Tenant name<input required value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2"/></label>
      <label className="block text-sm font-semibold">Administrator name<input required value={adminName} onChange={e => setAdminName(e.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2"/></label>
      <label className="block text-sm font-semibold">Administrator email<input required type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2"/></label>
      <label className="block text-sm font-semibold">Temporary password<input required minLength={12} type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2"/></label>
      <button disabled={busy} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Creating…" : "Create tenant"}</button>
    </form>
    <section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Tenant workspaces</h2><div className="mt-3 divide-y">{tenants.length ? tenants.map(t => <div key={t.id} className="py-3"><b className="block">{t.name}</b><span className="font-mono text-xs text-zinc-500">{t.id}</span></div>) : <Empty text="No tenant workspaces have been created."/>}</div></section>
  </div>;
}

function DataTable({ title, rows, empty }: { title: string; rows: Array<Record<string,unknown>>; empty: string }) {
  return <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b p-5"><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-zinc-500">Live, tenant scoped records. Evidence and contract text are excluded from general logs.</p></div>
    {rows.length ? <div className="max-h-[70vh] divide-y overflow-auto">{rows.map((row, i) => <details key={String(row.id || i)} className="group px-5 py-3"><summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 text-sm"><span className="font-mono text-xs text-zinc-500">{String(row.timestamp || row.created_at || "")}</span><b>{String(row.component || row.action || row.scope_type || row.category || row.email || row.id || "Event")}</b><span className="text-zinc-600">{String(row.message || row.status || row.object_type || row.role || "")}</span><ChevronDown size={14} className="ml-auto transition group-open:rotate-180"/></summary><pre className="mt-3 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs">{JSON.stringify(row, null, 2)}</pre></details>)}</div> : <Empty text={empty}/>}
  </section>;
}

function Notice({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><span>{message}</span><button onClick={onClose} aria-label="Dismiss"><CircleAlert size={16}/></button></div>;
}
function Empty({ text }: { text: string }) { return <p className="p-5 text-sm text-zinc-500">{text}</p>; }
function pageTitle(page: MainPage, admin: AdminPage) { return page === "ask" ? "Ask contracts within a defined scope" : page === "sweeps" ? "Portfolio compliance" : page === "rules" ? "Policy rules" : ({ ingestion: "Documents and ingestion", pipeline: "Pipeline controls", logs: "Logs & operational events", traces: "Judgment traces", audit: "Audit trail", users: "Tenant users" } as Record<AdminPage,string>)[admin]; }
function scopeDescription(scope: "document" | "family" | "portfolio") { return scope === "document" ? "Retrieval is restricted to the selected document." : scope === "family" ? "Retrieval uses only in-force indexed documents in this contract family; every citation names its source." : "Portfolio questions read completed sweep findings. If none exist, a sweep is queued; contract pages are not sampled."; }
function errorMessage(reason: unknown) { return reason instanceof Error ? reason.message : "The request could not be completed."; }
