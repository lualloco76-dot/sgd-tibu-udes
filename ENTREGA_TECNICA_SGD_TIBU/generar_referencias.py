"""Generate references from application code; never connects to a database."""
from pathlib import Path
import ast
import json
import os
import sys

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path(__file__).resolve().parent
# Override the application's .env before importing config. No real data is read.
os.environ['DATABASE_URL'] = 'sqlite://'
os.environ['SECRET_KEY'] = 'synthetic-documentation-key-never-use-for-deployment'
sys.path.insert(0, str(ROOT / 'backend'))
from app.main import app as application
from app.database import Base
import app.models
from sqlalchemy.schema import CreateTable, CreateIndex
from sqlalchemy.dialects import postgresql

ddl = ['-- Referencia PostgreSQL del ORM actual. NO ejecutar sobre una base existente.',
       '-- Alembic 0001 -> 0002 -> 0003 -> 0004 es la fuente de migración.',
       '-- No incluye datos ni credenciales; algunos defaults son aplicados por SQLAlchemy.', '']
for table in Base.metadata.sorted_tables:
    ddl.append(str(CreateTable(table).compile(dialect=postgresql.dialect())).strip() + ';')
    for index in sorted(table.indexes, key=lambda x: x.name):
        ddl.append(str(CreateIndex(index).compile(dialect=postgresql.dialect())) + ';')
(ROOT / 'database' / 'schema.sql').write_text('\n'.join(line.rstrip() for line in '\n\n'.join(ddl).splitlines()) + '\n', encoding='utf-8')

schema = application.openapi()
(OUTPUT / 'openapi.json').write_text(json.dumps(schema, ensure_ascii=False, indent=2), encoding='utf-8')
lines = ['# Diccionario de datos real', '', 'Generado desde `Base.metadata`; describe el modelo actual, no certifica el esquema de una base histórica. Las revisiones Alembic conservan columnas históricas adicionales. NULL de custodia significa pendiente de conciliación institucional.', '']
er = ['erDiagram']
erp = ['@startuml', 'title Entidad-relación: esquema ORM actual', 'hide circle', 'skinparam linetype ortho', 'skinparam entityAttributeIconSize 0']
for table in Base.metadata.sorted_tables:
    lines += ['## ' + table.name, '', '| Columna | Tipo ORM | Nulo | Clave / referencia | Valor predeterminado |', '|---|---|---|---|---|']
    er += ['  ' + table.name + ' {']
    erp += ['entity "' + table.name + '" as ' + table.name + ' {']
    for column in table.columns:
        keys = ['PK'] if column.primary_key else []
        keys += ['FK → ' + fk.target_fullname for fk in column.foreign_keys]
        if column.unique: keys.append('UNIQUE')
        default = str(column.server_default.arg) if column.server_default else (str(column.default.arg) if column.default and not column.default.is_callable else '')
        lines += [f'| {column.name} | {column.type} | {"Sí" if column.nullable else "No"} | {"; ".join(keys)} | {default} |']
        typename = str(column.type).split('(')[0].replace(' ', '_')
        er += [f'    {typename} {column.name}' + (' PK' if column.primary_key else ' FK' if column.foreign_keys else '')]
        marker = ' <<PK>>' if column.primary_key else ' <<FK>>' if column.foreign_keys else ''
        erp += [f'  {"* " if not column.nullable else "  "}{column.name} : {column.type}{marker}']
    er += ['  }']
    erp += ['}']
    constraints = [str(c) for c in table.constraints if c.__class__.__name__ in ['CheckConstraint', 'UniqueConstraint']]
    unique = [','.join(c.columns.keys()) for c in table.constraints if c.__class__.__name__ == 'UniqueConstraint']
    checks = [str(c.sqltext) for c in table.constraints if c.__class__.__name__ == 'CheckConstraint']
    lines += ['', 'Unicidad: ' + ('; '.join(unique) or 'solo claves indicadas') + '.', 'Restricciones CHECK: ' + ('; '.join(checks) or 'ninguna declarada en ORM') + '.', 'Índices: ' + ('; '.join(i.name + '(' + ', '.join(c.name for c in i.columns) + ')' for i in sorted(table.indexes, key=lambda x: x.name)) or 'ninguno adicional') + '.', '']
    for column in table.columns:
        for fk in column.foreign_keys:
            er += [f'  {fk.column.table.name} |o--o{{ {table.name} : "{column.name}"' if column.nullable else f'  {fk.column.table.name} ||--o{{ {table.name} : "{column.name}"']
            erp += [f'  {fk.column.table.name} |o--o{{ {table.name} : "{column.name}"' if column.nullable else f'  {fk.column.table.name} ||--o{{ {table.name} : "{column.name}"']
(OUTPUT / '04_DICCIONARIO_DATOS.md').write_text('\n'.join(lines), encoding='utf-8')
(OUTPUT / 'diagramas' / '09_entidad_relacion.mmd').write_text('\n'.join(er) + '\n', encoding='utf-8')
erp += ['note bottom', '  Campos obligatorios: prefijo *. PK/FK indicadas.', '  La custodia histórica desconocida permanece NULL.', '  Ver diccionario para índices y restricciones compuestas.', 'end note', '@enduml']
(OUTPUT / 'diagramas' / '09_entidad_relacion.puml').write_text('\n'.join(erp) + '\n', encoding='utf-8')
lines = ['# Referencia de endpoints', '', 'Generada desde OpenAPI. Swagger UI: `/docs`; contrato completo: `openapi.json`. La columna Bearer indica autenticación; la autorización por rol y custodia se detalla en el manual y se comprueba en el servidor.', '', '| Método | Ruta | Bearer | Entrada | Respuestas documentadas |', '|---|---|---|---|---|']
for path, operations in schema['paths'].items():
    for method, operation in operations.items():
        if method not in ['get','post','patch','delete','put','options']: continue
        parameters = [p['name'] + ' (' + p['in'] + ')' for p in operation.get('parameters', [])]
        if 'requestBody' in operation:
            parameters += ['cuerpo: ' + ', '.join(operation['requestBody']['content'])]
        lines += [f'| {method.upper()} | `{path}` | {"Sí" if operation.get("security") else "No"} | {"; ".join(parameters)} | {", ".join(operation["responses"])} |']
lines += ['', 'Respuestas operativas adicionales: 401 sesión inválida; 403 rol/custodia denegados; 404 recurso inexistente o archivo inaccesible; 409 integridad, duplicado o transición inválida; 413 tamaño excesivo; 422 validación; 429 bloqueo de acceso; 503 configuración/persistencia no disponible. No todas estas respuestas están anotadas individualmente en OpenAPI.', '', 'Listados paginados: `skip >= 0`, `1 <= limit <= 200` donde el contrato expone ambos parámetros. Devuelven listas; el frontend avanza por páginas. Búsqueda externa exacta por referencia archivística, con datos mínimos. No usar esta búsqueda para acceder a identidades religiosas.']
(OUTPUT / '05_ENDPOINTS.md').write_text('\n'.join(lines), encoding='utf-8')
lines = ['# Catálogo de pruebas automatizadas', '', 'Generado por análisis sintáctico. La presencia de una prueba no implica que se haya ejecutado. Consultar resultados y XML de evidencia.', '', '| Archivo | Caso |', '|---|---|']
for file in sorted((ROOT / 'backend' / 'tests').glob('test_*.py')):
    tree = ast.parse(file.read_text(encoding='utf-8-sig'))
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name.startswith('test_'):
            lines += [f'| `{file.relative_to(ROOT).as_posix()}` | `{node.name}` |']
(OUTPUT / '08_CATALOGO_PRUEBAS.md').write_text('\n'.join(lines), encoding='utf-8')
print('Referencias generadas sin conexión a base de datos.')
