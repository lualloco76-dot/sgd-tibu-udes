# Despliegue del SGD Tibu en Hostinger VPS (evaluacion)

**Estado:** plantilla de instalacion preparada, NO instalacion efectuada ni pruebas remotas aprobadas.

Este despliegue usa el Dockerfile existente del repositorio y publica React y FastAPI en el mismo origen, con PostgreSQL 18, proxy HTTPS Caddy y discos Docker persistentes para base y PDF. La base se llama **sgd_evaluacion**, exclusivamente para pruebas con datos ficticios. NO trasladar partidas reales sin autorizacion institucional.

## 0. Requisitos y advertencias

- VPS Hostinger con Ubuntu 24.04, Docker Engine y complemento Docker Compose.
- Un dominio o subdominio que apunte mediante registro DNS A a la IP publica del VPS.
- Puertos TCP 80/443 accesibles para TLS automatico y SSH accesible para administracion.
- Los puertos PostgreSQL 5432 y FastAPI 8000 quedan en la red privada de Docker.
- Si el VPS ya tiene sitios o un panel (CloudPanel, CyberPanel, cPanel, etc.), NO instale otro proxy sobre 80/443 sin comprobar conflictos; NO reinstale el sistema operativo sin copia completa.
- Recomendado para compilacion en el VPS: >= 4 GB RAM y >= 2 vCPU, sujeto a medicion; no son especificaciones ya comprobadas del alojamiento.

Hostinger dispone de una plantilla de Ubuntu con Docker. No reinstalar Ubuntu si el VPS contiene datos.

## 1. Abrir terminal SSH

Desde hPanel > VPS > Administrar > Terminal, o:

```bash
ssh root@IP_PUBLICA_VPS
```

El acceso con claves SSH y un usuario administrativo sin root permanente es preferible para produccion.

## 2. Preparar Docker y Git

```bash
docker --version
docker compose version
git --version
```

Si Docker falta, seguir la guia oficial de Hostinger para el sistema operativo instalado antes de continuar. Elija la plantilla Ubuntu 24.04 con Docker solo si el VPS es nuevo y no contiene datos.

Si Git no esta disponible en Ubuntu:

```bash
sudo apt-get update && sudo apt-get install -y git openssl
```

## 3. Copiar codigo publico desde GitHub

```bash
sudo mkdir -p /opt/sgd-tibu
sudo chown "$USER":"$USER" /opt/sgd-tibu
git clone https://github.com/lualloco76-dot/sgd-tibu-udes.git /opt/sgd-tibu
cd /opt/sgd-tibu/deploy/hostinger
cp .env.example .env
chmod 600 .env
```

Si el repositorio pasa a privado, usar SSH deploy key de solo lectura o una autenticacion de GitHub restringida; nunca incorporar tokens al codigo.

## 4. Configurar secretos locales y dominio

Generar **tres valores distintos**, cada uno por separado:

```bash
openssl rand -hex 32    # POSTGRES_PASSWORD
openssl rand -hex 48    # SECRET_KEY
openssl rand -hex 24    # DEMO_PASSWORD
nano .env
```

Sustituir los tres marcadores por los valores generados y poner el dominio real, p. ej., `sgd.midominio.com`. **No copiar valores al chat**. No usar los marcadores ni la misma clave para distintos servicios.

Para el entorno de evaluacion con cuentas ficticias, establecer `DEMO_SEED_ENABLED=true` solo cuando se haya confirmado que la BD es exclusivamente de evaluacion. El seed prepara dos parroquias ficticias y perfiles con contrasena secreta compartida de evaluacion. Antes de la puesta en produccion institucional, desactivar seed y crear identidades de verdad mediante procedimientos aprobados.

Apuntar el registro DNS A del subdominio a la IP del VPS y esperar la propagacion. No iniciar HTTPS antes de comprobar que 80/443 estan libres.

## 5. Validar y poner en marcha

```bash
cd /opt/sgd-tibu/deploy/hostinger
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=120 app
docker compose logs --tail=120 proxy
```

**Nunca publicar las salidas completas de `docker compose config`**, porque expande secretos.

Las migraciones Alembic se aplican al iniciar `deploy/start.py`. Si hay errores, leer solo mensajes de error sin exponer secretos.

Comprobar:

```bash
curl -fsS https://TU_DOMINIO/health
curl -I https://TU_DOMINIO/
docker compose exec -T db psql -U sgd -d sgd_evaluacion -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
```

Esperado: `{"estado":"disponible"}` y un numero positivo de tablas. Despues iniciar sesion con una cuenta de evaluacion, cargar un PDF ficticio, cerrar sesion, reiniciar los contenedores y comprobar consulta y descarga.

## 6. Respaldo verificable

Las copias deben incluir **la BD y los PDF**, no solo PostgreSQL. Ejemplo manual (realizar en servidor seguro y copiar fuera del VPS):

```bash
cd /opt/sgd-tibu/deploy/hostinger
mkdir -p ~/sgd-backups
docker compose exec -T db pg_dump -U sgd -d sgd_evaluacion -Fc > ~/sgd-backups/sgd_evaluacion.dump
docker compose exec -T app tar -czf - -C /var/data/sgd uploads > ~/sgd-backups/sgd_uploads.tar.gz
sha256sum ~/sgd-backups/*
```

Guardar copias fuera del VPS con acceso restringido. Verificar restauracion **en una base y carpeta aisladas**; nunca sobre la base que se este utilizando. La copia de volumen Docker por si sola NO reemplaza una estrategia de respaldo externo.

Ejemplo de restauracion de BD de evaluacion independiente:

```bash
docker compose exec -T db createdb -U sgd sgd_restauracion_prueba
docker compose exec -T db pg_restore --no-owner --no-privileges -U sgd -d sgd_restauracion_prueba < ~/sgd-backups/sgd_evaluacion.dump
docker compose exec -T db psql -U sgd -d sgd_restauracion_prueba -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
```

Para documentos, extraer `sgd_uploads.tar.gz` en una carpeta temporal aislada, comparar SHA256 y verificar que las rutas de la copia y la BD restaurada concuerdan. **No se ha ejecutado aqui esta prueba en Hostinger.**

## 7. Verificaciones y evidencias exigidas por UDES

Documentar con fecha, version Git y capturas/salidas anonimizadas:
1. `git rev-parse HEAD` y estado de contenedores;
2. HTTPS, certificado valido y respuesta `/health`;
3. versiones de Docker, Python, PostgreSQL y FastAPI;
4. recursos reales del servidor: `nproc`, `free -h`, `df -h`, `docker stats --no-stream`;
5. migraciones, creacion/busqueda de 4 tipos de partidas con datos ficticios;
6. permisos por rol, auditoria, PDF y persistencia tras reinicio;
7. respaldo, restauracion independiente y pruebas de carga autorizadas, con resultados medidos.

Si cualquiera de esos pasos no pasa, dejarlo como **pendiente o fallido** en los informes de pruebas y despliegue.

## 8. Operacion segura

- Mantener sistema operativo y Docker actualizados y SSH con llaves y control de acceso.
- No exponer 5432, 8000, `.env`, directorios de subida ni respaldos en internet.
- Los archivos de evaluacion pueden incluir datos sensibles: usar exclusivamente datos ficticios hasta contar con autorizacion institucional.
- No ejecutar `docker compose down -v`: **elimina los volumenes de PostgreSQL y PDF**.
- Renovar claves y contrasenas antes de habilitar usuarios institucionales.
- Para actualizar codigo, realizar respaldo, `git pull --ff-only` y `docker compose up -d --build`, revisar migraciones y repetir pruebas.
