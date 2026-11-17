# Inventario funcional y alcance

`Implementado` significa que existen rutas y componentes. `Completado y verificado` exige persistencia, autorización y pruebas ejecutadas en el registro de resultados. La aceptación institucional y el uso de datos reales son controles distintos.

| Módulo | Funcionalidad implementada | Límite o dependencia |
|---|---|---|
| A. Acceso | Login/logout, sesión persistente y revocable, bcrypt, cambio/restablecimiento autorizado, bloqueo temporal, roles y activación | Recuperación mediante administrador; no se simula correo. Requiere clave fuerte y HTTPS del despliegue |
| B. Parroquias | Alta/edición administrativa, activación, relación de usuarios, custodia y libros | Catálogo real y conciliación del legado requieren responsables |
| C. Partidas | Bautismo, confirmación, matrimonio, defunción, referencias, campos específicos, corrección e historial | Conserva trazabilidad; no sustituye libros físicos ni decisiones canónicas |
| D. Consulta | Nombre propio de su custodia, tipo, parroquia, referencia, fechas y paginación | Búsqueda externa exacta entrega referencia mínima, sin identidades |
| E. Solicitudes | Bandejas origen/custodia, aprobar/rechazar, responsable/fecha/motivo y entrega aprobada | Recepción en la aplicación; no hay notificación por correo |
| F. Certificados | Número único, instantánea, PDF, QR, verificación mínima y descarga autorizada | Sin firma digital criptográfica; firma/sello sujetos a política |
| G. Auditoría | Accesos, altas/correcciones, solicitudes, decisiones, emisión, descargas y administración | Bitácora aplicativa; acceso de superusuario requiere controles externos |
| H. Administración | Panel/recuentos reales, reportes básicos, usuarios, catálogo y configuración | No se agregan cobros, cementerio ni módulos ajenos a la tesis |

## Roles efectivos

Los siete roles y sus operaciones reales se detallan en [la matriz actualizada](14_MATRIZ_ROLES_PERMISOS.md). La preparación técnica se separa de autorización, aprobación de Curia y firma. Solo un certificado firmado permite descarga y verificación válida; la anulación retira ambas.

Rutas de la interfaz: /login, /, /usuarios, /roles, /parroquias, /libros, /bautismos, /confirmaciones, /matrimonios, /defunciones, /registros, /personas, /solicitudes, /certificados, /aprobaciones, /auditoria, /documentos, /reportes, /configuracion y /verificar/:codigo. Las operaciones de cada vista usan HTTP contra FastAPI; Roles muestra competencias versionadas, no permite inventar nuevos roles. Respaldos informa el procedimiento técnico y no simula una tarea automática.

## Pendientes externos

- Aprobación de roles, catálogo real de parroquias/libros y política de firma/sello.
- Restauración y conciliación autorizada de copias del legado antes de migrar producción.
- Dominio HTTPS y URL pública accesible para QR desde otros equipos.
- Aceptación con usuarios administrativos y política de retención/respaldos.
- Navegación E2E en navegador: no había apps ni navegadores conectados al entorno CUA; se ejecutaron pruebas DOM y API, sin atribuirles equivalencia a esa aceptación.
- Recuperación autónoma por correo solo si se incorpora un proveedor institucional autorizado. La versión entregada usa restablecimiento administrativo.

No se sustituyen pendientes mediante simulación y no se realizó despliegue a producción.
