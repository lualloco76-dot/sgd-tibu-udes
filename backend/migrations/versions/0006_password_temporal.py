"""Require replacement of temporary credentials without changing existing accounts."""
from alembic import op
import sqlalchemy as sa

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('usuarios', sa.Column('debe_cambiar_password', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    raise RuntimeError('Downgrade destructivo bloqueado. Restaure un respaldo verificado.')
