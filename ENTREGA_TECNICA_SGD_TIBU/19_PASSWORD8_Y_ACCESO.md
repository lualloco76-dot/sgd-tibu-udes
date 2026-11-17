# Contraseñas de mínimo ocho caracteres y acceso restablecido

Actualización del 28 de octubre de 2026 solicitada por el responsable.

Se ajustó el mínimo de las contraseñas de cuentas de 12 a 8 caracteres. No se exigen símbolos, mayúsculas ni otras reglas de composición. Se conserva bcrypt, su máximo de 72 bytes, la comprobación de contraseña actual, la auditoría y la revocación de sesiones al restablecer o cambiar una clave. La política es coherente en alta, restablecimiento, cambio propio, scripts CLI, formularios activos y OpenAPI. No se modificaron SECRET_KEY, PostgreSQL ni las reglas de pertenencia parroquial.

Se restableció la contraseña de la cuenta administradora según la solicitud del responsable mediante el CLI existente. Se reiniciaron los intentos fallidos y se invalidaron las sesiones anteriores. La cuenta continúa activa, con rol administrador y acceso diocesano. Las credenciales no se incluyen en archivos de entrega.

## Validación

- Frontend: 68 pruebas aprobadas y build Vite satisfactorio.
- Backend: 43 aprobadas y 44 omitidas, sin fallos ni errores. TEST_DATABASE_URL no se habilitó; las variantes PostgreSQL y el caso SQLite exclusivo de ese motor siguen declarados como omitidos.
- Prueba nueva del ciclo de contraseñas: alta, restablecimiento y cambio con ocho caracteres; rechazo de siete; revocación de sesiones anteriores y nuevo login.
- Cuenta local real sobre PostgreSQL: inicio de sesión, identidad y reportes por HTTP 200; cuenta activa, sin bloqueo y cero intentos fallidos; sesión de verificación cerrada.
- Backend reiniciado y contrato servido con mínimo 8 en UsuarioCreate, PasswordReset y PasswordChange.

Evidencias: [backend](evidencias/password8-backend.xml), [frontend](evidencias/password8-frontend.json) y [acceso HTTP](evidencias/password8-acceso-verificado.json). Las suites anteriores se conservan como ejecuciones históricas y no se suman a estos resultados. No se realizó E2E de navegador ni cambios de esquema.

Para ingresar a la cuenta administradora, elegir «Acceso diocesano / administración» y usar la contraseña actual acordada con el responsable. Los ZIP anteriores no se regeneraron.
