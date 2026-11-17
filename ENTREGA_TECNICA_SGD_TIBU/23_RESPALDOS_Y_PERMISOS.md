# Respaldos y permisos editables

Actualización del 2 de noviembre de 2026. Requiere la migración `0005` y reiniciar la API.

## Roles y permisos

El administrador selecciona un perfil en **Roles y permisos**, activa o desactiva sus capacidades y pulsa **Guardar permisos**. **Restablecer perfil** prepara los valores originales; se aplican al guardar. **Descartar** conserva la configuración del servidor.

La política se guarda en `politicas_roles`. Cada petición autenticada consulta los permisos actuales: se aplican inmediatamente en la API a las sesiones existentes. La interfaz actualiza la identidad cada 30 segundos y al volver a la ventana. No es necesario volver a iniciar sesión para aplicar una política de rol.

Se pueden configurar registro/corrección, gestión de usuarios, preparación de certificados y auditoría. Los gestores que no sean administradores conservan la asignación limitada a secretaría parroquial y consulta. Se mantiene el filtro de custodia de cada rol. La lectura global es fija. El perfil administrador conserva sus capacidades técnicas. Solo se puede habilitar la autorización parroquial para párroco, aprobación de Curia para canciller y firma para párroco/canciller; estas capacidades también se pueden desactivar.

Las escrituras usan un número de revisión para detectar cambios simultáneos. Una revisión desactualizada devuelve 409 y conserva el borrador en la interfaz. Los cambios quedan registrados en Auditoría.

## Centro de respaldos

Solo el administrador accede al módulo y sus endpoints. **Crear respaldo** inicia una tarea en el servidor y el historial actualiza su estado. Cada copia contiene:

- Base PostgreSQL en formato personalizado de `pg_dump`, o copia consistente de SQLite mediante su API de backup.
- Los archivos de todos los documentos registrados, comprobados contra sus hashes originales.
- `manifiesto.json` con hashes SHA-256 del contenido y `RESTAURAR.txt` con instrucciones.

El resultado se guarda en un ZIP privado, fuera del frontend. **Verificar** vuelve a comprobar el hash del ZIP y los archivos del manifiesto. **Descargar** también verifica la integridad antes de entregar la copia. Un archivo faltante o dañado impide la descarga. Los fallos se muestran en el historial sin revelar credenciales ni rutas privadas. Crear, verificar, descargar y programar dejan trazabilidad.

La verificación de integridad no equivale a una prueba de restauración. El ZIP contiene información privada: descargar una copia a otra unidad segura. El almacenamiento local no constituye por sí solo una copia fuera del servidor. No se aplica eliminación automática de copias.

## Programación

Se puede elegir **Solo manual**, **Todos los días** o **Cada domingo**, y una hora de Colombia (`America/Bogota`). El programador revisa tareas pendientes cada 30 segundos mientras la API está ejecutándose. Si el servidor estuvo apagado, ejecuta la copia pendiente cuando vuelve a estar disponible y calcula la siguiente fecha; no crea una copia por cada día omitido.

La configuración se guarda en `configuracion_respaldos` y el historial en `respaldos`. Una reserva atómica impide copias simultáneas entre peticiones y procesos de API.

La tarea renueva su reserva cada 20 segundos. Si pasan cinco minutos sin señal del proceso, la próxima revisión marca la copia como interrumpida y libera la reserva. La tarea antigua no puede liberar la reserva de una copia nueva. Esto permite recuperarse después de un cierre inesperado del servidor.

Configuración opcional en `backend/.env`:

```dotenv
BACKUP_SCHEDULER_ENABLED=true
PG_DUMP_PATH=pg_dump
# BACKUP_DIR=C:/ruta/privada/respaldos
```

En Windows se detecta `pg_dump.exe` en la instalación estándar de PostgreSQL si no está en PATH. Para instalaciones distintas, indicar la ruta completa. La versión debe ser compatible con el servidor. La contraseña se pasa al proceso mediante su entorno, sin argumentos de consola ni registros. `BACKUP_DIR` por defecto es `backend/backups` y está excluido de Git.

## Recuperación

Extraer la copia en una ubicación privada y restaurar primero en una base nueva de pruebas. Para PostgreSQL: `pg_restore --no-owner --dbname BASE_PRUEBAS base.dump`. Para SQLite, abrir `base.sqlite` como base nueva. Restaurar `documentos/` en `UPLOAD_DIR`; si cambia la ubicación del servidor, conciliar las rutas almacenadas en `documentos.ruta_archivo`. El ZIP no incluye contraseñas de configuración, `.env` ni secretos del servidor.

## Endpoints

| Método | Ruta bajo `/api` | Acceso |
|---|---|---|
| GET | `/roles/` | Usuario autenticado |
| PATCH | `/roles/{rol}` | Administrador |
| GET / POST | `/respaldos/` | Administrador |
| GET / PATCH | `/respaldos/configuracion` | Administrador |
| POST | `/respaldos/{id}/verificar` | Administrador |
| GET | `/respaldos/{id}/descargar` | Administrador |
