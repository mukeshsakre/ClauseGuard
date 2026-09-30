# Specification conflicts and decisions

Authority: PRD v2 > Tech Stack v3 > PLAN.md > repository tree > existing code.
These decisions record source conflicts; they are not release waivers.

| Conflict | Sources | Resolution | Implementation state |
| --- | --- | --- | --- |
| Corrective retrieval bound | PRD FR-VER-10 and Tech Stack section 4 allow one rewrite/retrieval; PLAN allows two; existing code/tests allow two. | One corrective retrieval after the initial pass. Configuration must never increase it. | Existing controller and test require task 35 changes. |
| Optional retrieval stages | PRD FR-ASK-06 requires HyDE, dense+sparse Qdrant/RRF, scoped graph, cross-encoder, CRAG, generation and verification on every judgment; Tech Stack calls HyDE always on; PLAN allows optional stage bypasses. | PRD-required stages cannot be bypassed for the release pipeline. Versioned controls may govern genuinely optional additions. CRAG, scope and citation verification stay locked. | Existing switches/defaults are incompatible; task 45/46 must repair them. |
| Persisted verdict | PRD FR-VER-01 defines compliant/non-compliant/not_found/ambiguous; existing worker writes unchecked. | Persist not_found; display Unchecked. Preserve history through explicit migration without rewriting evidence. | Tasks 5/41/57 must handle legacy state explicitly. |
| Original storage | PRD FR-ING-05 and NFR-REL-03 require MinIO; existing runtime defaults to filesystem. | MinIO is authoritative. A test double is permitted only in isolated tests, never as a production fallback. | Runtime configuration task 4 rejects filesystem for production; storage tasks 10/11 replace it. |
| Lexical retrieval | PRD FR-ASK-06 requires Qdrant sparse vectors; existing code uses SQL ILIKE as lexical search. | Implement Qdrant sparse retrieval. PRD section 17 does not authorize a Postgres fallback without a recall fixture. | Tasks 26/29 must replace the substitute. |
| Query planning vs HyDE | Existing hyde flag only creates short query variants. Tech Stack requires a hypothetical contract-like answer used only for retrieval. | Implement real HyDE, separately tracked and never accepted as evidence. | Task 28. |
| Fusion ordering | Tech Stack section 4 mentions graph before fusion; PRD FR-ASK-06 specifies dense+sparse RRF before graph expansion. | Follow PRD: dense+sparse, RRF, one-hop expansion, bounded rerank, grade. | Tasks 29/32. |
| Processing states | Tech Stack examples use received/partially indexed; PRD FR-ING-03 names queued/extracting/needs OCR/indexed/failed/rejected. | Use PRD states on public surfaces and retain precise page/table failure metadata. Never label unread scans indexed. | Task 15. |
| Coverage exception | PRD section 9 / FR-VER-04 describe complete coverage; FR-VER-09 explicitly permits verified prose/parsed cells when an unrelated table failed. | Apply the specific table exception: unread OCR pages block all verdicts; a failed table blocks absence and values from that region, but not independent verified evidence. | Tasks 20/21/39/41 need explicit fixtures. |
| Tenant creation role | PRD section 4 allows tenant admin globally; FR-IAM-07 allows tenant admin or super-admin; current API permits only super-admin. | Support PRD tenant-admin creation while preserving isolation; creating another tenant grants no content access to it. | Tasks 8/9. |
| Cross-tenant super-admin content | Current trace/log/audit endpoints omit tenant filtering for super-admin. PRD tenant wall does not grant platform operators universal contract/prompt access. | Platform creation does not imply content access. Protected content requires a tenant-authorized session. | Tasks 6/8/60/77. |

The PRD's exact notice, release thresholds, business-unit wall, immutable history,
and excluded features take precedence over incompatible legacy UI labels and demos.
