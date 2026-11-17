# PostgreSQL: inspección y estrategia de destino

**Actualización posterior:** se creó una base nueva local `parroquia`, con rol propio sin privilegios de superusuario, migraciones hasta `0003` y conexión comprobada. Véase [verificación actual](17_CONEXION_POSTGRESQL_LOCAL.md). La inspección y la tabla siguientes conservan el estado inicial como evidencia histórica; no describen la conexión actual. Las bases históricas permanecen sin modificar.

Inspección realizada el 28-10-2026 mediante consultas de metadatos en transacciones de solo lectura. Fuente: `evidencias/postgresql-inspeccion.json`; herramienta reproducible: `backend/inspeccionar_postgresql.py`. No se leyó contenido de feligreses ni se modificó configuración o datos históricos. PostgreSQL observado: 18.3.

| Nombre exacto | Hallazgo | Compatibilidad |
|---|---|---|
| `parroquia` | Es el destino configurado, pero no existe | El arranque no dispone de persistencia funcional con ese destino |
| `parroquia.sql` | Es una base real con 7 tablas; no es un nombre de archivo supuesto | Esquema cercano al legado de seis tablas, con Especie adicional; sin Alembic ni estructura institucional ampliada |
| `partidas` | 24 tablas, nombres y relaciones de otro modelo; contiene alembic_version propia | No es compatible automáticamente con los modelos actuales ni con esta cadena de revisiones |
| `sgd_test` | Sin tablas en public en la inspección inicial | Destino de pruebas mediante esquemas aleatorios aislados, retirados al finalizar |

## Comparación y migraciones

La versión nueva utiliza doce tablas de dominio ORM: parroquias, usuarios, personas, sacramentos, libros, registros_sacramentales, documentos, solicitudes, certificados, notas_marginales, sesiones y auditoria. Alembic añade su tabla de versión. El JSON enumera, por base y tabla, columnas faltantes/adicionales y tipos/nulabilidad observados, además de enums y versiones. El diccionario describe el ORM actual; no confunde ese modelo con una base histórica ya migrada.

`parroquia.sql` carece de parroquias, libros, solicitudes, certificados, notas_marginales y sesiones; faltan custodia, datos de partida, versión/revocación de cuentas y demás ampliaciones. Conserva columnas históricas como creado_en que no deben borrarse. La adopción exige además prevalidar columnas e integridad en una copia; esta inspección no certifica todas las filas ni autoriza adoptar la base original.

Cadena de este proyecto: `0001` línea base; `0002` custodia y flujo institucional; `0003` siete roles, renombre de secretaria y trazabilidad/estados de certificados. Los tests comprueban base nueva, adopción sintética, enum PostgreSQL, conservación del secretario y columnas/FK ORM contra migraciones. No se ha aplicado esta cadena a las bases históricas.

`0003` conserva certificados anteriores como preparados, sujetos a revisión/autorización; no inventa firmantes para validar emisiones antiguas. Los campos de Curia de Solicitud existen en el esquema, pero el flujo de aprobación implementado se realiza sobre Certificado. No hay un endpoint independiente de aprobación de Curia de solicitudes ni aprobación canónica especial de correcciones; esos campos o comentarios de intención no se anuncian como funciones operativas.

## Estrategia recomendada y orden exacto

1. El responsable elige una base definitiva nueva, por ejemplo un nombre institucional aprobado, y un usuario de privilegios mínimos. No se cambia `.env` automáticamente.
2. Respaldar BD histórica, archivos y configuración; restaurar en otra base y verificar recuperación con responsables autorizados. La existencia de un ZIP de código no reemplaza un respaldo restaurable de PostgreSQL.
3. Para instalación vacía: aplicar 0001→0003 en una base de desarrollo elegida explícitamente; crear administrador con entrada oculta; cargar parroquias, libros y cuentas sintéticos; validar acceso desde interfaz.
4. Para conservar `parroquia.sql`: restaurar una copia, ejecutar prevalidación de `ejecutar_schema.py`, revisar huérfanos/roles y aplicar `--adopt-legacy --confirm-target` exclusivamente sobre esa copia. Conciliar custodia NULL con evidencia; no inferirla ni asignarla masivamente.
5. Para `partidas`: elaborar un mapeo ETL de las 24 tablas al modelo actual, con conciliación y controles de cantidad/referencias. No ejecutar esta adopción de seis tablas contra aquel esquema.
6. Validar integridad, conservación, usuarios, roles, solicitudes, autorización, Curia, firma, PDF/QR y auditoría en la copia. Obtener autorización explícita antes de cualquier cambio en producción.
7. Solo con destino aprobado y copia verificada, configurar DATABASE_URL del despliegue, usar secreto fuerte/HTTPS/URL pública y realizar aceptación institucional. Preparar reversión por restauración comprobada.

## Repetir inspección o pruebas

Desde la raíz, con entorno virtual instalado: definir privadamente `INSPECT_DATABASE_URL` y ejecutar `python backend/inspeccionar_postgresql.py --output informe.json`. La herramienta consulta nombres y metadatos; no cambia `.env`, no crea esquemas ni imprime contraseñas.

Para pruebas, definir `TEST_DATABASE_URL` con destino exclusivo `sgd_test` y ejecutar `python -m pytest backend/tests -q`. Las fixtures rechazan otras bases, crean únicamente esquemas api_test_/migration_test_ aleatorios y retiran sus propios esquemas. No reutilizar credenciales productivas en una prueba. El catálogo public permanece vacío al cierre de las pruebas.
