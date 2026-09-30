# Current implementation audit

Baseline: 2026-09-28. This is an implementation inventory, not a readiness approval.
All 88 FR/NFR definitions, including every Must, are classified individually in
[requirements-traceability.md](requirements-traceability.md). No Must is VERIFIED.

## Inspection and evidence

- Read the PRD, all four Tech Stack pages, PLAN, repository tree and attached execution contract.
- Inventoried and read 76 first-party files/manifests (14,856 lines including npm lockfile).
  Vendor dependencies, generated output, runtime documents and local secret values are excluded.
  Full-file scan results and hashes: [source-inventory.json](evidence/source-inventory.json).
- Reviewed API authentication/authorization, source scope, ingestion, extraction, retrieval,
  generation, citation filtering, persistence, sweeps, migrations, deployment, and active UI.
- Reviewed every legacy component's imports, state, event bindings and simulated operations.
- Five existing SQLite/fake-provider/local-storage unit tests pass. They do not establish
  PostgreSQL, Qdrant, RabbitMQ, MinIO, Neo4j or Redis integration.
- Full-source TypeScript check fails: [exact diagnostics](evidence/task-02-full-types.json).
  `tsconfig.json` includes only App, main and the API client, so the usual lint command
  excludes all legacy components. Its earlier green result was not whole-repository validation.

## Priority implementation gaps

| Area / PRD IDs | Existing behavior | Exact gap and consequence |
| --- | --- | --- |
| Data boundary — FR-IAM-01/02, NFR-SEC-04 | Many API queries and dense retrieval carry tenant/unit predicates. | Raw SQLAlchemy sessions permit unscoped content access. No composite tenant/unit foreign keys or storage enforcement. Full adversarial two-tenant/two-unit suite absent. |
| Authorization — FR-IAM-01/02/05 | Roles are checked on some mutations. | `require_tenant` allows ingestion-service callers into read/Ask routes; sweep list exposes whole-tenant scope to unit roles; global super-admin trace reads expose customer prompts/evidence. Cross-tenant email conflicts disclose account existence. |
| Authentication — FR-IAM-03/06 | Argon2 password hashes, custom HMAC JWT, revoked-token table. | Logout reports success even after revocation persistence fails. No administrative session lifecycle or ingestion key lifecycle. No end-to-end role/revocation test. |
| Original storage — FR-ING-05, NFR-REL-03 | Optional boto3 S3 backend, local default. | Required MinIO path unverified; object boundary lacks business unit; no original-download endpoint. After flattening core, `_local_root` still uses `parents[5]`, resolving relative storage outside src. Do not use this path. |
| Ingestion — FR-ING-01/02/03/06/10 | Single file accepted; DB outbox dispatches Celery task. | No watched folder, manifest, per-row report, ingestion credentials or actual queue integration tests. Missing model key causes worker terminal failure. |
| Derivatives — FR-ING-08/09, FR-VER-02/08/09 | Basic PDF lines and DOCX paragraphs/cells. | No OCR, page offsets/rectangles, spans/header paths, merged/continued grids. Failed table fallback can admit flattened table text. DOCX citations all use page 1. |
| Portfolio — FR-PRT-01..05 | Family fields and boolean document in_force. | No immutable document lineage, version-set snapshot, status-aware resolution, family moves, filters/counts or capacity evidence. Resolver omits failed active documents, hiding coverage failures. |
| Rules — FR-POL-01..05 | Six type strings and optional threshold/unit stored. | No owner, applicability, immutable versions, activation preview, retirement or validated activation. Rules default active. |
| Retrieval — FR-ASK-06, FR-VER-10/12 | Dense Qdrant plus SQL ILIKE fused in Python. | SQL lexical search substitutes for required sparse Qdrant. Query variants substitute for HyDE. Graph, reranker and cache adapters absent. Two corrective rounds exceed PRD one. |
| Evidence/verdict — FR-VER-01..11 | Ask checks quote substring and source scope. | No independent offsets/version/cell/header verifier, coverage/absence records, deterministic comparison, precedence resolution, confidence components or complete structured output validation. |
| Sweeps — FR-SWP-01..07, FR-FND-01 | Per-rule/family retrieval; commits findings; retry exists. | Every finding gets unsupported persisted `unchecked`. No true evaluator, pair identity, incremental cross-run reuse, fixed input snapshot, checkpoints, counters, concurrency safety or separate queues. |
| Ask — FR-ASK-01..03 | Document/family scope and latest completed sweep lookup. | Incomplete PRD answer contract. Portfolio question ignored when choosing run. Limit applied before unit filtering; no complete filter/coverage mapping or trace for portfolio/empty-scope responses. |
| Findings — FR-FND-02..08 | Four user disposition values and list. | No version-bound risk expiry/false-positive note, system supersession, confidence controls, detail evidence, partial-run marking or denominator accounting. |
| Audit — FR-AUD-01..05, NFR-OPS-01 | Ask trace and selected mutations produce DB rows. | Missing immutable model/prompt/rule/in-force identity, coverage, scores, shared operational/audit identity; retention not enforced. No exports, deletion/tombstones or legal holds. Arbitrary event details lack redaction enforcement. |
| UI — FR-ASK-04/05, FR-FND-06, NFR-UX-01 | Active App uses real API client for its limited screens. | Users/rules read-only; family-create form disappears after first family; no evidence viewer, exact legal notice, manifest, policy activation, export, credentials, full review workflow. Failed background reads often swallowed. |
| Operations — NFR-SCL/REL/SEC/OPS | PostgreSQL Compose, basic static `/health`. | No dependency readiness, app/worker production deployment, TLS/SSE setup, backups/restore, deletion/revocation drills, capacity/evaluation/ORT release gates. |

## Legacy UI and stale contracts

`main.tsx` mounts only `App.tsx`. Legacy components remain in the repository, are
excluded by tsconfig, and are not a second working application. Preserve usable
styling/components while integrating the real contracts; do not revive fake actions.

| Files | Finding |
| --- | --- |
| components/admin/IngestionPipeline.tsx | Missing uploadFile/uploadText exports; sample uploads; retry timer; advertised OCR options unsupported. |
| components/admin/ModelManagement.tsx | Timer-based inference result; no actual model-management backend. |
| components/admin/AuditTrail.tsx; enduser/BatchSweep.tsx | Alert-only export; sweep uses hard-coded ruleset/progress and incompatible dispositions. |
| components/enduser/ContractUploadIngestion.tsx; EndUserWorkspace.tsx | Simulated uploads, randomized IDs/hashes and sample filenames. |
| components/enduser/AnswerView.tsx | Simulated document viewer instead of original version/page evidence. |
| components/dashboard/ExecutiveOverview.tsx | Static charts/counts/calendar data unrelated to backend. |
| components/dashboard/ClaudeChatDashboard.tsx | Obsolete Ask argument/response shape; local chat state; attachment does not ingest. |
| components/admin/UserTenantManagement.tsx; enduser/PolicyRulesetViewer.tsx | Missing createUser/createRule exports and old role/severity contracts. |
| components/auth/LoginScreen.tsx | Missing changePassword export and must_change_password response field. |
| components/profile/UserProfileView.tsx | Fixed example API credential; remove, never treat as a valid secret. |
| types/index.ts | Obsolete verdict/disposition/role shapes and confidence probabilities conflict with PRD. |
| web/.env.example; README.md; metadata.json | Stale AI Studio/Gemini setup conflicts with backend-owned model adapter. |

## Database and preservation

The current additive migration imports live `Base.metadata`; future model edits
would silently alter what revision 0001 means for a fresh install. Freeze the old
schema before adding versioned upgrades. Existing `cg_user` records and original
password hashes must be preserved; no demo cleanup may truncate user/tenant tables.
Do not run destructive cleanup against the product database as an audit action.

## Verification limits

No browser, real model, quality, capacity, restore, deletion, or complete tenant/unit
isolation gate has passed. Unit test bootstrap loads core through an import alias;
that does not prove the installed API/worker package starts. Verify normal package
installation separately. Missing capabilities retain NOT_IMPLEMENTED/PARTIAL status.
