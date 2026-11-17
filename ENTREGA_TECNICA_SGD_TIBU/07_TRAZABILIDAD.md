# Matriz de trazabilidad

Los nombres exactos de pruebas están en el catálogo generado. Los identificadores CP son casos funcionales estables; la evidencia de ejecución se registra en XML y en resultados.

| Requisito | Caso | Comprobación | Código |
|---|---|---|---|
| A / HU01 | CP01 | Login correcto, incorrecto, bloqueo | `api/auth.py`, `core/security.py` |
| A / HU01 | CP02 | Logout, revocación, caducidad y manipulación | `Sesion`, `get_usuario_actual` |
| A / HU02,13 | CP03 | Roles, inactivación, restablecimiento | `api/usuarios.py`, `core/deps.py` |
| B / HU02 | CP04 | Parroquias solo admin y parroquia inactiva | `api/institucional.py` |
| B / HU03 | CP05 | Libro configurado, duplicados y custodia | `Libro`, validación de registros |
| C / HU03 | CP06 | Cuatro tipos, fechas y cónyuge válidos | `api/registros.py`, schemas |
| C / HU03 | CP07 | Fecha futura, persona ajena y duplicado rechazados | `validar`, restricción de referencia |
| C / HU04 | CP08 | Corrección/nota conserva motivo y antes/después | `NotaMarginal`, endpoints de historial |
| D / HU05 | CP09 | Filtros, paginación y aislamiento | Listados personas/registros |
| D / HU05 | CP10 | Referencia externa sin identidad religiosa | `/registros/buscar` |
| E / HU06,07 | CP11 | Bandejas limitadas y origen/tercero no deciden | Solicitudes y dependencias |
| E / HU07 | CP12 | Decisión terminal, fecha/motivo, concurrencia | Actualización condicionada por estado |
| F / HU08,09 | CP13 | Emisión/descarga aprobada y rechazo/tercero denegados | `api/certificados.py` |
| F / HU08,10 | CP14 | PDF correcto, instantánea y QR | `services/certificados.py` |
| F / HU10 | CP15 | Verificación pública mínima, desconocido 404 | Endpoint de verificación |
| G / HU11 | CP16 | Bitácora sin secretos y por custodia | `services/access.py`, auditoría |
| H / HU11 | CP17 | Recuentos persistentes y por alcance | Reportes backend/frontend |
| Archivos | CP18 | Subida, tamaño, formato, ruta, hash y acceso | `core/storage.py`, documentos |
| BD / HU12 | CP19 | Migración nueva/idempotencia y legado conservado | Tests de migración |
| BD / HU12 | CP20 | Esquema desconocido, FK, duplicado y estado inválido | Tests de integridad de migración |
| Recuperación | CP21 | Downgrade destructivo bloqueado | Test de downgrade |
| Interfaz | CP22 | Navegación protegida, formularios y mensajes | Pruebas React y build |
| Integral | CP23 | Login → alta → consulta → solicitud → aprobación → emisión → descarga → QR → auditoría | Suite API y demostración |
| Legado / HU14 | CP24 | Custodia NULL solo admin y con historial | `/registros/{id}/custodia` |

El escenario entre parroquias utiliza identidades distintas: el custodiante registra, revisa y emite; el origen solicita y descarga. Un administrador global no sustituye las pruebas negativas de cuentas parroquiales.

## Enlace con funciones automatizadas actuales

| Casos | Funciones en `backend/tests/test_api.py` |
|---|---|
| CP01–03 | `test_lockout_recovery_and_session_invalidation`, `test_revocation_deactivation_and_tokens`, `test_roles_isolation_user_administration` |
| CP04–05,17 | `test_administrative_catalogs_users_and_reports`, `test_upload_size_storage_boundary_and_book_validation` |
| CP06–08 | `test_four_record_types_and_history`, `test_validation_duplicates_and_search`, `test_notes_and_controlled_legacy_custody` |
| CP09–10 | `test_roles_isolation_user_administration`, `test_validation_duplicates_and_search`, `test_headers_cors_and_public_privacy` |
| CP11–16,23 | `test_integral_approval_pdf_qr_and_audit`, `test_rejection_final_state_and_download_denial`, `test_concurrent_request_decisions` |
| CP18 | `test_upload_download_integrity_and_traversal`, `test_upload_size_storage_boundary_and_book_validation` |
| CP24 | `test_notes_and_controlled_legacy_custody` |
| Configuración/errores | `test_configuration_and_sanitized_errors` |

CP19–21 se enlazan con las funciones de `test_migrations.py` listadas en el catálogo; `test_postgresql_legacy_enum_accepts_diocesan_admin` cubre adicionalmente el enum del SQL histórico. CP22 corresponde a la suite frontend registrada en `evidencias/frontend.json`.

## Ampliación RBAC y ciclo de certificados (28-10-2026)

| RF / historias | Código y pantalla | Prueba backend / frontend |
|---|---|---|
| RF02 / HU02 | usuarios.py; UsuariosPage y RolesPage | parroco_assigns_only_parish_roles; siete opciones y límite del párroco |
| RF11 / HU06 | institucional.py; SolicitudesPage | interparish_curia_full_lifecycle; coordinación con origen explícito |
| RF13–16 / HU08,15,16 | certificados.py; CertificadosPage y /aprobaciones | certificate_authorization_separates_prepare_authorize_sign; certificate_curia_approval_flow; matriz frontend de rol/estado y POST de actuaciones |
| RF17 / HU17 | anular; Confirmación de actuación | invalid_certificate_transitions_and_annulment; acciones y descarga solo firmado |
| RF18 / HU09 | lectura_global y public del certificado | diocesan_certificates_visible_and_downloadable |
| RF21 / HU11 | scope, scope_auditoria; AuditoriaPage | unassigned_custody_does_not_grant_auditor_legacy_records; ruta de auditor |
| RNF03 | _transition y bloqueo de fila | concurrent_certificate_authorization en ambos motores |
| RF04 | PATCH de registros; ConnectedRecords | correction_cannot_select_unconfigured_book |
| RF23 | Alembic 0003 | rbac_migration_preserves_secretary_and_certificate_states; migrated_schema_contains_orm_columns_and_foreign_keys |
| RF24 | Dashboard, Sidebar y pantallas conectadas | 16 rutas DOM, roles de aprobaciones, errores de carga y login; npm build |

Las pruebas API del flujo completo incluyen autorización, Curia cuando corresponde, firma y auditoría. La revisión de QR renderizado es evidencia separada; las pruebas DOM con mocks no se denominan E2E de navegador.
