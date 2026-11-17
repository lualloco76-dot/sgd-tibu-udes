# Resultados reales de validación — 28-10-2026

Validación más reciente del [rediseño y funciones](21_REDISENO_Y_FUNCIONES.md): frontend **84 aprobadas**, build satisfactorio; backend **46 aprobadas y 47 omitidas**, sin fallos. Migración 0004 aplicada con conservación y comprobaciones HTTP sobre PostgreSQL local correctas. Sin E2E ni revisión visual automática por falta de conexión de navegador. Las ejecuciones siguientes son históricas y no se suman a estos resultados.

Última ejecución, tras ajustar el mínimo de contraseñas a 8: **68 pruebas frontend aprobadas**, build satisfactorio, **43 backend aprobadas y 44 omitidas**, sin fallos. Login, identidad y reportes de la cuenta administradora verificados por HTTP contra PostgreSQL. Véase [política y evidencia actual](19_PASSWORD8_Y_ACCESO.md). Las ejecuciones siguientes son anteriores y se conservan por separado.

Actualización posterior a esta suite: la base local `parroquia` ya existe y la conexión fue comprobada. Véase [conexión PostgreSQL local](17_CONEXION_POSTGRESQL_LOCAL.md). Los resultados de la suite y sus límites siguientes describen la validación anterior; la comprobación nueva no constituye otra ejecución de esa suite.

Validación posterior del [login con selector de parroquia](18_LOGIN_POR_PARROQUIA.md): frontend **66 aprobadas**, build satisfactorio; backend **42 aprobadas y 43 omitidas**, sin fallos. Las variantes PostgreSQL de la suite no se habilitaron en esta ejecución. Por separado, ocho comprobaciones de login pasaron sobre PostgreSQL local dentro de una transacción revertida. Backend reiniciado, catálogo público y frontend servido comprobados por HTTP. Evidencias `login-parroquia-*`; no se ejecutó E2E de navegador. Estos resultados no se suman a la suite histórica siguiente.

Versión de código: commit **6194f38**, rama `mejoras-sgd-tibu`. La suite final se ejecutó en un entorno Python 3.12 nuevo instalado desde `backend/requirements-dev.txt`. No se utilizaron datos de producción.

| Comprobación | Resultado final observado | Evidencia |
|---|---|---|
| Backend completo, SQLite + PostgreSQL 18.3 | **78 aprobadas, 1 omitida, 0 fallidas, 0 errores**, 78,46 s | `evidencias/backend.xml`, `backend-resumen.json` |
| API (subconjunto del backend) | 60 aprobadas | `evidencias/api.xml`, derivado del XML completo |
| Migraciones y guarda de destino (subconjunto) | 18 aprobadas, 1 omitida | `evidencias/migraciones.xml`, derivado del XML completo |
| Frontend Vitest/jsdom | **61 aprobadas**, 2 archivos | `evidencias/frontend.json` |
| Build Vite | Satisfactorio: 89 módulos; JS 285,39 kB / gzip 92,16 kB | `evidencias/frontend-build.txt` |
| Instalación Python nueva | Satisfactoria desde requirements-dev; `pip check` sin conflictos | `instalacion-limpia.txt`, `python-instalacion-limpia.txt` |
| npm audit | 0 vulnerabilidades conocidas | `evidencias/npm-audit.json` |
| pip-audit de requirements | 31 dependencias resueltas, 0 vulnerabilidades conocidas | `evidencias/pip-audit.json` |
| PostgreSQL histórico | Metadatos consultados en solo lectura; .env no cambiado | `postgresql-inspeccion.json` |
| Limpieza del entorno PostgreSQL de pruebas | public sin tablas; sin esquemas api_test_/migration_test_ restantes | `postgresql-cierre.json` |
| UML | Once fuentes renderizadas SVG/PNG; revisión visual de conjunto y estados | `diagramas/` |
| PDF y QR | PDF de una página descargado durante prueba; render final inspeccionado; QR OpenCV coincide exactamente con URL impresa | `certificado-sintetico.pdf`, `certificado-pagina-1.png`, `pdf-qr.json` |
| E2E de navegador | **No ejecutado**: inventario de superficies conectado vacío | `navegador.json` |

La prueba omitida es la variante SQLite de `test_postgresql_legacy_enum_accepts_diocesan_admin`, exclusiva de PostgreSQL. Su variante PostgreSQL sí se ejecutó. Los subconjuntos API/migraciones son la misma ejecución; no se suman de nuevo. Se observaron tres avisos de deprecación de las herramientas de prueba (HTTPX/TestClient y add_js de pypdf), sin fallos; no se presentan como funcionalidad pendiente del sistema.

## Diferencia frente a la sesión anterior

Se reprodujo primero **59 passed, 1 skipped** con PostgreSQL configurado para pruebas. Se añadieron siete casos API ejecutados en ambos motores (+14), dos casos de migración ejecutados en ambos motores (+4) y una guarda de destino (+1): 59 + 19 = 78 aprobados. La omisión se mantiene. Una ejecución inicial sin TEST_DATABASE_URL dio 29 aprobadas/31 omitidas porque no se habilitaron variantes PostgreSQL; no representa el resultado final.

La suite frontend recibida tuvo 14 aprobadas/3 fallidas en el registro inicial: faltaban exportaciones en mocks y se usaba el rol anterior. Se corrigió y se amplió desde 17 a 61 casos. Los JSON históricos se conservan con nombre inicial/base y están identificados en el índice de evidencias.

## Escenarios comprobados

Login, bloqueo, revocación y cambio/restablecimiento; siete roles y límites de asignación; aislamiento, legado sin custodia y auditoría; los cuatro tipos de partida, duplicados, fechas, libros y correcciones; descubrimiento externo mínimo; solicitud aprobada/rechazada y decisión terminal/concurrente; preparación, autorización parroquial, aprobación de Curia, firma, anulación y transiciones inválidas; descarga autorizada y bloqueo de terceros; PDF, instantánea y QR; errores de persistencia saneados; formato/hash/tamaño de PDF; migraciones nuevas y de legado sintético, conservación de roles/filas y comparación de columnas/FK con ORM.

Las pruebas frontend incluyen rutas activas, asignación de roles, acciones por rol/estado/custodia, cinco endpoints de certificados, motivo de Curia, origen explícito, entrega sin descarga prematura, auditoría, formularios y mensajes de errores. Usan DOM y HTTP sustituido; la persistencia se acredita por las pruebas API con SQLite/PostgreSQL reales.

## Límites verificables

El .env apunta a **parroquia, una base inexistente**. No se cambió automáticamente a parroquia.sql ni partidas. La base definitiva y el cambio de conexión requieren decisión del responsable; por ello no se declara el despliegue local existente plenamente operativo ni el sistema listo para producción.

No se migraron bases históricas ni se concilió custodia real. Faltan navegador conectado para E2E/capturas, aceptación de responsables, política de firma/sello, validación de copias restaurables y despliegue HTTPS/URL pública. No se midió carga institucional ni se realizó pentest externo. No hay firma digital criptográfica ni envío de correo de recuperación simulado. Las auditorías de dependencias solo cubren avisos conocidos en la fecha.

El QR sintético se verificó mientras existía su esquema de prueba; al retirar el esquema, el PDF no representa un certificado institucional verificable en producción. El render usa pypdfium2 disponible en este entorno, dado que Poppler no estaba en PATH. La verificación mediante API y la revisión visual/QR son evidencias complementarias.
