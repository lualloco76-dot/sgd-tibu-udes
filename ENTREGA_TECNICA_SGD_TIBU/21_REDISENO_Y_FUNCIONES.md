# Rediseño institucional y ampliación funcional — 28 de octubre de 2026

El sistema local incorpora una identidad visual en verde profundo, marfil y dorado, con tipografía editorial, iconos SVG propios, navegación agrupada y adaptación a pantallas pequeñas. No se presenta la marca propuesta como escudo o identidad oficial aprobada de la Diócesis.

## Funciones implementadas

| Área | Resultado funcional |
|---|---|
| Login | Composición editorial, selector de parroquia, mostrar/ocultar contraseña y validación institucional existente |
| Navegación | Secciones agrupadas por tarea y permisos, accesos favoritos por cuenta en este navegador, salto al contenido y menú móvil |
| Búsqueda rápida | Ctrl K / Cmd K abre secciones y consulta hasta cinco partidas por nombre mediante la API autorizada; Escape cierra y devuelve el foco |
| Apariencia | Modo claro/oscuro guardado como preferencia local; sin datos personales en esas preferencias |
| Panel | Conteos de partidas, personas, certificados y solicitudes; serie de seis meses por fecha de celebración; distribución por tipo; estados de certificados; últimas partidas y actividad de auditoría autorizada |
| Accesos rápidos | Apertura del formulario de personas/partidas y administración de usuarios según los permisos de la cuenta |
| Consultas | Filtros en URL para enlazar búsquedas, acción de limpiar filtros y exportación de la página consultada |
| CSV | Directorio, entidades, partidas y resumen de indicadores; exportación local de filas recibidas, UTF-8, delimitador punto y coma y neutralización de fórmulas |
| Directorio | Tarjetas y tabla, búsqueda por nombre/código/municipio/localidad, filtro de estado, edición de ubicación y tipo, exportación y enlaces de ubicación |

No se generan tendencias, nombres de personas o cantidades de ejemplo para llenar el panel. Una base sin partidas muestra cero y estados vacíos. Los agregados conservan el alcance autorizado del servidor; los últimos registros con nombres conservan el permiso ordinario de lectura y no heredan permisos globales exclusivos de auditoría. La actividad de auditoría se omite para roles sin esa facultad. El CSV de página contiene solo las filas de la página recibida, no toda la base ni datos recuperados fuera de alcance.

## PostgreSQL y conservación

Se aplicó la migración aditiva `0004_directorio`: municipio, localidad y dirección opcionales; tipo de comunidad con valor inicial parroquia. Se conservaron las 13 parroquias y la cuenta existente. Se cargaron las ubicaciones aportadas previamente por el responsable: 10 parroquias tienen municipio conocido, una dirección fue suministrada y tres ubicaciones siguen pendientes. No se inventaron contactos ni ubicaciones.

Antes de actualizar se guardaron código y un dump privado PostgreSQL dentro de `.test-artifacts/redesign-20261028/`. El catálogo del dump fue comprobado con pg_restore --list; no se hizo un simulacro de restauración y no se anuncia como tal. No distribuir los respaldos privados como parte de la documentación pública.

## Canva y Figma

Se creó un [tablero editable de dirección visual en Canva](https://canva.link/5mb8n52vn8f559u), diseño DAHZV4jXmzQ. El brief incluyó solamente la propuesta visual, ejemplos públicos y estados de demostración declarados; no se enviaron credenciales ni datos sacramentales personales.

Se ofreció agregar Figma, pero la conexión no está confirmada y no hay herramientas Figma habilitadas en esta sesión. No se creó ni se afirma haber creado un archivo Figma. Los tokens están en `design/tokens.json` y los SVG propios en el código y `frontend/public/brand-mark.svg`, preparados para continuar el trabajo de diseño. La aplicación funciona sin depender de Canva o Figma en tiempo de ejecución.

## Validación y límites

- Frontend: 84 pruebas aprobadas en cuatro archivos y build Vite satisfactorio.
- Backend: 46 aprobadas, 47 omitidas, cero fallos y cero errores. No se configuró TEST_DATABASE_URL para la suite PostgreSQL; también se declara la variante SQLite de un caso exclusivo de PostgreSQL como omitida.
- Se comprobaron alta/edición/borrado de campos opcionales del directorio, migración con conservación, alcance de agregados y datos recientes por parroquia, restricciones de auditoría, teclado/búsqueda, favoritos/tema, filtros URL, formularios rápidos y exportación CSV.
- HTTP contra PostgreSQL local: login, salud, panel, filtros de Tibú, 13 entradas del catálogo, dirección de la Catedral, esquema nuevo, CORS y módulos frontend servidos.
- Revisión visual automática/E2E: no realizada; el host de navegador y el pipe nativo de automatización no estaban disponibles. Las pruebas de DOM y HTTP no equivalen a una captura ni un recorrido real en navegador.

Evidencias: [resumen](evidencias/redesign-resumen.json), [backend XML](evidencias/redesign-backend.xml), [frontend JSON](evidencias/redesign-frontend.json), [migración y conservación](evidencias/redesign-migracion-0004.json) y [comprobación HTTP/PostgreSQL](evidencias/redesign-http-postgresql.json). OpenAPI, diccionario, catálogo de pruebas y ER se regeneran desde el código actual. Los informes y ZIP anteriores conservan su estado histórico.

## Revisión por el responsable

Abrir http://localhost:3000/login, recargar y usar la cuenta existente con acceso diocesano. Revisar el panel, Ctrl K, favoritos, tema oscuro, el directorio y CSV de página. Los servicios son procesos de desarrollo locales; no constituyen despliegue institucional ni arranque automático. Sigue pendiente la aceptación institucional, firma/sello, datos y libros reales, restauración de respaldos y publicación autorizada.
