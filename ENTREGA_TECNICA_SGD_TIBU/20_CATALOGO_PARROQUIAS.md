# Catálogo inicial de parroquias — 28 de octubre de 2026

Se agregaron las trece entradas suministradas por el responsable a la base PostgreSQL local `parroquia`, mediante la API autenticada de administración. Todas están activas. Los códigos PAR-001 a PAR-013 son identificadores internos generados para esta instalación, no códigos oficiales aportados por la Diócesis.

| Código | Nombre cargado | Ubicación suministrada |
|---|---|---|
| PAR-001 | San Luis Beltrán (Iglesia Catedral) | Tibú |
| PAR-002 | La Santísima Trinidad | La Gabarra · Tibú |
| PAR-003 | María Inmaculada | Tibú |
| PAR-004 | María Auxiliadora | Buena Esperanza · Cúcuta |
| PAR-005 | Nuestra Señora de Fátima | No indicada |
| PAR-006 | Nuestra Señora del Carmen | Puerto Santander |
| PAR-007 | Nuestra Señora de Guadalupe (Cuasiparroquia) | Banco de Arena · Cúcuta |
| PAR-008 | San Faustino | San Faustino de los Ríos · Cúcuta |
| PAR-009 | San Isidro Labrador | San Martín de Loba · Sardinata |
| PAR-010 | San José | Astilleros · El Zulia |
| PAR-011 | San Marcos | El Tarra |
| PAR-012 | Señor de los Milagros | No indicada |
| PAR-013 | San Vicente Ferrer | No indicada |

La dirección suministrada de la Catedral es Calle 7 N° 4-52, Barrio El Carmen, Tibú. Las ubicaciones, tipo y dirección se conservan en [el catálogo de referencia](../database/catalogo-parroquias-inicial.json). El modelo actual guarda nombre, código y estado activo; no tiene columnas de municipio, localidad o dirección. No se completaron ubicaciones no indicadas ni se verificaron fuentes externas: el origen de esta carga es la lista del responsable.

## Verificación

Las trece creaciones devolvieron HTTP 201 y registraron auditoría. Se verificó la ausencia de códigos duplicados y la presencia de los trece pares nombre/código en el catálogo administrativo y en `GET /api/auth/parroquias` (HTTP 200 sin sesión). El selector del login consulta ese catálogo al cargar la pantalla; recargarlo permite ver las nuevas entradas.

Evidencia: [parroquias-carga-inicial.json](evidencias/parroquias-carga-inicial.json). No hubo cambios de esquema ni código funcional; se verificó la persistencia y la respuesta API sin repetir suites que no cambiaron.

La cuenta administradora mantiene el acceso diocesano. Las cuentas parroquiales deben ser asignadas a su parroquia por administración; la carga del catálogo no crea usuarios, libros ni partidas. Los ZIP anteriores conservan el estado previo.
