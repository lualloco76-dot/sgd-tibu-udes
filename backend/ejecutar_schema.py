"""Apply reviewed migrations to an explicitly selected database."""
import argparse
from pathlib import Path
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

BASE = Path(__file__).resolve().parent
LEGACY = {
    'usuarios': {'id','nombre','email','password_hash','rol','activo'},
    'personas': {'id','nombres','apellidos','fecha_nacimiento','lugar_nacimiento','numero_identificacion','telefono','email'},
    'sacramentos': {'id','nombre','descripcion'},
    'registros_sacramentales': {'id','persona_id','sacramento_id','fecha_celebracion','lugar','ministro','libro','folio','numero','notas'},
    'documentos': {'id','registro_id','tipo_documento','nombre_archivo','ruta_archivo','hash_sha256','fecha_subida','subido_por'},
    'auditoria': {'id','usuario_id','accion','entidad','entidad_id','fecha','detalle'},
}

def alembic_config(url):
    config = Config(str(BASE / 'alembic.ini'))
    config.set_main_option('sqlalchemy.url', url.replace('%', '%%'))
    return config

def validate_legacy(connection):
    inspector = inspect(connection)
    tables = set(inspector.get_table_names())
    if not set(LEGACY).issubset(tables):
        raise ValueError('No coincide el esquema legado: faltan tablas requeridas')
    if {'parroquias','sesiones','solicitudes','certificados'} & tables:
        raise ValueError('Esquema parcial institucional: revise manualmente antes de adoptar')
    for table, columns in LEGACY.items():
        found = {c['name'] for c in inspector.get_columns(table)}
        if {'parroquia_id', 'token_version', 'datos'} & found:
            raise ValueError('Columnas institucionales parciales: revise antes de adoptar')
        if not columns.issubset(found):
            raise ValueError('No coincide el esquema legado: faltan columnas requeridas en ' + table)
    # No values are printed: the preflight only reports structural incompatibility.
    for child, foreign_key, parent in [('registros_sacramentales','persona_id','personas'),
        ('registros_sacramentales','sacramento_id','sacramentos'),('documentos','registro_id','registros_sacramentales'),
        ('documentos','subido_por','usuarios'),('auditoria','usuario_id','usuarios')]:
        count = connection.execute(text(f'SELECT COUNT(*) FROM {child} c LEFT JOIN {parent} p ON c.{foreign_key}=p.id WHERE c.{foreign_key} IS NOT NULL AND p.id IS NULL')).scalar_one()
        if count:
            raise ValueError('Referencias huérfanas en ' + child + '; conciliar en una copia antes de migrar')

def migrate(url, adopt_legacy=False):
    engine = create_engine(url)
    try:
        original_counts = None
        with engine.connect() as connection:
            tables = set(inspect(connection).get_table_names())
            if 'alembic_version' not in tables and tables:
                if not adopt_legacy:
                    raise ValueError('Base existente sin versión. Respalde y revise una copia; utilice --adopt-legacy explícitamente')
                validate_legacy(connection)
                original_counts = {table: connection.execute(text('SELECT COUNT(*) FROM ' + table)).scalar_one() for table in LEGACY}
            elif adopt_legacy:
                raise ValueError('--adopt-legacy requiere una base histórica existente sin alembic_version')
        config = alembic_config(url)
        if adopt_legacy:
            command.stamp(config, '0001')
        command.upgrade(config, 'head')
        with engine.connect() as connection:
            if original_counts is not None:
                for table, original_count in original_counts.items():
                    current_count = connection.execute(text('SELECT COUNT(*) FROM ' + table)).scalar_one()
                    if current_count < original_count:
                        raise RuntimeError('Verificación de conservación fallida: detener y restaurar respaldo')
            counts = {table: connection.execute(text('SELECT COUNT(*) FROM ' + table + ' WHERE parroquia_id IS NULL')).scalar_one()
                      for table in ['usuarios','personas','registros_sacramentales']}
        return counts
    finally:
        engine.dispose()

def main():
    parser = argparse.ArgumentParser(description='Migrar una base revisada; nunca selecciona la base histórica por defecto.')
    parser.add_argument('--database-url', required=True, help='URL SQLAlchemy de la base elegida; preferir variable de entorno al invocar')
    parser.add_argument('--confirm-target', action='store_true', help='Confirma respaldo y revisión del destino')
    parser.add_argument('--adopt-legacy', action='store_true', help='Adoptar esquema histórico validado sin borrar sus datos')
    args = parser.parse_args()
    if not args.confirm_target:
        parser.error('Revise destino y respaldo; se requiere --confirm-target')
    try:
        counts = migrate(args.database_url, args.adopt_legacy)
    except Exception as error:
        print('Migración no completada (' + type(error).__name__ + '). Revise el esquema y conectividad sin imprimir secretos.')
        return 1
    print('Migración completada. Registros sin custodia (requieren conciliación institucional): ' + str(counts))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())

