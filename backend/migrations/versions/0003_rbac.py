"""RBAC de la tesis: roles institucionales y ciclo de vida de certificados.

Conserva usuarios y datos existentes:
- `secretaria` se renombra a `secretario_parroquial` (mismo registro, sin nuevos
  privilegios).
- Se añaden `secretario_general`, `canciller` y `auditor` como roles.
- Se amplía `certificados` con estados y trazabilidad de autorización, aprobación
  de Curia y firma, y `solicitudes` con la marca de competencia de Curia.
No se otorgan privilegios automáticamente a usuarios existentes.
"""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. Roles: adaptar el enum histórico (PostgreSQL) o el VARCHAR (nuevos/esquemas).
    if bind.dialect.name == 'postgresql':
        role_type = next(c['type'] for c in inspector.get_columns('usuarios') if c['name'] == 'rol')
        if isinstance(role_type, sa.Enum):
            preparer = bind.dialect.identifier_preparer
            quoted = preparer.quote(role_type.name)
            if role_type.schema:
                quoted = preparer.quote_schema(role_type.schema) + '.' + quoted
            for value in ['secretario_general', 'canciller', 'auditor']:
                op.execute(sa.text(f"ALTER TYPE {quoted} ADD VALUE IF NOT EXISTS '{value}'"))
            # Renombrar el valor legado sin recrear el enum.
            op.execute(sa.text(
                f"DO $$ BEGIN "
                f"ALTER TYPE {quoted} RENAME VALUE 'secretaria' TO 'secretario_parroquial'; "
                f"EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL; "
                f"END $$"
            ))
        else:
            op.execute(sa.text("UPDATE usuarios SET rol='secretario_parroquial' WHERE rol='secretaria'"))
    else:
        op.execute(sa.text("UPDATE usuarios SET rol='secretario_parroquial' WHERE rol='secretaria'"))

    # 2. Solicitudes: competencia de Curia.
    with op.batch_alter_table('solicitudes') as batch:
        batch.add_column(sa.Column('requiere_aprobacion_curia', sa.Boolean, nullable=False, server_default='false'))
        batch.add_column(sa.Column('aprobado_curia_por', sa.Integer))
        batch.add_column(sa.Column('fecha_aprobacion_curia', sa.DateTime(timezone=True)))
        batch.add_column(sa.Column('motivo_curia', sa.Text))
        batch.create_foreign_key('fk_solicitudes_aprobado_curia', 'usuarios', ['aprobado_curia_por'], ['id'])

    # 3. Certificados: ciclo de vida preparado -> autorizado -> (aprobado_curia) -> firmado.
    with op.batch_alter_table('certificados') as batch:
        batch.add_column(sa.Column('estado', sa.String(20), nullable=False, server_default='preparado'))
        batch.add_column(sa.Column('autorizado_por', sa.Integer))
        batch.add_column(sa.Column('fecha_autorizacion', sa.DateTime(timezone=True)))
        batch.add_column(sa.Column('requiere_aprobacion_curia', sa.Boolean, nullable=False, server_default='false'))
        batch.add_column(sa.Column('aprobado_curia_por', sa.Integer))
        batch.add_column(sa.Column('fecha_aprobacion_curia', sa.DateTime(timezone=True)))
        batch.add_column(sa.Column('motivo_curia', sa.Text))
        batch.add_column(sa.Column('firmado_por', sa.Integer))
        batch.add_column(sa.Column('fecha_firma', sa.DateTime(timezone=True)))
        batch.create_foreign_key('fk_certificados_autorizado', 'usuarios', ['autorizado_por'], ['id'])
        batch.create_foreign_key('fk_certificados_aprobado_curia', 'usuarios', ['aprobado_curia_por'], ['id'])
        batch.create_foreign_key('fk_certificados_firmado', 'usuarios', ['firmado_por'], ['id'])
        batch.create_check_constraint('ck_certificado_estado', "estado IN ('preparado','autorizado','aprobado_curia','firmado','anulado')")


def downgrade():
    raise RuntimeError('Downgrade destructivo bloqueado. Restaure un respaldo previamente verificado.')
