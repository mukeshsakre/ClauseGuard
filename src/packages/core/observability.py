"""Redacted operational and audit event writers."""

from uuid import uuid4

from sqlalchemy.orm import Session

from clauseguard_core.domain.entities import AuditEvent, OperationalEvent


class Observability:
    def __init__(self, session: Session):
        self._session = session

    def event(
        self,
        *,
        component: str,
        message: str,
        tenant_id: str | None = None,
        actor_id: str | None = None,
        trace_id: str | None = None,
        category: str = "operation",
        severity: str = "INFO",
        details: dict[str, object] | None = None,
    ) -> None:
        # Details are for identifiers, timings, and codes; never pass source text or prompts.
        self._session.add(
            OperationalEvent(
                id=str(uuid4()),
                tenant_id=tenant_id,
                actor_id=actor_id,
                trace_id=trace_id,
                category=category,
                severity=severity,
                component=component,
                message=message[:500],
                details=details or {},
            )
        )

    def audit(
        self,
        *,
        action: str,
        object_type: str,
        object_id: str,
        tenant_id: str | None,
        actor_id: str | None,
        details: dict[str, object] | None = None,
    ) -> None:
        self._session.add(
            AuditEvent(
                id=str(uuid4()),
                tenant_id=tenant_id,
                actor_id=actor_id,
                action=action,
                object_type=object_type,
                object_id=object_id,
                details=details or {},
            )
        )
