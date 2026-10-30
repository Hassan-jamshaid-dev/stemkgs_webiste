"""Initial calendar schema: users, sessions, events, audit.

Revision ID: 001_initial
Revises:
Create Date: 2026-10-30

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

KARACHI_NOW = sa.text("timezone('Asia/Karachi', now())")


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("society", sa.String(length=64), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False, server_default="editor"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_dummy", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("failed_login_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("lockout_level", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=KARACHI_NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=KARACHI_NOW, nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=False)
    op.create_index(op.f("ix_users_society"), "users", ["society"], unique=False)

    op.create_table(
        "auth_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("csrf_token", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=KARACHI_NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=KARACHI_NOW, nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_auth_sessions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_sessions")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_auth_sessions_token_hash")),
    )
    op.create_index(op.f("ix_auth_sessions_user_id"), "auth_sessions", ["user_id"], unique=False)
    op.create_index(op.f("ix_auth_sessions_token_hash"), "auth_sessions", ["token_hash"], unique=False)
    op.create_index(op.f("ix_auth_sessions_expires_at"), "auth_sessions", ["expires_at"], unique=False)

    op.create_table(
        "calendar_events",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("society", sa.String(length=64), nullable=False),
        sa.Column("event_name", sa.String(length=200), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("room", sa.String(length=120), nullable=False),
        sa.Column("room_normalized", sa.String(length=120), nullable=False),
        sa.Column("school_year", sa.String(length=9), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by_user_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=KARACHI_NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=KARACHI_NOW, nullable=False),
        sa.CheckConstraint("ends_at > starts_at", name="ck_calendar_events_ends_after_starts"),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            name=op.f("fk_calendar_events_created_by_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["updated_by_user_id"],
            ["users.id"],
            name=op.f("fk_calendar_events_updated_by_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_calendar_events")),
    )
    op.create_index(op.f("ix_calendar_events_society"), "calendar_events", ["society"], unique=False)
    op.create_index(op.f("ix_calendar_events_school_year"), "calendar_events", ["school_year"], unique=False)
    op.create_index(
        "ix_calendar_events_school_year_start",
        "calendar_events",
        ["school_year", "starts_at"],
        unique=False,
    )
    op.create_index(
        "ix_calendar_events_room_norm_starts",
        "calendar_events",
        ["room_normalized", "starts_at"],
        unique=False,
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("actor_email", sa.String(length=320), nullable=True),
        sa.Column("actor_society", sa.String(length=64), nullable=True),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("entity_type", sa.String(length=32), nullable=False, server_default="calendar_event"),
        sa.Column("entity_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("before_state", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("after_state", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=KARACHI_NOW, nullable=False),
        sa.ForeignKeyConstraint(
            ["actor_user_id"],
            ["users.id"],
            name=op.f("fk_audit_logs_actor_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_audit_logs")),
    )
    op.create_index(op.f("ix_audit_logs_actor_user_id"), "audit_logs", ["actor_user_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_action"), "audit_logs", ["action"], unique=False)
    op.create_index(op.f("ix_audit_logs_entity_id"), "audit_logs", ["entity_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_created_at"), "audit_logs", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("calendar_events")
    op.drop_table("auth_sessions")
    op.drop_table("users")
