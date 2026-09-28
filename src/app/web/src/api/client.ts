/** Authenticated API client. Tenant identity is always supplied by the server session. */

const TOKEN_KEY = "clauseguard_token";

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string | null;
  business_unit_ids: string[];
}
export interface ApiTenant { id: string; name: string }

export interface ApiDocument {
  id: string;
  name: string;
  family_id: string;
  business_unit_id: string;
  role: string;
  precedence: number;
  version: number;
  status: string;
  sha256: string;
  page_count: number;
  failed_pages: number[];
  in_force: boolean;
  created_at: string;
}

export interface ApiFamily {
  id: string;
  business_unit_id: string;
  vendor: string;
  contract_type: string;
  effective_date: string | null;
  status: string;
}

export interface ApiRule {
  id: string;
  title: string;
  statement: string;
  rule_type: string;
  severity: string;
  threshold: number | null;
  unit: string;
  active: boolean;
  created_at: string;
}

export interface ApiFinding {
  id: string;
  family_id: string;
  document_id: string | null;
  rule_id: string;
  sweep_id: string | null;
  verdict: string;
  disposition: string;
  summary: string;
  created_at: string;
}

export interface ApiAnswer {
  id?: string;
  status: string;
  summary: string;
  scope_type?: string;
  scope_id?: string;
  pipeline_version?: number;
  sweep_id?: string;
  citations?: Array<{
    document_id: string;
    document_name: string;
    chunk_id: string;
    quote: string;
    page: number;
    row_header?: string;
    column_header?: string;
  }>;
  findings?: ApiFinding[];
  trace?: Array<Record<string, unknown>>;
}

export interface ApiLog {
  id: string;
  timestamp: string;
  severity: string;
  component: string;
  message: string;
  trace_id: string | null;
  tenant_id: string | null;
  metadata: Record<string, unknown>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(path, { ...init, headers });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function saveToken(token: string) { sessionStorage.setItem(TOKEN_KEY, token); }
export function clearToken() { sessionStorage.removeItem(TOKEN_KEY); }
export function hasToken() { return Boolean(sessionStorage.getItem(TOKEN_KEY)); }

export async function login(email: string, password: string) {
  return request<{ token: string; user: ApiUser }>("/v1/auth/login", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
}
export const me = () => request<ApiUser>("/v1/me");
export async function logout() {
  try { await request("/v1/auth/logout", { method: "POST" }); } finally { clearToken(); }
}

export const listDocuments = () => request<{ documents: ApiDocument[] }>("/v1/documents");
export const listFamilies = () => request<{ families: ApiFamily[] }>("/v1/families");
export const listUnits = () => request<{ business_units: Array<{ id: string; name: string }> }>("/v1/business-units");
export const listRules = () => request<{ rules: ApiRule[] }>("/v1/rules");
export const listFindings = () => request<{ findings: ApiFinding[] }>("/v1/findings");
export const listSweeps = () => request<{ sweeps: Array<Record<string, unknown>> }>("/v1/sweeps");
export const listLogs = () => request<{ logs: ApiLog[] }>("/v1/logs");
export const listTraces = () => request<{ traces: Array<Record<string, unknown>> }>("/v1/traces");
export const listAudit = () => request<{ events: Array<Record<string, unknown>> }>("/v1/audit");
export const listUsers = () => request<{ users: Array<Record<string, unknown>> }>("/v1/users");
export const listTenants = () => request<{ tenants: ApiTenant[] }>("/v1/tenants");
export function createTenant(input: { name: string; admin_email: string; admin_name: string; admin_password: string }) {
  return request<{ tenant: ApiTenant; admin_user_id: string }>("/v1/tenants", {
    method: "POST", body: JSON.stringify(input),
  });
}
export const getPipeline = () => request<{ version: number; stages: Record<string, boolean>; mandatory_stages: string[] }>("/v1/pipeline");

export function ask(question: string, scopeType: "document" | "family" | "portfolio", scopeId?: string) {
  return request<ApiAnswer>("/v1/ask", {
    method: "POST", body: JSON.stringify({ question, scope_type: scopeType, scope_id: scopeId || null }),
  });
}
export function createFamily(businessUnitId: string, vendor: string) {
  return request<{ family: ApiFamily }>("/v1/families", {
    method: "POST", body: JSON.stringify({ business_unit_id: businessUnitId, vendor, contract_type: "other" }),
  });
}
export function uploadDocument(file: File, familyId: string) {
  const body = new FormData();
  body.append("file", file);
  body.append("family_id", familyId);
  return request<{ document_id: string; status: string }>("/v1/documents", { method: "POST", body });
}
export const runSweep = () => request<{ sweep_id: string; status: string; pipeline_version: number }>("/v1/sweeps", { method: "POST" });
export function savePipeline(stages: Record<string, boolean>) {
  return request<{ version: number; stages: Record<string, boolean>; mandatory_stages: string[] }>("/v1/pipeline", {
    method: "PUT", body: JSON.stringify({ stages }),
  });
}
export function setDocumentInForce(id: string, inForce: boolean) {
  return request<{ document_id: string; in_force: boolean }>(`/v1/documents/${id}/in-force`, {
    method: "PATCH", body: JSON.stringify({ in_force: inForce }),
  });
}
export function setFindingDisposition(id: string, disposition: string, reason = "") {
  return request<{ updated: boolean }>(`/v1/findings/${id}`, {
    method: "PATCH", body: JSON.stringify({ disposition, reason }),
  });
}
