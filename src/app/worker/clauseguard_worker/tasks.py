"""Idempotent worker tasks for ingestion and incremental sweep runs."""

from datetime import datetime, timezone
from uuid import NAMESPACE_URL, uuid4, uuid5

from sqlalchemy import select

from clauseguard_core.application.agentic_ask import AgenticAsk
from clauseguard_core.domain.entities import (
    ContractDocument,
    ContractFamily,
    Finding,
    OutboxEvent,
    PolicyRule,
    SweepRun,
    TextChunk,
)
from clauseguard_core.domain.scope import ScopeContext
from clauseguard_core.ingestion.extract import extract_document
from clauseguard_core.infrastructure.database import SessionFactory
from clauseguard_core.infrastructure.model_provider import ModelProvider
from clauseguard_core.infrastructure.object_store import ObjectStore
from clauseguard_core.infrastructure.search import QdrantSearch
from clauseguard_core.observability import Observability
from clauseguard_worker.celery_app import celery_app


@celery_app.task(name="clauseguard.dispatch_outbox")
def dispatch_outbox() -> int:
    """Publish committed rows; a later tick retries anything not acknowledged by RabbitMQ."""
    published = 0
    with SessionFactory() as session:
        items = session.scalars(
            select(OutboxEvent).where(OutboxEvent.published_at.is_(None)).order_by(OutboxEvent.created_at).limit(50)
        ).all()
        for item in items:
            try:
                if item.event_type == "document.ingest":
                    process_ingestion.delay(str(item.payload["document_id"]), item.tenant_id)
                elif item.event_type.startswith("sweep."):
                    process_sweep.delay(str(item.payload["sweep_id"]), item.tenant_id)
                item.published_at = datetime.now(timezone.utc)
                published += 1
            except Exception as exc:
                Observability(session).event(
                    tenant_id=item.tenant_id,
                    component="outbox_dispatcher",
                    message="Queued work will be retried",
                    severity="WARN",
                    details={"event_id": item.id, "error_type": type(exc).__name__},
                )
        session.commit()
    return published


@celery_app.task(name="clauseguard.process_ingestion", bind=True, max_retries=5)
def process_ingestion(task, document_id: str, tenant_id: str) -> dict[str, object]:
    with SessionFactory() as session:
        document = session.scalar(
            select(ContractDocument).where(
                ContractDocument.id == document_id,
                ContractDocument.tenant_id == tenant_id,
            )
        )
        if document is None:
            return {"status": "not_found"}
        if document.status == "indexed":
            return {"status": "indexed", "document_id": document_id}
        document.status = "extracting"
        session.commit()
        try:
            original = ObjectStore().get(tenant_id, document.object_key)
            chunks, pages, failed_pages, failed_tables = extract_document(document.name, original)
            if not chunks:
                document.status = "needs_ocr" if failed_pages else "failed"
                document.page_count = pages
                document.failed_pages = failed_pages
                document.table_failed_pages = failed_tables
                Observability(session).event(
                    tenant_id=tenant_id, component="ingestion", message="Document text extraction incomplete",
                    severity="WARN", details={"document_id": document_id, "failed_pages": failed_pages},
                )
                session.commit()
                return {"status": document.status, "document_id": document_id}

            provider = ModelProvider()
            if not provider.available:
                document.status = "failed"
                session.commit()
                return {"status": "failed", "reason": "embedding_provider_unconfigured"}
            vectors = provider.embed([chunk.text for chunk in chunks])
            session.query(TextChunk).filter(
                TextChunk.tenant_id == tenant_id, TextChunk.document_id == document_id
            ).delete(synchronize_session=False)
            search = QdrantSearch()
            for index, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True)):
                chunk_id = str(uuid5(NAMESPACE_URL, f"clauseguard:{tenant_id}:{document_id}:{index}"))
                row = TextChunk(
                    id=chunk_id,
                    tenant_id=tenant_id,
                    business_unit_id=document.business_unit_id,
                    family_id=document.family_id,
                    document_id=document.id,
                    page=chunk.page,
                    ordinal=index,
                    text=chunk.text,
                    chunk_type=chunk.kind,
                    table_id=chunk.table_id,
                    row_index=chunk.row_index,
                    column_index=chunk.column_index,
                    row_header=chunk.row_header,
                    column_header=chunk.column_header,
                )
                session.add(row)
                search.upsert(
                    chunk_id,
                    vector,
                    {
                        "tenant_id": tenant_id,
                        "business_unit_id": document.business_unit_id,
                        "family_id": document.family_id,
                        "document_id": document.id,
                        "page": chunk.page,
                        "text": chunk.text,
                        "chunk_type": chunk.kind,
                        "row_header": chunk.row_header,
                        "column_header": chunk.column_header,
                    },
                )
            document.page_count = pages
            document.failed_pages = failed_pages
            document.table_failed_pages = failed_tables
            document.status = "indexed" if not failed_pages else "partial"
            Observability(session).event(
                tenant_id=tenant_id, component="ingestion", message="Document ingestion completed",
                severity="INFO" if document.status == "indexed" else "WARN",
                details={"document_id": document_id, "chunk_count": len(chunks), "status": document.status},
            )
            session.commit()
            return {"status": document.status, "document_id": document_id, "chunks": len(chunks)}
        except Exception as exc:
            session.rollback()
            current = session.scalar(
                select(ContractDocument).where(
                    ContractDocument.id == document_id, ContractDocument.tenant_id == tenant_id
                )
            )
            if current is not None:
                current.status = "failed"
                Observability(session).event(
                    tenant_id=tenant_id, component="ingestion", message="Document ingestion failed",
                    severity="ERROR", details={"document_id": document_id, "error_type": type(exc).__name__},
                )
                session.commit()
            raise task.retry(exc=exc, countdown=min(2 ** task.request.retries, 60))


@celery_app.task(name="clauseguard.process_sweep", bind=True, max_retries=3)
def process_sweep(task, sweep_id: str, tenant_id: str) -> dict[str, object]:
    """Evaluate the run's fixed snapshot; unsupported or incomplete evidence stays unchecked."""
    with SessionFactory() as session:
        run = session.scalar(
            select(SweepRun).where(SweepRun.id == sweep_id, SweepRun.tenant_id == tenant_id)
        )
        if run is None:
            return {"status": "not_found"}
        if run.status == "complete":
            return {"status": "complete", "sweep_id": sweep_id}
        run.status = "running"
        session.commit()
        try:
            families = session.scalars(
                select(ContractFamily).where(
                    ContractFamily.tenant_id == tenant_id,
                    ContractFamily.status == "active",
                )
            ).all()
            rules = session.scalars(
                select(PolicyRule).where(PolicyRule.tenant_id == tenant_id, PolicyRule.active.is_(True))
            ).all()
            judgment_count = 0
            # A run always uses the stages recorded when the user started it.
            run_stages = dict(run.scope.get("pipeline_stages", {}))
            for family in families:
                docs = session.scalars(
                    select(ContractDocument).where(
                        ContractDocument.tenant_id == tenant_id,
                        ContractDocument.family_id == family.id,
                        ContractDocument.in_force.is_(True),
                        ContractDocument.status.in_(("indexed", "partial")),
                    )
                ).all()
                if not docs:
                    continue
                doc_ids = tuple(doc.id for doc in docs)
                scope = ScopeContext(
                    tenant_id=tenant_id,
                    business_unit_ids=(family.business_unit_id,),
                    scope_type="family",
                    scope_id=family.id,
                    document_ids=doc_ids,
                )
                for rule in rules:
                    existing = session.scalar(
                        select(Finding).where(
                            Finding.tenant_id == tenant_id,
                            Finding.family_id == family.id,
                            Finding.rule_id == rule.id,
                            Finding.sweep_id == sweep_id,
                        )
                    )
                    if existing:
                        continue
                    response = AgenticAsk(session).answer(
                        actor_id=run.requested_by,
                        question=rule.retrieval_topic or rule.statement,
                        scope=scope,
                        pipeline_snapshot={**run_stages, "hyde": False},
                        pipeline_version=run.config_version,
                        corrective_rounds=0,
                    )
                    citations = response.get("citations", [])
                    has_coverage_gaps = any(doc.failed_pages or doc.table_failed_pages for doc in docs)
                    verdict = "unchecked"
                    summary = str(response.get("summary", ""))
                    citation_chunk_id = None
                    if response.get("status") == "answered" and citations:
                        citation = citations[0]
                        citation_chunk_id = str(citation["chunk_id"])
                        summary = (
                            "Evidence retrieved for human review. The rule evaluator has not confirmed "
                            "a typed verdict. " + str(citation.get("quote", ""))[:500]
                        )
                    elif has_coverage_gaps:
                        summary = "Unchecked: document extraction has coverage gaps; absence cannot be concluded."
                    else:
                        summary = (
                            "Unchecked: no relevant evidence was retrieved. A rule-directed evaluation "
                            "is required before recording a compliance verdict."
                        )
                    session.add(
                        Finding(
                            id=str(uuid4()), tenant_id=tenant_id, family_id=family.id,
                            document_id=str(citations[0]["document_id"]) if citations else None,
                            rule_id=rule.id, sweep_id=sweep_id, verdict=verdict,
                            summary=summary, citation_chunk_id=citation_chunk_id,
                        )
                    )
                    judgment_count += 1
                    session.commit()
            run.status = "complete"
            run.completed_at = datetime.now(timezone.utc)
            Observability(session).event(
                tenant_id=tenant_id, component="sweep", message="Sweep completed",
                details={"sweep_id": sweep_id, "judgment_count": judgment_count},
            )
            session.commit()
            return {"status": "complete", "sweep_id": sweep_id, "judgments": judgment_count}
        except Exception as exc:
            session.rollback()
            current = session.scalar(select(SweepRun).where(SweepRun.id == sweep_id, SweepRun.tenant_id == tenant_id))
            if current is not None:
                current.status = "failed"
                Observability(session).event(
                    tenant_id=tenant_id, component="sweep", message="Sweep failed",
                    severity="ERROR", details={"sweep_id": sweep_id, "error_type": type(exc).__name__},
                )
                session.commit()
            raise task.retry(exc=exc, countdown=min(2 ** task.request.retries, 60))
