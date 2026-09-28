"""Create missing ClauseGuard tables and add document in-force state.

Existing tables are never dropped or recreated. The existing cg_user table and rows are
left intact; this revision only creates it when absent and never rewrites its contents.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

from clauseguard_core.domain.entities import Base

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind, checkfirst=True)
    inspector = inspect(bind)
    if "in_force" not in {column["name"] for column in inspector.get_columns("cg_document")}:
        op.add_column(
            "cg_document",
            sa.Column("in_force", sa.Boolean(), nullable=False, server_default=sa.true()),
        )
        op.create_index("ix_cg_document_in_force", "cg_document", ["in_force"])


def downgrade() -> None:
    # Data-preserving by design. Production schemas are rolled forward, never dropped here.
    pass
