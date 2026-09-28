# ClauseGuard: Agentic RAG with Strict Data Boundaries

## Summary

Implement the backend and integrate the existing UI under `ClauseGuard/src`. Add a bounded agentic retrieval controller for Ask, with strict tenant and document scope enforced by the system. Keep policy evaluation and mandatory safety checks auditable and evidence-based.

## Implementation Changes

- Keep all application code, dependencies, migrations, evaluation assets, and deployment files under `src`. Preserve `src/app/web`, update the repository tree to match, install Python packages in `src/.venv`, and manage React dependencies with npm.
- Build the backend with clear domain, application, and infrastructure layers; use readable, typed code with OOP, SOLID, and DRY practices. Use existing Qdrant, RabbitMQ, and Redis instances by configuration. Put ClauseGuard’s PostgreSQL deployment under `src/deploy`; preserve and migrate `cg_user` and its user records, and keep other demo data out of the product database.
- Give Ask an explicit scope: **document**, **family**, or **portfolio**. Document scope retrieves only the selected document. Family scope may use only that family’s in-force documents and must identify the source of every citation. Portfolio questions read completed sweep findings or start a sweep; they do not search a sample of contract pages.
- Add an agentic controller for document and family Ask. It may plan subqueries and use tenant-scoped tools for contract search, table lookup, in-force version/precedence lookup, and references within the selected scope. Bound corrective retrieval to two rounds. It cannot broaden scope, access the web, change rules or findings, or decide verdicts. Sweeps keep a predictable rule-directed flow.
- Enforce scope server-side at every layer: database queries, Qdrant filters, Neo4j lookups, object storage, agent tools, caches, and citation verification. Derive tenant scope from the authenticated session, never trust a client-supplied tenant ID, and reject any result or citation outside the requested scope.
- Replace UI mock data and hard-coded tenants, sample records, statistics, and simulated operations with backend data. Extend the current admin screens in their existing style with per-tenant pipeline controls. Optional stages can be bypassed; CRAG, citation verification, and tenant/security enforcement stay mandatory and visibly locked.
- Capture operational events, agent actions, judgment traces, and audit events for display in the existing Logs & Traces and Audit Trail screens. Keep contract text and prompts out of general logs; restrict evidence-bearing trace details to authorized users within scope.

## Test Plan

- Seed isolated test tenants and documents with distinct sentinel text. Verify zero cross-tenant visibility through APIs, search, graph traversal, caches, storage, agent tools, citations, counts, and error messages.
- Ask about document A when the answer exists only in document B; require no use or citation of B. Verify explicit family scope can cite only in-force documents from that family.
- Verify bounded agent search, optional-stage bypasses, mandatory gates, trace completeness, resumable sweeps, and clean database startup with only the preserved `cg_user` records.
- Remove demo content from the live UI and product database. Keep synthetic cases only in isolated tests and evaluation datasets. Complete OCR and the PRD’s quality, isolation, and capacity gates before v1 launch.

## Assumptions

- Pipeline configuration is per tenant. Changing it creates a new recorded configuration version; each answer and sweep uses a fixed snapshot.
- Scanned-document support remains required before v1 launch, though it may be implemented after text-layer PDF and DOCX support.
- Existing Qdrant, RabbitMQ, and Redis containers remain externally managed; ClauseGuard will not start duplicate instances. Docker access was unavailable during this review, so connection endpoints must be verified when runtime access is available.
