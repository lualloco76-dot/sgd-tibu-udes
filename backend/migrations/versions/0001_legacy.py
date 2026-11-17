"""Baseline compatible with the original ORM. Existing databases are adopted separately."""
from alembic import op
import sqlalchemy as sa

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('usuarios', sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('nombre', sa.String, nullable=False), sa.Column('email', sa.String, nullable=False, unique=True),
        sa.Column('password_hash', sa.String, nullable=False), sa.Column('rol', sa.String), sa.Column('activo', sa.Boolean))
    op.create_table('personas', sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('nombres', sa.String, nullable=False), sa.Column('apellidos', sa.String, nullable=False),
        sa.Column('fecha_nacimiento', sa.Date), sa.Column('lugar_nacimiento', sa.String),
        sa.Column('numero_identificacion', sa.String, unique=True), sa.Column('telefono', sa.String), sa.Column('email', sa.String))
    op.create_table('sacramentos', sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('nombre', sa.String, nullable=False, unique=True), sa.Column('descripcion', sa.Text))
    op.create_table('registros_sacramentales', sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('persona_id', sa.Integer, sa.ForeignKey('personas.id'), nullable=False),
        sa.Column('sacramento_id', sa.Integer, sa.ForeignKey('sacramentos.id'), nullable=False),
        sa.Column('fecha_celebracion', sa.Date), sa.Column('lugar', sa.String), sa.Column('ministro', sa.String),
        sa.Column('libro', sa.String), sa.Column('folio', sa.String), sa.Column('numero', sa.String), sa.Column('notas', sa.Text))
    op.create_table('documentos', sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('registro_id', sa.Integer, sa.ForeignKey('registros_sacramentales.id'), nullable=False),
        sa.Column('tipo_documento', sa.String, nullable=False), sa.Column('nombre_archivo', sa.String, nullable=False),
        sa.Column('ruta_archivo', sa.String, nullable=False), sa.Column('hash_sha256', sa.String, nullable=False),
        sa.Column('fecha_subida', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('subido_por', sa.Integer, sa.ForeignKey('usuarios.id')))
    op.create_table('auditoria', sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('usuario_id', sa.Integer, sa.ForeignKey('usuarios.id')), sa.Column('accion', sa.String, nullable=False),
        sa.Column('entidad', sa.String, nullable=False), sa.Column('entidad_id', sa.Integer),
        sa.Column('fecha', sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column('detalle', sa.Text))

def downgrade():
    raise RuntimeError('Downgrade destructivo bloqueado. Restaure un respaldo previamente verificado.')
