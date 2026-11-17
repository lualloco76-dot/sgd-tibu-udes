# Referencia de endpoints

Generada desde OpenAPI. Swagger UI: `/docs`; contrato completo: `openapi.json`. La columna Bearer indica autenticación; la autorización por rol y custodia se detalla en el manual y se comprueba en el servidor.

| Método | Ruta | Bearer | Entrada | Respuestas documentadas |
|---|---|---|---|---|
| GET | `/api/auth/parroquias` | No |  | 200 |
| POST | `/api/auth/login` | No | cuerpo: application/json | 200, 422 |
| GET | `/api/auth/me` | Sí |  | 200 |
| POST | `/api/auth/logout` | Sí |  | 200 |
| POST | `/api/auth/change-password` | Sí | cuerpo: application/json | 200, 422 |
| GET | `/api/usuarios/` | Sí | skip (query); limit (query) | 200, 422 |
| POST | `/api/usuarios/` | Sí | cuerpo: application/json | 201, 422 |
| PATCH | `/api/usuarios/{id}` | Sí | id (path); cuerpo: application/json | 200, 422 |
| POST | `/api/usuarios/{id}/restablecer` | Sí | id (path); cuerpo: application/json | 200, 422 |
| POST | `/api/personas/` | Sí | cuerpo: application/json | 201, 422 |
| GET | `/api/personas/` | Sí | skip (query); limit (query); q (query) | 200, 422 |
| GET | `/api/sacramentos/` | Sí |  | 200 |
| POST | `/api/registros/` | Sí | cuerpo: application/json | 201, 422 |
| GET | `/api/registros/` | Sí | skip (query); limit (query); q (query); parroquia_id (query); sacramento_id (query); libro (query); folio (query); numero (query); desde (query); hasta (query) | 200, 422 |
| GET | `/api/registros/buscar` | Sí | parroquia_id (query); sacramento_id (query); libro (query); folio (query); numero (query) | 200, 422 |
| GET | `/api/registros/{id}/historial` | Sí | id (path) | 200, 422 |
| PATCH | `/api/registros/{id}` | Sí | id (path); cuerpo: application/json | 200, 422 |
| POST | `/api/registros/{id}/notas` | Sí | id (path); cuerpo: application/json | 201, 422 |
| POST | `/api/registros/{id}/custodia` | Sí | id (path); cuerpo: application/json | 200, 422 |
| POST | `/api/documentos/` | Sí | registro_id (query); tipo_documento (query); cuerpo: multipart/form-data | 201, 422 |
| GET | `/api/documentos/` | Sí | skip (query); limit (query) | 200, 422 |
| GET | `/api/documentos/{id}/descargar` | Sí | id (path) | 200, 422 |
| GET | `/api/auditoria/` | Sí | skip (query); limit (query) | 200, 422 |
| GET | `/api/parroquias/` | Sí | skip (query); limit (query); q (query); activa (query) | 200, 422 |
| POST | `/api/parroquias/` | Sí | cuerpo: application/json | 201, 422 |
| PATCH | `/api/parroquias/{id}` | Sí | id (path); cuerpo: application/json | 200, 422 |
| GET | `/api/libros/` | Sí | skip (query); limit (query) | 200, 422 |
| POST | `/api/libros/` | Sí | cuerpo: application/json | 201, 422 |
| POST | `/api/solicitudes/` | Sí | cuerpo: application/json | 201, 422 |
| GET | `/api/solicitudes/` | Sí | skip (query); limit (query) | 200, 422 |
| POST | `/api/solicitudes/{id}/decision` | Sí | id (path); cuerpo: application/json | 200, 422 |
| GET | `/api/reportes` | Sí |  | 200 |
| GET | `/api/certificados/verificar/{codigo}` | No | codigo (path) | 200, 422 |
| POST | `/api/certificados/` | Sí | cuerpo: application/json | 201, 422 |
| GET | `/api/certificados/` | Sí | skip (query); limit (query) | 200, 422 |
| POST | `/api/certificados/{id}/autorizar` | Sí | id (path); cuerpo: application/json | 200, 422 |
| POST | `/api/certificados/{id}/aprobar-curia` | Sí | id (path); cuerpo: application/json | 200, 422 |
| POST | `/api/certificados/{id}/firmar` | Sí | id (path); cuerpo: application/json | 200, 422 |
| POST | `/api/certificados/{id}/anular` | Sí | id (path); cuerpo: application/json | 200, 422 |
| GET | `/api/certificados/{id}/pdf` | Sí | id (path) | 200, 422 |
| GET | `/` | No |  | 200 |
| GET | `/health` | No |  | 200 |

Respuestas operativas adicionales: 401 sesión inválida; 403 rol/custodia denegados; 404 recurso inexistente o archivo inaccesible; 409 integridad, duplicado o transición inválida; 413 tamaño excesivo; 422 validación; 429 bloqueo de acceso; 503 configuración/persistencia no disponible. No todas estas respuestas están anotadas individualmente en OpenAPI.

Listados paginados: `skip >= 0`, `1 <= limit <= 200` donde el contrato expone ambos parámetros. Devuelven listas; el frontend avanza por páginas. Búsqueda externa exacta por referencia archivística, con datos mínimos. No usar esta búsqueda para acceder a identidades religiosas.