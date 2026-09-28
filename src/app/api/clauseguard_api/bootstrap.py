"""Safe first-run account provisioning from explicit environment settings."""

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from clauseguard_api.security import hash_password
from clauseguard_core.config import get_settings
from clauseguard_core.domain.entities import BusinessUnit, CgUser, PipelineConfiguration, Tenant
from clauseguard_core.infrastructure.database import SessionFactory

DEFAULT_PIPELINE = {
    "hyde": True,
    "hybrid_search": True,
    "graph_expansion": False,
    "reranker": False,
    "semantic_cache": False,
    "crag": True,
    "citation_verifier": True,
    "tenant_scope": True,
}


def bootstrap_initial_admin(session: Session | None = None) -> None:
    """Create only explicitly configured accounts; never insert demo users or documents."""
    settings = get_settings()
    if not (
        (settings.bootstrap_admin_email and settings.bootstrap_admin_password)
        or (settings.bootstrap_super_admin_email and settings.bootstrap_super_admin_password)
    ):
        return

    owns_session = session is None
    session = session or SessionFactory()
    try:
        staged: list[object] = []
        super_email = settings.bootstrap_super_admin_email.strip().lower()
        admin_email = settings.bootstrap_admin_email.strip().lower()
        if super_email and admin_email and super_email == admin_email:
            raise ValueError("Super-admin and tenant-admin bootstrap emails must be different")
        if super_email and settings.bootstrap_super_admin_password:
            exists = session.scalar(select(CgUser.id).where(CgUser.email == super_email))
            if not exists:
                staged.append(
                    CgUser(
                        id=str(uuid4()),
                        tenant_id=None,
                        email=super_email,
                        name="ClauseGuard Super Administrator",
                        password_hash=hash_password(settings.bootstrap_super_admin_password),
                        role="super_admin",
                        business_unit_ids=[],
                    )
                )

        if admin_email and settings.bootstrap_admin_password:
            exists = session.scalar(select(CgUser.id).where(CgUser.email == admin_email))
            if not exists:
                tenant = Tenant(id=str(uuid4()), name="ClauseGuard")
                unit = BusinessUnit(id=str(uuid4()), tenant_id=tenant.id, name="General")
                user = CgUser(
                    id=str(uuid4()),
                    tenant_id=tenant.id,
                    email=admin_email,
                    name="Tenant Administrator",
                    password_hash=hash_password(settings.bootstrap_admin_password),
                    role="tenant_admin",
                    business_unit_ids=[unit.id],
                )
                staged.extend(
                    [
                        tenant,
                        unit,
                        user,
                        PipelineConfiguration(
                            id=str(uuid4()),
                            tenant_id=tenant.id,
                            version=1,
                            settings=DEFAULT_PIPELINE.copy(),
                            created_by=user.id,
                        ),
                    ]
                )

        if staged:
            session.add_all(staged)
            session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        if owns_session:
            session.close()
