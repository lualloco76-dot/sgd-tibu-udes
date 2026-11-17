"""Versioned schema changes. URL must be supplied explicitly by the operator."""
import os
from alembic import context
from sqlalchemy import create_engine, pool

config = context.config
url = config.get_main_option('sqlalchemy.url') or os.environ.get('DATABASE_URL')
if not url:
    raise RuntimeError('Indique DATABASE_URL explícitamente; no se selecciona la base histórica.')

if context.is_offline_mode():
    raise RuntimeError('Las migraciones requieren inspección online de una base de pruebas.')

def run(connection):
    context.configure(connection=connection, transaction_per_migration=True, render_as_batch=connection.dialect.name == 'sqlite')
    with context.begin_transaction():
        context.run_migrations()

connection = config.attributes.get('connection')
if connection is not None:
    run(connection)
else:
    engine = create_engine(url, poolclass=pool.NullPool)
    with engine.connect() as connection:
        run(connection)
