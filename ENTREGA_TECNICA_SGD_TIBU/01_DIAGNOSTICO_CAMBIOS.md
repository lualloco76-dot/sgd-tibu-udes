# Diagnóstico y correcciones

La rama de trabajo es `mejoras-sgd-tibu`. El commit original conocido es `b0bc7b7` (`chore: conservar código original antes de correcciones`). Existían cambios sin confirmar al iniciar esta revisión: se conservaron e integraron. El respaldo original se encuentra fuera del repositorio y tiene manifiesto SHA-256; no se publica su contenido.

| ID | Impacto | Hallazgo | Corrección o control |
|---|---|---|---|
| D01 | Crítico | Scripts originales con credenciales fijas y operaciones al importar | CLI explícita, destino obligatorio, `getpass`, sin cuentas por defecto |
| D02 | Crítico | Aislamiento institucional insuficiente | Custodia, filtros de alcance y controles por recurso en servidor |
| D03 | Crítico | Flujo interparroquial sin integración verificable | Solicitud persistente, decisión custodiante, estados terminales y entrega aprobada |
| D04 | Alto | Pantallas originales con cifras y operaciones simuladas | Rutas activas conectadas a API e indicadores persistentes |
| D05 | Alto | Ausencia de migraciones del esquema ampliado | Alembic 0001/0002/0003, adopción explícita del legado y conservación |
| D06 | Alto | Lanzadores ligados a otro equipo; PowerShell bajo extensión `.bat` y finalización de procesos por puerto | Arranque portable, sin cierre indiscriminado de procesos |
| D07 | Alto | Formularios incompatibles con POST/PATCH | Campos de alta/edición separados y motivos obligatorios |
| D08 | Alto | Sesiones sin revocación suficiente | JWT, sesión persistente, caducidad, versión y revocación |
| D09 | Alto | Emisión/descarga/QR sin evidencia suficiente de privacidad | Instantánea, código aleatorio, control de descarga y verificación mínima |
| D10 | Alto | Pruebas automatizadas insuficientes | Suites API, autorización, persistencia, migraciones y React |
| D11 | Medio | Integridad y duplicación archivística insuficientes | FK, unicidad por custodia/referencia y CHECK de estados |
| D12 | Medio | Corrección sin reconstrucción trazable | Motivo, autor, fecha e instantáneas anterior/posterior |
| D13 | Medio | Exposición de rutas o nombres de archivos | Nombre aleatorio, directorio limitado, tamaño/formato PDF y hash |
| D14 | Medio | Errores internos de BD poco claros | Respuestas 409/503 sin SQL ni parámetros sensibles |
| D16 | Alto | Auditoría npm detectó 50 avisos iniciales (2 críticos, 23 altos, 9 moderados, 16 bajos); actualización compatible CRA dejaba 38 | Sustitución de CRA por Vite/Vitest y actualización de cliente/router; resultado final auditado en validación |
| D15 | Bajo | Documentación desalineada con implementación | Referencias generadas del código, UML y manuales reales |

La clasificación expresa impacto sobre el sistema revisado; no equivale a una auditoría de penetración certificada. No se inspeccionaron datos personales ni se migró producción. La ejecución de dependencias demuestra compatibilidad en el entorno declarado, no ausencia de vulnerabilidades futuras.

Se conservan tablas, prefijo `/api` y catálogo histórico. Defunción se añade como tipo documental, expresamente sin considerarlo sacramento. La custodia histórica desconocida permanece NULL hasta conciliación autorizada. Los componentes antiguos pueden conservarse como código fuera del flujo activo; los resultados mostrados por rutas activas proceden de la API.

Las operaciones de borrado físico y el descenso destructivo de migraciones no forman parte del flujo entregado. Los certificados conservan una instantánea para que una corrección posterior no modifique una emisión previa. Firma/sello requieren política institucional.
