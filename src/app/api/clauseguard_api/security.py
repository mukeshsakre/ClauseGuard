"""Password hashing and signed, revocable bearer sessions."""

import base64
import hashlib
import hmac
import json
import secrets
import time
from uuid import uuid4

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from clauseguard_core.config import get_settings
from clauseguard_core.domain.actor import Actor
from clauseguard_core.domain.entities import CgUser, RevokedToken
from clauseguard_core.infrastructure.database import get_session

_passwords = PasswordHash.recommended()
_bearer = HTTPBearer(auto_error=False)


def bearer_scheme():
    """Expose the same bearer extractor for logout without reaching into module internals."""
    return _bearer


def hash_password(password: str) -> str:
    return _passwords.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _passwords.verify(password, password_hash)
    except Exception:
        return False


def normalize_role(role: str) -> str:
    """Translate the historical RAGGauge admin role into a tenant-scoped role."""
    normalized = role.casefold()
    return "tenant_admin" if normalized == "admin" else normalized


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode().rstrip("=")


def issue_token(user: CgUser) -> tuple[str, str, int]:
    settings = get_settings()
    now = int(time.time())
    expires = now + settings.jwt_expire_minutes * 60
    jti = str(uuid4())
    header = _encode(b'{"alg":"HS256","typ":"JWT"}')
    payload = _encode(
        json.dumps(
            {
                "sub": user.id,
                "jti": jti,
                "iat": now,
                "exp": expires,
            },
            separators=(",", ":"),
        ).encode()
    )
    unsigned = f"{header}.{payload}"
    signature = hmac.new(settings.jwt_secret.encode(), unsigned.encode(), hashlib.sha256).digest()
    return f"{unsigned}.{_encode(signature)}", jti, expires


def current_actor(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    session: Session = Depends(get_session),
) -> Actor:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    token = credentials.credentials
    try:
        header, payload, signature = token.split(".")
        unsigned = f"{header}.{payload}"
        expected = _encode(
            hmac.new(get_settings().jwt_secret.encode(), unsigned.encode(), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(signature, expected):
            raise ValueError("signature")
        decoded = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if int(decoded["exp"]) <= int(time.time()):
            raise ValueError("expired")
        if session.get(RevokedToken, decoded["jti"]) is not None:
            raise ValueError("revoked")
        user = session.get(CgUser, decoded["sub"])
        if user is None or not user.active:
            raise ValueError("inactive")
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired session") from exc
    return Actor(
        id=user.id,
        email=user.email,
        name=user.name,
        # Preserve legacy role text in storage, while mapping the old RAGGauge ADMIN role
        # to this product's tenant-scoped administrator permissions.
        role=normalize_role(user.role),
        tenant_id=user.tenant_id,
        business_unit_ids=tuple(user.business_unit_ids or []),
    )


def require_roles(*roles: str):
    def check(actor: Actor = Depends(current_actor)) -> Actor:
        if actor.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return actor

    return check


def require_tenant(actor: Actor = Depends(current_actor)) -> Actor:
    if actor.tenant_id is None:
        raise HTTPException(status_code=403, detail="This operation requires a tenant session")
    return actor


def new_temporary_password() -> str:
    return secrets.token_urlsafe(16)
