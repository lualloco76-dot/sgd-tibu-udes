# Informe de consolidación del 28 de octubre de 2026

Se continuó la rama `mejoras-sgd-tibu`, desde HEAD `1242b8c`, sin reemplazar el proyecto ni deshacer cambios previos. Antes de editar se inspeccionaron estado, ramas, log y diff. Se conservaron 161 archivos del estado recibido en `.test-artifacts/respaldo-inicial-20261028-155757/estado-inicial.zip`, con manifiesto SHA-256, diff binario y referencias Git. Se conserva además el respaldo original externo. No distribuir respaldos con la tesis sin revisar su contenido.

## Cambios de esta intervención

| Área | Problema comprobado | Corrección |
|---|---|---|
| Usuarios | Selectores y permisos todavía usaban secretaria | Siete roles, etiquetas y asignación limitada del párroco |
| Permisos | Matriz frontend repetida y auditoría bloqueaba roles autorizados | permissionsFor compartida con contexto/matriz; canAudit en página y menú |
| Certificados | Preparación tratada como emisión descargable | Estado, Curia y motivo, cinco actuaciones reales, confirmación/motivo y PDF solo firmado |
| Certificados API | Canciller/secretario general preparaban o aprobaban pero no listaban/descargaban | Lectura global explícita y parroquia_id/autor/motivo en respuesta para UI y trazabilidad |
| Solicitudes | Intento de descargar inmediatamente tras preparar; roles globales sin origen | Preparación sin descarga, origen explícito, responsables/fechas y enlace a entrega |
| Registros | Filtros limitados a admin; valores dependientes podían quedar obsoletos | Filtro diocesano, limpieza de persona/libro/datos al cambiar selección, custodia de edición bloqueada |
| Libros | Secretario podía crear por API pero interfaz lo ocultaba | canWrite y ruta /libros; configuración conserva acceso |
| Navegación | Faltaban vistas claras de roles y actuaciones | /roles de permisos versionados, /aprobaciones para párroco/canciller |
| Seguridad | Auditor con parroquia NULL listaba legado sin custodia | Filtro vacío si no hay alcance parroquial; reportes/auditoría globales explícitos |
| Integridad | Transiciones podían depender solo de bloqueo PostgreSQL | Actualización condicionada por estado, incluida anulación; prueba concurrente SQLite/PostgreSQL |
| Correcciones | PATCH permitía seleccionar libro nuevo sin configurar | Validación de nueva referencia; conserva corrección de referencia histórica sin cambiarla |
| Pruebas PostgreSQL | Un TEST_DATABASE_URL arbitrario podía recibir DDL | Guarda que admite exclusivamente sgd_test |
| Dependencias | requirements UTF-16 con versiones diferentes a las probadas y sin Alembic/psycopg2 | UTF-8, dependencias directas probadas, controlador/migraciones incluidos; instalación limpia |
| Documentación | Cuatro roles, diagramas con herencia admin→párroco y emisión directa | Matrices de siete roles, UML sin herencia eclesiástica, ciclo completo, RF/RNF y manuales |

Se preservó el trabajo recibido en seguridad, JWT, almacenamiento PDF, migración 0003 y certificados. Los commits actuales incorporan también los cambios válidos que estaban sin confirmar al comienzo; no se atribuye toda su autoría a esta intervención. Véanse lista de commits y respaldo inicial para distinguir estados.

## Comprobaciones

La base anterior de backend se reprodujo: 59 aprobadas y una omitida. Sin TEST_DATABASE_URL hubo inicialmente 29 aprobadas y 31 omitidas; eso reflejaba variantes PostgreSQL no configuradas, no regresiones. El frontend recibido falló (14 aprobadas, 3 fallidas en la ejecución inicial conservada) por mocks incompletos y rol antiguo. Posteriormente se reparó y amplió la cobertura. Los números definitivos están en `09_RESULTADOS_VALIDACION.md` y sus archivos de evidencia, sin sumar suites contenidas unas en otras.

No se editaron `.env` ni bases históricas. El sistema no se declara listo para producción: la conexión configurada sigue apuntando a una base inexistente, faltan selección autorizada del destino, aceptación institucional y navegador conectado para E2E. Se deja el siguiente paso en `../FINAL_PENDIENTES_Y_RESULTADOS.md`.
