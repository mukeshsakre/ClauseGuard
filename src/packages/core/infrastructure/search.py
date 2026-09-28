"""Tenant- and target-bound Qdrant dense-vector adapter."""

from qdrant_client import QdrantClient, models

from clauseguard_core.config import get_settings
from clauseguard_core.domain.scope import ScopeContext


class QdrantSearch:
    def __init__(self) -> None:
        settings = get_settings()
        self._collection = settings.qdrant_collection
        self._client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)
        self._dimensions = settings.openai_embedding_dimensions

    def ensure_collection(self) -> None:
        if not self._client.collection_exists(self._collection):
            self._client.create_collection(
                collection_name=self._collection,
                vectors_config=models.VectorParams(size=self._dimensions, distance=models.Distance.COSINE),
            )

    def upsert(self, point_id: str, vector: list[float], payload: dict[str, object]) -> None:
        self.ensure_collection()
        self._client.upsert(
            collection_name=self._collection,
            points=[models.PointStruct(id=point_id, vector=vector, payload=payload)],
            wait=True,
        )

    def search(self, vector: list[float], scope: ScopeContext, limit: int = 20) -> list[dict[str, object]]:
        # The tenant predicate is unconditional. Document/family targets are always added.
        if not scope.business_unit_ids or not scope.document_ids:
            return []
        filters: list[models.FieldCondition] = [
            models.FieldCondition(key="tenant_id", match=models.MatchValue(value=scope.tenant_id))
        ]
        filters.append(
            models.FieldCondition(
                key="business_unit_id",
                match=models.MatchAny(any=list(scope.business_unit_ids)),
            )
        )
        if scope.scope_type == "document":
            filters.append(
                models.FieldCondition(
                    key="document_id", match=models.MatchValue(value=scope.scope_id)
                )
            )
        else:
            filters.append(
                models.FieldCondition(key="family_id", match=models.MatchValue(value=scope.scope_id))
            )
            if scope.document_ids:
                filters.append(
                    models.FieldCondition(
                        key="document_id", match=models.MatchAny(any=list(scope.document_ids))
                    )
                )
        response = self._client.query_points(
            collection_name=self._collection,
            query=vector,
            query_filter=models.Filter(must=filters),
            limit=limit,
            with_payload=True,
        )
        results: list[dict[str, object]] = []
        for point in response.points:
            payload = point.payload or {}
            # Defend against a misconfigured index in addition to the server-side filter.
            if payload.get("tenant_id") != scope.tenant_id:
                continue
            if scope.scope_type == "document" and payload.get("document_id") != scope.scope_id:
                continue
            if scope.scope_type == "family":
                if payload.get("family_id") != scope.scope_id:
                    continue
                if scope.document_ids and payload.get("document_id") not in scope.document_ids:
                    continue
            results.append({"id": str(point.id), "score": point.score, **payload})
        return results
