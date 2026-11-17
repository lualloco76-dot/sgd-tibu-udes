# Estado vigente de la entrega — 16 de noviembre de 2026

Se retomaron y conservaron las correcciones previas. El cierre de botones Ver,
Editar, Historial, trazabilidad y preparación desde Solicitudes se documenta en
[Revisión funcional](AUDITORIA_20261116/REVISION_FUNCIONAL.md).
La entrega actual es **SGD_TIBU_ACTUALIZADO_20261116.zip**, edición 3.1.0,
con programa e instalador reconstruidos, fuentes, manuales y evidencias.
No se publicó en GitHub, Render ni Neon. Los ZIP anteriores permanecen intactos.

## Estado anterior — 9 de noviembre de 2026

Se completó la verificación final de `SGD_TIBU_VERSION_FINAL_PROFESORA_UDES.zip` (distribución 3.0.0, 150,85 MiB, 5.788 archivos). Pasaron CRC, extracción real, comparación SHA-256 de todos los archivos y arranque del ejecutable extraído con su PostgreSQL incluido y un perfil nuevo. El acceso administrador funcionó; se comprobaron 13 parroquias y cero partidas precargadas. La base original conserva conteos y firmas de contenido idénticos a los de la preparación.

Archivos para entregar: el ZIP final y `SGD_TIBU_VERSION_FINAL_PROFESORA_UDES.zip.sha256`. Resultado detallado: [verificación final](SGD_TIBU_VERSION_FINAL_PROFESORA_UDES_VERIFICACION.json). La guía de apertura está dentro del ZIP en `09_GUIA_PROFESORA/LEEME_PRIMERO.pdf`.

La prueba detectó un límite de carga de DLL en rutas profundas de Windows. Se repitió correctamente con un destino corto y se actualizó la guía: extraer todo el ZIP en una carpeta corta, por ejemplo `C:\SGD`.

Siguen pendientes las pruebas en Windows 10/11 limpios, el reinicio completo del sistema operativo y la aceptación institucional de contenido y firma/sello. Las pruebas previas registradas en esta entrega son 109 backend aprobadas y una omitida; 91 frontend aprobadas. Esta continuación cerró la integridad y el arranque del paquete; no repitió esas suites.

## Registro histórico — 28 de octubre de 2026

Las referencias siguientes a entregas o pasos anteriores se conservan como historial; el estado vigente es el indicado arriba.

**Actualización más reciente: PostgreSQL local conectado.** Se creó una base nueva `parroquia`, con rol propio sin privilegios de superusuario, y se aplicaron las migraciones hasta `0004`. Pasaron lectura/escritura con reversión de prueba, comparación de columnas con el ORM y `/health` mediante TestClient (HTTP 200). La cuenta administradora inicial ya está creada y su login fue verificado. Faltan datos institucionales, E2E en navegador y aceptación institucional. Véase [conexión local](ENTREGA_TECNICA_SGD_TIBU/17_CONEXION_POSTGRESQL_LOCAL.md). No se declara el sistema terminado para producción.

También se añadió el [selector de parroquia en el login](ENTREGA_TECNICA_SGD_TIBU/18_LOGIN_POR_PARROQUIA.md), con validación de pertenencia en servidor y acceso diocesano separado. El catálogo local ya contiene las 13 parroquias suministradas por el responsable, activas y disponibles en el login. Véase [catálogo y verificación](ENTREGA_TECNICA_SGD_TIBU/20_CATALOGO_PARROQUIAS.md). El administrador inicial ya está creado. El sistema está iniciado localmente en `http://localhost:3000` y su API en `http://localhost:8000`; estos procesos dependen de la sesión del equipo y no equivalen a un servicio instalado para arranque automático.

Último ajuste: [mínimo de contraseña de 8 caracteres y acceso restablecido](ENTREGA_TECNICA_SGD_TIBU/19_PASSWORD8_Y_ACCESO.md). Cuenta administradora activa y login verificado contra PostgreSQL. Las credenciales no se incluyen en la entrega.

Actualización de interfaz: [rediseño institucional y funciones](ENTREGA_TECNICA_SGD_TIBU/21_REDISENO_Y_FUNCIONES.md), con 84 pruebas frontend aprobadas, 46 backend aprobadas y 47 omitidas; build y comprobaciones HTTP/PostgreSQL correctas. Revisión visual automática no disponible.

Inicio simplificado: [lanzador Windows](ENTREGA_TECNICA_SGD_TIBU/22_LANZADOR_WINDOWS.md), probado iniciando ambos servicios y reabriendo sin duplicados.

## Registro del cierre anterior

El contenido siguiente conserva el estado previo a crear la base local, incluidas sus referencias a una base inexistente, `.env` sin modificar y siguientes pasos. Esas afirmaciones históricas quedan sustituidas, para la conexión local, por la actualización anterior. Las pruebas completas y los ZIP citados corresponden a la entrega anterior y no se regeneraron en esta intervención.

Rama: `mejoras-sgd-tibu`. Código: **6194f38**. Se continuó desde `1242b8c`, conservando los cambios anteriores. El commit de documentación se consulta con `git log -2 --oneline`. Los commits usan identidad local de agente Codex sin cambiar la configuración global de Git. No se modificaron `.env`, `partidas` ni `parroquia.sql`.

## Resultados reales

- Backend en instalación Python limpia, SQLite y PostgreSQL 18.3: **78 aprobadas, 1 omitida**, sin fallos. La omisión es un caso de enum PostgreSQL no aplicable a SQLite; su variante PostgreSQL pasó.
- Frontend: **61 pruebas aprobadas**, build Vite satisfactorio.
- npm audit y pip-audit: **0 vulnerabilidades conocidas** en las dependencias auditadas; pip check sin conflictos.
- PDF real de prueba renderizado e inspeccionado; QR decodificado y URL exacta comprobada.
- Once diagramas UML/ER renderizados y documentación RUP + Scrum actualizada.
- `sgd_test` quedó sin tablas públicas ni esquemas temporales de pruebas.

La diferencia respecto de 59 aprobadas/1 omitida corresponde a 19 comprobaciones adicionales aprobadas. Los subconjuntos API y migraciones no se suman a la suite completa. Consultar `ENTREGA_TECNICA_SGD_TIBU/09_RESULTADOS_VALIDACION.md` y `evidencias/`.

## Estado de cada módulo

| Módulo | Estado comprobado | Pendiente real |
|---|---|---|
| Inicio de sesión | Autenticación, bloqueo, revocación, formularios y errores probados | Ingreso E2E con navegador conectado y base elegida |
| Dashboard / reportes | Indicadores reales por alcance, ruta DOM y API | Aceptación institucional / medición de carga |
| Usuarios | Siete roles y asignación limitada del párroco | Cuentas institucionales autorizadas |
| Roles y permisos | Matriz visible y RBAC en servidor; admin no firma | Validación diocesana de competencias |
| Parroquias | Alta/edición/activación admin y catálogo probado | Catálogo real aprobado |
| Libros | Alta de referencias por custodiante y validación | Configurar referencias institucionales |
| Bautismos | Alta, consulta, corrección e historial probados | Conciliación de datos reales y E2E |
| Confirmaciones | Alta, consulta, corrección e historial probados | Conciliación de datos reales y E2E |
| Matrimonios | Cónyuge de misma custodia y flujo probado | Conciliación de datos reales y E2E |
| Defunciones | Asiento documental y validación de fechas probados | Conciliación de datos reales y E2E |
| Consulta documental | Filtros, paginación y referencia externa mínima probados | E2E con volumen institucional |
| Solicitudes entre parroquias | Alta, origen explícito, decisión, responsable, rechazo y trazabilidad probados | Aceptación del procedimiento institucional |
| Certificados | Preparar/autorizar/Curia/firmar/anular, PDF y QR probados | Política de firma/sello, dominio público |
| Aprobaciones | Vista y acciones por rol/estado/custodia conectadas | Validación institucional del circuito |
| Documentos PDF | Almacenamiento, formato, tamaño, hash y acceso probados | Operación de respaldos y retención |
| Auditoría | Acceso por rol/alcance; auditor sin acceso al legado NULL | Controles operativos y aceptación |
| Configuración | Cambio de contraseña y libros conectados | HTTPS/secretos y configuración definitiva |
| PostgreSQL / Alembic | 0001→0003 y legado sintético probados; esquema comparado | Elegir destino y validar copia restaurada del legado |
| Respaldos | Procedimiento documentado; no se simula automatización | Programación y simulacro de restauración institucional |

## Hallazgo que impide declarar operación completa

`DATABASE_URL` apunta a **parroquia**, que no existe. Se verificaron nombres exactos: **parroquia.sql** es una base real de 7 tablas, **partidas** tiene 24 tablas de otro modelo y **sgd_test** se usó con esquemas aislados. No se eligió otra base ni se alteró conexión automáticamente.

El navegador automatizado no está conectado: `cua.getState()` devolvió `apps=[]` y `browsers=[]`. Las pruebas DOM/API realizadas no se anuncian como E2E de navegador. No se inventaron capturas, aceptación, sprints o actividades históricas.

## Siguiente paso exacto

1. El responsable selecciona el destino de desarrollo y confirma si será base nueva o copia restaurada de `parroquia.sql`. Seguir `15_POSTGRESQL_Y_MIGRACION_SEGURA.md`; `partidas` requiere un mapeo ETL independiente. Esta elección no autoriza modificar producción.
2. Con destino y restauración verificados, aplicar Alembic hasta 0003 en la base de desarrollo elegida y crear administrador con el CLI existente. Configurar privadamente DATABASE_URL solo para ese entorno autorizado.
3. Arrancar backend y frontend según el manual técnico. Conectar un navegador al entorno de automatización.
4. Ejecutar y capturar el guion del manual: login → partida → consulta → solicitud → decisión → autorización → Curia cuando corresponda → firma → PDF → QR → auditoría; repetir rechazo, tercero y anulación.
5. Recoger aceptación diocesana, definir firma/sello y realizar restauración/HTTPS/URL pública antes de considerar despliegue institucional.

## Conservación y entrega

Respaldo del estado recibido: `.test-artifacts/respaldo-inicial-20261028-155757/estado-inicial.zip`, 161 archivos, manifiesto SHA-256, diff binario y estado/log de Git. Se conserva el respaldo original externo; no se usaron comandos destructivos.

La carpeta `ENTREGA_TECNICA_SGD_TIBU` incluye informe, RF/RNF, historias/backlog, matrices de roles/trazabilidad, arquitectura, UML/ER, diccionario, OpenAPI, manuales y evidencias. `codigo-corregido.zip` incorpora 104 archivos versionados del commit 6194f38, sin bases/configuración privada/dependencias; su manifiesto verifica los hashes. `ENTREGA_TECNICA_SGD_TIBU.zip` reúne la entrega actualizada. No se hizo push ni despliegue productivo.
