# Iniciar backend y frontend con doble clic

Ejecutar **Iniciar Sistema.exe**. Hay una copia junto a backend/frontend y otra en la carpeta contenedora del proyecto. Las dos detectan esta instalación local. Mantener el ejecutable con la estructura del proyecto; no es un instalador autónomo ni incluye Python, Node.js o PostgreSQL.

El lanzador comprueba la API, su conexión a PostgreSQL y el catálogo necesario para el login. Inicia los servicios que falten, espera hasta que respondan y abre http://localhost:3000 en el navegador predeterminado. Si ya están funcionando los reutiliza. No detiene programas que ocupen los puertos 8000/3000 ni cambia .env, migraciones o credenciales.

La ventana incluye Abrir sistema, Ver registros y Cerrar lanzador. Cerrar la ventana no apaga los servicios. Los registros están en `.test-artifacts/runtime/`. Si PostgreSQL está detenido o falta una dependencia, se muestra el problema para corregirlo y volver a abrir el lanzador.

Alternativa: doble clic en **iniciar_sistema.bat**. En PowerShell se conservan `./iniciar.bat backend` y `./iniciar.bat frontend` para iniciar solo uno, oculto y sin abrir el navegador.

## Recompilar

Desde la raíz del proyecto, con .NET Framework de Windows disponible:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File launcher/Build-Launcher.ps1
```

Esto regenera el EXE de la raíz del proyecto a partir de Launcher.cs y launcher.ico. Si se usa también la copia de la carpeta contenedora, actualizarla con el EXE recién compilado. El controlador operativo está en Start-System.ps1; el binario lo ejecuta desde la instalación, sin copiar credenciales a sus argumentos ni cambiar políticas globales.

## Verificación técnica sin abrir ventanas

```powershell
# Ejecutable: --headless --no-browser --result ruta-a-informe.json
# Un proyecto completo es necesario. El EXE devuelve 2 si no lo encuentra.
```

Se probó el ejecutable real iniciando ambos servicios desde cero y reabriéndolo sin duplicar sus PID; la copia de la carpeta contenedora y la alternativa BAT también se comprobaron. Las pruebas automatizadas se ejecutaron sin mostrar la interfaz del lanzador ni abrir el navegador. Ver la evidencia de la entrega técnica.
