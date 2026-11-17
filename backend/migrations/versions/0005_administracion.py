"""Persistent role policies and backup history; preserves existing data."""
from alembic import op
import sqlalchemy as sa

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('politicas_roles',
        sa.Column('rol', sa.String(40), primary_key=True),
        sa.Column('permisos', sa.JSON(), nullable=False),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('actualizado', sa.DateTime(timezone=True)),
        sa.Column('actualizado_por', sa.Integer(), sa.ForeignKey('usuarios.id')))
    op.create_table('configuracion_respaldos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('frecuencia', sa.String(15), nullable=False),
        sa.Column('hora', sa.Integer(), nullable=False),
        sa.Column('proximo', sa.DateTime(timezone=True)),
        sa.Column('en_curso', sa.Boolean(), nullable=False),
        sa.Column('trabajo_id', sa.String(32)),
        sa.Column('latido', sa.DateTime(timezone=True)))
    op.bulk_insert(sa.table('configuracion_respaldos', sa.column('id'), sa.column('frecuencia'), sa.column('hora'), sa.column('en_curso')),
        [{'id': 1, 'frecuencia': 'manual', 'hora': 2, 'en_curso': False}])
    op.create_table('respaldos',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('origen', sa.String(15), nullable=False),
        sa.Column('estado', sa.String(20), nullable=False),
        sa.Column('creado', sa.DateTime(timezone=True), nullable=False),
        sa.Column('terminado', sa.DateTime(timezone=True)),
        sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuarios.id')),
        sa.Column('tamano', sa.BigInteger()),
        sa.Column('sha256', sa.String(64)),
        sa.Column('verificado', sa.DateTime(timezone=True)),
        sa.Column('error', sa.String(300)))


def downgrade():
    raise RuntimeError('Downgrade destructivo bloqueado. Restaure un respaldo verificado.')
