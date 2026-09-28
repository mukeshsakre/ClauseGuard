"""Bounded, read-only agentic retrieval. Scope is fixed before any tool can run."""

from time import perf_counter
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from clauseguard_core.config import get_settings
from clauseguard_core.domain.entities import (
    ContractDocument,
    JudgmentTrace,
    PipelineConfiguration,
    TextChunk,
)
from clauseguard_core.domain.scope import ScopeContext
from clauseguard_core.infrastructure.model_provider import ModelProvider
from clauseguard_core.infrastructure.search import QdrantSearch
from clauseguard_core.observability import Observability


MANDATORY_STAGES = {"crag", "citation_verifier", "tenant_scope"}
DEFAULT_STAGES = {
    "hyde": True,
    "hybrid_search": True,
    "graph_expansion": False,
    "reranker": False,
    "semantic_cache": False,
    "crag": True,
    "citation_verifier": True,
    "tenant_scope": True,
}


class AgenticAsk:
    """Plans and retries retrieval, but leaves the compliance decision to typed logic."""

    def __init__(self, session: Session, provider: ModelProvider | None = None):
        self._session = session
        self._provider = provider or ModelProvider()
        self._search = QdrantSearch()
        self._events = Observability(session)

    def _pipeline(self, tenant_id: str) -> tuple[int, dict[str, bool]]:
        config = self._session.scalar(
            select(PipelineConfiguration)
            .where(PipelineConfiguration.tenant_id == tenant_id)
            .order_by(PipelineConfiguration.version.desc())
        )
        if config is None:
            return 1, DEFAULT_STAGES.copy()
        settings = {**DEFAULT_STAGES, **(config.settings or {})}
        for unavailable_stage in ("graph_expansion", "reranker", "semantic_cache"):
            settings[unavailable_stage] = False
        for stage in MANDATORY_STAGES:
            settings[stage] = True
        return config.version, settings

    def _lexical_search(self, query: str, scope: ScopeContext, limit: int) -> list[dict[str, object]]:
        statement = select(TextChunk).where(TextChunk.tenant_id == scope.tenant_id)
        if scope.business_unit_ids:
            statement = statement.where(TextChunk.business_unit_id.in_(scope.business_unit_ids))
        if scope.scope_type == "document":
            statement = statement.where(TextChunk.document_id == scope.scope_id)
        else:
            statement = statement.where(TextChunk.family_id == scope.scope_id)
            if scope.document_ids:
                statement = statement.where(TextChunk.document_id.in_(scope.document_ids))
        words = [word.strip(".,?!:;()[]{}\"'").lower() for word in query.split()]
        words = [word for word in words if len(word) > 2][:8]
        if words:
            from sqlalchemy import or_

            statement = statement.where(or_(*(TextChunk.text.ilike(f"%{word}%") for word in words)))
        rows = self._session.scalars(statement.limit(limit)).all()
        return [
            {
                "id": row.id,
                "score": 0.5,
                "tenant_id": row.tenant_id,
                "business_unit_id": row.business_unit_id,
                "family_id": row.family_id,
                "document_id": row.document_id,
                "page": row.page,
                "text": row.text,
                "chunk_type": row.chunk_type,
                "row_header": row.row_header,
                "column_header": row.column_header,
            }
            for row in rows
        ]

    def _retrieve(self, query: str, scope: ScopeContext, stages: dict[str, bool]) -> list[dict[str, object]]:
        if not scope.business_unit_ids or not scope.document_ids:
            return []
        lexical = self._lexical_search(query, scope, 20) if stages["hybrid_search"] else []
        dense: list[dict[str, object]] = []
        if self._provider.available:
            try:
                vector = self._provider.embed([query])[0]
                dense = self._search.search(vector, scope, limit=20)
            except Exception as exc:
                # The event records the failing adapter and code, never the customer query.
                self._events.event(
                    tenant_id=scope.tenant_id,
                    component="qdrant",
                    message="Dense retrieval failed",
                    severity="ERROR",
                    details={"error_type": type(exc).__name__},
                )
        # Reciprocal-rank fusion combines independently scoped dense and lexical results.
        ranks: dict[str, tuple[float, dict[str, object]]] = {}
        for result_list in (dense, lexical):
            for rank, result in enumerate(result_list, start=1):
                chunk_id = str(result["id"])
                previous = ranks.get(chunk_id, (0.0, result))[0]
                ranks[chunk_id] = (previous + 1.0 / (60 + rank), result)
        candidates = [entry[1] for entry in sorted(ranks.values(), key=lambda item: item[0], reverse=True)]
        # Resolve all candidates against Postgres before exposing them to generation.
        allowed_ids = {str(item["id"]) for item in candidates}
        if not allowed_ids:
            return []
        statement = select(TextChunk).where(
            TextChunk.id.in_(allowed_ids),
            TextChunk.tenant_id == scope.tenant_id,
            TextChunk.business_unit_id.in_(scope.business_unit_ids),
        )
        if scope.scope_type == "document":
            statement = statement.where(TextChunk.document_id == scope.scope_id)
        else:
            statement = statement.where(
                TextChunk.family_id == scope.scope_id,
                TextChunk.document_id.in_(scope.document_ids),
            )
        query_chunks = self._session.scalars(statement).all()
        safe = {row.id: row for row in query_chunks}
        checked: list[dict[str, object]] = []
        for candidate in candidates:
            row = safe.get(str(candidate["id"]))
            if row is None:
                continue
            if row.business_unit_id not in scope.business_unit_ids:
                continue
            if scope.scope_type == "document" and row.document_id != scope.scope_id:
                continue
            if scope.scope_type == "family":
                if row.family_id != scope.scope_id:
                    continue
                if scope.document_ids and row.document_id not in scope.document_ids:
                    continue
            checked.append(
                {
                    "id": row.id,
                    "document_id": row.document_id,
                    "family_id": row.family_id,
                    "page": row.page,
                    "text": row.text,
                    "chunk_type": row.chunk_type,
                    "row_header": row.row_header,
                    "column_header": row.column_header,
                }
            )
        # Optional stages without an installed adapter are explicitly unavailable.
        return checked[:12]

    def answer(
        self,
        *,
        actor_id: str,
        question: str,
        scope: ScopeContext,
        pipeline_snapshot: dict[str, bool] | None = None,
        pipeline_version: int | None = None,
        corrective_rounds: int | None = None,
    ) -> dict[str, object]:
        started = perf_counter()
        trace_id = str(uuid4())
        version, stages = self._pipeline(scope.tenant_id)
        if pipeline_version is not None:
            version = pipeline_version
        if pipeline_snapshot is not None:
            stages = {**DEFAULT_STAGES, **pipeline_snapshot}
            for mandatory_stage in MANDATORY_STAGES:
                stages[mandatory_stage] = True
        steps: list[dict[str, object]] = [
            {"stage": "scope_lock", "status": "passed", "scope_type": scope.scope_type, "scope_id": scope.scope_id},
            {"stage": "pipeline_config", "status": "loaded", "version": version, "enabled": stages},
        ]
        scope_description = f"{scope.scope_type}:{scope.scope_id}; documents={len(scope.document_ids)}"
        try:
            queries = self._provider.plan_queries(question, scope_description) if stages["hyde"] else [question]
        except Exception as exc:
            self._events.event(
                tenant_id=scope.tenant_id,
                actor_id=actor_id,
                trace_id=trace_id,
                component="agent_planner",
                message="Planner failed; original query retained",
                severity="WARN",
                details={"error_type": type(exc).__name__},
            )
            queries = [question]
        steps.append({"stage": "query_plan", "status": "complete", "query_count": len(queries)})

        configured_rounds = (
            get_settings().max_agent_retrieval_rounds
            if corrective_rounds is None
            else corrective_rounds
        )
        max_rounds = min(2, max(0, configured_rounds))
        candidates: list[dict[str, object]] = []
        grade = "incorrect"
        for round_number in range(max_rounds + 1):
            combined: dict[str, dict[str, object]] = {}
            for query in queries:
                for candidate in self._retrieve(query, scope, stages):
                    combined[str(candidate["id"])] = candidate
            candidates = list(combined.values())
            evidence_text = [str(item["text"]) for item in candidates[:8]]
            try:
                grade = self._provider.grade_relevance(question, evidence_text)
            except Exception as exc:
                grade = "ambiguous"
                self._events.event(
                    tenant_id=scope.tenant_id,
                    actor_id=actor_id,
                    trace_id=trace_id,
                    component="crag",
                    message="Evidence grading failed closed",
                    severity="WARN",
                    details={"error_type": type(exc).__name__},
                )
            steps.append(
                {
                    "stage": "retrieval",
                    "status": "complete",
                    "round": round_number,
                    "candidate_count": len(candidates),
                    "relevance_grade": grade,
                    "source_ids": [str(item["id"]) for item in candidates[:8]],
                }
            )
            if grade == "correct":
                break
            if round_number >= max_rounds or grade == "incorrect":
                break
            # Re-plan only from the original question. Scope and tool permissions stay fixed.
            try:
                refined = self._provider.plan_queries(
                    question,
                    f"{scope_description}; retrieval correction round {round_number + 1}; "
                    f"available evidence types: {', '.join(sorted({str(x['chunk_type']) for x in candidates}))}",
                )
                queries = list(dict.fromkeys([question, *refined[:2]]))
            except Exception as exc:
                self._events.event(
                    tenant_id=scope.tenant_id,
                    actor_id=actor_id,
                    trace_id=trace_id,
                    component="agent_planner",
                    message="Corrective query planning failed",
                    severity="WARN",
                    details={"error_type": type(exc).__name__},
                )
                break

        summary = ""
        citations: list[dict[str, object]] = []
        status = "needs_review"
        if grade == "correct" and candidates and self._provider.available:
            for attempt in range(3):
                try:
                    draft = self._provider.answer(question, candidates[:8])
                except Exception as exc:
                    steps.append({"stage": "generation", "status": "failed", "error_type": type(exc).__name__})
                    break
                valid: list[dict[str, object]] = []
                for citation in draft.get("citations", []):
                    if not isinstance(citation, dict):
                        continue
                    evidence = next((item for item in candidates if item["id"] == citation.get("evidence_id")), None)
                    quote = citation.get("quote")
                    if evidence is None or not isinstance(quote, str) or not quote:
                        continue
                    source_text = str(evidence["text"])
                    if quote not in source_text:
                        continue
                    # Re-check source scope immediately before returning a citation.
                    if scope.scope_type == "document" and evidence["document_id"] != scope.scope_id:
                        continue
                    if scope.scope_type == "family" and evidence["document_id"] not in scope.document_ids:
                        continue
                    doc = self._session.scalar(
                        select(ContractDocument).where(
                            ContractDocument.id == str(evidence["document_id"]),
                            ContractDocument.tenant_id == scope.tenant_id,
                            ContractDocument.business_unit_id.in_(scope.business_unit_ids),
                        )
                    )
                    if doc is None or doc.family_id != scope.scope_id and scope.scope_type == "family":
                        continue
                    valid.append(
                        {
                            "document_id": doc.id,
                            "document_name": doc.name,
                            "chunk_id": evidence["id"],
                            "quote": quote,
                            "page": evidence["page"],
                            "row_header": evidence.get("row_header", ""),
                            "column_header": evidence.get("column_header", ""),
                        }
                    )
                steps.append(
                    {
                        "stage": "citation_verifier",
                        "status": "passed" if valid else "failed",
                        "attempt": attempt + 1,
                        "citation_count": len(valid),
                    }
                )
                if valid:
                    citations = valid
                    summary = str(draft.get("summary", ""))[:4000]
                    status = "answered"
                    break
        result = {
            "id": trace_id,
            "status": status,
            "summary": summary if status == "answered" else "Needs review: I could not verify sufficient in-scope evidence.",
            "scope_type": scope.scope_type,
            "scope_id": scope.scope_id,
            "citations": citations,
            "pipeline_version": version,
            "relevance_grade": grade,
            "latency_ms": round((perf_counter() - started) * 1000),
        }
        self._session.add(
            JudgmentTrace(
                id=trace_id,
                tenant_id=scope.tenant_id,
                actor_id=actor_id,
                scope_type=scope.scope_type,
                scope_id=scope.scope_id,
                pipeline_version=version,
                question=question,
                result=result,
                steps=steps,
            )
        )
        self._events.event(
            tenant_id=scope.tenant_id,
            actor_id=actor_id,
            trace_id=trace_id,
            component="agentic_ask",
            message="Ask completed",
            details={"status": status, "scope_type": scope.scope_type, "pipeline_version": version},
        )
        self._session.commit()
        return {**result, "trace": steps}
