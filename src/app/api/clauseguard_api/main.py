"""Thin HTTP layer. Business rules live in the shared core package."""

from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from clauseguard_core.application.agentic_ask import AgenticAsk, DEFAULT_STAGES, MANDATORY_STAGES
from clauseguard_core.application.scope_resolver import resolve_scope
from clauseguard_core.config import get_settings
from clauseguard_core.domain.entities import (
    AuditEvent,
    BusinessUnit,
    CgUser,
    ContractDocument,
    ContractFamily,
    Finding,
    JudgmentTrace,
    OperationalEvent,
    OutboxEvent,
    PipelineConfiguration,
    PolicyRule,
    RevokedToken,
    SweepRun,
    Tenant,
)
from clauseguard_core.infrastructure.database import SessionFactory, get_session
from clauseguard_core.observability import Observability
from clauseguard_api.bootstrap import bootstrap_initial_admin
from clauseguard_api.schemas import (
    AskRequest,
    DocumentForceUpdate,
    FamilyCreate,
    FindingUpdate,
    LoginRequest,
    PipelineUpdate,
    RuleCreate,
    UnitCreate,
    TenantCreate,
    UserCreate,
)
from clauseguard_api.security import (
    Actor,
    current_actor,
    hash_password,
    issue_token,
    new_temporary_password,
    require_roles,
    require_tenant,
    verify_password,
    bearer_scheme,
    normalize_role,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Apply versioned, additive schema migrations; no existing user data is dropped.
    from alembic import command
    from alembic.config import Config
    from pathlib import Path

    config_path = Path(__file__).resolve().parents[3] / "alembic.ini"
    config = Config(str(config_path))
    with SessionFactory.kw["bind"].begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
    with SessionFactory() as session:
        bootstrap_initial_admin(session)
    yield


app = FastAPI(title="ClauseGuard API", version="0.1.0", lifespan=lifespan)


def _actor_user(session: Session, actor: Actor) -> CgUser:
    user = session.get(CgUser, actor.id)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid session")
    return user


def _can_manage_users(actor: Actor) -> bool:
    return actor.role in {"tenant_admin", "super_admin"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "clauseguard-api"}


@app.post("/v1/auth/login")
def login(payload: LoginRequest, session: Session = Depends(get_session)) -> dict[str, object]:
    user = session.scalar(
        select(CgUser).where(func.lower(CgUser.email) == payload.email.strip().lower())
    )
    if user is None or not user.active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    token, _, expires = issue_token(user)
    Observability(session).event(
        component="authentication",
        message="User signed in",
        tenant_id=user.tenant_id,
        actor_id=user.id,
        details={"role": user.role},
    )
    session.commit()
    return {
        "token": token,
        "expires_at": expires,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": normalize_role(user.role),
            "tenant_id": user.tenant_id,
            "business_unit_ids": user.business_unit_ids or [],
        },
    }


@app.get("/v1/me")
def me(actor: Actor = Depends(current_actor)) -> dict[str, object]:
    return {
        "id": actor.id,
        "email": actor.email,
        "name": actor.name,
        "role": actor.role,
        "tenant_id": actor.tenant_id,
        "business_unit_ids": actor.business_unit_ids,
    }


@app.post("/v1/auth/logout")
def logout(
    actor: Actor = Depends(current_actor),
    credentials=Depends(bearer_scheme()),
    session: Session = Depends(get_session),
) -> dict[str, bool]:
    import base64
    import json
    from datetime import datetime, timezone

    try:
        payload = credentials.credentials.split(".")[1]
        decoded = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        expiry = datetime.fromtimestamp(int(decoded["exp"]), timezone.utc)
        session.add(RevokedToken(jti=decoded["jti"], expires_at=expiry))
        session.add(
            OperationalEvent(
                id=str(uuid4()),
                tenant_id=actor.tenant_id,
                actor_id=actor.id,
                component="authentication",
                message="User signed out",
                category="security",
            )
        )
        session.commit()
    except Exception:
        session.rollback()
    return {"logged_out": True}


@app.get("/v1/tenants")
def list_tenants(
    actor: Actor = Depends(current_actor), session: Session = Depends(get_session)
) -> dict[str, object]:
    if actor.role == "super_admin":
        tenants = session.scalars(select(Tenant).order_by(Tenant.name)).all()
    else:
        tenants = session.scalars(select(Tenant).where(Tenant.id == actor.tenant_id)).all()
    return {"tenants": [{"id": item.id, "name": item.name} for item in tenants]}


@app.post("/v1/tenants")
def create_tenant(
    payload: TenantCreate,
    actor: Actor = Depends(require_roles("super_admin")),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    name = payload.name.strip()
    email = str(payload.admin_email).lower()
    if session.scalar(select(CgUser.id).where(CgUser.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    tenant_id, unit_id = str(uuid4()), str(uuid4())
    tenant = Tenant(id=tenant_id, name=name)
    unit = BusinessUnit(id=unit_id, tenant_id=tenant_id, name="General")
    tenant_admin = CgUser(
        id=str(uuid4()),
        tenant_id=tenant_id,
        email=email,
        name=payload.admin_name,
        password_hash=hash_password(payload.admin_password),
        role="tenant_admin",
        business_unit_ids=[unit_id],
    )
    config = PipelineConfiguration(
        id=str(uuid4()), tenant_id=tenant_id, version=1, settings=DEFAULT_STAGES.copy(),
        created_by=tenant_admin.id,
    )
    session.add_all([tenant, unit, tenant_admin, config])
    Observability(session).audit(
        action="tenant_created",
        object_type="tenant",
        object_id=tenant_id,
        tenant_id=None,
        actor_id=actor.id,
    )
    session.commit()
    return {
        "tenant": {"id": tenant.id, "name": tenant.name},
        "business_unit_id": unit_id,
        "admin_user_id": tenant_admin.id,
    }


@app.get("/v1/business-units")
def list_business_units(
    actor: Actor = Depends(require_tenant), session: Session = Depends(get_session)
) -> dict[str, object]:
    statement = select(BusinessUnit).where(BusinessUnit.tenant_id == actor.tenant_id)
    if actor.role not in {"tenant_admin", "auditor"}:
        statement = statement.where(BusinessUnit.id.in_(actor.business_unit_ids or ["__none__"]))
    units = session.scalars(statement.order_by(BusinessUnit.name)).all()
    return {"business_units": [{"id": unit.id, "name": unit.name} for unit in units]}


@app.post("/v1/business-units")
def create_business_unit(
    payload: UnitCreate,
    actor: Actor = Depends(require_roles("tenant_admin")),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    unit = BusinessUnit(id=str(uuid4()), tenant_id=actor.tenant_id, name=payload.name)
    session.add(unit)
    Observability(session).audit(
        action="business_unit_created",
        object_type="business_unit",
        object_id=unit.id,
        tenant_id=actor.tenant_id,
        actor_id=actor.id,
    )
    session.commit()
    return {"business_unit": {"id": unit.id, "name": unit.name}}


@app.get("/v1/users")
def list_users(
    actor: Actor = Depends(current_actor), session: Session = Depends(get_session)
) -> dict[str, object]:
    if not _can_manage_users(actor) and actor.role != "auditor":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    statement = select(CgUser).where(CgUser.tenant_id == actor.tenant_id)
    users = session.scalars(statement.order_by(CgUser.email)).all()
    return {
        "users": [
            {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "tenant_id": user.tenant_id,
                "business_unit_ids": user.business_unit_ids or [],
                "active": user.active,
            }
            for user in users
        ]
    }


@app.post("/v1/users")
def create_user(
    payload: UserCreate,
    actor: Actor = Depends(current_actor),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    if not _can_manage_users(actor) or not actor.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant administrator required")
    if session.scalar(select(CgUser).where(CgUser.email == payload.email.lower())):
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    unit_ids = set(payload.business_unit_ids)
    owned = set(
        session.scalars(
            select(BusinessUnit.id).where(
                BusinessUnit.tenant_id == actor.tenant_id,
                BusinessUnit.id.in_(unit_ids or {"__none__"}),
            )
        ).all()
    )
    if unit_ids - owned:
        raise HTTPException(status_code=404, detail="Business unit not found")
    password = new_temporary_password()
    user = CgUser(
        id=str(uuid4()),
        tenant_id=actor.tenant_id,
        email=payload.email.lower(),
        name=payload.name,
        password_hash=hash_password(password),
        role=payload.role,
        business_unit_ids=list(unit_ids),
    )
    session.add(user)
    Observability(session).audit(
        action="user_created",
        object_type="user",
        object_id=user.id,
        tenant_id=actor.tenant_id,
        actor_id=actor.id,
        details={"role": user.role},
    )
    session.commit()
    return {"user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role}, "password": password}


@app.get("/v1/families")
def list_families(
    actor: Actor = Depends(require_tenant), session: Session = Depends(get_session)
) -> dict[str, object]:
    statement = select(ContractFamily).where(ContractFamily.tenant_id == actor.tenant_id)
    if actor.role not in {"tenant_admin", "auditor"}:
        statement = statement.where(ContractFamily.business_unit_id.in_(actor.business_unit_ids or ["__none__"]))
    families = session.scalars(statement.order_by(ContractFamily.vendor)).all()
    return {
        "families": [
            {
                "id": item.id,
                "business_unit_id": item.business_unit_id,
                "vendor": item.vendor,
                "contract_type": item.contract_type,
                "effective_date": item.effective_date,
                "status": item.status,
            }
            for item in families
        ]
    }


@app.post("/v1/families")
def create_family(
    payload: FamilyCreate,
    actor: Actor = Depends(require_tenant),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    if actor.role not in {"tenant_admin", "ingestion_service"}:
        raise HTTPException(status_code=403, detail="Tenant administrator required")
    unit = session.scalar(
        select(BusinessUnit).where(
            BusinessUnit.id == payload.business_unit_id,
            BusinessUnit.tenant_id == actor.tenant_id,
        )
    )
    if unit is None:
        raise HTTPException(status_code=404, detail="Business unit not found")
    family = ContractFamily(
        id=str(uuid4()), tenant_id=actor.tenant_id, business_unit_id=unit.id,
        vendor=payload.vendor, contract_type=payload.contract_type,
        effective_date=payload.effective_date, status=payload.status,
    )
    session.add(family)
    Observability(session).audit(
        action="contract_family_created",
        object_type="contract_family",
        object_id=family.id,
        tenant_id=actor.tenant_id,
        actor_id=actor.id,
        details={"business_unit_id": family.business_unit_id},
    )
    session.commit()
    return {"family": {"id": family.id, "vendor": family.vendor, "business_unit_id": unit.id}}


@app.get("/v1/documents")
def list_documents(
    actor: Actor = Depends(require_tenant), session: Session = Depends(get_session)
) -> dict[str, object]:
    statement = select(ContractDocument).where(ContractDocument.tenant_id == actor.tenant_id)
    if actor.role not in {"tenant_admin", "auditor"}:
        statement = statement.where(ContractDocument.business_unit_id.in_(actor.business_unit_ids or ["__none__"]))
    docs = session.scalars(statement.order_by(desc(ContractDocument.created_at))).all()
    return {
        "documents": [
            {
                "id": doc.id,
                "name": doc.name,
                "family_id": doc.family_id,
                "business_unit_id": doc.business_unit_id,
                "role": doc.role,
                "precedence": doc.precedence,
                "version": doc.version,
                "in_force": doc.in_force,
                "status": doc.status,
                "sha256": doc.sha256,
                "page_count": doc.page_count,
                "failed_pages": doc.failed_pages or [],
                "created_at": doc.created_at,
            }
            for doc in docs
        ]
    }


@app.post("/v1/documents")
def upload_document(
    file: UploadFile = File(...),
    family_id: str = Form(...),
    role: str = Form("other"),
    precedence: int = Form(0),
    actor: Actor = Depends(require_tenant),
    session: Session = Depends(get_session),
) -> JSONResponse:
    from hashlib import sha256

    from clauseguard_core.infrastructure.object_store import ObjectStore

    if role not in {"master", "amendment", "statement_of_work", "order_form", "exhibit", "other"}:
        raise HTTPException(status_code=422, detail="Invalid document role")
    data = file.file.read(get_settings().max_upload_bytes + 1)
    if len(data) > get_settings().max_upload_bytes:
        raise HTTPException(status_code=413, detail="File exceeds the configured upload limit")
    if not file.filename or not file.filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(status_code=415, detail="Only PDF and DOCX files are accepted")
    family = session.scalar(
        select(ContractFamily).where(
            ContractFamily.id == family_id,
            ContractFamily.tenant_id == actor.tenant_id,
        )
    )
    if family is None:
        raise HTTPException(status_code=404, detail="Contract family not found")
    if actor.role not in {"tenant_admin", "ingestion_service"} and family.business_unit_id not in actor.business_unit_ids:
        raise HTTPException(status_code=404, detail="Contract family not found")
    latest_version = session.scalar(
        select(ContractDocument.version).where(
            ContractDocument.tenant_id == actor.tenant_id,
            ContractDocument.family_id == family.id,
        ).order_by(desc(ContractDocument.version)).limit(1)
    )
    document_id = str(uuid4())
    try:
        storage = ObjectStore()
        storage.ensure_bucket()
        object_key = storage.put(actor.tenant_id, document_id, data)
    except Exception as exc:
        Observability(session).event(
            component="object_storage", message="Original document storage failed",
            tenant_id=actor.tenant_id, actor_id=actor.id, severity="ERROR",
            details={"error_type": type(exc).__name__},
        )
        session.commit()
        raise HTTPException(status_code=503, detail="Document storage is unavailable") from exc
    document = ContractDocument(
        id=document_id,
        tenant_id=actor.tenant_id,
        business_unit_id=family.business_unit_id,
        family_id=family.id,
        name=file.filename,
        role=role,
        precedence=precedence,
        version=(latest_version or 0) + 1,
        in_force=True,
        sha256=sha256(data).hexdigest(),
        object_key=object_key,
        status="queued",
    )
    event = OutboxEvent(
        id=str(uuid4()), tenant_id=actor.tenant_id, event_type="document.ingest",
        payload={"document_id": document_id, "tenant_id": actor.tenant_id},
    )
    session.add_all([document, event])
    Observability(session).audit(
        action="document_uploaded", object_type="document", object_id=document_id,
        tenant_id=actor.tenant_id, actor_id=actor.id,
    )
    session.commit()
    return JSONResponse(
        status_code=202,
        content={"document_id": document_id, "family_id": family.id, "status": "queued"},
    )


@app.patch("/v1/documents/{document_id}/in-force")
def set_document_in_force(
    document_id: str,
    payload: DocumentForceUpdate,
    actor: Actor = Depends(require_roles("tenant_admin")),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    document = session.scalar(
        select(ContractDocument).where(
            ContractDocument.id == document_id,
            ContractDocument.tenant_id == actor.tenant_id,
        )
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    document.in_force = payload.in_force
    Observability(session).audit(
        action="document_in_force_changed",
        object_type="document",
        object_id=document.id,
        tenant_id=actor.tenant_id,
        actor_id=actor.id,
        details={"in_force": payload.in_force},
    )
    session.commit()
    return {"document_id": document.id, "in_force": document.in_force}


@app.post("/v1/ask")
def ask(
    payload: AskRequest,
    actor: Actor = Depends(require_tenant),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    if payload.scope_type == "portfolio":
        # Read completed sweep results only; start a normal sweep when no completed result exists.
        completed = session.scalar(
            select(SweepRun).where(
                SweepRun.tenant_id == actor.tenant_id,
                SweepRun.status == "complete",
            ).order_by(desc(SweepRun.completed_at)).limit(1)
        )
        if completed is not None:
            rows = session.scalars(
                select(Finding).where(
                    Finding.tenant_id == actor.tenant_id,
                    Finding.sweep_id == completed.id,
                ).order_by(Finding.created_at.desc()).limit(500)
            ).all()
            if actor.role not in {"tenant_admin", "auditor"}:
                visible_family_ids = select(ContractFamily.id).where(
                    ContractFamily.tenant_id == actor.tenant_id,
                    ContractFamily.business_unit_id.in_(actor.business_unit_ids or ["__none__"]),
                )
                allowed_family_ids = set(session.scalars(visible_family_ids).all())
                rows = [row for row in rows if row.family_id in allowed_family_ids]
            return {
                "status": "answered",
                "sweep_id": completed.id,
                "summary": f"Latest completed sweep contains {len(rows)} findings requiring review.",
                "findings": [{"id": row.id, "family_id": row.family_id, "document_id": row.document_id,
                              "rule_id": row.rule_id, "verdict": row.verdict, "summary": row.summary}
                             for row in rows],
            }
        config = session.scalar(
            select(PipelineConfiguration).where(PipelineConfiguration.tenant_id == actor.tenant_id)
            .order_by(PipelineConfiguration.version.desc())
        )
        run = SweepRun(
            id=str(uuid4()), tenant_id=actor.tenant_id, requested_by=actor.id,
            status="queued", scope={"kind": "tenant", "pipeline_stages": config.settings if config else DEFAULT_STAGES.copy()},
            config_version=config.version if config else 1,
        )
        session.add(run)
        session.add(
            OutboxEvent(
                id=str(uuid4()), tenant_id=actor.tenant_id, event_type="sweep.portfolio_ask",
                payload={"sweep_id": run.id, "tenant_id": actor.tenant_id},
            )
        )
        session.commit()
        return {"status": "queued", "sweep_id": run.id, "summary": "No completed sweep was available. A portfolio sweep has been queued."}
    if not payload.scope_id:
        raise HTTPException(status_code=422, detail="A document or family id is required")
    scope = resolve_scope(session, actor, payload.scope_type, payload.scope_id)
    if not scope.document_ids:
        return {
            "id": str(uuid4()), "status": "needs_review",
            "summary": "Needs review: this family has no indexed in-force documents.",
            "scope_type": scope.scope_type, "scope_id": scope.scope_id, "citations": [],
            "pipeline_version": 1, "trace": [],
        }
    return AgenticAsk(session).answer(actor_id=actor.id, question=payload.question, scope=scope)


@app.get("/v1/rules")
def list_rules(
    actor: Actor = Depends(require_tenant), session: Session = Depends(get_session)
) -> dict[str, object]:
    rules = session.scalars(
        select(PolicyRule).where(PolicyRule.tenant_id == actor.tenant_id).order_by(PolicyRule.title)
    ).all()
    return {"rules": [
        {"id": r.id, "title": r.title, "statement": r.statement, "rule_type": r.rule_type,
         "severity": r.severity, "threshold": r.threshold, "unit": r.unit, "active": r.active,
         "created_at": r.created_at}
        for r in rules
    ]}


@app.post("/v1/rules")
def create_rule(
    payload: RuleCreate,
    actor: Actor = Depends(require_roles("tenant_admin", "policy_owner")),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    if not actor.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant scope required")
    if payload.rule_type in {"numeric_max", "numeric_min", "duration_max", "notice_within"}:
        if payload.threshold is None or not payload.unit:
            raise HTTPException(status_code=422, detail="Numeric and duration rules require a unit and threshold")
    rule = PolicyRule(
        id=str(uuid4()), tenant_id=actor.tenant_id, title=payload.title, statement=payload.statement,
        rule_type=payload.rule_type, severity=payload.severity,
        retrieval_topic=payload.retrieval_topic, threshold=payload.threshold, unit=payload.unit,
    )
    session.add(rule)
    Observability(session).audit(
        action="rule_created", object_type="rule", object_id=rule.id,
        tenant_id=actor.tenant_id, actor_id=actor.id,
    )
    session.commit()
    return {"id": rule.id, "title": rule.title, "statement": rule.statement, "rule_type": rule.rule_type,
            "severity": rule.severity, "created_at": rule.created_at}


@app.get("/v1/pipeline")
def get_pipeline(
    actor: Actor = Depends(require_tenant), session: Session = Depends(get_session)
) -> dict[str, object]:
    config = session.scalar(
        select(PipelineConfiguration).where(PipelineConfiguration.tenant_id == actor.tenant_id)
        .order_by(PipelineConfiguration.version.desc())
    )
    settings = {**DEFAULT_STAGES, **(config.settings if config else {})}
    for unavailable_stage in ("graph_expansion", "reranker", "semantic_cache"):
        settings[unavailable_stage] = False
    for stage in MANDATORY_STAGES:
        settings[stage] = True
    return {"version": config.version if config else 1, "stages": settings,
            "mandatory_stages": sorted(MANDATORY_STAGES)}


@app.put("/v1/pipeline")
def update_pipeline(
    payload: PipelineUpdate,
    actor: Actor = Depends(require_roles("tenant_admin")),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    if not actor.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant scope required")
    if MANDATORY_STAGES.intersection(key for key, value in payload.stages.items() if not value):
        raise HTTPException(status_code=422, detail="CRAG, citation verification, and scope enforcement are mandatory")
    allowed = set(DEFAULT_STAGES) - MANDATORY_STAGES
    if set(payload.stages) - set(DEFAULT_STAGES):
        raise HTTPException(status_code=422, detail="Unknown pipeline stage")
    unavailable = {"graph_expansion", "reranker", "semantic_cache"}
    if any(payload.stages.get(stage, False) for stage in unavailable):
        raise HTTPException(status_code=422, detail="Graph expansion, reranking, and semantic cache are not installed")
    current = session.scalar(
        select(PipelineConfiguration).where(PipelineConfiguration.tenant_id == actor.tenant_id)
        .order_by(PipelineConfiguration.version.desc())
    )
    version = (current.version + 1) if current else 1
    settings = {**(current.settings if current else DEFAULT_STAGES), **payload.stages}
    for stage in MANDATORY_STAGES:
        settings[stage] = True
    config = PipelineConfiguration(
        id=str(uuid4()), tenant_id=actor.tenant_id, version=version,
        settings=settings, created_by=actor.id,
    )
    session.add(config)
    Observability(session).audit(
        action="pipeline_configuration_changed", object_type="pipeline_configuration",
        object_id=config.id, tenant_id=actor.tenant_id, actor_id=actor.id,
        details={"version": version, "stages": {key: settings[key] for key in allowed}},
    )
    session.commit()
    return {"version": version, "stages": settings, "mandatory_stages": sorted(MANDATORY_STAGES)}


@app.post("/v1/sweeps")
def start_sweep(
    actor: Actor = Depends(require_roles("tenant_admin", "policy_owner")),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    config = session.scalar(
        select(PipelineConfiguration).where(PipelineConfiguration.tenant_id == actor.tenant_id)
        .order_by(PipelineConfiguration.version.desc())
    )
    run = SweepRun(
        id=str(uuid4()), tenant_id=actor.tenant_id, requested_by=actor.id,
        status="queued", scope={"kind": "tenant", "pipeline_stages": config.settings if config else DEFAULT_STAGES.copy()},
        config_version=config.version if config else 1,
    )
    session.add(run)
    session.add(OutboxEvent(
        id=str(uuid4()), tenant_id=actor.tenant_id, event_type="sweep.run",
        payload={"sweep_id": run.id, "tenant_id": actor.tenant_id},
    ))
    Observability(session).audit(
        action="sweep_started", object_type="sweep", object_id=run.id,
        tenant_id=actor.tenant_id, actor_id=actor.id,
    )
    session.commit()
    return {"sweep_id": run.id, "status": "queued", "pipeline_version": run.config_version}


@app.get("/v1/sweeps")
def list_sweeps(
    actor: Actor = Depends(require_tenant), session: Session = Depends(get_session)
) -> dict[str, object]:
    runs = session.scalars(
        select(SweepRun).where(SweepRun.tenant_id == actor.tenant_id).order_by(desc(SweepRun.created_at)).limit(100)
    ).all()
    return {"sweeps": [{"id": r.id, "status": r.status, "scope": r.scope,
                         "pipeline_version": r.config_version, "created_at": r.created_at,
                         "completed_at": r.completed_at} for r in runs]}


@app.get("/v1/findings")
def list_findings(
    actor: Actor = Depends(require_tenant), session: Session = Depends(get_session)
) -> dict[str, object]:
    statement = select(Finding).where(Finding.tenant_id == actor.tenant_id)
    if actor.role not in {"tenant_admin", "auditor"}:
        statement = statement.join(ContractFamily, Finding.family_id == ContractFamily.id).where(
            ContractFamily.tenant_id == actor.tenant_id,
            ContractFamily.business_unit_id.in_(actor.business_unit_ids or ["__none__"]),
        )
    rows = session.scalars(statement.order_by(desc(Finding.created_at)).limit(500)).all()
    return {"findings": [
        {"id": row.id, "family_id": row.family_id, "document_id": row.document_id,
         "rule_id": row.rule_id, "sweep_id": row.sweep_id, "verdict": row.verdict,
         "disposition": row.disposition, "summary": row.summary, "created_at": row.created_at}
        for row in rows
    ]}


@app.patch("/v1/findings/{finding_id}")
def update_finding(
    finding_id: str,
    payload: FindingUpdate,
    actor: Actor = Depends(require_roles("tenant_admin", "reviewer")),
    session: Session = Depends(get_session),
) -> dict[str, bool]:
    statement = select(Finding).where(
        Finding.id == finding_id,
        Finding.tenant_id == actor.tenant_id,
    )
    if actor.role != "tenant_admin":
        statement = statement.join(ContractFamily, Finding.family_id == ContractFamily.id).where(
            ContractFamily.tenant_id == actor.tenant_id,
            ContractFamily.business_unit_id.in_(actor.business_unit_ids or ["__none__"]),
        )
    row = session.scalar(statement)
    if row is None:
        raise HTTPException(status_code=404, detail="Finding not found")
    row.disposition = payload.disposition
    Observability(session).audit(
        action="finding_disposition_changed", object_type="finding", object_id=row.id,
        tenant_id=actor.tenant_id, actor_id=actor.id,
        details={"disposition": payload.disposition, "reason": payload.reason[:1000]},
    )
    session.commit()
    return {"updated": True}


@app.get("/v1/logs")
def list_logs(
    actor: Actor = Depends(current_actor), session: Session = Depends(get_session), limit: int = 200
) -> dict[str, object]:
    if actor.role not in {"tenant_admin", "super_admin", "auditor"}:
        raise HTTPException(status_code=403, detail="Administrative access required")
    statement = select(OperationalEvent).order_by(desc(OperationalEvent.created_at)).limit(min(max(limit, 1), 500))
    if actor.role != "super_admin":
        statement = statement.where(OperationalEvent.tenant_id == actor.tenant_id)
    rows = session.scalars(statement).all()
    return {"logs": [
        {"id": row.id, "timestamp": row.created_at, "severity": row.severity,
         "component": row.component, "message": row.message, "trace_id": row.trace_id,
         "tenant_id": row.tenant_id, "metadata": row.details}
        for row in rows
    ]}


@app.get("/v1/traces")
def list_traces(
    actor: Actor = Depends(current_actor), session: Session = Depends(get_session), limit: int = 100
) -> dict[str, object]:
    if actor.role not in {"tenant_admin", "auditor", "super_admin"}:
        raise HTTPException(status_code=403, detail="Auditor or administrator access required")
    statement = select(JudgmentTrace).order_by(desc(JudgmentTrace.created_at)).limit(min(max(limit, 1), 250))
    if actor.role != "super_admin":
        statement = statement.where(JudgmentTrace.tenant_id == actor.tenant_id)
    traces = session.scalars(statement).all()
    return {"traces": [
        {"id": item.id, "scope_type": item.scope_type, "scope_id": item.scope_id,
         "pipeline_version": item.pipeline_version, "question": item.question,
         "result": item.result, "steps": item.steps, "created_at": item.created_at}
        for item in traces
    ]}


@app.get("/v1/audit")
def list_audit(
    actor: Actor = Depends(current_actor), session: Session = Depends(get_session), limit: int = 200
) -> dict[str, object]:
    if actor.role not in {"tenant_admin", "auditor", "super_admin"}:
        raise HTTPException(status_code=403, detail="Administrative access required")
    statement = select(AuditEvent).order_by(desc(AuditEvent.created_at)).limit(min(max(limit, 1), 500))
    if actor.role != "super_admin":
        statement = statement.where(AuditEvent.tenant_id == actor.tenant_id)
    rows = session.scalars(statement).all()
    return {"events": [
        {"id": row.id, "timestamp": row.created_at, "actor_id": row.actor_id,
         "action": row.action, "object_type": row.object_type, "object_id": row.object_id,
         "tenant_id": row.tenant_id, "details": row.details}
        for row in rows
    ]}


@app.get("/v1/traces/{trace_id}")
def get_trace(
    trace_id: str,
    actor: Actor = Depends(current_actor),
    session: Session = Depends(get_session),
) -> dict[str, object]:
    statement = select(JudgmentTrace).where(JudgmentTrace.id == trace_id)
    if actor.role != "super_admin":
        statement = statement.where(JudgmentTrace.tenant_id == actor.tenant_id)
    row = session.scalar(statement)
    if row is None:
        raise HTTPException(status_code=404, detail="Trace not found")
    if actor.role not in {"tenant_admin", "auditor", "super_admin"}:
        raise HTTPException(status_code=403, detail="Auditor or administrator access required")
    return {"id": row.id, "scope_type": row.scope_type, "scope_id": row.scope_id,
            "question": row.question, "result": row.result, "steps": row.steps,
            "pipeline_version": row.pipeline_version, "created_at": row.created_at}
