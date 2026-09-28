"""Copy only user records from the source PostgreSQL database into ClauseGuard.

This utility is intentionally non-destructive: it never drops, updates, or truncates source
or target records. It supports a cg_user table directly, or the legacy RAGGauge users table.
The legacy mapping preserves its username in cg_user.email and its original role/password hash.
"""

from datetime import UTC, datetime
import os
import sys
from uuid import uuid4

from sqlalchemy import MetaData, Table, create_engine, inspect, select
from sqlalchemy.dialects.postgresql import insert


def main() -> int:
    source_url = os.environ.get("SOURCE_CG_USER_DATABASE_URL", "").strip()
    target_url = os.environ.get("DATABASE_URL", "").strip()
    if not source_url or not target_url:
        print("Set SOURCE_CG_USER_DATABASE_URL and DATABASE_URL before running.", file=sys.stderr)
        return 2

    source_engine = create_engine(source_url, pool_pre_ping=True)
    target_engine = create_engine(target_url, pool_pre_ping=True)
    try:
        source_inspector = inspect(source_engine)
        target_inspector = inspect(target_engine)
        source_tables = set(source_inspector.get_table_names())
        source_name = "cg_user" if "cg_user" in source_tables else "users"
        if source_name not in source_tables:
            raise RuntimeError("Source database has neither cg_user nor users; no data was copied.")
        if "cg_user" not in target_inspector.get_table_names():
            raise RuntimeError(
                "Run the ClauseGuard Alembic migration first; target has no cg_user table."
            )

        source_metadata, target_metadata = MetaData(), MetaData()
        source = Table(source_name, source_metadata, autoload_with=source_engine)
        target = Table("cg_user", target_metadata, autoload_with=target_engine)
        with source_engine.connect() as source_connection:
            source_rows = source_connection.execute(select(source)).mappings().all()
        if not source_rows:
            print(f"Source {source_name} table has no rows; no data was copied.")
            return 0

        if source_name == "users":
            return _copy_legacy_users(source_rows, target, target_engine)

        unsupported_columns = sorted(set(source.c.keys()) - set(target.c.keys()))
        if unsupported_columns:
            raise RuntimeError(
                "Target schema cannot preserve source cg_user fields: "
                + ", ".join(unsupported_columns)
                + ". Add an explicit migration mapping before copying."
            )
        common_columns = [column.name for column in target.columns if column.name in source.c]
        if not common_columns:
            raise RuntimeError("Source and target cg_user schemas have no compatible columns.")
        missing_required = [
            column.name
            for column in target.columns
            if column.name not in common_columns
            and not column.nullable
            and column.server_default is None
            and not column.primary_key
            and column.autoincrement is not True
        ]
        if missing_required:
            raise RuntimeError(
                "Target requires fields absent from source: "
                + ", ".join(missing_required)
                + ". Add an explicit reviewed field mapping before migration."
            )

        rows = [{name: row[name] for name in common_columns} for row in source_rows]

        primary_key_names = [column.name for column in target.primary_key.columns]
        if not primary_key_names:
            raise RuntimeError(
                "Target cg_user has no primary key; refusing to copy without idempotency."
            )
        statement = (
            insert(target).values(rows).on_conflict_do_nothing(index_elements=primary_key_names)
        )
        with target_engine.begin() as target_connection:
            result = target_connection.execute(statement)
        print(f"Copied {result.rowcount or 0} cg_user rows (conflicts were preserved).")
        return 0
    finally:
        source_engine.dispose()
        target_engine.dispose()


def _copy_legacy_users(source_rows, target: Table, target_engine) -> int:
    """Map the old users(id, username, password_hash, role, enabled) table explicitly."""
    required = {"id", "username", "password_hash", "role", "enabled"}
    if set(source_rows[0].keys()) != required:
        raise RuntimeError("Legacy users table does not match the reviewed five-column schema.")
    tenant = Table("cg_tenant", MetaData(), autoload_with=target_engine)
    business_unit = Table("cg_business_unit", MetaData(), autoload_with=target_engine)

    with target_engine.begin() as connection:
        existing_tenant = connection.execute(select(tenant.c.id).limit(1)).first()
        if existing_tenant:
            tenant_id = existing_tenant[0]
        else:
            tenant_id = str(uuid4())
            connection.execute(
                tenant.insert().values(
                    id=tenant_id,
                    name="ClauseGuard (Migrated Users)",
                    created_at=datetime.now(UTC),
                )
            )

        existing_unit = connection.execute(
            select(business_unit.c.id).where(business_unit.c.tenant_id == tenant_id).limit(1)
        ).first()
        if existing_unit:
            unit_id = existing_unit[0]
        else:
            unit_id = str(uuid4())
            connection.execute(
                business_unit.insert().values(
                    id=unit_id, tenant_id=tenant_id, name="General"
                )
            )

        copied = 0
        for user in source_rows:
            user_id = str(user["id"])
            username = str(user["username"]).strip()
            if not user_id or len(user_id) > 36 or not username:
                raise RuntimeError("A legacy user row has an invalid id or empty username.")
            if not str(user["role"]).strip():
                raise RuntimeError("A legacy user row has an empty role.")
            if connection.execute(select(target.c.id).where(target.c.id == user_id)).first():
                continue
            if connection.execute(
                select(target.c.id).where(target.c.email == username)
            ).first():
                raise RuntimeError("A legacy username conflicts with a target account email.")
            connection.execute(
                target.insert().values(
                    id=user_id,
                    tenant_id=tenant_id,
                    email=username,
                    name=username,
                    password_hash=str(user["password_hash"]),
                    role=str(user["role"]),
                    business_unit_ids=[unit_id],
                    active=bool(user["enabled"]),
                    created_at=datetime.now(UTC),
                )
            )
            copied += 1
    print(f"Copied {copied} legacy users into cg_user; source records remain unchanged.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
