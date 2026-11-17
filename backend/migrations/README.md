# Migraciones y conservación del legado

La revisión `0005` incorpora políticas de permisos, programación e historial de respaldos mediante tablas nuevas. No cambia los permisos existentes hasta que el administrador los guarda. Aplicar antes de reiniciar la API. Véase [el manual del módulo](../../ENTREGA_TECNICA_SGD_TIBU/23_RESPALDOS_Y_PERMISOS.md).

Alembic es la fuente de actualización. `database/schema.sql` es referencia de una instalación nueva; no ejecutarlo sobre una base existente.

## Base nueva de desarrollo o pruebas

Crear previamente una base PostgreSQL vacía y un rol limitado a ella. Desde `backend/`, con la URL guardada en una variable de entorno de la sesión:

```powershell
python ejecutar_schema.py --database-url $env:TEST_DATABASE_URL --confirm-target
python crear_admin.py --database-url $env:TEST_DATABASE_URL --email operador@example.test --nombre 'Administrador de pruebas' --confirm-target
```

La contraseña se solicita mediante entrada oculta; no hay usuario ni contraseña predeterminados. `crear_db.py` conserva una entrada compatible que aplica las mismas migraciones y no crea bases mediante un superusuario. Los scripts no realizan operaciones al importarse.

## Adopción de una base histórica

1. Respaldar la base y los PDF; verificar su restauración en otra instancia.
2. Restaurar el respaldo en una base de pruebas. Mantener el original desconectado.
3. Revisar tablas, claves externas, referencias archivísticas y roles. Los scripts no imprimen personas ni secretos.
4. Aplicar en esa copia: `python ejecutar_schema.py --database-url $env:TEST_DATABASE_URL --adopt-legacy --confirm-target`.
5. La adopción exige las seis tablas y columnas originales. Rechaza esquemas institucionales parciales y referencias huérfanas; no los repara silenciosamente.
6. `0001` marca la línea base; `0002` añade parroquias, custodia, libros, sesiones, solicitudes, certificados y notas. PostgreSQL amplía el enum histórico de roles, si existe, con `administrador`, conservando valores existentes.
7. Los datos históricos conservan `parroquia_id = NULL`. Se informa solamente su cantidad. Requieren conciliación institucional aprobada antes de habilitar cuentas parroquiales o emitir certificados. No se deduce custodia por persona ni por archivo. Revisar referencias repetidas antes de asignar custodia: el índice único parroquia/tipo/libro/folio/partida bloqueará colisiones.
8. Ejecutar pruebas y comparar cantidades e integridad con la copia inicial. Las pruebas sintéticas no certifican datos históricos reales.

`0002` conserva columnas y restricciones históricas adicionales. SQLite usa reconstrucción por lotes de Alembic para añadir claves; PostgreSQL usa ALTER TABLE. No se eliminan filas. La revisión se prueba también con registros legados incompletos y custodia nula.

## Recuperación

Los downgrades que eliminarían información están bloqueados. Antes de actualizar debe existir un respaldo restaurable. Si la migración falla, detener la aplicación y restaurar la copia de pruebas desde el respaldo; conservar la instancia fallida para diagnóstico. PostgreSQL ejecuta cada revisión en su transacción. SQLite puede conservar DDL parcial ante un fallo: no repetir adopción a ciegas y restaurar el respaldo. Producción requiere autorización separada y no se modifica en esta entrega.

## Pruebas

Desde `backend/`: `python -m pytest tests/test_migrations.py -v`.

SQLite usa archivos temporales. Con `TEST_DATABASE_URL` apuntando a PostgreSQL sintético, cada prueba utiliza y elimina solamente su esquema aleatorio. Sin PostgreSQL estas variantes se declaran omitidas.

## Revisión 0004: directorio

La revisión vigente añade municipio, localidad, dirección y tipo a parroquias. Conserva sus identificadores, nombres, códigos y relaciones; los campos de ubicación son opcionales y tipo parte de parroquia. Existe una prueba que actualiza una parroquia de 0003 a head y comprueba conservación. La instalación local se actualizó con un dump previo; ver el informe de rediseño para evidencias y límites.
