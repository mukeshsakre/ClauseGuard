# Infrastructure audit

Baseline: 2026-09-28. Read-only probes establish connectivity only. No probe is
a substitute for a real isolated ingestion/retrieval/infrastructure integration test.
Evidence: [infrastructure-probes.json](evidence/infrastructure-probes.json).
Pre-restart evidence: [infrastructure-before-restart.json](evidence/infrastructure-before-restart.json).

Docker Desktop was readable with elevated tool access. Existing containers:
clauseguard-postgres (postgres:17-alpine, healthy, port 5433),
deploy-rabbitmq-1 (rabbitmq:3-management, port 5672),
deploy-qdrant-1 (qdrant/qdrant:latest, port 6333), deploy-redis-1 (redis:7, port 6379).
The last three were stopped and were restarted in place. No duplicates were created.
The other product's raggauge-postgres-1 was not modified.

| Dependency | Configuration/client | Lifecycle / retries / errors | Scope / runtime use | Observed health / readiness | Integration evidence / remaining gap |
| --- | --- | --- | --- | --- | --- |
| PostgreSQL | DATABASE_URL; SQLAlchemy/psycopg | Module-level engine, pool_pre_ping; request sessions close; no explicit engine disposal on API shutdown. Alembic runs at startup. | Actual system of record; individual queries carry predicates, unrestricted Session remains possible; no composite tenant FK/storage wall. | Authenticated SELECT 1 passed. API `/health` does not check it. | No fresh/upgrade/constraint/access integration suite. Task 5 must use isolated databases and preserve cg_user. |
| MinIO | MINIO_ENDPOINT/access/secret/bucket; boto3 ObjectStore | S3 client optional; no close/explicit bounded timeout; bucket creation on upload; storage errors become 503. Local write is current default. | S3 put/get implementation exists; key validates tenant only, no business-unit authorization. Workers read ObjectStore. | BLOCKED: no MinIO container and credentials absent. No runtime durability evidence. | Task 10 deploy/configure MinIO, then actual put/get/download SHA-256 equality; task 11 cross-tenant/unit access denial. |
| RabbitMQ | RABBITMQ_URL; Kombu/Celery | Outbox publisher retries at next beat tick; no concurrency lock or explicit publisher confirmation/queue partitioning. | Actual dispatch_outbox publishes tenant/document or sweep IDs. Consumer reloads tenant rows. | Authenticated AMQP connection passed after restarting existing container. | No real queued processing/idempotency/outage test. |
| Celery | broker RabbitMQ, result backend Redis; celery_app/tasks | Late ack and worker-lost requeue; bounded task retries; no per-run checkpoint/uniqueness. | Actual task implementations for ingestion/sweep; no separate interactive/sweep pools. | BLOCKED: no worker advertising ClauseGuard tasks. Current installed core import also fails outside test alias. | Repair package install in task 4; task 12 real worker job/terminal-state test; task 55 restart drill. |
| Qdrant | QDRANT_URL/API_KEY/collection; QdrantClient | Client per Ask/task, no close in product adapter; collection ensure before each point; read failure logged/falls back to SQL. | Actual dense-only upsert/query with tenant/unit/document/family filters. Sparse indexing/retrieval absent; pre-rank version semantics incomplete. | Collections API passed after restarting existing container. | No real sparse/dense/metadata isolation integration test; tasks 25-29. Latest image tag must be pinned for release. |
| Neo4j | NEO4J_URI/user/password declared; neo4j dependency | No product adapter/driver lifecycle/retry handling. | No runtime write or traversal. | BLOCKED: service unavailable; no Neo4j container. | Tasks 30-32 real scoped graph index/traversal; missing adapter must not be represented as working. |
| Redis | REDIS_URL; Celery backend | Celery manages backend; no product embedding/answer cache client lifecycle or failure policy. | Celery results only; ScopeContext.cache_key unused and exposes raw question in key. | Authenticated PING passed after restart. | Tasks 51/52 scoped cache/invalidation tests; no answer/embedding cache currently. |

## Commands and acceptance still required

Run from src:

```powershell
.\.venv\Scripts\python.exe scripts/probe_infrastructure.py
.\.venv\Scripts\python.exe -c "import clauseguard_core, clauseguard_api, clauseguard_worker"
```

The first command currently returns nonzero because MinIO, Neo4j and the ClauseGuard
worker are missing. Acceptance: all seven real probes reachable, then separate
isolated infrastructure workflow tests pass. The second currently fails because
the editable distribution was not refreshed after restructuring. Acceptance: normal
imports resolve without pytest's manual alias. These are concrete runtime blockers,
not a justification to substitute mocks in production.

The live model key was initially absent. The user subsequently confirmed configuring
it locally; presence and authenticated model use still require verification. The
audit never writes the key, URLs, credentials, or raw client exception text to reports.

## Probe reliability

The first probe draft exposed two audit-code defects: QdrantClient is not a context
manager in the installed version, and concurrent lazy Kombu/Celery imports raced.
The probe now closes Qdrant explicitly and initializes/probes transports sequentially.
Only the corrected probe output is used above. Two probe-result tests verify redaction
and distinguish REACHABLE from integration verification; they are unit tests only.
