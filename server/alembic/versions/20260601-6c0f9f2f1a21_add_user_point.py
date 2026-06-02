"""add user point balance

Revision ID: 6c0f9f2f1a21
Revises: a74154e5bd83
Create Date: 2026-06-01 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '6c0f9f2f1a21'
down_revision = 'a74154e5bd83'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user', sa.Column('point', sa.Integer(), nullable=False, server_default='1000'))


def downgrade() -> None:
    op.drop_column('user', 'point')
