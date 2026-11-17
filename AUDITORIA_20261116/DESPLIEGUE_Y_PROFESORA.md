# Publicación y evaluación por la profesora

Estado: configuración preparada; **no existe una URL pública creada por esta
revisión**. No se han activado servicios, facturación ni créditos. El contenedor
queda pendiente de construcción y prueba porque Docker no está instalado.

## Preparar internet

1. Subir a un repositorio GitHub el código fuente de la entrega verificada,
   conservando `.github/workflows/quality.yml`. No subir `.env`, `.test-data`,
   `.test-artifacts`, respaldos ni ZIP portátiles antiguos. La canalización
   ejecuta frontend, backend, migraciones, Playwright, npm audit, pip-audit y
   Bandit. No ejecuta Strix. Revisar la cuota de Actions del repositorio antes
   de activar ejecuciones si su plan puede facturar minutos.
2. En un proyecto Neon destinado únicamente a evaluación, crear una base vacía
   llamada **sgd_evaluacion**. No importar la base original ni datos personales.
   Obtener la conexión directa PostgreSQL, usar `sslmode=require` o
   `verify-full` y conservar los demás parámetros TLS de Neon. La conexión
   directa facilita migraciones y pg_dump sin restricciones de pooling.
3. Revisar `render.yaml`: propone web Docker `starter` y disco persistente de
   1 GB para PDF y respaldos. **Son recursos con coste al crearlos**; aprobar
   el plan en Render antes de importar el Blueprint. Un servidor gratuito con
   almacenamiento efímero no preserva los documentos subidos entre despliegues.
4. En los secretos de Render, configurar `DATABASE_URL` de Neon y una
   `DEMO_PASSWORD` aleatoria de 12 a 60 caracteres para las cuentas ficticias.
   `SECRET_KEY` se genera en el Blueprint. No escribir esos valores en Git.
   `DEMO_SEED_ENABLED=true` crea las cuentas y 50 personas ficticias, junto con
   libros de los cuatro tipos; la carga es idempotente y rechaza cuentas ajenas
   a evaluación. La base empieza sin partidas; la profesora puede crearlas.
5. Render construye React y el backend desde ese mismo commit. El inicio exige
   PostgreSQL, TLS remoto y URL HTTPS, aplica Alembic y sirve UI y `/api` en el
   mismo origen. Usa `RENDER_EXTERNAL_URL` para los QR; si hay dominio propio,
   configurar `PUBLIC_BASE_URL` con ese origen HTTPS sin barra final.
6. Comprobar `/health`, acceso institucional y carga/descarga de un PDF. El
   usuario del contenedor debe poder escribir en `/var/data/sgd`; comprobar el
   montaje y permisos del disco en el primer despliegue.
7. Registrar commit y SHA256 de la entrega. Ejecutar Playwright contra esa URL
   autorizada antes de compartirla. No considerar publicado un sistema que solo
   pasó las pruebas locales.

Ejemplo para repetir Playwright sobre evaluación, desde `frontend`, con claves
proporcionadas por el gestor de secretos del equipo, sin escribirlas aquí:

```powershell
# Establecer QA_BASE_URL con el origen HTTPS autorizado y QA_PASSWORD en entorno.
npm run test:e2e
```

La suite crea registros ficticios; nunca apuntarla a un entorno con datos reales.
No hace escaneos de infraestructura Render/Neon ni peticiones a sitios externos.
GitHub Actions y el despliegue no se han ejecutado remotamente en esta revisión.

## Guion para la profesora

El responsable entrega por un canal privado la URL y cuentas de evaluación.
No compartir `DATABASE_URL`, `SECRET_KEY`, tokens ni la contraseña de PostgreSQL.

1. Entrar como Secretaría Parroquial en **Parroquia Ficticia 1**. Consultar
   Personas, crear una persona ficticia o usar las disponibles. Registrar
   bautismo, confirmación, matrimonio (dos personas distintas) y defunción.
   Seleccionar libro `EVAL-1`, folio y número nuevos.
2. Buscar una partida por nombre, libro, folio, número y fechas; probar paginación
   en Personas. Corregir la partida con motivo y abrir su historial.
3. Preparar un certificado. Cerrar sesión y entrar como Párroco de esa parroquia;
   autorizarlo y firmarlo. Descargar PDF y abrir su enlace de autenticidad.
4. Para Curia, preparar con la casilla correspondiente, autorizar como párroco,
   aprobar y firmar como Canciller mediante acceso diocesano. Probar la anulación
   con datos ficticios y comprobar que el enlace ya no declara validez.
5. Crear una partida en Parroquia Ficticia 2 con `secretario2`; anotar su referencia.
   Desde Parroquia Ficticia 1, buscar esa referencia y enviar solicitud.
   `secretario2` aprueba y prepara, `parroco2` autoriza y firma; Secretaría 1
   descarga el certificado aprobado. Las partidas de otra custodia no aparecen
   en la consulta personal completa.
6. Como Consulta, confirmar lectura local y ausencia de escritura; como Auditor,
   revisar reportes y trazabilidad. Como administrador, revisar usuarios,
   parroquias, permisos y respaldos. El administrador técnico prepara
   certificados; las autorizaciones eclesiásticas pertenecen a sus cargos.
7. Cerrar sesión y volver a entrar; confirmar que los registros siguen presentes.
   Probar el mismo guion en pantalla pequeña. Usar exclusivamente datos ficticios.

La recuperación es administrativa: restablecer desde Usuarios, entrar con la
contraseña temporal y cambiarla antes de acceder a los módulos. Para abandonar
la evaluación, desactivar accesos y retirar el servicio según el plan acordado.

Referencias: [Blueprint oficial de Render](https://render.com/docs/blueprint-spec),
[conexiones seguras de Neon](https://neon.com/docs/connect/connect-securely),
[cliente PostgreSQL para Debian](https://www.postgresql.org/download/linux/debian/).
