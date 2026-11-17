"""Deliver the actual configured database and evaluator account, as requested."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import zipfile

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'backend'))
os.environ.update(SGD_DESKTOP='1',DATABASE_URL='sqlite://',SECRET_KEY='documentation-key-'+'x'*48)
from desktop.manual_render import Manual,field_help,dictionary,diagrams,table_purpose,OUT,EVIDENCE
from desktop.manual_labels_real import BUTTON_HELP
PRIVATE=ROOT/'.test-artifacts/evaluadores-real'
BUILD=ROOT/'.test-artifacts/distribution'
FOLDERS=['01_INSTALADOR','02_BASE_DATOS_POSTGRESQL','03_MANUAL_USUARIO','04_MANUAL_TECNICO','05_CODIGO_FUENTE','06_DIAGRAMAS','07_ACCESO_EVALUADORES','08_PRUEBAS']


def load(path):return json.loads(Path(path).read_text(encoding='utf8'))


def digest(path):
    with Path(path).open('rb') as file:return hashlib.file_digest(file,'sha256').hexdigest()


def user_manual(captures,manifest):
    m=Manual('Manual de usuario · SGD Diócesis de Tibú','Entrega para evaluadores con copia de la base real parroquia y la cuenta administradora existente.')
    m.h('Acceso de los evaluadores')
    m.table(['Dato','Valor'],[('Usuario','admin@iglesia.org'),('Contraseña','admin123'),('Contexto','Acceso diocesano / administración'),('Rol','administrador')],[1,2])
    m.p('El acceso fue comprobado en la API real y en Chrome después de instalar y restaurar el paquete. Se conserva el hash original de la cuenta y se permite ingresar directamente con la contraseña indicada.')
    m.h('Contenido real de la base entregada')
    m.p('La copia procede de la base local parroquia. Conserva 13 parroquias, la cuenta registrada, cuatro tipos de partida y 53 eventos de auditoría del origen. La base de origen no contiene personas, libros, partidas, solicitudes, certificados ni documentos registrados. Las listas vacías reflejan ese contenido real; los módulos permanecen disponibles para ingresar información autorizada.')
    m.p('Las sesiones del equipo original no se transfieren y la programación de respaldo empieza en manual. El historial de actuaciones del origen se conserva. El instalador restaura automáticamente esta copia en una base nueva y no reemplaza información de una base existente.')
    m.h('Instalar y abrir')
    m.steps(['Instale PostgreSQL 18 x64 con PostgreSQL Server y Command Line Tools.','Ejecute 01_INSTALADOR/SGD_Tibu_Setup.exe y complete la instalación por usuario Windows.','En el asistente introduzca el host local, puerto y credenciales administrativas de PostgreSQL. Conserve una base nueva y un usuario limitado exclusivos para esta instalación.','Pulse Comprobar e inicializar. El sistema restaura la base incluida, comprueba Alembic 0006 y concede permisos limitados a su conexión de aplicación.','Al abrirse el navegador, elija Acceso diocesano / administración e ingrese admin@iglesia.org y admin123.','En el uso diario abra SGD Diócesis de Tibú desde el escritorio. Cierre sesión y use Cerrar SGD en la ventana nativa al terminar.'])
    m.image(EVIDENCE/'capturas/asistente_real.png','Asistente real de esta edición; restaura la copia entregada y conserva la cuenta existente.')
    m.image(EVIDENCE/'capturas/login.png','Inicio de sesión de la aplicación instalada con las parroquias del catálogo real.')
    m.h('Roles y alcance')
    m.p('El sistema implementa siete roles. La base recibida tiene una cuenta administradora. No se crean automáticamente cuentas adicionales para los demás cargos: el administrador debe registrarlas cuando existan responsables institucionales autorizados. Administrador no adquiere la facultad de autorizar, aprobar Curia o firmar certificados.')
    from app.core.roles import ROLES
    from app.services.permisos import PERMISOS,predeterminados
    for role in ROLES:
        m.h(role,2);values=predeterminados(role)
        m.table(['Capacidad','Permiso inicial'],[(label,'Habilitado' if values[key] else 'No habilitado') for key,label,_ in PERMISOS],[2,1])
    m.h('Índice de módulos')
    modules=load(ROOT/'desktop/manual_modules_real.json')
    m.table(['Módulo','Ruta'],[(module['title'],module['route']) for module in modules],[1.5,1.5])
    for number,module in enumerate(modules,1):
        m.page();m.h(str(number)+'. '+module['title'])
        m.h('Finalidad',2);m.p(module['purpose'])
        m.h('Rol y acceso',2);m.p(module['roles']+'. Ruta: '+module['route']+'. Los permisos efectivos y la custodia se comprueban en el servidor.')
        shots=[shot for shot in captures if shot['name'] in {module['key'],module['key']+'_formulario'}]
        for shot in shots:m.image(EVIDENCE/shot['file'],'Captura actual de la aplicación instalada con la cuenta admin@iglesia.org y la copia de la base real.')
        if not shots:m.p('Esta función requiere el rol, estado o documento correspondiente. No se presenta una captura de datos que no existen en la base entregada.')
        m.h('Procedimiento',2);m.steps(module['steps'])
        m.h('Campos',2)
        fields=[];seen=set()
        for shot in shots:
            for field in shot['fields']:
                key=(field['name'],field['label'])
                if key not in seen:fields.append((field['label'] or field['name'],field_help(field)));seen.add(key)
        if fields:m.table(['Campo','Explicación y validación'],fields,[1,2.8])
        else:m.p('Vista de consulta o actuación condicionada. Los valores de identificación, estado, responsable y fecha proceden de los registros del sistema y no se modifican sobre la tabla.')
        m.h('Botones y acciones',2)
        buttons=list(dict.fromkeys(button for shot in shots for button in shot['buttons'] if button))
        rows=[]
        for button in buttons:
            explanation=BUTTON_HELP.get(button)
            if not explanation:
                if button.startswith('Actualizar'):explanation='Consulta nuevamente la información vigente del servidor.'
                elif button.startswith('Guardar'):explanation='Valida y guarda los cambios del formulario correspondiente.'
                elif button in ['Tarjetas','Tabla']:explanation='Cambia la presentación del directorio sin alterar la base.'
                elif button in ['Administrador','Párroco','Secretario Parroquial','Secretario General','Canciller','Auditor','Consulta']:explanation='Selecciona el cargo para revisar o administrar sus capacidades; no cambia el rol de la sesión.'
                else:explanation='Ejecuta la acción indicada en la sección o fila seleccionada. Su disponibilidad depende del permiso y del estado del recurso.'
            rows.append((button,explanation))
        if rows:m.table(['Botón','Resultado'],rows,[1,2.8])
        else:m.p('Las acciones aparecen cuando existe un recurso autorizado y el rol puede realizar la operación. No se habilitan por cambiar la URL del navegador.')
        for heading,key in [('Validaciones y restricciones','validations'),('Resultado esperado','result'),('Errores frecuentes','errors'),('Relación con otros módulos','relations')]:m.h(heading,2);m.p(module[key])
        m.h('Aplicación a esta base',2)
        m.p('Ingrese únicamente información real autorizada. Si el módulo necesita una persona, libro o partida previa, regístrela primero en su módulo. Las instrucciones describen el procedimiento; no agregan registros automáticamente a la base entregada.')
    m.page();m.h('Tutorial: primera partida autorizada')
    m.steps(['Administrador: abra Parroquias y confirme la comunidad custodiante y su código.','Abra Usuarios y registre las cuentas institucionales del párroco y secretario de esa custodia cuando corresponda. No asigne un cargo sin autorización.','En Personas registre al titular conforme a la fuente documental autorizada.','En Libros sacramentales registre el libro por parroquia y tipo de partida.','En el módulo del sacramento pulse Registrar partida. Seleccione primero custodia, después persona y libro.','Ingrese fecha, folio, número y demás datos que consten en la fuente. Guarde y revise Ver e Historial.','Para corregir use Corregir / nota y explique el motivo; para añadir texto use Agregar nota marginal.'])
    m.h('Tutorial: certificado y actuación de Curia')
    m.steps(['Con una partida completa, una cuenta con capacidad de preparación indica el ID de la partida y prepara el certificado.','El párroco custodio revisa la trazabilidad, pulsa Autorizar y confirma un motivo.','Para un certificado ordinario, el párroco pulsa Firmar. Después aparece Descargar PDF.','Si el trámite requiere Curia, al prepararlo debe marcarse esa competencia y su motivo. Tras la autorización parroquial, el canciller debe Aprobar en Curia y después Firmar.','La anulación exige una actuación autorizada y conserva historial. La verificación del código pasa a no válida.','El administrador técnico no puede sustituir al párroco ni al canciller para estas actuaciones.'])
    m.h('Tutorial: solicitud a otra parroquia')
    m.steps(['Busque la referencia externa por parroquia, libro, folio y número desde Solicitudes.','Indique el motivo institucional y la parroquia de origen cuando su rol pueda seleccionarla.','La custodia de destino revisa y aprueba o rechaza con motivo. Una decisión ya definitiva no se repite.','Consulte el resultado y vincule, cuando corresponda, la solicitud aprobada con el certificado del mismo registro.'])
    m.h('Auditoría, respaldo y cierre')
    m.p('Revise Auditoría después de una operación. Cree una copia en Respaldos, espere completado, pulse Verificar y descárguela a almacenamiento protegido. La programación requiere que el SGD permanezca abierto. Cerrar solo el navegador no detiene la API; utilice Cerrar SGD. Los registros técnicos están en %LOCALAPPDATA%\\SGD Tibu\\datos\\registros.')
    m.p('La firma corresponde a una actuación autenticada dentro del SGD. No equivale a una firma digital certificada por un tercero. El QR verifica el documento en el mismo equipo porque el servidor está limitado a 127.0.0.1.')
    m.save(OUT/'03_MANUAL_USUARIO','Manual_Usuario_SGD_Tibu')


def technical_manual(schema,openapi,manifest):
    m=Manual('Manual técnico e instalación · SGD Tibú','Edición 2.2.0 para evaluadores: copia de la base real y cuenta existente.')
    m.h('Contenido y cuenta de acceso')
    m.p('Origen: base PostgreSQL parroquia, revisión 0005, consultada y respaldada en solo lectura. En una copia independiente se aplicó la migración 0006 para la versión empaquetada. Se conserva el hash original de admin@iglesia.org y el inicio con admin123, verificado mediante API y navegador. No se reemplazó la cuenta ni se modificó la base de origen.')
    m.table(['Tabla','Filas incluidas'],[(name,count) for name,count in manifest['counts'].items()],[2,1])
    m.p('Se preservan negocio y auditoría. Las sesiones no se transfieren; las referencias al historial de archivos de respaldo del equipo original se omiten porque esos archivos operativos no forman parte de la instalación. La configuración de respaldo queda en manual. El origen conserva sus sesiones e historial íntegros.')
    m.h('A. Instalación para evaluadores')
    m.steps(['Abra https://www.postgresql.org/download/windows/ y descargue PostgreSQL 18 para Windows x64 desde el enlace oficial al proveedor. La versión comprobada en este equipo es 18.3.','Instale PostgreSQL Server y Command Line Tools. pgAdmin 4 es recomendable; Stack Builder no es necesario. Mantenga 5432 salvo que exista otro servidor y conserve la contraseña administrativa.','Compruebe en Servicios de Windows que PostgreSQL 18 está En ejecución.','Descomprima el ZIP y ejecute SGD_Tibu_Setup.exe desde 01_INSTALADOR. El instalador incluye Python, Tcl/Tk, las dependencias y React compilado. El destinatario no instala Node, NPM ni herramientas de desarrollo.','En el asistente indique host local, puerto, usuario y contraseña administrativa PostgreSQL; mantenga una base nueva, por ejemplo sgd_tibu_evaluadores, y un rol exclusivo, por ejemplo sgd_tibu_eval_app.','Pulse Comprobar e inicializar. Se comprueba el hash de la copia incluida y se restaura mediante pg_restore en una base vacía, dentro de una sola transacción.','El asistente aplica Alembic hasta 0006, concede DML al rol limitado y verifica tablas y conexión. La contraseña administrativa permanece en memoria y no se guarda.','Abra el acceso SGD Diócesis de Tibú. Elija Acceso diocesano / administración; correo admin@iglesia.org, contraseña admin123.','El uso posterior requiere solo abrir el acceso directo. Cierre con Cerrar SGD.'])
    m.image(EVIDENCE/'capturas/asistente_real.png','Asistente vigente, sin selección de datos de ejemplo ni creación de otra cuenta administradora.')
    m.h('A.1. Campos del asistente',2)
    m.table(['Campo','Uso'],[('Host local','127.0.0.1, localhost o ::1. La instalación normal está limitada a la máquina local.'),('Puerto','Puerto del servidor PostgreSQL 18, habitualmente 5432.'),('Base exclusiva','Nombre nuevo de 3 a 48 caracteres: minúsculas, números y guion bajo. No use postgres ni template0/template1.'),('Usuario limitado','Rol exclusivo que la aplicación usará para consultar y guardar; no es la cuenta administrativa postgres.'),('Usuario administrador PostgreSQL','Cuenta con permisos para crear base, rol y ejecutar la restauración.'),('Contraseña PostgreSQL','Se usa solo durante la operación; se descarta al terminar.'),('Autorizar base existente','Úselo únicamente tras respaldo para reutilizar una base SGD ya gestionada. Las bases ajenas se rechazan y no se restauran encima.')],[1,2.8])
    m.h('B. Arquitectura')
    m.p('Launcher.cs ejecuta directamente el pythonw.exe oficial incluido, sin shell ni búsqueda de intérpretes en PATH. runtime.py presenta Tkinter y ejecuta Uvicorn dentro del mismo proceso Python. FastAPI conserva sus routers bajo /api y sirve React compilado desde frontend/build en el mismo origen. El servidor solo escucha 127.0.0.1; reserva 8765 o un puerto local libre y abre la dirección correcta en el navegador. Un bloqueo por perfil evita instancias duplicadas.')
    m.image(OUT/'06_DIAGRAMAS/arquitectura.png','Arquitectura del programa instalado y almacenamiento separado de los binarios.')
    m.h('B.1. Directorios y persistencia',2)
    m.table(['Ruta','Contenido'],[('%LOCALAPPDATA%\\Programs\\SGDTibu','Binarios y código instalado, retirables mediante desinstalación.'),('%LOCALAPPDATA%\\SGD Tibu\\datos','Configuración DPAPI del usuario Windows, documentos, respaldos y registros. Se conserva al actualizar o desinstalar.'),('desktop/resources','sgd_tibu_real.dump y manifiesto con SHA-256 de esta entrega.'),('backend/app','API, modelos SQLAlchemy, esquemas Pydantic y servicios.'),('backend/migrations','Revisiones Alembic 0001 a 0006.'),('frontend/src','Interfaz conectada definida por App y Dashboard.'),('frontend/build','Archivos React compilados; no se ejecuta un servidor de desarrollo.'),('desktop','Lanzador, configuración segura, restauración, compilación y verificación de entrega.')],[1.3,2.7])
    m.h('B.2. Tecnologías y versiones',2)
    purposes={'fastapi':'API e inyección de dependencias','uvicorn':'Servidor ASGI interno','sqlalchemy':'ORM y transacciones','psycopg2-binary':'Controlador PostgreSQL','alembic':'Migraciones','bcrypt':'Comprobación y hash de contraseñas','pyjwt':'JWT de sesiones','pydantic':'Validación de esquemas','pydantic-core':'Motor compilado de validación','reportlab':'PDF y QR de certificados','pypdf':'Inspección segura de PDF','python-multipart':'Recepción de archivos','python-dotenv':'Configuración del código de desarrollo; deshabilitada en escritorio','email-validator':'Direcciones de correo','tzdata':'Zonas horarias','pillow':'Soporte gráfico y capturas dirigidas','starlette':'Respuestas, middleware y ciclo ASGI','anyio':'Concurrencia de FastAPI y Starlette','h11':'HTTP/1.1 de Uvicorn','click':'Infraestructura CLI de Uvicorn','greenlet':'Contextos de SQLAlchemy','mako':'Plantillas Alembic','markupsafe':'Escape para Mako','idna':'Dominios internacionales','dnspython':'Resolución de dominios','annotated-doc':'Documentación de parámetros','annotated-types':'Restricciones de tipos','typing-extensions':'Anotaciones compatibles','typing-inspection':'Inspección de anotaciones','charset-normalizer':'Normalización de codificaciones','opentelemetry-api':'Interfaces de instrumentación transitivas sin exportador remoto configurado'}
    m.table(['Biblioteca','Uso'],[(line,purposes.get(line.split('==')[0],'Dependencia transitiva de las anteriores')) for line in (ROOT/'desktop/requirements-runtime.lock').read_text().splitlines()],[1.3,2.7])
    m.p('Runtime oficial Python 3.12.10 x64. Tcl/Tk y zlib1.dll incluidos. Inno Setup 7.1.1 construye el instalador. React 18 se compila con Vite; consulte frontend/package-lock.json para las versiones exactas. Los requisitos Node de compilación están en package.json y no afectan al equipo del evaluador. python312._pth impide cargar librerías del entorno de desarrollo. La distribución es 2.2.0; el API conserva su versión funcional '+openapi['info']['version']+'.')
    m.h('B.3. PostgreSQL y migraciones',2)
    m.table(['Revisión','Efecto'],[('0001','Esquema original de usuarios, personas, sacramentos, registros, documentos y auditoría.'),('0002','Custodia, parroquias, libros, solicitudes, certificados y sesiones.'),('0003','Siete roles y ciclo de certificados.'),('0004','Directorio de parroquias y ubicación.'),('0005','Políticas persistentes y respaldos.'),('0006','Campo de contraseña temporal, sin alterar las cuentas existentes.')],[.6,3.4])
    m.p('La copia incluida ya está en 0006. La cuenta real existente queda con debe_cambiar_password falso y su hash intacto. La inicialización normal restaura solo si la base está vacía; si hay tablas, valida la instalación y migra únicamente cuando se autorizó reutilización. No sobrescribe filas ni vuelve a cargar el dump. No se usa create_all para actualizar una base existente. Los downgrades destructivos están bloqueados.')
    m.h('B.4. Diccionario y validaciones',2)
    m.table(['Tabla','Finalidad'],[(name,table_purpose(name)) for name in schema],[1.1,2.9])
    m.p('diccionario_datos.xlsx contiene todas las tablas y columnas físicas, claves, índices, valores por defecto y comprobaciones; esquema_fisico.json conserva la inspección íntegra. OpenAPI incluye las validaciones Pydantic de entrada y salida. La API rechaza campos extra, referencias incompatibles y operaciones fuera de la custodia. Partidas: fecha no futura, persona y libro de la custodia, referencia única. Matrimonio: contrayente distinto y existente. PDF: hasta 10 MiB, de 1 a 1000 páginas, sin cifrado, JavaScript ni adjuntos activos.')
    m.h('B.5. Autenticación y roles',2)
    m.p('La cuenta solicitada se autenticó con admin123 a través del mecanismo real, sin cambiar la política general de creación de contraseñas. bcrypt valida el hash conservado. JWT requiere exp, sub, jti y token_version coherentes con una sesión no revocada. Cinco fallos bloquean durante 15 minutos. Los permisos efectivos se leen del servidor en cada petición y se suman a las reglas de custodia. La administración técnica no concede autorización parroquial, aprobación de Curia ni firma.')
    m.p('config.dat se protege con DPAPI del usuario Windows. Contiene la conexión limitada y la clave JWT, nunca la contraseña administrativa PostgreSQL. La conexión de aplicación no es superusuario, no crea roles ni bases, no tiene CREATE en public y solo lee alembic_version. Las credenciales del servidor de origen no se incluyen en el ZIP.')
    m.h('B.6. API y endpoints',2)
    rows=[]
    for path,value in openapi['paths'].items():
        for method,operation in value.items():
            if method in {'get','post','patch','put','delete'}:rows.append((method.upper()+' '+path,operation.get('summary','')+'; '+('Bearer requerido' if operation.get('security') else 'Público/salud')))
    m.table(['Endpoint','Función'],rows,[1.8,2.2])
    m.p('Base: http://127.0.0.1:PUERTO/api. /health ejecuta SELECT 1. OpenAPI completo acompaña el código; las rutas de control de escritorio no forman parte del API de negocio y requieren una clave de control local protegida. Los códigos principales son 401 sesión inválida; 403 permiso/custodia; 409 conflicto de estado o unicidad; 413 archivo grande; 422 validación; 429 bloqueo de acceso; 503 persistencia no disponible.')
    m.h('B.7. Auditoría y certificados',2)
    m.p('services.access.audit conserva usuario, acción, entidad, ID, fecha, detalle y custodia. Las correcciones mantienen anterior y posterior en notas_marginales. El certificado guarda una instantánea y separa preparado, autorizado, aprobado_curia, firmado y anulado. Solo se descarga firmado. Una corrección posterior de la partida no reescribe la instantánea. El administrador prepara, el párroco custodio autoriza y firma ordinarios, el canciller aprueba y firma los de Curia. La firma es una actuación autenticada, no una firma digital certificada por un prestador externo.')
    m.h('B.8. Respaldo y recuperación',2)
    m.steps(['Desde Respaldos cree la copia, espere completado, verifique y descargue el ZIP a un lugar protegido. Incluye base.dump, manifiesto y PDF referenciados.','Para copia manual use PostgreSQL 18 pg_dump: pg_dump -h 127.0.0.1 -p 5432 -U postgres -W -Fc --no-owner --no-privileges -d BASE -f respaldo.dump.','Cree una base de recuperación nueva en pgAdmin y use Restore con formato custom. Equivalente: pg_restore -h 127.0.0.1 -p 5432 -U postgres -W --no-owner --no-privileges --exit-on-error -d BASE_NUEVA respaldo.dump.','Compruebe revisión, tablas, conteos y hashes. No use --clean ni restaure sobre la única copia.','Restaure los PDF del ZIP y concilie documentos.ruta_archivo si cambió el equipo, conservando cada SHA-256 y el directorio privado configurado.','Tras validar una recuperación de esta instalación, marque la base con COMMENT ON DATABASE BASE_NUEVA IS \'SGD_TIBU:real\'; después configure su conexión y autorice reutilización. No marque una base desconocida para forzar su adopción.'])
    m.h('B.9. Actualización y mantenimiento',2)
    m.steps(['Respalde y pruebe la recuperación antes de actualizar.','Cierre sesión y Cerrar SGD; no cierre durante un trabajo de respaldo.','Ejecute el nuevo instalador con el mismo usuario Windows. El programa y los datos están separados.','Si falta migración, abra Configurar PostgreSQL con respaldo y autorización sobre esa base.','Compruebe cuenta, parroquias, partida autorizada cuando exista, documento y auditoría. Conserve la versión y copia anteriores hasta la aceptación.'])
    m.table(['Problema','Respuesta'],[('No conecta','Compruebe servicio, puerto y contraseña PostgreSQL 18.'),('Falta pg_restore o pg_dump','Instale Command Line Tools de PostgreSQL 18.'),('Base ya existe','Use una nueva o autorice únicamente una instalación SGD respaldada; no se sobrescribe.'),('Configuración DPAPI no legible','Abra con el mismo usuario Windows o configure de nuevo en otro perfil.'),('API ya abierta','La segunda apertura reutiliza la instancia activa.'),('Puerto ocupado','La aplicación reserva otro puerto local libre.'),('Listas vacías','La base original no contiene esas filas. Registre solo información autorizada.'),('No aparece Firmar','Revise cargo, custodia y estado. Administrador no firma.'),('QR no abre en otro equipo','La verificación es local a 127.0.0.1.'),('No se detuvo al cerrar navegador','Use Cerrar SGD en la ventana nativa.')],[1.2,2.8])
    m.h('B.10. Recompilar',2)
    m.steps(['Use Windows x64 con Python 3.12 y Node compatible solo en el equipo de ingeniería.','Desde 05_CODIGO_FUENTE cree un venv aislado: python -m venv .build-venv. Instale desktop/requirements-build.txt.','Ejecute powershell.exe -NoProfile -ExecutionPolicy Bypass -File desktop/Prepare-Toolchain.ps1. Se descargan herramientas oficiales y se exige firma válida de Inno Setup.','En frontend ejecute npm ci.','Copie 02_BASE_DATOS_POSTGRESQL/sgd_tibu_real.dump y manifiesto_base_real.json a .test-artifacts/evaluadores-real/payload, renombrando el segundo como manifest.json. La carpeta se crea desde la raíz de fuentes.','Ejecute ./.build-venv/Scripts/python.exe desktop/build.py. El resultado queda en .test-artifacts/distribution/inno-output/SGD_Tibu_Setup.exe.','Compruebe el manifiesto instalado, autenticación, restauración, módulos, cierre y actualización. La carpeta de datos del destinatario no se incluye en una recompilación.'])
    m.h('B.11. Fragmentos reales explicados',2)
    m.code('desktop/provision.py',1,75)
    m.p('release_manifest verifica el SHA-256 del dump real antes de usarlo. restore_database comprueba que no hay tablas y ejecuta pg_restore en una sola transacción, sin exponer la contraseña en argumentos. La cuenta existente se valida después de aplicar las migraciones.')
    m.code('desktop/secure_config.py',1,51)
    m.p('La configuración se cifra mediante Windows DPAPI y se reemplaza de forma atómica. El archivo no contiene la URL como texto plano.')
    m.h('B.12. Alcance de validación',2)
    m.p('Se comprobó esta entrega restaurando la base real mediante el instalador, autenticando la cuenta exacta por API y Chrome, abriendo los módulos, creando y verificando un respaldo y comprobando instancias y cierre. La sesión no tiene acceso autorizado a VM Hyper-V; no se declara comprobada una instalación Windows 10/11 limpia ni un reinicio completo de Windows. Consulte el reporte real, sin convertir esas pruebas pendientes en resultados aprobados.')
    m.p('Fuentes oficiales: https://www.postgresql.org/download/windows/ ; https://www.postgresql.org/docs/18/app-pgrestore.html ; https://docs.python.org/3.12/using/windows.html#the-embeddable-package ; https://jrsoftware.org/isdl.php',small=True)
    m.save(OUT/'04_MANUAL_TECNICO','Manual_Tecnico_Instalacion_SGD_Tibu')


def copy_source():
    source=OUT/'05_CODIGO_FUENTE'
    extensions={'.py','.js','.jsx','.json','.css','.html','.md','.txt','.ini','.mako','.sql','.svg','.ico','.ps1','.cs','.lock'}
    forbidden={'venv','.venv','node_modules','__pycache__','.test-tools','uploads','backups','build','.test-artifacts','.pytest_cache'}
    inventory=[]
    for folder in ['backend','frontend','launcher','database']:
        for path in sorted((ROOT/folder).rglob('*')):
            if not path.is_file() or path.suffix not in extensions:continue
            relative=path.relative_to(ROOT)
            if forbidden.intersection(relative.parts) or path.name.startswith('.env') or path.name=='test-results.json':continue
            target=source/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target)
            inventory.append(dict(archivo=relative.as_posix(),sha256=digest(path)))
    names=['__init__.py','runtime.py','secure_config.py','provision.py','Launcher.cs','installer.iss','build.py','Prepare-Toolchain.ps1','requirements-build.txt','requirements-runtime.lock','package-browser.json','README.md','AVISOS_DISTRIBUCION.txt','manual_render.py','manual_labels_real.py','manual_modules_real.json','deliver_real.py','verify_real_release.py','capture_real.mjs']
    for name in names:
        path=ROOT/'desktop'/name;target=source/'desktop'/name;target.parent.mkdir(exist_ok=True,parents=True);shutil.copy2(path,target)
        inventory.append(dict(archivo='desktop/'+name,sha256=digest(path)))
    (source/'INVENTARIO_FUENTES_SHA256.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding='utf8')
    (source/'README.md').write_text('# Fuente del SGD Tibú — entrega real para evaluadores\n\nEl instalador incluye el runtime y restaura la copia de la base real parroquia.\nCuenta existente: admin@iglesia.org. Acceso: admin123.\n\nPara reconstruir, siga desktop/README.md y el manual técnico de la carpeta 04_MANUAL_TECNICO.\nLa base restaurable se encuentra en 02_BASE_DATOS_POSTGRESQL del ZIP.\nNo se incluye backend/.env ni las credenciales administrativas del servidor de origen.\n',encoding='utf8')
    # Runtime licenses were already collected from the exact same dependency lock.
    prior=ROOT/'SGD_TIBU_PROGRAMA_LISTO_PARA_USAR/05_CODIGO_FUENTE/LICENCIAS_TERCEROS.txt'
    if prior.exists():shutil.copy2(prior,source/'LICENCIAS_TERCEROS.txt')


def report_and_first_read(manifest):
    browser=load(EVIDENCE/'navegador-real.json')
    m=Manual('Reporte de instalación y pruebas · entrega real para evaluadores','Comprobaciones efectuadas sobre la copia de la base real y la cuenta solicitada.')
    m.table(['Comprobación','Resultado'],[
      ('Cuenta del origen','Existe, activa y administradora. bcrypt verifica admin123 sin restablecer la clave.'),
      ('Origen','Base parroquia, PostgreSQL 18.3, revisión 0005, usada en solo lectura.'),
      ('Copia distribuida','Migrada a 0006 en laboratorio independiente. Negocio y auditoría conservados.'),
      ('Instalador real','Incluye runtime, frontend compilado y sgd_tibu_real.dump. Restaura automáticamente en base nueva.'),
      ('Cuenta restaurada','Inicio HTTP 200 en /api/auth/login y /api/auth/me, como administrador, sin cambio obligatorio.'),
      ('Navegador','Inicio real con admin@iglesia.org/admin123 y '+str(browser['capturas'])+' capturas actuales; '+str(len(browser['errores']))+' errores JavaScript.'),
      ('Módulos','13 rutas API consultadas correctamente. Las pantallas muestran las filas reales existentes, incluidas las listas vacías.'),
      ('Respaldo','Creado y verificado mediante el API, con pg_dump instalado.'),
      ('Instancias y cierre','Segunda apertura reutiliza la instancia; cierre ordenado comprobado.'),
      ('Repetición','Sin autorización se rechaza; autorizada conserva conteos y no vuelve a cargar la base.'),
      ('Dependencias del destinatario','Se comprobó la ejecución sin Python ni Node en PATH. PostgreSQL es externo.'),
      ('Windows limpio','Pendiente. No hubo acceso autorizado a una VM Windows 10/11 limpia.'),
      ('Reinicio completo de Windows','Pendiente. No se presenta cierre/reapertura de aplicación como reinicio del sistema operativo.')],[1.1,2.9])
    m.h('Contenido de la copia')
    m.table(['Tabla','Filas iniciales'],list(manifest['counts'].items()),[2,1])
    m.p('Las sesiones y las referencias a archivos operativos de respaldo del equipo original no se transfirieron. La base original conserva esas filas. Ninguna persona, partida, solicitud ni cuenta se inventó para la entrega. Los 53 eventos históricos del origen se preservan; las pruebas posteriores agregaron únicamente eventos de autenticación y respaldo a la base de laboratorio.')
    m.p('Las pruebas de roles y flujos del código existentes usan bases aisladas de prueba. Sus registros no forman parte de este respaldo ni del contenido que recibe el evaluador.')
    m.image(EVIDENCE/'capturas/panel.png','Panel actual después de entrar con la cuenta existente en la aplicación instalada.')
    m.save(OUT/'08_PRUEBAS','Reporte_Instalacion_y_Pruebas')
    m=Manual('LEEME PRIMERO · SGD Tibú para evaluadores','Programa completo con copia de la base real parroquia y cuenta administradora registrada.')
    m.table(['Acceso','Valor'],[('Usuario','admin@iglesia.org'),('Contraseña','admin123'),('Seleccione','Acceso diocesano / administración')],[1,2])
    m.steps(['Instale PostgreSQL 18 x64 desde https://www.postgresql.org/download/windows/ con Server y Command Line Tools.','Abra 01_INSTALADOR/SGD_Tibu_Setup.exe. No instale Python, Node, NPM ni servidores de desarrollo.','En el asistente ingrese los datos administrativos de su PostgreSQL local. Conserve una base nueva y un usuario limitado exclusivos.','Pulse Comprobar e inicializar: se restaura automáticamente la copia real incluida. No se solicita crear otra cuenta administradora.','Abra SGD Diócesis de Tibú, seleccione acceso diocesano e ingrese el usuario y contraseña indicados.'])
    m.h('Qué se entrega')
    m.p('El sistema completo y los siete roles permanecen implementados. La base contiene los datos realmente registrados: 13 parroquias, una cuenta administradora, cuatro tipos de partida y el historial de auditoría. Actualmente no hay personas, libros ni partidas registrados en el origen. Los módulos están disponibles para registrar información autorizada; no se precargaron registros inventados.')
    m.p('Manuales en DOCX/PDF: carpetas 03 y 04. Código fuente: 05. Diagramas: 06. Acceso para evaluadores: 07. Respaldo restaurable y diccionario: 02. Las evidencias de esta entrega real se encuentran en 08.')
    m.h('Uso y conservación de información')
    m.p('Mantenga PostgreSQL en ejecución. El programa comprueba la conexión e inicia su servidor interno automáticamente. Mantenga su ventana abierta y termine con Cerrar SGD. Base y documentos se conservan fuera de los binarios; respalde antes de actualizar. El QR y la interfaz son locales a este equipo.')
    m.h('Estado de las pruebas')
    m.p('Esta edición fue instalada y probada localmente con la copia real y el acceso indicado. Sigue pendiente la prueba en Windows 10/11 limpios y tras reinicio completo porque la sesión no tiene permisos de VM. No se afirma que esa aceptación haya sido realizada.')
    m.save(OUT,'LEEME_PRIMERO')


def main():
    for folder in FOLDERS:(OUT/folder).mkdir(parents=True,exist_ok=True)
    manifest=load(PRIVATE/'payload/manifest.json');schema=load(EVIDENCE/'esquema.json');captures=load(EVIDENCE/'capturas.json')
    database=OUT/'02_BASE_DATOS_POSTGRESQL'
    shutil.copy2(PRIVATE/'payload/sgd_tibu_real.dump',database/'sgd_tibu_real.dump')
    shutil.copy2(PRIVATE/'payload/manifest.json',database/'manifiesto_base_real.json')
    shutil.copy2(PRIVATE/'estructura.sql',database/'estructura.sql')
    shutil.copy2(EVIDENCE/'esquema.json',database/'esquema_fisico.json')
    shutil.copytree(ROOT/'backend/migrations',database/'migraciones',dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
    (database/'RESTAURAR_BASE_REAL.txt').write_text('La instalación normal restaura automáticamente esta base con el asistente.\n\nPara recuperación administrativa en una BASE_NUEVA:\npg_restore -h 127.0.0.1 -p 5432 -U postgres -W --no-owner --no-privileges --exit-on-error -d BASE_NUEVA sgd_tibu_real.dump\n\nNo use --clean ni una base que tenga información. La cuenta se conserva: admin@iglesia.org / admin123, acceso diocesano.\nEl dump procede de parroquia y fue migrado a 0006 en una copia independiente.\nConserva 13 parroquias y la auditoría histórica. No contiene personas o partidas inventadas.\n',encoding='utf8')
    prior=ROOT/'SGD_TIBU_PROGRAMA_LISTO_PARA_USAR/02_BASE_DATOS_POSTGRESQL'
    for script in ['Inicializar_SGD.ps1','Comprobar_Conexion.ps1']:
        if (prior/script).exists():shutil.copy2(prior/script,database/script)
    dictionary(schema);diagrams(schema);copy_source()
    from app.main import app
    openapi=app.openapi()
    (OUT/'05_CODIGO_FUENTE/openapi.json').write_text(json.dumps(openapi,ensure_ascii=False,indent=2),encoding='utf8')
    shutil.copy2(BUILD/'inno-output/SGD_Tibu_Setup.exe',OUT/'01_INSTALADOR/SGD_Tibu_Setup.exe')
    shutil.copy2(ROOT/'desktop/AVISOS_DISTRIBUCION.txt',OUT/'01_INSTALADOR/AVISOS_DISTRIBUCION.txt')
    (OUT/'07_ACCESO_EVALUADORES/ACCESO_EVALUADORES.txt').write_text('SGD DIÓCESIS DE TIBÚ — ACCESO PARA EVALUADORES\n\nUsuario: admin@iglesia.org\nContraseña: admin123\nContexto: Acceso diocesano / administración\nRol: administrador\n\nCuenta original conservada y comprobada en la aplicación instalada.\nLa contraseña de PostgreSQL es independiente y se ingresa en el asistente local.\nNo se necesita crear otra cuenta ni cambiar esta contraseña para ingresar a la evaluación.\n',encoding='utf8')
    shutil.copytree(EVIDENCE/'capturas',OUT/'03_MANUAL_USUARIO/capturas',dirs_exist_ok=True)
    for path in EVIDENCE.glob('*.json'):shutil.copy2(path,OUT/'08_PRUEBAS'/path.name)
    shutil.copy2(PRIVATE/'origen-copia.json',OUT/'08_PRUEBAS/origen-copia.json')
    print('Generando manuales de la entrega real…',flush=True)
    user_manual(captures,manifest);technical_manual(schema,openapi,manifest);report_and_first_read(manifest)
    for folder,stem,short in [('03_MANUAL_USUARIO','Manual_Usuario_SGD_Tibu','Manual_Usuario'),('04_MANUAL_TECNICO','Manual_Tecnico_Instalacion_SGD_Tibu','Manual_Tecnico')]:
        for ext in ['pdf','docx']:shutil.copy2(OUT/folder/(stem+'.'+ext),OUT/folder/(short+'.'+ext))
    files=[]
    for path in sorted(OUT.rglob('*')):
        if path.is_file() and path!=OUT/'MANIFIESTO_SHA256.json':files.append(dict(archivo=path.relative_to(OUT).as_posix(),bytes=path.stat().st_size,sha256=digest(path)))
    (OUT/'MANIFIESTO_SHA256.json').write_text(json.dumps(files,ensure_ascii=False,indent=2),encoding='utf8')
    names=[path.name for path in OUT.rglob('*') if path.is_file()]
    assert not any(name in names for name in ['sgd_tibu_demo.dump','demo_accounts.json','.env','config.dat','lab.dat','respaldo_origen_privado.dump'])
    archive=ROOT/'SGD_TIBU_ENTREGA_EVALUADORES.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as target:
        for path in sorted(OUT.rglob('*')):
            if path.is_file():target.write(path,path.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(archive) as target:
        assert target.testzip() is None
        assert all(hashlib.sha256(target.read(OUT.name+'/'+row['archivo'])).hexdigest()==row['sha256'] for row in files)
    checksum=digest(archive)
    Path(str(archive)+'.sha256').write_text(checksum+'  '+archive.name+'\n',encoding='ascii')
    # The old advertised filename now also points to the corrected real delivery.
    compatible=ROOT/'SGD_TIBU_PROGRAMA_LISTO_PARA_USAR.zip';shutil.copy2(archive,compatible)
    Path(str(compatible)+'.sha256').write_text(checksum+'  '+compatible.name+'\n',encoding='ascii')
    print(json.dumps(dict(zip=archive.name,bytes=archive.stat().st_size,sha256=checksum,archivos=len(files),base_real='parroquia',cuenta='admin@iglesia.org'),ensure_ascii=False),flush=True)


if __name__=='__main__':main()
