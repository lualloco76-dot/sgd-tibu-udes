# Evaluación real del SGD de la Diócesis de Tibú

**Actualización posterior:** este documento conserva la auditoría inicial de la
sesión. El cierre vigente de botones, vistas, pruebas repetidas y distribución
3.1.0 está en [Revisión funcional](REVISION_FUNCIONAL.md). Las referencias de este
informe a ZIP o ejecutables aún sin reconstruir corresponden al estado inicial;
la distribución actualizada se identifica en ese cierre.

Fecha de cierre: 16 de noviembre de 2026, America/Bogota.
Fuente evaluada: `backend/` y `frontend/` de la raíz, con los cambios previos del
usuario conservados. No se hizo commit, push ni despliegue. Los ZIP y ejecutables
históricos no se reconstruyeron y no representan esta revisión.

## Resultado comprobado

La aplicación compilada funciona localmente en `http://127.0.0.1:8765`, con
FastAPI y PostgreSQL real independiente. No se sustituyeron llamadas PostgreSQL
por respuestas simuladas en integración. Las pruebas de componentes Vitest sí
usan sus dobles habituales; se distinguen de las pruebas de navegador y API.

| Verificación | Resultado |
|---|---|
| Playwright CLI 1.64.1 | Recorrido real de 19 módulos; capturas desktop y 390 px; consola final sin errores |
| Playwright Test 1.64.1 | **46 aprobadas**, 23 en escritorio y 23 con emulación Pixel 7 |
| Vitest | **91 aprobadas**, 0 fallidas |
| Suite completa backend y migraciones | **113 aprobadas, 1 omitida**, 0 fallidas; SQLite y PostgreSQL |
| Regresiones focalizadas posteriores | **6 aprobadas**: edición, custodia delegada y cookies/CORS, en ambos motores; cuatro ya forman parte de las 113 anteriores |
| Compilación React | Correcta; API `/api` en el mismo origen por defecto |
| Persistencia | Partida conservada tras logout, reinicio real de API y de PostgreSQL ficticio |
| npm audit | 0 vulnerabilidades conocidas reportadas |
| pip-audit entorno QA corregido | 0 vulnerabilidades conocidas reportadas |
| pip-audit archivo runtime fijado | 0 vulnerabilidades conocidas reportadas |
| Bandit | 0 avisos medios/altos; 3 bajos revisados, descritos abajo |
| Render YAML | Válido contra esquema oficial; no implica contenedor construido ni servicio desplegado |
| Strix 1.7.0 | Instalado, `--version` y `--help` ejecutados; análisis no ejecutado; coste 0 |

La omisión del backend corresponde al caso de enum legado exclusivo de PostgreSQL
cuando se parametriza sobre SQLite; ese caso sí se ejecuta en PostgreSQL.
Persisten advertencias de deprecación de TestClient/httpx y `PdfWriter.add_js`
en pruebas, y de escritura de caché pytest en el sandbox; no son fallos de los
recorridos ni de persistencia.

## Hallazgos y correcciones

| ID | Gravedad / impacto | Antes | Corrección y nueva comprobación |
|---|---|---|---|
| SEC-01 | Alta, autorización condicionada a delegación de permisos | `custodia` permitía lectura global y se reutilizaba para escritura. Al habilitar gestión/escritura a Secretaría General, podía restablecer una cuenta de otra parroquia o modificar sus notas | `custodia_escritura` separa el alcance de escritura del de lectura. Aplicada a usuarios, personas, partidas, documentos, libros y decisiones. La lectura global se conserva. El PoC falló antes (200 indebido) y pasa después (403), en SQLite y PostgreSQL |
| SEC-02 | Alta como riesgo de disponibilidad al procesar PDF | `pypdf 6.21.3` tenía tres avisos publicados de consumo de memoria/bucles con PDF hostiles | Actualización a `6.21.4` en requirements y lock. Se mantienen validación estructural, límite de tamaño, rechazo de PDF activos y cifrados. pip-audit final y pruebas de PDF aprobadas |
| SEC-03 | Media, dependencias auxiliares | En el entorno QA había avisos de dnspython, OpenTelemetry y pip | Actualizados a 2.9.2, 1.45.2 y 26.2. Añadidos mínimos corregidos a requirements. El lock de distribución ya fijaba DNS/OpenTelemetry corregidos. Segunda consulta sin avisos conocidos |
| FUN-01 | Alta funcional para publicación | `npm run build` leía `.env` de desarrollo y fijaba `localhost:8000`; el navegador mostraba CORS y no podía entrar | `frontend/scripts/build.mjs` fija `/api` por defecto, conserva variables de entorno explícitas y compatibilidad legacy. Compilación y los 46 recorridos reales aprobados |
| FUN-02 | Media, edición de datos administrativos | Personas mostraba Editar, pero no existía PATCH; el formulario recibía 404 | Nuevo PATCH con permiso de escritura, custodia, prohibición de traslado, coherencia de nacimiento frente a partidas existentes y auditoría. Se reprodujo el fallo antes y se verificó guardado en navegador y pruebas de ambos motores |
| SEC-04 | Media, recuperación y estado de sesión | El restablecimiento no marcaba la clave como temporal. Configuración conservaba la pantalla autenticada después de revocar la sesión por cambio de contraseña | El restablecimiento exige sustitución antes de abrir módulos. Configuración cierra la sesión local inmediatamente. Recorrido de recuperación y revocación aprobado en escritorio y móvil; prueba Vitest verifica `logout({revoked:true})` |

No se quitaron funciones ni cargos para remediar los fallos. Las facultades de
autorizar, aprobar en Curia y firmar mantienen sus controles originales.

## Alcance funcional probado

Los siete roles iniciaron y cerraron sesión y recorrieron los módulos habilitados.
Se comprobaron restricciones tanto en rutas de la UI como en endpoints reales.
Se probaron los cuatro formularios de partidas, correcciones con motivo e
historial, edición de persona, alta/edición de parroquia, creación de libro,
duplicados, folio/número, búsqueda por referencia y fechas, filtros y paginación.
El backend verifica también unicidad, FK, migraciones idempotentes y preservación
de asientos legados en esquemas sintéticos.

Se completaron solicitudes entre las dos parroquias ficticias, aprobación por la
custodiante, preparación, autorización parroquial, firma ordinaria, aprobación y
firma de Curia, anulación, verificación pública y entrega de PDF al origen
autorizado. Se comprobaron carga, recarga y descarga de PDF válido, rechazo de
contenido inválido, consulta de reportes, auditoría y respaldos del backend.

El cierre de persistencia usa PostgreSQL 18.3 privado en 55432 y una API temporal
en 8766: crea partida, revoca sesión, termina API, detiene/inicia PostgreSQL,
inicia nueva API y compara ID y campos después de volver a autenticar. No usa
una simple recarga de página como sustituto del reinicio.

## Seguridad gratuita y estado de Strix

Se ejercitaron IDOR de partidas e historial de otra parroquia, escritura sin
permisos, endpoints sin autenticación, JWT malformado, revocación de sesiones,
bloqueo/recuperación, inyección en búsqueda, XSS almacenado como texto y archivos
inválidos. Los tokens no se autentican desde cookies; una preflight de origen
ajeno se rechaza. Se verificaron `no-store` y `nosniff`. Esto aporta evidencia
concreta, no una garantía de ausencia de todas las variantes de SQLi/XSS/CSRF.

Bandit conserva tres avisos bajos: B105 señala el literal de protocolo `bearer`,
no una contraseña; B404/B603 señalan el uso de subprocess para pg_dump. Se revisó
que se usa lista de argumentos, sin shell, ejecutable configurable por el servidor,
contraseña por entorno, timeout y sin imprimir secretos. No se silenciaron los
avisos para presentar un informe vacío.

Strix y sus nueve habilidades oficiales están instalados en entorno aislado y
`.agents/skills`. Se consultó la documentación y la CLI. Docker no está instalado,
no hay LLM configurado y el usuario eligió expresamente no consumir créditos.
`security/strix-policy.json` mantiene ejecución deshabilitada, presupuesto cero,
sin credenciales y con alcance local. `scripts/strix_preflight.py` registra ese
estado. **No existe informe de penetración producido por Strix**, ni segunda
pasada Strix: no se presentan los resultados de otras herramientas como suyos.

Para una futura ejecución autorizada, crear antes una copia escribible de fuente
sin secretos, verificar alcance y respaldo, Docker, conectividad y presupuesto;
seguir `security/strix-scope.md`. No se probaron terceros ni infraestructura
de Render/Neon.

## Protección de datos y entrega

La base original no fue seleccionada por los scripts nuevos ni recibió DDL/DML.
El clúster ficticio tiene credenciales propias, claves aleatorias y datos de evaluación.
La configuración privada, trazas sin sanear, archivos PostgreSQL y credenciales
están excluidos de Git y del paquete fuente. Las evidencias compartibles se
sanean antes de empaquetarlas. El saneamiento no revoca una clave si alguien
la publicara por otros medios; nunca compartir la configuración privada.

El paquete fuente se crea desde el árbol actual con `scripts/package_release.py`:
incluye UI compilada, código, migraciones, pruebas, habilidades y despliegue,
con manifiesto SHA256 por archivo. El paquete no incluye un ejecutable Windows
reconstruido. Se conserva el diff previo en el área privada de artefactos.

Consultar `evidencias/resumen.json`, JUnit, resultados Playwright, auditorías de
dependencias, preflight y capturas. Las trazas saneadas de diagnóstico se guardan
en el paquete separado de evidencias y en `.test-artifacts`; no contienen datos
personales reales ni deben distribuirse las originales con autenticación.

## Revisión adicional pendiente

- Construir y ejecutar la imagen Docker, comprobar permisos del disco Render y
  pg_dump contra Neon, y ejecutar GitHub Actions en el repositorio remoto.
- Publicar una URL de evaluación y repetir Playwright contra ella. Se dejó el
  procedimiento y guion de la profesora; no se creó una URL ficticia.
- Evaluar Safari, Firefox, un teléfono físico y concurrencia/carga sostenida.
  La ejecución realizada usa Chrome y emulación móvil, sin sustituir hardware real.
- Ejecutar Strix únicamente si existe autorización posterior de consumo y los
  requisitos. Revisión manual más profunda y ampliación de casos de autorización
  siguen siendo recomendables; estas pruebas no certifican seguridad completa.
- Usar PostgreSQL 18 con mantenimiento actualizado al publicar. Se reutilizó el
  binario local 18.3 sin cambiar la instalación ni el servidor original; el
  Dockerfile instala el cliente 18 del repositorio oficial al construir.
- Firma criptográfica, sello y aceptación eclesiástica no se certifican: el PDF
  informa su alcance y el flujo probado registra actuaciones del sistema.

Referencias oficiales consultadas: [Playwright CLI](https://playwright.dev/agent-cli/installation),
[Strix](https://github.com/usestrix/strix),
[esquema Render](https://render.com/schema/render.yaml.json),
[Neon TLS](https://neon.com/docs/connect/connect-securely).
