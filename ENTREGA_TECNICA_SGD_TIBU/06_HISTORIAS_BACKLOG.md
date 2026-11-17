# Historias y Product Backlog

| ID | Historia | Criterios de aceptación |
|---|---|---|
| HU01 | Como usuario habilitado quiero iniciar/cerrar sesión | Credenciales válidas generan sesión; acceso inválido se rechaza; logout revoca token; cuenta inactiva no lo reutiliza |
| HU02 | Como administrador quiero asignar parroquias y responsabilidades | Solo admin crea parroquias; cuenta parroquial requiere parroquia activa; párroco no crea admin ni modifica usuarios externos |
| HU03 | Como secretaría quiero registrar partidas | Persona y custodia coinciden; fecha válida; referencia y libro configurado obligatorios; duplicado rechazado; datos persisten |
| HU04 | Como custodiante quiero corregir y anotar con motivo | Historial conserva antes/después, autor y fecha; nota aditiva disponible; no hay transferencia silenciosa de custodia |
| HU05 | Como usuario quiero buscar bajo mi alcance | Filtros por nombre/referencia/tipo/fechas y paginación; búsqueda externa no revela nombres |
| HU06 | Como parroquia de origen quiero solicitar una partida externa | Origen/destino distintos; solicitud persistente visible a ambas custodias; tercero no la ve |
| HU07 | Como custodiante quiero aprobar/rechazar | Motivo obligatorio; responsable/fecha; origen no decide; segunda decisión produce conflicto |
| HU08 | Como custodiante quiero emitir certificado | Preparadores autorizados guardan instantánea; solicitud vinculada aprobada; número/código únicos; PDF solo tras firma |
| HU09 | Como origen quiero descargar una entrega aprobada | Certificado vinculado visible/descargable; tercero y rechazo no conceden acceso |
| HU10 | Como visitante quiero verificar QR con privacidad | Código válido devuelve número/fecha/parroquia; desconocido 404; no divulga identidad religiosa |
| HU11 | Como párroco quiero revisar auditoría y reportes | Filtrados por parroquia; secretaría no accede a auditoría; detalles sin contraseña/token |
| HU12 | Como operador quiero migrar una copia sin perder datos | Adopción explícita; estructura validada; huérfanos rechazados; custodia desconocida NULL; downgrade bloqueado |
| HU13 | Como usuario quiero cambiar/recuperar acceso | Cambio exige clave actual; restablecimiento autorizado; sesiones anteriores inválidas; no anuncia correo inexistente |
| HU14 | Como administrador quiero conciliar custodia histórica | Solo partida sin custodia; parroquia válida, motivo e historial; no reasigna partidas ya custodiadas |

| HU15 | Como párroco custodio quiero autorizar y firmar ordinarios | Preparado→autorizado→firmado; otros roles y custodias denegados |
| HU16 | Como canciller quiero aprobar y firmar competencia de Curia | Autorización parroquial previa, marca/motivo de Curia y aprobado_curia antes de firmar |
| HU17 | Como firmante autorizado quiero anular con motivo | Estado terminal, auditoría, PDF y verificación inválidos después de anular |

## Backlog de consolidación

| Prioridad | Elemento | Historias | Estado |
|---|---|---|---|
| P0 | Acceso revocable y aislamiento | HU01, HU02, HU13 | Implementado y sometido a suites API |
| P0 | Persistencia y migraciones conservadoras | HU12, HU14 | Implementado y probado en entornos sintéticos |
| P0 | Partidas, integridad e historial | HU03, HU04 | Implementado y sometido a validación |
| P0 | Solicitud, decisión y entrega | HU06–HU09 | Flujo integral probado; consultar resultados |
| P1 | Consulta, privacidad y verificación | HU05, HU10 | Pruebas negativas y PDF/QR |
| P1 | Interfaz HTTP real | Varias | Build y pruebas DOM ejecutadas |
| P1 | Auditoría, reportes y documentación | HU11 y todas | Evidencias y manuales entregados |
| P2 | Custodia del legado real y catálogo institucional | HU02, HU12, HU14 | Pendiente de conciliación y autorización |
| P2 | Firma/sello y aceptación documental | HU08 | Pendiente institucional |
| P2 | Dominio HTTPS y operación de respaldos | HU08, HU10, HU12 | Pendiente del despliegue autorizado |

Las prioridades son de esta consolidación. No se estiman puntos retrospectivos ni se inventan sprints históricos.

## RUP y Scrum

RUP estructura disciplinas y productos: requisitos (historias/alcance), análisis/diseño (UML/diccionario), implementación (código/commits), pruebas (casos/XML) y despliegue (manual/configuración). La transición necesita aceptación institucional.

Scrum organiza el valor mediante backlog priorizado e incrementos pequeños con criterios de terminado verificables. No se afirma que hayan ocurrido ceremonias, roles o sprints sin evidencia. Git y resultados de validación documentan el incremento de esta intervención.

Criterio de terminado técnico: rutas/componentes existentes, persistencia comprobada, autorización negativa, pruebas satisfactorias, errores principales resueltos y evidencia localizable. La aceptación institucional requiere responsables, datos conciliados, política de firma/sello y entorno aprobado.

RF/RNF e incrementos verificables: [Requerimientos y RUP + Scrum](13_REQUISITOS_RUP_SCRUM.md).
