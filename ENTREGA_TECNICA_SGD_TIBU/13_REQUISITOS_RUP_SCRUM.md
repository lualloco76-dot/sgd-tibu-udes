# Requerimientos y metodología de consolidación

Título: **Desarrollo de un sistema de información web para la gestión documental de las partidas sacramentales en la Diócesis de Tibú**. Proyecto de grado UDES. Corte: 28 de octubre de 2026.

Esta especificación se deriva del código y de las pruebas actuales; no sustituye un acta de aprobación institucional. Los siete actores autenticados son administrador, párroco, secretario parroquial, secretario general, canciller, auditor y consulta. El visitante verifica códigos sin autenticarse. Las competencias y el alcance se detallan en `14_MATRIZ_ROLES_PERMISOS.md`; no existe herencia de poderes eclesiásticos desde el administrador.

## Requisitos funcionales

| ID | Requisito y aceptación verificable | Historia / prueba |
|---|---|---|
| RF01 | Autenticar con cuenta habilitada, revocar al salir y rechazar token expirado/manipulado | HU01 / revocation_deactivation_and_tokens |
| RF02 | Asignar los siete roles; párroco solo asigna secretario parroquial/consulta de su parroquia | HU02 / parroco_assigns_only_parish_roles |
| RF03 | Registrar y editar parroquias únicamente desde administrador | HU02 / administrative_catalogs_users_and_reports |
| RF04 | Crear libros por parroquia y tipo; bloquear duplicados y referencias nuevas no configuradas | HU03 / correction_cannot_select_unconfigured_book |
| RF05 | Registrar personas con custodia y validar identificador único, correo y fechas | HU03 / validation_duplicates_and_search |
| RF06 | Registrar bautismos, confirmaciones, matrimonios y defunciones con datos específicos y referencia única | HU03 / four_record_types_and_history |
| RF07 | Consultar por nombre, tipo, referencia, parroquia y fechas con paginación y ámbito | HU05 / validation_duplicates_and_search |
| RF08 | Corregir y agregar notas con motivo, usuario, fecha y valores anteriores/posteriores | HU04 / notes_and_controlled_legacy_custody |
| RF09 | Conciliar asientos sin custodia solo como administrador, sin transferir los ya asignados | HU14 / notes_and_controlled_legacy_custody |
| RF10 | Descubrir referencia externa exacta sin divulgar identidad personal | HU06 / integral_approval_pdf_qr_and_audit |
| RF11 | Crear solicitud entre origen activo y custodiante distinto; coordinación diocesana indica origen explícito | HU06 / interparish_curia_full_lifecycle |
| RF12 | Aprobar/rechazar solicitud pendiente con motivo, responsable y fecha; decisión terminal | HU07 / rejection_final_state_and_download_denial |
| RF13 | Preparar certificado como instantánea; solicitud vinculada debe estar aprobada | HU08 / integral_approval_pdf_qr_and_audit |
| RF14 | Autorizar exclusivamente como párroco custodio; administración técnica no autoriza | HU15 / certificate_authorization_separates_prepare_authorize_sign |
| RF15 | Aprobar en Curia como canciller, solo después de autorización y si el trámite lo requiere | HU16 / certificate_curia_approval_flow |
| RF16 | Firmar ordinario como párroco o Curia como canciller; impedir saltos/repeticiones | HU15–16 / invalid_certificate_transitions_and_annulment |
| RF17 | Anular con trazabilidad y bloquear PDF/validez pública; estado terminal | HU17 / invalid_certificate_transitions_and_annulment |
| RF18 | Descargar PDF únicamente firmado, con control de custodia/origen o lectura diocesana | HU09 / diocesan_certificates_visible_and_downloadable |
| RF19 | Verificar QR públicamente devolviendo datos mínimos; no válido si no está firmado o está anulado | HU10 / headers_cors_and_public_privacy |
| RF20 | Subir PDF validado, limitar tamaño y revisar hash al descargar | HU03 / upload_download_integrity_and_traversal |
| RF21 | Consultar auditoría y reportes por alcance; auditor no escribe ni lee legado sin custodia | HU11 / unassigned_custody_does_not_grant_auditor_legacy_records |
| RF22 | Cambiar/restablecer contraseña con facultad y revocar sesiones anteriores | HU13 / lockout_recovery_and_session_invalidation |
| RF23 | Migrar copias explícitas conservando filas, roles e integridad | HU12 / test_migrations.py |
| RF24 | Ofrecer interfaz conectada a HTTP con errores visibles, navegación y controles por rol/estado | Todas / ConnectedFlows.test.jsx y AuthContext.test.jsx |

Los nombres abreviados de pruebas se encuentran con prefijo `test_` en el catálogo. Las aceptaciones frontend se comprueban en DOM con HTTP sustituido; la persistencia y autorización se comprueban en las suites API con bases sintéticas reales.

## Requisitos no funcionales

| ID | Requisito | Verificación y límite |
|---|---|---|
| RNF01 | Autenticación y control en servidor, independencia del menú | Pruebas negativas 401/403; no equivale a pentest externo |
| RNF02 | Confidencialidad: no divulgar contraseña, token, SQL ni identidad en verificación pública | Pruebas de errores saneados, QR y aislamiento |
| RNF03 | Integridad: FK, unicidad, estados y transacciones | SQLite y PostgreSQL; migración comparada con columnas/FK ORM |
| RNF04 | Trazabilidad de correcciones, solicitudes y ciclo de certificados | Bitácora aplicativa, fechas y usuarios; no inmutable frente a superusuario |
| RNF05 | Compatibilidad y reproducibilidad | Python 3.12, instalación limpia de requirements, Node 24.19.0, PostgreSQL 18.3 |
| RNF06 | Mantenibilidad | Módulos existentes, contratos Pydantic, OpenAPI, Alembic, pruebas y fuentes UML |
| RNF07 | Usabilidad | Campos etiquetados, validación, mensajes, tablas y navegación; aceptación con usuarios pendiente |
| RNF08 | Recuperabilidad | Downgrade destructivo bloqueado, manual de respaldo/restauración; simulacro institucional pendiente |
| RNF09 | Disponibilidad | Fallo de conexión devuelve 503 saneado; no se fija SLA no medido |
| RNF10 | Rendimiento | Listados paginados, límites e índices; carga/concurrencia institucional pendiente, sin tiempos objetivo inventados |
| RNF11 | Despliegue seguro | HTTPS, secretos y acceso restringido son condiciones de operación; despliegue no ejecutado |
| RNF12 | Dependencias | Auditorías npm/pip sobre dependencias declaradas y pip check; resultado limitado a avisos conocidos en la fecha |

## RUP + Scrum y evidencia

| Disciplina / fase RUP | Producto de esta intervención | Evidencia |
|---|---|---|
| Inicio / requisitos | Alcance, actores, RF/RNF, historias y prioridades | Este archivo, backlog y matriz de roles |
| Elaboración / análisis y diseño | Arquitectura, clases, componentes, secuencias, actividades, estados, despliegue y ER | `03_ARQUITECTURA.md`, `diagramas/`, diccionario |
| Construcción / implementación | Integración frontend existente, RBAC, transiciones y correcciones verificadas | Código y commits de la rama mejoras-sgd-tibu |
| Construcción / pruebas | Casos positivos/negativos y migraciones en esquemas sintéticos | XML backend y JSON frontend |
| Transición | Manuales, estrategia de base definitiva y guion de aceptación | Manuales, comparación PostgreSQL y pendientes |

Se utiliza un Product Backlog de consolidación, con criterios de aceptación y evidencia por historia. Los incrementos observables son: código original conservado (`b0bc7b7`), integración anterior (`1242b8c`) y consolidación actual (commits registrados en `evidencias/commits.txt`). La autoría y fechas anteriores se consultan en Git; los cambios sin confirmar recibidos se preservaron en un respaldo antes de editar.

No se atribuyen retrospectivamente sprints, reuniones, puntos de historia, Product Owner o actas que no constan. Las siguientes agrupaciones son incrementos técnicos de esta intervención, no sprints históricos: I1 integración de roles/pantallas, I2 ciclo documental y regresiones, I3 validación reproducible/documentación. Criterio de terminado: código conectado, pruebas y build satisfactorios, permisos negativos comprobados y documentación actualizada. La transición institucional necesita aceptación y destino de base autorizado.
