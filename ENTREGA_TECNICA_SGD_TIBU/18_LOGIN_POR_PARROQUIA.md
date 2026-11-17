# Selección de parroquia al ingresar — 28 de octubre de 2026

El login permite seleccionar una parroquia activa antes de ingresar correo y contraseña. El catálogo se consulta a PostgreSQL mediante `GET /api/auth/parroquias`, sin sesión, y devuelve exclusivamente `id`, `nombre` y `codigo`, ordenados por nombre. No expone cuentas, personas ni registros documentales.

`POST /api/auth/login` recibe `email`, `password` y `parroquia_id` (entero positivo o null). Las cuentas parroquiales deben enviar su parroquia asignada y activa; omitirla, elegir otra o seleccionar acceso diocesano provoca rechazo. Los roles administrador, secretario general, canciller y auditor ingresan con la opción «Acceso diocesano / administración», que envía null. El selector no reasigna parroquias ni concede permisos. La validación se realiza en el servidor antes de crear una sesión; el rechazo mantiene el registro de auditoría y el bloqueo por intentos fallidos.

La interfaz distingue carga pendiente, catálogo vacío y error de conexión, con botón Reintentar. Bloquea el envío durante la carga y exige elegir una opción. Una base sin parroquias conserva el acceso diocesano para que el administrador pueda registrar el catálogo real.

## Validación realizada

| Comprobación | Resultado |
|---|---|
| Frontend, suite completa Vitest/DOM | 66 aprobadas, sin fallos |
| Compilación Vite | Satisfactoria |
| Backend, suite completa sin TEST_DATABASE_URL | 42 aprobadas, 43 omitidas, sin fallos ni errores |
| Login sobre PostgreSQL local | Ocho comprobaciones satisfactorias: catálogo mínimo/activo, rechazo de parroquia ajena y omitida, aceptación de parroquia propia, conservación de rol/custodia, acceso diocesano, rechazo de contexto parroquial para administrador y rechazo de parroquia inactiva |
| Conservación | Datos sintéticos dentro de una transacción revertida; cantidades originales de usuarios, parroquias, sesiones y auditoría conservadas |
| Servidores locales | Backend reiniciado; `/health` y catálogo HTTP 200; frontend actualizado HTTP 200 y CORS correcto |
| E2E de navegador | No ejecutado; inventario de navegadores conectado vacío |

La suite backend anterior incluyó ambos motores; esta ejecución no habilitó las variantes PostgreSQL porque no se configuró TEST_DATABASE_URL para `sgd_test`. Sus 43 omisiones se declaran explícitamente. La prueba PostgreSQL posterior se hizo en proceso mediante TestClient y transacción con savepoints sobre la instalación local nueva: no ejecutó DDL, no creó esquemas ni persistió datos de prueba. No sustituye la suite PostgreSQL completa ni un recorrido E2E.

Evidencias: [backend XML](evidencias/login-parroquia-backend.xml), [frontend JSON](evidencias/login-parroquia-frontend.json), [PostgreSQL](evidencias/login-parroquia-postgresql.json) y [comprobación HTTP/resumen](evidencias/login-parroquia-validacion.json).

No hubo cambios de esquema ni necesidad de una migración adicional. Se actualizaron manual de usuario, catálogo de pruebas, referencia de endpoints y OpenAPI. Los ZIP de la entrega previa conservan el estado anterior.

## Pendientes de configuración

El catálogo local ya tiene las 13 parroquias activas suministradas por el responsable; véase [la carga posterior](20_CATALOGO_PARROQUIAS.md). Posteriormente se creó la cuenta administradora inicial con el correo solicitado por el responsable; se verificaron login, identidad y logout mediante HTTP. Su contraseña no se conserva en esta documentación. Las parroquias solicitadas ya se registraron desde la API de administración. No se inventaron nombres institucionales ni se importaron datos históricos.
