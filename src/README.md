# ClauseGuard

ClauseGuard is a tenant-isolated contract compliance service with explicitly scoped Ask, asynchronous ingestion, and rule-directed portfolio sweeps.

## Local setup

1. Create `src/.venv` and install the package from this directory with `pip install -e ".[dev]"`.
2. Copy `.env.example` to `.env`, set a random `JWT_SECRET`, database credentials, and either an intentional first tenant admin account or an initial super-admin account.
3. Create `deploy/.env` from `deploy/.env.example`, choose a unique PostgreSQL password, then run `docker compose --env-file deploy/.env -f deploy/compose.yaml up -d`.
4. Configure the existing Qdrant, RabbitMQ, and Redis host endpoints in `.env`. ClauseGuard does not start copies of those services. Local document originals use the tenant-prefixed filesystem store in `deploy/object-data`; set `OBJECT_STORE_BACKEND=s3` to use the configured S3-compatible endpoint.
5. Run the API and worker from `src` using `.venv`: `uvicorn clauseguard_api.main:app --app-dir app/api --reload` and `celery -A clauseguard_worker.celery_app:celery_app worker --beat --app-dir app/worker` (the beat scheduler dispatches the transactional outbox).
6. Run the web app from `src/app/web` using its local npm dependencies.

Alembic applies additive migrations at API startup. It does not delete tables or data. The current RAGGauge source has a legacy `users(id, username, password_hash, role, enabled)` table rather than `cg_user`; the one existing row was copied into ClauseGuard's `cg_user`, with username retained as the login identifier, its Argon2 hash and stored role preserved, and only the minimal tenant and business unit created. The source row remains intact. For a compatible `cg_user` source, set `SOURCE_CG_USER_DATABASE_URL` and `DATABASE_URL`, then run `.venv/Scripts/python scripts/migrate_cg_user.py` from `src`. The utility aborts rather than silently dropping incompatible columns. Do not point the ClauseGuard service at another product's database.

## Scope and evidence rules

- Document Ask searches only its selected document.
- Family Ask searches only in-force, indexed or partially indexed documents in its selected family and labels every citation with its source.
- Portfolio Ask reads findings from the latest completed sweep. If none exists, it queues a normal sweep.
- Agent correction is capped at two retrieval rounds. The controller cannot change scope, browse the web, mutate policy, or issue a compliance verdict.
- CRAG relevance grading, citation verification, and tenant scope enforcement are mandatory. Unsupported sweep judgments remain `unchecked` for human review.

The currently installed optional pipeline stages are query planning and hybrid retrieval. Graph expansion, reranking, and semantic caching are shown as unavailable until their adapters and isolation tests are implemented.
