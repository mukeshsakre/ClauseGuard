"""Immutable request scope carried through every retrieval and storage adapter."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ScopeContext:
    tenant_id: str
    business_unit_ids: tuple[str, ...]
    scope_type: str
    scope_id: str
    document_ids: tuple[str, ...]

    def cache_key(self, query: str, config_version: int) -> str:
        """Include every boundary in the key so cached answers cannot cross scopes."""
        scope = ":".join(sorted(self.document_ids)) or self.scope_id
        units = ":".join(sorted(self.business_unit_ids))
        return f"{self.tenant_id}:{units}:{self.scope_type}:{scope}:{config_version}:{query.strip().casefold()}"
