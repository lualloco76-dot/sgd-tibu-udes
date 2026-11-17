"""Add optional directory information without replacing parish records."""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('parroquias') as batch:
        batch.add_column(sa.Column('municipio', sa.String(150)))
        batch.add_column(sa.Column('localidad', sa.String(150)))
        batch.add_column(sa.Column('direccion', sa.String(250)))
        batch.add_column(sa.Column('tipo', sa.String(30), nullable=False, server_default='parroquia'))


def downgrade():
    raise RuntimeError('Downgrade destructivo bloqueado. Restaure un respaldo verificado.')
