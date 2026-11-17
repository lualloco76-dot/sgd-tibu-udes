# Matriz de roles y permisos efectivos

Fuente: `backend/app/core/roles.py`, `core/deps.py`, `api/usuarios.py`, `api/certificados.py`, `services/access.py` y `frontend/src/context/AuthContext.jsx`. Corte: 28-10-2026.

P = propia parroquia; G = global; O = origen de solicitud aprobada y certificado vinculado; — = no permitido. Los controles de estado y recurso se aplican además del rol.

| Operación | Administrador | Párroco | Secretario parroquial | Secretario general | Canciller | Auditor | Consulta |
|---|---|---|---|---|---|---|---|
| Leer personas/partidas/adjuntos/libros | G | P | P | G | G | — | P |
| Crear/corregir personas/partidas, notas, libros y adjuntos | G | P | P | — | — | — | — |
| Crear solicitud | Origen explícito | P | P | Origen explícito | Origen explícito | — | — |
| Ver solicitudes | G | P como origen/destino | P como origen/destino | G | G | — | P como origen/destino |
| Aprobar/rechazar solicitud | G | Destino P | Destino P | — | — | — | — |
| Preparar certificado | G | P custodiante | P custodiante | G | G | — | — |
| Autorizar certificado preparado | — | P custodiante | — | — | — | — | — |
| Aprobar Curia, autorizado y requiere Curia | — | — | — | — | G | — | — |
| Firmar ordinario autorizado | — | P custodiante | — | — | — | — | — |
| Firmar Curia aprobado_curia | — | — | — | — | G | — | — |
| Anular certificado no anulado | — | P custodiante | — | — | G | — | — |
| Ver/descargar certificado firmado | G | P u O | P u O | G | G | — | P u O |
| Consultar auditoría | G | P | — | G | G | G | — |
| Consultar reportes | G | P | P | G | G | G | P |
| Administrar usuarios | G | Solo secretario parroquial/consulta de P | — | — | — | — | — |
| Administrar parroquias / conciliar legado sin custodia | G | — | — | — | — | — | — |
| Contraseña propia / cerrar sesión | Sí | Sí | Sí | Sí | Sí | Sí | Sí |

El auditor consulta control y agregados, sin acceso general a identidades sacramentales. Ningún rol sin parroquia gana acceso a datos históricos NULL por coincidencia de NULL. Las parroquias y el catálogo de tipos son consultables por cuentas autenticadas; crear parroquias exige administrador. Los roles no se crean ni editan dinámicamente: son siete valores versionados; Usuarios asigna los existentes.

El canciller puede anular cualquier certificado no anulado conforme al backend actual; la firma se restringe a certificados de Curia aprobados. La decisión de una solicitud puede realizarla el secretario parroquial custodiante; la autorización de su certificado siempre exige párroco. Una aprobación de solicitud no sustituye autorización ni firma.

Las facultades registradas en la aplicación no son firma digital criptográfica ni prueba de aprobación canónica de estas reglas. La política institucional necesita validación diocesana.
