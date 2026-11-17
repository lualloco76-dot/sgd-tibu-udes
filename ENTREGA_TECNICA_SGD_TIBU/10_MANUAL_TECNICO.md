# Manual técnico

## Requisitos e instalación

Python 3.12 probado, Node.js `^22.22.2 || ^24.15.0 || >=26.0.0` con npm y PostgreSQL. La validación usó Node 24.19.0. El frontend conserva React 18 y utiliza Vite para desarrollo/build y Vitest para pruebas. Crear un entorno nuevo: el `venv` heredado puede apuntar a otro equipo. No es necesario borrarlo para instalar.

Desde la raíz que contiene `backend` y `frontend`, en PowerShell:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt
Set-Location frontend
npm ci
Set-Location ..
```

Producción solo necesita `backend/requirements.txt`; desarrollo añade pytest, HTTPX y lector PDF. El lockfile frontend fija las dependencias transitivas. La cadena anterior CRA/react-scripts se reemplazó por Vite/Vitest para corregir avisos transitivos sin reconstruir las pantallas. No sobrescribir un `.env` existente. Revisar `backend/.env.example` y configurar variables para una base de desarrollo explícita, sin reutilizar datos institucionales.

## Configuración

| Variable | Uso |
|---|---|
| `SECRET_KEY` | Clave aleatoria de al menos 32 caracteres, imprescindible para sesiones JWT |
| `DATABASE_URL` | URL SQLAlchemy; PostgreSQL usa `postgresql+psycopg2` |
| `UPLOAD_DIR` | Directorio persistente y restringido para PDF |
| `PUBLIC_BASE_URL` | URL pública del backend usada por QR, sin barra final |
| `CORS_ORIGINS` | Orígenes frontend permitidos, separados por coma, con esquema/puerto |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duración de sesión; 30 minutos por defecto |
| `VITE_API_URL` | Base API recomendada del frontend; ejemplo `http://localhost:8000/api` |
| `REACT_APP_API_URL` | Alias de compatibilidad del frontend heredado; se conserva mediante `envPrefix` |
| `TEST_DATABASE_URL` | Instancia PostgreSQL sintética exclusiva de pruebas |

Generar clave privada con `python -c "import secrets; print(secrets.token_urlsafe(48))"`. No publicar el resultado. El ejemplo PostgreSQL contiene un marcador de contraseña; sustituirlo en el entorno privado. No versionar `.env`, tokens o contraseñas. El usuario de aplicación no debe ser superusuario. Configurar TLS/`sslmode` de acuerdo con la instalación institucional.

## Base nueva y administrador

Crear una BD vacía y un rol autorizado limitado a ella. Guardar la URL en `$env:DATABASE_URL` sin mostrarla en capturas. Desde `backend`:

```powershell
../.venv/Scripts/python.exe ejecutar_schema.py --database-url $env:DATABASE_URL --confirm-target
../.venv/Scripts/python.exe crear_admin.py --database-url $env:DATABASE_URL --email administrador@example.test --nombre 'Administrador de desarrollo' --confirm-target
```

La contraseña se solicita oculta; no hay cuenta predeterminada. A petición del responsable, el mínimo de las contraseñas de cuentas es de 8 caracteres, sin reglas adicionales de composición y con máximo de 72 bytes; CLI, API y formularios activos aplican esa política. Esta regla no cambia SECRET_KEY ni las credenciales de PostgreSQL. Crear parroquias, usuarios y libros mediante la aplicación. Defunción es tipo documental, no sacramento. Las migraciones son fuente de evolución; `database/schema.sql` es referencia de instalación nueva, no actualización del legado. No ejecutar `create_all` para migrar bases existentes.

## Ejecución

Backend, desde `backend`:

```powershell
../.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend, desde `frontend`:

```powershell
npm start
```

Vite sirve desarrollo en localhost:3000. `npm run build` crea `frontend/build/`; `npm run preview` sirve ese build en localhost:3000 para revisión local. `npm test` ejecuta Vitest una vez y `npm run test:watch` observa cambios. El servidor de preview no es el despliegue institucional.

API: `http://localhost:8000`; Swagger: `/docs`; salud de persistencia: `/health`; interfaz: `http://localhost:3000`. Los lanzadores son conveniencia y usan configuración local. No detener procesos ajenos por ocupar un puerto. Un QR con localhost solo funciona donde ese localhost corresponde al servidor.

## Pruebas

Desde la raíz, usando entorno activado o su ejecutable:

```powershell
New-Item -ItemType Directory -Force ENTREGA_TECNICA_SGD_TIBU/evidencias
.venv/Scripts/python.exe -m pytest backend/tests -v --junitxml=ENTREGA_TECNICA_SGD_TIBU/evidencias/backend.xml
Set-Location frontend
$env:CI='true'
npm test
npm run build
```

Para PostgreSQL definir `TEST_DATABASE_URL` exclusivamente con instancia sintética. Los tests de migración crean esquemas aleatorios y los retiran al terminar. Sin PostgreSQL, esas variantes se omiten y no cuentan como aprobadas. No reutilizar una URL productiva. La evidencia final detalla las ejecuciones realmente realizadas.

## Migración y recuperación

1. Respaldar BD, PDF y configuración; verificar restauración en otra instancia.
2. Restaurar otra copia de pruebas y mantener el original desconectado.
3. Revisar estructura e integridad; aplicar `ejecutar_schema.py` con `--adopt-legacy --confirm-target` solo sobre la copia elegida.
4. La adopción exige tablas/columnas históricas compatibles y rechaza referencias huérfanas o esquemas parciales.
5. La custodia histórica desconocida queda NULL. Conciliar solo con evidencia y responsable autorizado; revisar colisiones de referencia. La API de custodia permite al administrador asignar partidas sin custodia con motivo e historial, sin transferir silenciosamente partidas ya asignadas.
6. Ejecutar pruebas y comparar conservación. Cualquier paso sobre producción requiere autorización separada.
7. Ante fallo, detener la aplicación y restaurar la copia desde el respaldo verificado. Conservar la copia fallida para diagnóstico. El downgrade destructivo está bloqueado. SQLite puede conservar DDL parcial: no repetir una adopción a ciegas.

El respaldo PDF debe corresponder al de BD. Probar restauración periódica y proteger copias fuera de la web. Ver también `backend/migrations/README.md`.

## Operación

Una instalación institucional requiere HTTPS, proxy/estáticos, permisos de directorio y red PostgreSQL restringidos. Rotar `SECRET_KEY` invalida JWT activos. Proteger también logs y auditoría. `/health` verifica conexión, no reemplaza migraciones y pruebas. No se realizó despliegue productivo en esta entrega.

## Revisiones del 28-10-2026

Las dependencias directas probadas están fijadas en UTF-8; incluyen Alembic y psycopg2-binary para postgresql+psycopg2. Se validó instalación nueva, no se reutilizó el venv heredado. TEST_DATABASE_URL solo admite sgd_test; no sustituirlo por una base de producción. Alembic actual es 0004; añade los campos del directorio sin eliminar registros. La aplicación no actualiza el esquema al iniciar.

La conexión local se actualizó posteriormente: `parroquia` ya está creada y migrada hasta `0004`, con un usuario PostgreSQL propio sin privilegios de superusuario. La cuenta administradora inicial ya se creó con el CLI descrito arriba y se verificó su login; no se documentan sus credenciales. Véase `17_CONEXION_POSTGRESQL_LOCAL.md`. No se migraron `parroquia.sql` ni `partidas`. La carpeta de entrega incluye SQL de referencia regenerado del ORM, sin intención de ejecutar ese SQL sobre legado.

Para repetir inspección de metadatos: definir INSPECT_DATABASE_URL privadamente y ejecutar `python backend/inspeccionar_postgresql.py --output informe.json`. La inspección fuerza transacciones de solo lectura y no modifica configuración. No publicar URLs con contraseña.

## Inicio mediante ejecutable Windows

Iniciar Sistema.exe ejecuta ambos servicios locales y abre la interfaz tras comprobar API/PostgreSQL y frontend. Se conserva iniciar_sistema.bat como alternativa. No instala dependencias, no aplica migraciones y no cambia la conexión. El icono Ver registros abre .test-artifacts/runtime; los procesos siguen funcionando cuando se cierra el lanzador. Ver launcher/README.md y 22_LANZADOR_WINDOWS.md para compilación, requisitos y pruebas.
