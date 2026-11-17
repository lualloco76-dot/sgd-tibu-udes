"""Add custody, sessions, requests and immutable certificate snapshots without assigning legacy custody."""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if bind.dialect.name == 'postgresql':
        # The historical SQL script used an enum, while the original ORM used VARCHAR.
        role_type = next(c['type'] for c in inspector.get_columns('usuarios') if c['name'] == 'rol')
        if isinstance(role_type, sa.Enum):
            preparer = bind.dialect.identifier_preparer
            quoted = preparer.quote(role_type.name)
            if role_type.schema:
                quoted = preparer.quote_schema(role_type.schema) + '.' + quoted
            op.execute(sa.text(f"ALTER TYPE {quoted} ADD VALUE IF NOT EXISTS 'administrador'"))
    op.create_table('parroquias', sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('nombre', sa.String(200), nullable=False), sa.Column('codigo', sa.String(40), nullable=False, unique=True),
        sa.Column('activa', sa.Boolean, nullable=False, server_default=sa.true()))
    for table in ['usuarios', 'personas', 'registros_sacramentales', 'auditoria']:
        with op.batch_alter_table(table) as batch:
            batch.add_column(sa.Column('parroquia_id', sa.Integer, nullable=True))
            batch.create_foreign_key('fk_' + table + '_parroquia', 'parroquias', ['parroquia_id'], ['id'])
            batch.create_index('ix_' + table + '_parroquia_id', ['parroquia_id'])
    with op.batch_alter_table('usuarios') as batch:
        batch.add_column(sa.Column('token_version', sa.Integer, nullable=False, server_default='0'))
        batch.add_column(sa.Column('intentos_fallidos', sa.Integer, nullable=False, server_default='0'))
        batch.add_column(sa.Column('bloqueado_hasta', sa.DateTime(timezone=True)))
    with op.batch_alter_table('registros_sacramentales') as batch:
        batch.add_column(sa.Column('datos', sa.JSON, nullable=False, server_default='{}'))
        batch.create_unique_constraint('uq_asiento_custodia', ['parroquia_id', 'sacramento_id', 'libro', 'folio', 'numero'])
        batch.create_index('ix_registro_fecha', ['fecha_celebracion'])
    op.create_table('libros', sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('parroquia_id', sa.Integer, sa.ForeignKey('parroquias.id'), nullable=False),
        sa.Column('sacramento_id', sa.Integer, sa.ForeignKey('sacramentos.id'), nullable=False),
        sa.Column('numero', sa.String(100), nullable=False),
        sa.UniqueConstraint('parroquia_id', 'sacramento_id', 'numero', name='uq_libro_custodia'))
    op.create_table('solicitudes', sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('registro_id', sa.Integer, sa.ForeignKey('registros_sacramentales.id'), nullable=False),
        sa.Column('origen_id', sa.Integer, sa.ForeignKey('parroquias.id'), nullable=False),
        sa.Column('destino_id', sa.Integer, sa.ForeignKey('parroquias.id'), nullable=False),
        sa.Column('solicitante_id', sa.Integer, sa.ForeignKey('usuarios.id'), nullable=False),
        sa.Column('estado', sa.String(20), nullable=False, server_default='pendiente'),
        sa.Column('motivo', sa.Text, nullable=False), sa.Column('decision_motivo', sa.Text),
        sa.Column('responsable_id', sa.Integer, sa.ForeignKey('usuarios.id')),
        sa.Column('fecha_creacion', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('fecha_decision', sa.DateTime(timezone=True)),
        sa.CheckConstraint("estado IN ('pendiente','aprobada','rechazada')", name='ck_solicitud_estado'))
    op.create_table('certificados', sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('numero', sa.String(60), nullable=False, unique=True),
        sa.Column('registro_id', sa.Integer, sa.ForeignKey('registros_sacramentales.id'), nullable=False),
        sa.Column('solicitud_id', sa.Integer, sa.ForeignKey('solicitudes.id')),
        sa.Column('emitido_por', sa.Integer, sa.ForeignKey('usuarios.id'), nullable=False),
        sa.Column('parroquia_id', sa.Integer, sa.ForeignKey('parroquias.id'), nullable=False),
        sa.Column('codigo_verificacion', sa.String(100), nullable=False, unique=True),
        sa.Column('fecha_emision', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('instantanea', sa.JSON, nullable=False))
    op.create_table('notas_marginales', sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('registro_id', sa.Integer, sa.ForeignKey('registros_sacramentales.id'), nullable=False),
        sa.Column('usuario_id', sa.Integer, sa.ForeignKey('usuarios.id'), nullable=False),
        sa.Column('fecha', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('motivo', sa.Text, nullable=False), sa.Column('anterior', sa.JSON, nullable=False), sa.Column('posterior', sa.JSON, nullable=False))
    op.create_table('sesiones', sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('usuario_id', sa.Integer, sa.ForeignKey('usuarios.id'), nullable=False),
        sa.Column('expira', sa.DateTime(timezone=True), nullable=False), sa.Column('revocada', sa.Boolean, nullable=False, server_default=sa.false()))
    for table, columns in {'libros':['parroquia_id'], 'solicitudes':['registro_id','origen_id','destino_id'],
                           'certificados':['registro_id','parroquia_id'], 'notas_marginales':['registro_id'], 'sesiones':['usuario_id']}.items():
        for column in columns:
            op.create_index('ix_' + table + '_' + column, table, [column])
    for name, table, columns in [
        ('ix_registro_persona', 'registros_sacramentales', ['persona_id']),
        ('ix_documentos_registro', 'documentos', ['registro_id']),
        ('ix_auditoria_fecha', 'auditoria', ['fecha'])]:
        op.create_index(name, table, columns)
    # Add the four scoped record types without replacing or renaming the existing catalog.
    catalog = sa.table('sacramentos', sa.column('nombre', sa.String), sa.column('descripcion', sa.Text))
    for name, description in [('Bautismo', 'Registro de bautismo'), ('Confirmación', 'Registro de confirmación'),
                              ('Matrimonio', 'Registro de matrimonio'), ('Defunción', 'Registro de defunción; no es un sacramento')]:
        if not bind.execute(sa.select(catalog.c.nombre).where(catalog.c.nombre == name)).first():
            bind.execute(catalog.insert().values(nombre=name, descripcion=description))

def downgrade():
    raise RuntimeError('Downgrade destructivo bloqueado. Restaure el respaldo tomado antes de migrar.')


