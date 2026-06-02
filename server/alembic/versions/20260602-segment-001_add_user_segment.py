"""GDD v0.2 H.1 段位体系：数据库 schema 变更（alembic migration）。"""
"""add user segment fields

Revision ID: 20260602_xxxx_add_segment
Revises: 6c0f9f2f1a21
Create Date: 2026-06-02 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '20260602_segment_001'
down_revision = '6c0f9f2f1a21'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user', sa.Column('segment', sa.String(16), nullable=False, server_default='gold'))
    op.add_column('user', sa.Column('segment_points', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('user', 'segment_points')
    op.drop_column('user', 'segment')
