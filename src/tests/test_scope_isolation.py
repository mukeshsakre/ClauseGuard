"""Synthetic sentinel cases proving that retrieval cannot escape the selected scope."""

from collections.abc import Iterator

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from clauseguard_core.application import agentic_ask
from clauseguard_core.application.scope_resolver import resolve_scope
from clauseguard_core.domain.actor import Actor
from clauseguard_core.domain.entities import (
    Base,
    BusinessUnit,
    ContractDocument,
    ContractFamily,
    Tenant,
    TextChunk,
)
from clauseguard_core.domain.scope import ScopeContext
from clauseguard_core.infrastructure.object_store import ObjectStore


@pytest.fixture
def db_session() -> Iterator[Session]:
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    session = factory()
    tenant_one = Tenant(id="tenant-one", name="Tenant One")
    tenant_two = Tenant(id="tenant-two", name="Tenant Two")
    unit_one = BusinessUnit(id="unit-one", tenant_id=tenant_one.id, name="Contracts")
    unit_two = BusinessUnit(id="unit-two", tenant_id=tenant_two.id, name="Contracts")
    family_one = ContractFamily(
        id="family-one", tenant_id=tenant_one.id, business_unit_id=unit_one.id
    )
    family_two = ContractFamily(
        id="family-two", tenant_id=tenant_two.id, business_unit_id=unit_two.id
    )
    docs = [
        _document("document-a", tenant_one.id, unit_one.id, family_one.id, "indexed", True),
        _document("document-b", tenant_one.id, unit_one.id, family_one.id, "indexed", True),
        _document("document-old", tenant_one.id, unit_one.id, family_one.id, "indexed", False),
        _document("document-queued", tenant_one.id, unit_one.id, family_one.id, "queued", True),
        _document(
            "document-other-tenant", tenant_two.id, unit_two.id, family_two.id, "indexed", True
        ),
    ]
    session.add_all([tenant_one, tenant_two, unit_one, unit_two, family_one, family_two, *docs])
    session.flush()
    session.add_all(
        [
            _chunk(
                "chunk-a", tenant_one.id, unit_one.id, family_one.id, docs[0].id, "A_SENTINEL_731"
            ),
            _chunk(
                "chunk-b", tenant_one.id, unit_one.id, family_one.id, docs[1].id, "B_SENTINEL_942"
            ),
            _chunk(
                "chunk-foreign",
                tenant_two.id,
                unit_two.id,
                family_two.id,
                docs[4].id,
                "TENANT_SENTINEL_516",
            ),
        ]
    )
    session.commit()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def test_resolver_rejects_a_document_from_another_tenant(db_session: Session) -> None:
    actor = _actor()
    with pytest.raises(HTTPException) as result:
        resolve_scope(db_session, actor, "document", "document-other-tenant")
    assert result.value.status_code == 404


def test_family_scope_includes_only_in_force_indexed_documents(db_session: Session) -> None:
    scope = resolve_scope(db_session, _actor(), "family", "family-one")
    assert set(scope.document_ids) == {"document-a", "document-b"}


def test_dense_candidates_outside_selected_document_are_discarded(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    foreign = {
        "id": "chunk-b",
        "tenant_id": "tenant-one",
        "business_unit_id": "unit-one",
        "family_id": "family-one",
        "document_id": "document-b",
        "page": 1,
        "text": "B_SENTINEL_942",
        "chunk_type": "prose",
    }
    cross_tenant = {
        **foreign,
        "id": "chunk-foreign",
        "tenant_id": "tenant-two",
        "business_unit_id": "unit-two",
        "family_id": "family-two",
        "document_id": "document-other-tenant",
        "text": "TENANT_SENTINEL_516",
    }

    class FakeSearch:
        def search(self, _vector: list[float], _scope: ScopeContext, limit: int = 20):
            return [foreign, cross_tenant]

    class FakeProvider:
        available = True

        def embed(self, _texts: list[str]):
            return [[0.0, 1.0]]

        def plan_queries(self, question: str, _description: str):
            return [question]

        def grade_relevance(self, _question: str, evidence: list[str]):
            return "correct" if evidence else "incorrect"

    monkeypatch.setattr(agentic_ask, "QdrantSearch", FakeSearch)
    scope = ScopeContext(
        tenant_id="tenant-one",
        business_unit_ids=("unit-one",),
        scope_type="document",
        scope_id="document-a",
        document_ids=("document-a",),
    )
    answer = agentic_ask.AgenticAsk(db_session, provider=FakeProvider()).answer(
        actor_id="user-one", question="B_SENTINEL_942", scope=scope
    )
    assert answer["status"] == "needs_review"
    assert answer["citations"] == []
    assert all("B_SENTINEL_942" not in str(step) for step in answer["trace"])
    assert all("TENANT_SENTINEL_516" not in str(step) for step in answer["trace"])


def test_filesystem_storage_checks_tenant_prefix(tmp_path) -> None:
    storage = ObjectStore()
    storage._root = tmp_path
    key = storage.put("tenant-one", "document-a", b"private bytes")
    assert storage.get("tenant-one", key) == b"private bytes"
    with pytest.raises(PermissionError):
        storage.get("tenant-two", key)
    with pytest.raises(PermissionError):
        storage.get("tenant-one", "tenant-one/../tenant-two/original")


def test_agent_stops_after_two_corrective_retrieval_rounds(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    scoped_candidate = {
        "id": "chunk-a",
        "tenant_id": "tenant-one",
        "business_unit_id": "unit-one",
        "family_id": "family-one",
        "document_id": "document-a",
        "page": 1,
        "text": "A_SENTINEL_731",
        "chunk_type": "prose",
    }

    class FakeSearch:
        searches = 0

        def search(self, _vector: list[float], _scope: ScopeContext, limit: int = 20):
            self.searches += 1
            return [scoped_candidate]

    class AmbiguousProvider:
        available = True
        grades = 0

        def embed(self, _texts: list[str]):
            return [[0.0, 1.0]]

        def plan_queries(self, question: str, _description: str):
            return [question]

        def grade_relevance(self, _question: str, _evidence: list[str]):
            self.grades += 1
            return "ambiguous"

    search = FakeSearch()
    provider = AmbiguousProvider()
    monkeypatch.setattr(agentic_ask, "QdrantSearch", lambda: search)
    scope = ScopeContext(
        tenant_id="tenant-one",
        business_unit_ids=("unit-one",),
        scope_type="document",
        scope_id="document-a",
        document_ids=("document-a",),
    )
    answer = agentic_ask.AgenticAsk(db_session, provider=provider).answer(
        actor_id="user-one",
        question="What does the selected document say?",
        scope=scope,
        corrective_rounds=2,
    )
    retrieval_steps = [step for step in answer["trace"] if step["stage"] == "retrieval"]
    assert [step["round"] for step in retrieval_steps] == [0, 1, 2]
    assert search.searches == 3
    assert provider.grades == 3
    assert answer["status"] == "needs_review"


def _actor() -> Actor:
    return Actor(
        id="user-one",
        email="reviewer@example.test",
        name="Reviewer",
        role="analyst",
        tenant_id="tenant-one",
        business_unit_ids=("unit-one",),
    )


def _document(
    identifier: str, tenant_id: str, unit_id: str, family_id: str, status: str, in_force: bool
) -> ContractDocument:
    return ContractDocument(
        id=identifier,
        tenant_id=tenant_id,
        business_unit_id=unit_id,
        family_id=family_id,
        name=f"{identifier}.pdf",
        sha256="0" * 64,
        object_key=f"{tenant_id}/{identifier}/original.pdf",
        status=status,
        in_force=in_force,
    )


def _chunk(
    identifier: str, tenant_id: str, unit_id: str, family_id: str, document_id: str, text: str
):
    return TextChunk(
        id=identifier,
        tenant_id=tenant_id,
        business_unit_id=unit_id,
        family_id=family_id,
        document_id=document_id,
        text=text,
        page=1,
        ordinal=0,
    )
