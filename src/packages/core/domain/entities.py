"""Persistence entities. Tenant and scope identifiers are explicit on content rows."""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Tenant(Base):
    __tablename__ = "cg_tenant"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class BusinessUnit(Base):
    __tablename__ = "cg_business_unit"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("cg_tenant.id"), index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)


class CgUser(Base):
    """User table retained as cg_user for compatibility with the existing user store."""

    __tablename__ = "cg_user"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(ForeignKey("cg_tenant.id"), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    password_hash: Mapped[str] = mapped_column(String(500))
    role: Mapped[str] = mapped_column(String(40), default="analyst")
    business_unit_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ContractFamily(Base):
    __tablename__ = "cg_contract_family"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("cg_tenant.id"), index=True)
    business_unit_id: Mapped[str] = mapped_column(ForeignKey("cg_business_unit.id"), index=True)
    vendor: Mapped[str] = mapped_column(String(300), default="")
    contract_type: Mapped[str] = mapped_column(String(100), default="other")
    effective_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ContractDocument(Base):
    __tablename__ = "cg_document"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("cg_tenant.id"), index=True)
    business_unit_id: Mapped[str] = mapped_column(ForeignKey("cg_business_unit.id"), index=True)
    family_id: Mapped[str] = mapped_column(ForeignKey("cg_contract_family.id"), index=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    role: Mapped[str] = mapped_column(String(40), default="other")
    precedence: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)
    in_force: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    status: Mapped[str] = mapped_column(String(30), default="queued")
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    object_key: Mapped[str] = mapped_column(String(800), nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_pages: Mapped[list[int]] = mapped_column(JSON, default=list)
    table_failed_pages: Mapped[list[int]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class TextChunk(Base):
    __tablename__ = "cg_chunk"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("cg_tenant.id"), index=True)
    business_unit_id: Mapped[str] = mapped_column(ForeignKey("cg_business_unit.id"), index=True)
    family_id: Mapped[str] = mapped_column(ForeignKey("cg_contract_family.id"), index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("cg_document.id"), index=True)
    page: Mapped[int] = mapped_column(Integer, default=1)
    ordinal: Mapped[int] = mapped_column(Integer, default=0)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_type: Mapped[str] = mapped_column(String(20), default="prose")
    table_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    row_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    column_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    row_header: Mapped[str] = mapped_column(String(500), default="")
    column_header: Mapped[str] = mapped_column(String(500), default="")


class PolicyRule(Base):
    __tablename__ = "cg_policy_rule"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("cg_tenant.id"), index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    rule_type: Mapped[str] = mapped_column(String(40), default="must_include")
    severity: Mapped[str] = mapped_column(String(20), default="medium")
    retrieval_topic: Mapped[str] = mapped_column(Text, default="")
    threshold: Mapped[float | None] = mapped_column(nullable=True)
    unit: Mapped[str] = mapped_column(String(40), default="")
    version: Mapped[int] = mapped_column(Integer, default=1)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PipelineConfiguration(Base):
    __tablename__ = "cg_pipeline_configuration"
    __table_args__ = (UniqueConstraint("tenant_id", "version"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("cg_tenant.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    settings: Mapped[dict[str, bool]] = mapped_column(JSON, default=dict)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("cg_user.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SweepRun(Base):
    __tablename__ = "cg_sweep_run"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("cg_tenant.id"), index=True)
    requested_by: Mapped[str] = mapped_column(ForeignKey("cg_user.id"))
    status: Mapped[str] = mapped_column(String(20), default="queued")
    config_version: Mapped[int] = mapped_column(Integer, default=1)
    scope: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Finding(Base):
    __tablename__ = "cg_finding"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("cg_tenant.id"), index=True)
    family_id: Mapped[str] = mapped_column(ForeignKey("cg_contract_family.id"), index=True)
    document_id: Mapped[str | None] = mapped_column(ForeignKey("cg_document.id"), nullable=True)
    rule_id: Mapped[str] = mapped_column(ForeignKey("cg_policy_rule.id"), index=True)
    sweep_id: Mapped[str | None] = mapped_column(ForeignKey("cg_sweep_run.id"), nullable=True, index=True)
    verdict: Mapped[str] = mapped_column(String(20), nullable=False)
    disposition: Mapped[str] = mapped_column(String(30), default="open")
    summary: Mapped[str] = mapped_column(Text, default="")
    citation_chunk_id: Mapped[str | None] = mapped_column(ForeignKey("cg_chunk.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class OperationalEvent(Base):
    __tablename__ = "cg_operational_event"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(ForeignKey("cg_tenant.id"), nullable=True, index=True)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("cg_user.id"), nullable=True)
    trace_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(30), default="operation")
    severity: Mapped[str] = mapped_column(String(12), default="INFO")
    component: Mapped[str] = mapped_column(String(80), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    details: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class JudgmentTrace(Base):
    __tablename__ = "cg_judgment_trace"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("cg_tenant.id"), index=True)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("cg_user.id"), nullable=True)
    scope_type: Mapped[str] = mapped_column(String(20), nullable=False)
    scope_id: Mapped[str] = mapped_column(String(36), nullable=False)
    pipeline_version: Mapped[int] = mapped_column(Integer, default=1)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    steps: Mapped[list[dict[str, object]]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class RevokedToken(Base):
    __tablename__ = "cg_revoked_token"
    jti: Mapped[str] = mapped_column(String(36), primary_key=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class OutboxEvent(Base):
    __tablename__ = "cg_outbox_event"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("cg_tenant.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    payload: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditEvent(Base):
    __tablename__ = "cg_audit_event"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(ForeignKey("cg_tenant.id"), nullable=True, index=True)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("cg_user.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    object_type: Mapped[str] = mapped_column(String(80), nullable=False)
    object_id: Mapped[str] = mapped_column(String(36), nullable=False)
    details: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
