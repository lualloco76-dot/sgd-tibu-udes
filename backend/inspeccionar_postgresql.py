"""Read-only structural comparison. Never selects a different application database."""
import argparse
import json
import os
from pathlib import Path
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


def inspect_databases(database_url):
    url = make_url(database_url)
    if url.get_backend_name() != 'postgresql':
        raise ValueError('Se requiere PostgreSQL')
    # Obtain ORM metadata without importing the real configured engine.
    os.environ['DATABASE_URL'] = 'sqlite://'
    from app.database import Base
    import app.models  # noqa: F401
    targets = {url.database, 'partidas', 'parroquia.sql', 'sgd_test'}
    options = {'connect_timeout': 5, 'options': '-c default_transaction_read_only=on'}
    maintenance = create_engine(url.set(database='postgres'), connect_args=options)
    try:
        with maintenance.connect() as c:
            names = set(c.execute(text('SELECT datname FROM pg_database WHERE NOT datistemplate')).scalars())
            version = c.execute(text('SHOW server_version')).scalar_one()
    finally:
        maintenance.dispose()
    result = {'fecha': '2026-10-28', 'solo_lectura': True, 'version_servidor': version,
              'configurada': url.database, 'configurada_existe': url.database in names,
              'nombres_exactos': sorted(targets & names), 'bases': []}
    for name in sorted(targets & names):
        engine = create_engine(url.set(database=name), connect_args=options)
        try:
            with engine.connect() as c:
                inspector = inspect(c)
                tables = inspector.get_table_names()
                columns = {t: [{'nombre': x['name'], 'tipo': str(x['type']), 'nulo': x['nullable']} for x in inspector.get_columns(t)] for t in tables}
                differences = {}
                for t in Base.metadata.sorted_tables:
                    actual = {x['nombre'] for x in columns.get(t.name, [])}
                    expected = {x.name for x in t.columns}
                    differences[t.name] = {'tabla_existe': t.name in tables, 'columnas_faltantes': sorted(expected - actual), 'columnas_adicionales': sorted(actual - expected)}
                result['bases'].append({'nombre': name, 'tablas': tables, 'columnas': columns,
                    'alembic': c.execute(text('SELECT version_num FROM alembic_version')).scalars().all() if 'alembic_version' in tables else None,
                    'enums': inspector.get_enums(), 'comparacion_orm': differences})
        finally:
            engine.dispose()
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database-url', default=os.getenv('INSPECT_DATABASE_URL'))
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.database_url:
        parser.error('Indique --database-url o INSPECT_DATABASE_URL')
    try:
        result = inspect_databases(args.database_url)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    except Exception as error:
        print(f'Inspección no completada ({type(error).__name__}); revise conexión y permisos.')
        return 1
    print('Inspección estructural completada en solo lectura. No se cambiaron conexiones ni datos.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
