"""add user elo + last_season_reset

Revision ID: 20260602_elo_002
Revises: 20260602_segment_001
Create Date: 2026-06-02 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '20260602_elo_002'
down_revision = '20260602_segment_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user', sa.Column('elo', sa.Integer(), nullable=False, server_default='1000'))
    op.add_column('user', sa.Column('last_season_reset', sa.TIMESTAMP(), nullable=True))


def downgrade() -> None:
    op.drop_column('user', 'last_season_reset')
    op.drop_column('user', 'elo')
