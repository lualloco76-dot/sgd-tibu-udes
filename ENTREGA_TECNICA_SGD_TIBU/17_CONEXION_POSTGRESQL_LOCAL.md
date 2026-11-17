# Conexión PostgreSQL local — 28 de octubre de 2026

Se creó una instalación local nueva, atendiendo la solicitud de conectar y crear la base del sistema. No se importaron ni modificaron las bases históricas.

| Comprobación | Resultado |
|---|---|
| Servidor | PostgreSQL 18.3, localhost:5432 |
| Base de la aplicación | `parroquia`, nueva |
| Usuario PostgreSQL | `parroquia_app_local`, sin superusuario, creación de bases ni creación de roles |
| Configuración | `backend/.env` actualizado con la conexión privada; contraseña aleatoria no publicada |
| Migraciones | `0001` → `0002` → `0003` |
| Tablas | 12 tablas de dominio y `alembic_version` |
| Columnas ORM | Sin diferencias frente al esquema instalado |
| Catálogo inicial | Bautismo, Confirmación, Matrimonio y Defunción |
| Lectura y escritura | Correctas; inserción de comprobación revertida, sin filas de prueba persistentes |
| Salud de API | `/health`: HTTP 200, `estado=disponible`, mediante TestClient |
| Cuentas de aplicación | Un administrador inicial; inicio y cierre de sesión verificados posteriormente por HTTP |

Evidencia sin contraseñas: [postgresql-conexion-local-20261028.json](evidencias/postgresql-conexion-local-20261028.json).

La comprobación de API se ejecutó en proceso. No se dejó un servidor HTTP permanente ni se hizo un recorrido en navegador. No se volvió a ejecutar la suite completa: sus resultados previos se conservan por separado.

Actualización posterior: se ajustó la política a mínimo 8 caracteres y se restableció la contraseña del administrador según la solicitud del responsable. Véase [estado actual del acceso](19_PASSWORD8_Y_ACCESO.md). La referencia a la clave inicial aleatoria siguiente describe su creación anterior.

## Próximo paso

La cuenta administradora inicial se creó posteriormente con el CLI existente y el correo solicitado por el responsable. Se verificaron inicio de sesión, identidad y cierre por HTTP. La contraseña inicial aleatoria se entregó al responsable y no se incluye en archivos. Cambiarla desde Configuración. Las 13 parroquias suministradas por el responsable ya están cargadas y activas; véase `20_CATALOGO_PARROQUIAS.md`. Falta configurar los libros y validar el flujo completo. No hay una contraseña ni una cuenta predeterminada.

La base nueva tiene un administrador y todavía no contiene registros institucionales. Migrar datos históricos, publicar el sistema, aceptar los procedimientos y configurar firma/sello y respaldos operativos siguen pendientes. Los ZIP de la entrega previa conservan su fecha y estado originales; esta actualización está en la carpeta de documentación.
