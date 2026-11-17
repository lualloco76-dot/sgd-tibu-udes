# Entrega final SGD Tibú UDES 3.0.0

**Edición vigente 3.1.0:** `SGD_TIBU_ACTUALIZADO_20261116.zip` contiene el programa
y el instalador reconstruidos con las correcciones funcionales del 16 de noviembre.
Consulte [el cierre actualizado](../AUDITORIA_20261116/REVISION_FUNCIONAL.md).
La descripción siguiente conserva la construcción y el contenido base de 3.0.0.

Paquete: SGD_TIBU_VERSION_FINAL_PROFESORA_UDES.zip.

Incluye React compilado, FastAPI, Python 3.12.10 y PostgreSQL 18.3 x64.
Abrir 01_PROGRAMA/SGD_Tibu.exe o instalar 02_INSTALADOR/SGD_Tibu_Setup.exe.
Extraer todo el ZIP en una carpeta local corta, por ejemplo C:\SGD.
Las rutas muy profundas pueden impedir que Windows cargue bibliotecas nativas.
El primer inicio prepara y restaura automáticamente una base independiente.
Cerrar SGD termina API y PostgreSQL. No cambia servicios instalados aparte.
Datos persistentes: %LOCALAPPDATA%\SGD Tibu UDES\datos, fuera de binarios.
La conexión y las credenciales aleatorias del clúster se protegen con DPAPI.

Acceso de evaluación: admin@iglesia.org / admin123.
Seleccionar Acceso diocesano / administración. Exclusivo de evaluación local;
no publicar en red ni utilizar esta copia como producción.

El origen tiene 13 parroquias, cuatro tipos, un administrador y 53 eventos.
No tiene personas, libros, partidas, solicitudes, certificados ni documentos.
La copia anonimiza nombre de cuenta y texto libre de auditoría y excluye sesiones.
Conserva la referencia de respaldo histórico señalando que su archivo no se entrega.
Los registros ficticios de QA no forman parte del dump distribuido.

## Construcción y documentación

Solo ingeniería requiere Python 3.12 x64, Node compatible y herramientas.
Crear un venv aislado e instalar desktop/requirements-build.txt; ejecutar npm ci
en frontend. Prepare-Toolchain.ps1 prepara Python embebido e Inno Setup.
La compilación de esta sesión reutilizó las dependencias y herramientas disponibles;
no se presenta su reinstalación limpia como una prueba ejecutada.

Copiar 03_BASE_DATOS/SGD_Tibu_Evaluacion.dump a
.test-artifacts/final-udes-20261109/payload/sgd_tibu_real.dump y copiar
manifiesto_base_evaluacion.json como payload/manifest.json. Después:

    python desktop/final_release.py build

build.py admite SGD_BUILD_DIR, SGD_PAYLOAD_DIR y SGD_POSTGRES_BINARIES.
Copia las distribuciones exactas del venv aislado y compila un EXE real con csc,
además del instalador Inno Setup. Nunca incluir .env ni un clúster del desarrollador.

final_release.py prepare consulta el origen en solo lectura y prepara un laboratorio
nuevo. No es necesario ejecutarlo para reconstruir con el dump aprobado. Rechaza
sobrescribir una base de preparación existente.

verify_final.py instala y prueba el EXE en un perfil de laboratorio nuevo, usando
Chrome y Playwright para QA. No son requisitos del evaluador.
final_documents.py genera la documentación y la estructura final.
final_integrity.py comprueba origen, hashes, ZIP, extracción y arranque distribuido.
Los generadores de versiones anteriores se conservan como fuente histórica.

La portabilidad se refiere a los binarios. DPAPI y los datos pertenecen al usuario
Windows; para otro perfil se necesita respaldo y restauración.
Las pruebas Windows 10/11 limpios y reinicio completo del sistema están pendientes.
Consulte el informe final y la matriz para el alcance exacto de las pruebas locales.
