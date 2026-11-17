# Sistema de Gestión Documental de Partidas Sacramentales — SGD Tibú

Proyecto de grado de Ingeniería de Sistemas, Universidad de Santander (UDES), versión de código **3.1.0 (16/11/2026)**.

## Arquitectura

- **Frontend:** React 18 y Vite.
- **Backend:** FastAPI (Python), SQLAlchemy, Alembic.
- **Datos:** PostgreSQL; migraciones en `backend/migrations/versions/`.
- **Servicios:** autenticación, usuarios, roles, custodia parroquial, registros sacramentales, expedientes, documentos, solicitudes, certificados PDF y auditoría.

## Funciones demostrables

Bautismos, confirmaciones, matrimonios, defunciones, personas, parroquias, libros/folios, digitalización de documentos, preparación/autorización/firma de certificados, trazabilidad, auditoría y respaldos. Las funciones están sujetas al perfil y las autorizaciones del usuario.

## Cómo comprobar el código

- Revisar `ENTREGA_TECNICA_SGD_TIBU/` para arquitectura, diagramas y manuales.
- Revisar `AUDITORIA_20261116/` para el informe técnico y guía reproducible de pruebas.
- Backend: `python -m pytest backend/tests` con las dependencias y base de pruebas configuradas según su documentación.
- Frontend: en `frontend/`, `npm ci`, `npm test` y `npm run build`.

### Pruebas reportadas

Codex informó 99 Vitest, 122 pruebas backend y 50 Playwright aprobadas durante la revisión local del 16/11/2026. Son resultados de la entrega, **no pruebas verificadas en un despliegue remoto**. Los detalles y límites constan en `AUDITORIA_20261116/REVISION_FUNCIONAL.md`.

## Despliegue y datos

El código fuente y sus pruebas **no constituyen por sí solos una instalación cloud operativa**. Antes de demostrar en internet: configurar PostgreSQL migrado, credenciales nuevas, HTTPS, almacenamiento persistente de PDF, respaldos y pruebas de persistencia remota. Consultar `PUBLICACION_UDES_LEER_PRIMERO.md` y `AUDITORIA_20261116/DESPLIEGUE_Y_PROFESORA.md`.

**Privacidad:** repositorio académico de evaluación. No subir bases de datos reales, contraseñas, archivos `.env` con valores, documentos sacramentales identificables ni cuentas de prueba locales.

## Estado de versiones

Esta importación del código procede de una entrega ZIP y no incluye el historial Git original; su commit de incorporación al repositorio es auténtico. Para documentar la evolución histórica, incorporar únicamente commits originales recuperados de un repositorio de desarrollo existente; no recrear fechas ficticias.
