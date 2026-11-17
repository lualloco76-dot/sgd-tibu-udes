"""Migration tests always create synthetic disposable schemas; no application DATABASE_URL is read."""
from pathlib import Path
import importlib.util
import os
import uuid
import pytest
from alembic import command
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError
from safe_database import test_database_url as safe_url

BACKEND = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('migration_cli', BACKEND / 'ejecutar_schema.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

@pytest.fixture(params=['sqlite', 'postgresql'])
def migration_url(request, tmp_path):
    if request.param == 'sqlite':
        yield 'sqlite:///' + (tmp_path / 'synthetic.sqlite').as_posix()
        return
    base_url = os.environ.get('TEST_DATABASE_URL')
    if not base_url or not base_url.startswith('postgresql'):
        pytest.skip('TEST_DATABASE_URL PostgreSQL sintética no configurada')
    # A per-test PostgreSQL schema isolates DDL/data and makes the tests repeatable.
    schema = 'migration_test_' + uuid.uuid4().hex
    checked_url = safe_url(base_url)
    base_engine = create_engine(checked_url)
    with base_engine.begin() as connection:
        connection.execute(text('CREATE SCHEMA ' + schema))
    url = checked_url.update_query_dict({'options': '-csearch_path=' + schema})
    try:
        yield url.render_as_string(hide_password=False)
    finally:
        with base_engine.begin() as connection:
            # Only the generated identifier above is dropped, never a supplied schema.
            connection.execute(text('DROP SCHEMA ' + schema + ' CASCADE'))
        base_engine.dispose()

def test_new_schema_and_idempotence(migration_url):
    assert module.migrate(migration_url) == {'usuarios': 0, 'personas': 0, 'registros_sacramentales': 0}
    assert module.migrate(migration_url)['usuarios'] == 0
    engine = create_engine(migration_url)
    try:
        with engine.connect() as connection:
            assert connection.execute(text('SELECT version_num FROM alembic_version')).scalar_one() == '0006'
            assert {'solicitudes','certificados','notas_marginales','sesiones','libros','parroquias'}.issubset(inspect(connection).get_table_names())
            assert connection.execute(text('SELECT COUNT(*) FROM sacramentos')).scalar_one() == 4
    finally:
        engine.dispose()

def test_legacy_preserves_rows_and_requires_adoption(migration_url):
    config = module.alembic_config(migration_url)
    command.upgrade(config, '0001')
    engine = create_engine(migration_url)
    try:
        with engine.begin() as connection:
            connection.execute(text("INSERT INTO usuarios (id,nombre,email,password_hash,rol,activo) VALUES (801,'Sintético','sintetico@example.test','hash-sintetico','parroco',TRUE)"))
            connection.execute(text("INSERT INTO personas (id,nombres,apellidos) VALUES (801,'Persona','Sintética')"))
            connection.execute(text("INSERT INTO sacramentos (id,nombre) VALUES (801,'Catálogo legado')"))
            connection.execute(text("INSERT INTO registros_sacramentales (id,persona_id,sacramento_id,libro,folio,numero) VALUES (801,801,801,'L1','F1','N1')"))
            connection.execute(text('DROP TABLE alembic_version'))
        with pytest.raises(ValueError, match='sin versión'):
            module.migrate(migration_url)
        counts = module.migrate(migration_url, adopt_legacy=True)
        assert counts == {'usuarios': 1, 'personas': 1, 'registros_sacramentales': 1}
        with engine.connect() as connection:
            assert connection.execute(text('SELECT id FROM registros_sacramentales')).scalar_one() == 801
            assert connection.execute(text('SELECT parroquia_id FROM registros_sacramentales')).scalar_one() is None
            assert connection.execute(text('SELECT token_version FROM usuarios')).scalar_one() == 0
            assert connection.execute(text('SELECT COUNT(*) FROM sacramentos')).scalar_one() == 5
    finally:
        engine.dispose()

def test_adoption_rejects_unrecognized_schema(migration_url):
    engine = create_engine(migration_url)
    try:
        with engine.begin() as connection:
            connection.execute(text('CREATE TABLE tabla_desconocida (id INTEGER PRIMARY KEY)'))
        with pytest.raises(ValueError, match='faltan tablas'):
            module.migrate(migration_url, adopt_legacy=True)
        with engine.connect() as connection:
            assert 'alembic_version' not in inspect(connection).get_table_names()
    finally:
        engine.dispose()

def test_custody_reference_uniqueness_and_state_constraint(migration_url):
    module.migrate(migration_url)
    engine = create_engine(migration_url)
    try:
        with engine.begin() as connection:
            connection.execute(text("INSERT INTO parroquias (id,nombre,codigo) VALUES (801,'Parroquia Sintética','SYN')"))
            connection.execute(text("INSERT INTO usuarios (id,nombre,email,password_hash,rol,activo) VALUES (801,'Sintético','synthetic@example.test','hash-sintetico','parroco',TRUE)"))
            connection.execute(text("INSERT INTO personas (id,nombres,apellidos,parroquia_id) VALUES (801,'Persona','Sintética',801)"))
            sacrament = connection.execute(text("SELECT id FROM sacramentos WHERE nombre='Bautismo'")).scalar_one()
            values = {'s': sacrament}
            connection.execute(text("INSERT INTO registros_sacramentales (id,persona_id,sacramento_id,parroquia_id,libro,folio,numero) VALUES (801,801,:s,801,'L1','F1','N1')"), values)
        with pytest.raises(IntegrityError):
            with engine.begin() as connection:
                connection.execute(text("INSERT INTO registros_sacramentales (id,persona_id,sacramento_id,parroquia_id,libro,folio,numero) VALUES (802,801,:s,801,'L1','F1','N1')"), values)
        with pytest.raises(IntegrityError):
            with engine.begin() as connection:
                connection.execute(text("INSERT INTO solicitudes (registro_id,origen_id,destino_id,solicitante_id,motivo,estado) VALUES (801,801,801,801,'Solicitud sintética','estado_inexistente')"))
    finally:
        engine.dispose()

def test_destructive_downgrade_is_blocked(migration_url):
    module.migrate(migration_url)
    with pytest.raises(RuntimeError, match='destructivo bloqueado'):
        command.downgrade(module.alembic_config(migration_url), '0001')

def test_foreign_keys_protect_document_integrity(migration_url):
    module.migrate(migration_url)
    engine = create_engine(migration_url)
    try:
        with engine.connect() as connection:
            if connection.dialect.name == 'sqlite':
                connection.exec_driver_sql('PRAGMA foreign_keys=ON')
                connection.commit()
            with pytest.raises(IntegrityError):
                with connection.begin():
                    connection.execute(text("INSERT INTO documentos (registro_id,tipo_documento,nombre_archivo,ruta_archivo,hash_sha256) VALUES (999999,'prueba','sintetico.pdf','sintetico.pdf','hash-sintetico')"))
    finally:
        engine.dispose()

def test_postgresql_legacy_enum_accepts_diocesan_admin(migration_url):
    if not migration_url.startswith('postgresql'):
        pytest.skip('La migración del enum corresponde exclusivamente a PostgreSQL')
    config = module.alembic_config(migration_url)
    command.upgrade(config, '0001')
    engine = create_engine(migration_url)
    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE TYPE rol_usuario AS ENUM ('parroco','secretaria','consulta')"))
            connection.execute(text('ALTER TABLE usuarios ALTER COLUMN rol TYPE rol_usuario USING rol::rol_usuario'))
            connection.execute(text('DROP TABLE alembic_version'))
        module.migrate(migration_url, adopt_legacy=True)
        with engine.begin() as connection:
            connection.execute(text("INSERT INTO usuarios(nombre,email,password_hash,rol,activo) VALUES('Administrador sintético','admin-synthetic@example.test','hash-sintetico','administrador',TRUE)"))
        with engine.connect() as connection:
            assert connection.execute(text("SELECT COUNT(*) FROM usuarios WHERE rol='administrador'")).scalar_one() == 1
    finally:
        engine.dispose()


def test_rbac_migration_preserves_secretary_and_certificate_states(migration_url):
    config = module.alembic_config(migration_url)
    command.upgrade(config, '0002')
    engine = create_engine(migration_url)
    try:
        with engine.begin() as c:
            c.execute(text("INSERT INTO usuarios(id,nombre,email,password_hash,rol,activo) VALUES(801,'Secretario sintético','secretary@example.test','hash-sintetico','secretaria',TRUE)"))
        command.upgrade(config, 'head')
        with engine.connect() as c:
            assert c.execute(text('SELECT rol FROM usuarios WHERE id=801')).scalar_one() == 'secretario_parroquial'
            columns = {col['name'] for col in inspect(c).get_columns('certificados')}
            assert {'estado','autorizado_por','aprobado_curia_por','firmado_por','fecha_firma','requiere_aprobacion_curia'} <= columns
            checks = inspect(c).get_check_constraints('certificados')
            assert any(check['name'] == 'ck_certificado_estado' for check in checks)
    finally:
        engine.dispose()


def test_guard_rejects_production_test_targets():
    for value in ['postgresql://localhost/partidas', 'postgresql://localhost/parroquia.sql', 'sqlite://']:
        with pytest.raises(ValueError, match='exclusivamente a sgd_test'):
            safe_url(value)


def test_migrated_schema_contains_orm_columns_and_foreign_keys(migration_url):
    from app.database import Base
    module.migrate(migration_url)
    engine = create_engine(migration_url)
    try:
        with engine.connect() as c:
            inspector = inspect(c)
            for table in Base.metadata.sorted_tables:
                assert {col.name for col in table.columns} <= {col['name'] for col in inspector.get_columns(table.name)}, table.name
                actual = {(tuple(fk['constrained_columns']), fk['referred_table'], tuple(fk['referred_columns'])) for fk in inspector.get_foreign_keys(table.name)}
                for fk in table.foreign_key_constraints:
                    expected = (tuple(fk.column_keys), next(iter(fk.elements)).column.table.name, tuple(e.column.name for e in fk.elements))
                    assert expected in actual, (table.name, expected)
    finally:
        engine.dispose()


def test_directory_upgrade_preserves_existing_parish(migration_url):
    config = module.alembic_config(migration_url)
    command.upgrade(config, '0003')
    engine = create_engine(migration_url)
    try:
        with engine.begin() as connection:
            connection.execute(text("INSERT INTO parroquias(id,nombre,codigo,activa) VALUES(801,'Parroquia preservada','PRESERVADA',TRUE)"))
        command.upgrade(config, 'head')
        with engine.connect() as connection:
            row = connection.execute(text('SELECT nombre,codigo,activa,tipo,municipio FROM parroquias WHERE id=801')).mappings().one()
            assert row['nombre'] == 'Parroquia preservada' and row['codigo'] == 'PRESERVADA' and row['activa']
            assert row['tipo'] == 'parroquia' and row['municipio'] is None
    finally:
        engine.dispose()
