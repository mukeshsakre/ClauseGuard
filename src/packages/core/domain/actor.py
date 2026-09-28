"""Authenticated principal passed from the API boundary into the application layer."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Actor:
    id: str
    email: str
    name: str
    role: str
    tenant_id: str | None
    business_unit_ids: tuple[str, ...]
