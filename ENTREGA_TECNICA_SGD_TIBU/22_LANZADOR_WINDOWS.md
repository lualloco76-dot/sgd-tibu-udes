# Lanzador ejecutable Windows — 28 de octubre de 2026

Se entrega **Iniciar Sistema.exe**, compilado localmente desde `launcher/Launcher.cs`. No es un BAT renombrado. Se incluye el código del controlador, compilación e icono. Hay una copia en la raíz que contiene backend/frontend y otra en la carpeta inmediatamente superior, que detecta el proyecto anidado.

Con doble clic inicia backend y frontend de forma oculta, espera la disponibilidad, comprueba PostgreSQL mediante salud y catálogo de login y abre la interfaz. Una ventana informa del resultado y permite abrir el sistema o sus registros. Los servicios existentes se reutilizan; otros programas que ocupen los puertos no se terminan. No modifica bases, cuentas, migraciones ni configuración privada. Cerrar el lanzador conserva los servicios en ejecución.

Requiere la instalación actual del proyecto, sus dependencias Python, Node.js y PostgreSQL ya configurados. El ejecutable no empaqueta esas herramientas ni instala un servicio automático de Windows. Usa Windows PowerShell y .NET Framework disponibles en este equipo. La alternativa iniciar_sistema.bat funciona sin exigir abrir dos terminales. Los comandos individuales siguen disponibles en iniciar.bat.

## Pruebas

- Compilación .NET y ejecutable PE real.
- Inicio desde cero: backend y frontend arrancaron y respondieron HTTP 200.
- Nueva apertura: mismos PID, sin servicios duplicados.
- Copia en carpeta contenedora: proyecto localizado y funcionamiento verificado.
- Carpeta sin proyecto: rechazo con código 2.
- Alternativa BAT de backend: reuso satisfactorio.
- Sin visualización automática de la ventana ni apertura del navegador durante la prueba; se usaron los modos headless y no-browser del propio EXE.

[Instrucciones y compilación](../launcher/README.md). [Evidencia y SHA-256](evidencias/launcher-windows.json). Los ZIP de entrega anteriores no se regeneraron.
