"""Resolve and authorize an immutable document/family scope before retrieval."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from clauseguard_core.domain.entities import ContractDocument, ContractFamily
from clauseguard_core.domain.scope import ScopeContext
from clauseguard_core.domain.actor import Actor


def _visible_units(actor: Actor) -> tuple[str, ...]:
    # Empty business-unit membership means no unit-level access for scoped roles.
    return tuple(actor.business_unit_ids)


def resolve_scope(session: Session, actor: Actor, scope_type: str, scope_id: str) -> ScopeContext:
    if not actor.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant scope required")
    visible_units = _visible_units(actor)
    unit_wide = actor.role in {"tenant_admin", "auditor"}
    if scope_type == "document":
        document = session.scalar(
            select(ContractDocument).where(
                ContractDocument.id == scope_id,
                ContractDocument.tenant_id == actor.tenant_id,
            )
        )
        if document is None or (not unit_wide and document.business_unit_id not in visible_units):
            raise HTTPException(status_code=404, detail="Document not found")
        return ScopeContext(
            tenant_id=actor.tenant_id,
            business_unit_ids=(document.business_unit_id,),
            scope_type="document",
            scope_id=document.id,
            document_ids=(document.id,),
        )
    if scope_type == "family":
        family = session.scalar(
            select(ContractFamily).where(
                ContractFamily.id == scope_id,
                ContractFamily.tenant_id == actor.tenant_id,
            )
        )
        if family is None or (not unit_wide and family.business_unit_id not in visible_units):
            raise HTTPException(status_code=404, detail="Contract family not found")
        documents = session.scalars(
            select(ContractDocument).where(
                ContractDocument.tenant_id == actor.tenant_id,
                ContractDocument.family_id == family.id,
                ContractDocument.in_force.is_(True),
                ContractDocument.status.in_(("indexed", "partial")),
            )
        ).all()
        in_force = tuple(sorted((item for item in documents), key=lambda item: item.precedence, reverse=True))
        active_ids = tuple(item.id for item in in_force)
        return ScopeContext(
            tenant_id=actor.tenant_id,
            business_unit_ids=(family.business_unit_id,),
            scope_type="family",
            scope_id=family.id,
            document_ids=active_ids,
        )
    raise HTTPException(status_code=422, detail="Document or family scope is required")
