# Cierre funcional y entrega actualizada · 16 de noviembre de 2026

Se retomó el árbol de trabajo existente, conservando los cambios anteriores,
las migraciones, los datos y las entregas históricas. No se reinició el proyecto,
no se restauró Git y no se publicó en GitHub, Render ni Neon.

## Correcciones incorporadas

- **Ver:** detalles de personas y partidas con nombres, fechas de Colombia,
  datos sacramentales y referencia documental. No se vuelcan objetos JSON,
  contraseñas, identificadores de relaciones ni propiedades arbitrarias.
- **Editar:** edición de personas, parroquias y usuarios conectada al servidor.
  Las cuatro clases de partidas permiten corregir con motivo; conservan el
  historial. Los permisos y la custodia se verifican también en el servidor.
- **Historial:** responsable y cargo, fecha, motivo y campos cambiados con sus
  valores anteriores y nuevos. Consulta sin permiso de escritura/auditoría ve
  los campos afectados y una explicación de la restricción de valores.
- **Ver trazabilidad:** consulta específica autenticada con preparación,
  autorización, aprobación de Curia, firma, entrega y anulación cuando existen.
  Una actuación sin evidencia histórica no recibe fechas ni responsables
  inventados. La vista conserva la instantánea documental del certificado.
- **Preparar certificado en Solicitudes:** aprobación por la custodia, creación
  idempotente, mensaje de resultado y enlace al certificado concreto. Un doble
  envío no duplica el certificado; PostgreSQL verifica también concurrencia.
  Solicitudes rechazadas o pendientes no permiten prepararlo.
- **Datos en español:** estados, auditoría, errores de validación, parroquias,
  tipos de partidas y fechas legibles. Los errores omiten rutas internas,
  mensajes de Pydantic en inglés y valores sensibles enviados por el formulario.
- **Selección documental:** Certificados y Gestión documental buscan por persona
  o número y presentan libro, folio y partida. No se exige escribir un ID de la
  base. La selección se conserva al paginar. Las solicitudes aprobadas se filtran
  por la partida seleccionada; Solicitudes permite continuar directamente.
- **Listados y CSV:** nombres de parroquias y roles, referencias archivísticas y
  estados en español. Los objetos sin presentación no se exportan como JSON.
  Los documentos recién cargados aparecen primero.
- **Entrega Windows:** ejecutable, runtime, interfaz e instalador 3.1.0
  reconstruidos en una carpeta nueva. El constructor interpreta correctamente
  dependencias con rangos y usa pypdf 6.21.4. Se reutiliza únicamente el dump
  anonimizado aprobado; no se consulta la base original para reconstruir.

## Pruebas y evidencias del cierre

Las pruebas de integración usan PostgreSQL real independiente. Vitest usa los
dobles de componentes habituales; no se presenta como prueba de persistencia.

| Comprobación | Resultado final |
|---|---|
| Vitest | 99 aprobadas, 0 fallidas |
| Backend completo: SQLite y PostgreSQL | 122 aprobadas, 2 omitidas en SQLite; 63 casos PostgreSQL ejecutados, 0 fallos |
| Playwright Test: escritorio y Pixel 7 emulado | 50 aprobadas, 25 por entorno, 0 fallidas |
| Playwright CLI: recorrido activo e inventario | 98 acciones, 255 clics, 464 peticiones; sin errores de navegador/servidor |
| Ejecutable con PostgreSQL incluido y perfil nuevo | 14 comprobaciones aprobadas, incluidas navegación real, historial, trazabilidad y PDF |
| React compilado para entrega | Compilación correcta; API en el mismo origen |
| ZIP: CRC, extracción y hashes por archivo | Resultado detallado en SGD_TIBU_ACTUALIZADO_20261116_VERIFICACION.json, junto al ZIP |

La revisión inicial dejó evidencias de pruebas y un recorrido interrumpido; esas
evidencias no se presentaron como cierre vigente. Al probar el selector nuevo se
detectaron dos fallos de localización de su etiqueta accesible: el asterisco de
obligatoriedad impedía la coincidencia exacta. Se fijó un nombre accesible estable
y la siguiente suite completa aprobó sus 48 casos. Después se añadieron dos casos
para paginación y conservación de selección y se ejecutó la tanda final.
El recorrido CLI detectó además una espera insuficiente entre páginas de usuarios:
intentaba pulsar Siguiente antes de terminar de mostrar la página recibida. Se
sincronizó con la respuesta y su primera fila; el recorrido repetido llegó hasta
respaldos y cierre de sesión, sin errores. Los controles de accesibilidad y todos
los enlaces internos del panel se ejercitaron también por separado.

El inventario de CLI registra acciones efectivamente pulsadas, rol, módulo,
peticiones y resultado. Incluye menús, búsqueda, exportaciones, cuatro partidas,
personas, solicitudes, firma ordinaria y Curia, usuarios, cambio de contraseña,
roles, respaldos y cierre de sesión. La suite de navegador agrega siete roles,
restricciones de acceso, carga documental, filtros y persistencia al recargar.
Los controles deshabilitados por estado o permiso se verifican como restricciones;
no se habilitaron facultades adicionales para conseguir pruebas aprobadas.

Fuentes reproducibles: [guía de pruebas](REPRODUCIR.md),
[resumen](evidencias/resumen.json), [JUnit backend](evidencias/qa-backend.xml),
[Playwright](evidencias/playwright-final.json) y
[recorrido de botones](evidencias/botones/recorrido.log). El
[inventario legible](INVENTARIO_BOTONES.md) detalla cada acción y su resultado.
Las pruebas de seguridad de la auditoría inicial se conservan separadas; no se
ejecutó un pentest Strix ni se consumieron créditos en esta continuación.

## Entrega y uso

Archivo principal: **SGD_TIBU_ACTUALIZADO_20261116.zip**, acompañado de su SHA-256.

1. Extraer todo en una ruta corta, por ejemplo `C:\SGD31`.
2. Abrir `01_PROGRAMA/SGD_Tibu.exe`, o instalar desde `02_INSTALADOR`.
3. Leer `LEEME_PRIMERO.md`. La fuente completa está en `03_CODIGO_FUENTE`;
   el informe y la guía de pruebas, en `04_DOCUMENTACION`.

El primer inicio de un perfil nuevo restaura el catálogo aprobado: 13 parroquias,
cuatro tipos de partidas y la cuenta de evaluación; no distribuye los registros
ficticios de QA. Los datos del usuario permanecen fuera de los binarios, en su
perfil Windows. Las credenciales privadas de pruebas y la configuración del
equipo no se incluyen. La cuenta académica indicada en la guía solo sirve para
evaluación local.

El manifiesto interno permite verificar cada archivo. Los ZIP anteriores se
conservaron y no deben confundirse con la edición actualizada.

## Límites comprobables

La emulación móvil no sustituye una prueba en teléfono físico. Quedan fuera de
esta entrega la publicación remota, Windows limpio, reinicio completo del sistema
operativo, Safari/Firefox, carga sostenida y aceptación institucional del contenido.
La firma registrada es administrativa; no constituye firma criptográfica certificada.
El instalador se compiló; las comprobaciones de ejecución se realizaron con el
programa portátil y perfiles nuevos, sin instalarlo en el perfil habitual del usuario.
Las omisiones de SQLite corresponden a casos exclusivos de PostgreSQL, cuya
variante sí se ejecuta en ese motor. Las advertencias de deprecación y caché pytest
se conservan en los registros; no se ocultaron ni se contaron como fallos funcionales.
