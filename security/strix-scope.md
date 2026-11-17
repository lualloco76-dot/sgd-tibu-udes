# Alcance preparado para Strix

Estado: **NO EJECUTAR**. El usuario eligió preparar sin consumir créditos.
No configurar llaves ni programar ejecuciones automáticas.

Cuando exista autorización posterior, usar exclusivamente una copia nueva de
`backend/app`, migraciones y frontend, con respaldo previo y datos ficticios.
La copia montada por Strix es escribible: nunca montar el proyecto original.
Único servidor activo autorizado: aplicación ficticia local en puerto 8765.
No escanear puertos, servicios de terceros, Render, Neon ni PostgreSQL original.
En Docker de Windows, publicar el servidor de pruebas solo para la red del
contenedor autorizado y comprobar conectividad antes del análisis. Actualmente
el servidor escucha en loopback y no se presupone accesible desde el contenedor.

Revisar autenticación, revocación de sesiones, políticas dinámicas de roles,
custodia parroquial en cada escritura y lectura, IDOR, PDF, SQLi, XSS, CSRF,
validaciones, solicitudes, autorizaciones de certificados e integridad.
Registrar los siete roles, mantener lectura global de supervisión y facultades
eclesiásticas reservadas. No eliminar funciones para remediar hallazgos.

Antes de iniciar: Docker operativo, proveedor autorizado, clave solo en entorno,
presupuesto positivo expresamente aprobado, copia y alcance verificados.
Usar CLI no interactiva `-n`, `--instruction-file`, `--max-budget` y
`--max-turns`. Nunca reemplazar un presupuesto no aprobado por un valor sugerido.
Revisar `run.json`, estado y coste incluso si el proceso termina con código cero.
Un análisis limitado o sin hallazgos no demuestra seguridad completa.
