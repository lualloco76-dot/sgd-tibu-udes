# Reproducir la evaluación

Usar el código de la raíz, no una copia de los ZIP portátiles anteriores.
Requisitos comprobados: Windows, Node 24.19.0, Python 3.12.10, Chrome instalado
y binarios PostgreSQL 18.3. Para una instalación nueva usar un PostgreSQL 18
con las correcciones de mantenimiento vigentes.

## Preparación local

Desde la raíz, en PowerShell:

```powershell
python -m venv .venv-qa
.venv-qa/Scripts/python.exe -m pip install -r backend/requirements-dev.txt
npm ci --prefix frontend
npm --prefix frontend run build
# Solo si PostgreSQL no está en la ubicación estándar de Windows:
$env:PG_BIN = 'C:/Program Files/PostgreSQL/18/bin'
.venv-qa/Scripts/python.exe scripts/qa.py setup
```

El comando crea un clúster privado en `.test-data/qa/postgres`, escucha únicamente
en `127.0.0.1:55432`, usa SCRAM y contraseñas aleatorias. Crea `sgd_evaluacion`
y `sgd_test`; aplica Alembic hasta `0006`. No carga `backend/.env` ni selecciona
la base original. `setup` se puede repetir y no borra registros existentes.
Las pruebas de backend usan esquemas aleatorios dentro de `sgd_test`.

Las nueve cuentas iniciales usan correos `ROL@evaluacion.example.org`:
`administrador`, `parroco`, `secretario_parroquial`, `secretario_general`,
`canciller`, `auditor`, `consulta`, `parroco2`, `secretario2`.
La contraseña aleatoria de esta instalación se guarda en
`.test-data/qa/runtime.json`, ignorado por Git y excluido de la entrega.
Las tres cuentas parroquiales comunes usan Parroquia Ficticia 1; las terminadas
en `2`, Parroquia Ficticia 2. Los cargos diocesanos usan acceso diocesano.
No publicar esta contraseña ni reutilizarla para datos reales.

```powershell
# Terminal 1: UI compilada y API en un mismo origen, http://127.0.0.1:8765
.venv-qa/Scripts/python.exe scripts/qa.py serve
# Terminal 2:
.venv-qa/Scripts/python.exe scripts/qa.py backend-test
npm --prefix frontend test
Push-Location frontend
npx --no-install playwright cli --help
npx --no-install playwright cli install --skills=agents
npm run test:e2e
Pop-Location
.venv-qa/Scripts/python.exe scripts/qa_browser.py
.venv-qa/Scripts/python.exe scripts/qa_buttons_cli.py
# Sin otras pruebas en ejecución: reinicia solo el clúster ficticio y API 8766.
.venv-qa/Scripts/python.exe scripts/qa_persistence.py
.venv-qa/Scripts/python.exe scripts/sanitize_evidence.py
```

Playwright Test puede iniciar la API por sí mismo si el puerto no está ocupado.
Usa Chrome en local y Chromium instalado por Playwright en CI. La instalación
de Chromium inicialmente encontró EPERM al escribir la caché del usuario en el
sandbox; se reutilizó Chrome compatible y se ejecutaron las pruebas reales.
En una máquina sin Chrome: `npx playwright install chromium` y configurar
`CI=1` o quitar `channel: chrome` de la configuración local.

Los resultados HTML, JSON, capturas y trazas están en `.test-artifacts/`.
Ejecutar el saneamiento **después** de finalizar las pruebas y antes de compartir.
Las trazas originales pueden capturar peticiones de autenticación; solo distribuir
la copia saneada. No abrir `state-save` ni volcar sessionStorage a los informes.

## PostgreSQL externo de pruebas y CI

Configurar `QA_DATABASE_URL`, `SECRET_KEY` y `QA_PASSWORD` en el entorno. El
nombre de base debe ser `sgd_test` o `sgd_evaluacion`; cualquier otro se rechaza.
`QA_PASSWORD` requiere 12 caracteres y `SECRET_KEY`, 32. Para PostgreSQL remoto,
usar TLS. En CI se crea un servicio PostgreSQL efímero propio con cuentas
sintéticas, sin secretos de producción ni llamadas simuladas a la base.

## Herramientas gratuitas y Strix

```powershell
python -m venv .test-tools/strix
.test-tools/strix/Scripts/python.exe -m pip install strix-agent==1.7.0 bandit==1.9.4 pip-audit==2.10.1
npx --yes skills add usestrix/strix --agent codex --yes
.test-tools/strix/Scripts/strix.exe --version
.venv-qa/Scripts/python.exe scripts/strix_preflight.py
.test-tools/strix/Scripts/python.exe -m bandit -r backend/app -ll
.test-tools/strix/Scripts/python.exe -m pip_audit -r desktop/requirements-runtime.lock --disable-pip --no-deps
npm audit --prefix frontend
```

No ejecutar un escaneo Strix: el usuario eligió preparación sin consumo.
La política está en `security/strix-policy.json` y el alcance en
`security/strix-scope.md`. No se requieren claves por ahora. Las habilidades
instaladas quedan disponibles para siguientes turnos de Codex.

## Entrega verificable

La entrega completa actualizada se construye con
`scripts/release_complete.py build`, `package` y `verify`, en ese orden.
`build` exige un entorno virtual aislado Python 3.12 con las dependencias de
`desktop/requirements-build.txt`, PostgreSQL 18 y las herramientas preparadas por
`desktop/Prepare-Toolchain.ps1`; no debe usarse un venv con bibliotecas globales.
La reconstrucción local reutilizó las herramientas existentes y actualizó pypdf
en ese entorno aislado; no se presenta como reinstalación limpia.

El script no lee `.env` ni consulta la base original. Usa el dump anonimizado
aprobado y verifica su hash. En otra extracción, `SGD_APPROVED_PAYLOAD` puede
apuntar a `01_PROGRAMA/desktop/resources`; `SGD_TOOLCHAIN_DIR`, a las herramientas
preparadas. `SGD_RELEASE_BUILD_DIR` selecciona una carpeta nueva de construcción
dentro del proyecto cuando Windows conserva un binario anterior bloqueado.
`verify` realiza CRC, extracción real y comparación de todos los hashes.
Para probar el ejecutable resultante en un perfil nuevo:

```powershell
.venv-qa/Scripts/python.exe scripts/verify_desktop_release.py --app-root RUTA_DEL_PROGRAMA
```

La prueba arranca únicamente el PostgreSQL privado del programa, navega con
Playwright, crea datos ficticios en ese perfil y comprueba historial, idempotencia,
trazabilidad, PDF, carga documental, revocación y cierre. No instala servicios ni
ejecuta el instalador en el perfil habitual del usuario.

Para generar únicamente el paquete fuente:

```powershell
.venv-qa/Scripts/python.exe scripts/package_release.py
```

Se genera `.test-artifacts/entrega/SGD_TIBU_CODIGO_VERIFICADO.zip`, su SHA256 y
un manifiesto interno con hash de cada archivo. Incluye fuente, pruebas,
compilación React y configuración. Excluye `.env`, bases, respaldos, credenciales,
binarios y distribuciones históricas. Incluye también los manuales de
`ENTREGA_TECNICA_SGD_TIBU`; los enlaces a ZIP históricos requieren esas entregas
anteriores. La edición completa añade los binarios actualizados en carpetas separadas.
