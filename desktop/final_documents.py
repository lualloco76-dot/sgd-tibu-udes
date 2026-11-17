"""University deliverables generated from the final schema, UI and test results."""
import ast
import csv
import importlib.metadata as md
import json
import os
from pathlib import Path
import re
import shutil
import sys
import xml.etree.ElementTree as ET
import zipfile
from html import escape

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT), str(ROOT / 'backend')]
os.environ.update(SGD_RELEASE_VERSION='3.0.0', SGD_DESKTOP='1', DATABASE_URL='sqlite://', SECRET_KEY='docs-' + 'x' * 48)
from desktop.final_release import WORK, OUT, dump_json, digest
from desktop.manual_render import Manual, field_help
from desktop.manual_labels_real import BUTTON_HELP
from docx.shared import Pt, Cm
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from reportlab.platypus import Paragraph, SimpleDocTemplate, Table, TableStyle, Spacer
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle

EVIDENCE = WORK / 'evidence'
MODULES = json.loads((ROOT / 'desktop/manual_modules_real.json').read_text(encoding='utf8'))
FOLDERS = ['01_PROGRAMA', '02_INSTALADOR', '03_BASE_DATOS', '04_MANUAL_USUARIO', '05_MANUAL_TECNICO',
           '06_CODIGO_FUENTE', '07_DIAGRAMAS', '08_PRUEBAS', '09_GUIA_PROFESORA',
           '10_LIBRERIAS_Y_DEPENDENCIAS', '11_RESPALDOS_Y_RECUPERACION']


class UniversityManual(Manual):
    def __init__(self, title, subtitle):
        self.figures = 0; self.tables = 0
        super().__init__(title, subtitle)
        self.p('Universidad de Santander — UDES\nTrabajo de grado de Ingeniería de Sistemas\nDiócesis de Tibú')
        self.p('Distribución académica local. Copia independiente y anonimizada de la base actual. Credenciales públicas de evaluación; no es una instalación productiva.')
        self.page()

    def h(self, value, level=1):
        super().h(value, level)
        self.items[-1]._toc_level = min(level - 1, 2)

    def toc(self):
        self.h('Tabla de contenido')
        field = OxmlElement('w:fldSimple')
        field.set(qn('w:instr'), 'TOC \\o "1-2" \\h \\z \\u')
        paragraph = self.doc.add_paragraph(); paragraph._p.append(field)
        paragraph.add_run(' En Microsoft Word: actualizar toda la tabla para mostrar los números de página del DOCX.')
        update = OxmlElement('w:updateFields'); update.set(qn('w:val'), 'true'); self.doc.settings.element.append(update)
        toc = TableOfContents()
        toc.levelStyles = [ParagraphStyle('toc0', fontName='TNR', fontSize=12, leading=15, spaceBefore=5),
                           ParagraphStyle('toc1', fontName='TNR', fontSize=12, leading=14, leftIndent=14)]
        self.items.append(toc)
        self.page()

    def table(self, headers, rows, widths=None):
        if not rows: return
        self.tables += 1; self.p('Tabla ' + str(self.tables) + '. ' + ' / '.join(headers), small=True)
        super().table(headers, rows, widths)
        for row in self.doc.tables[-1].rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs: run.font.name = 'Times New Roman'; run.font.size = Pt(10)
        table = self.items[-2]
        for row in table._cellvalues:
            for paragraph in row:
                if isinstance(paragraph, Paragraph):
                    paragraph.style = self.small
                    for fragment in paragraph.frags:
                        fragment.fontSize = 10

    def image(self, path, caption):
        self.figures += 1
        self.p('Véase la figura ' + str(self.figures) + ' para ubicar los controles descritos.')
        super().image(path, 'Figura ' + str(self.figures) + '. ' + caption + ' Fuente: ejecución local del sistema final, 9 de noviembre de 2026.')

    def save(self, folder, stem):
        folder = Path(folder); folder.mkdir(parents=True, exist_ok=True)
        self.doc.save(folder / (stem + '.docx'))
        class IndexedPDF(SimpleDocTemplate):
            def afterFlowable(document, flowable):
                level = getattr(flowable, '_toc_level', None)
                if level is not None and level < 2:
                    key = 'h' + str(document.seq.nextf('heading'))
                    document.canv.bookmarkPage(key)
                    document.notify('TOCEntry', (level, flowable.getPlainText(), document.page, key))
        def footer(canvas, document):
            canvas.setFont('TNR', 10)
            canvas.drawRightString(A4[0] - 56.7, 30, 'SGD Tibú UDES · Página ' + str(document.page))
        pdf = IndexedPDF(str(folder / (stem + '.pdf')), pagesize=A4, rightMargin=Cm(2).pt,
                         leftMargin=Cm(2).pt, topMargin=Cm(2).pt, bottomMargin=Cm(2).pt,
                         title=self.title, author='Proyecto SGD Diócesis de Tibú')
        pdf.multiBuild(self.items, onFirstPage=footer, onLaterPages=footer)


def module_example(key):
    examples = {
        'login': 'Seleccione Acceso diocesano / administración; admin@iglesia.org, admin123.',
        'panel': 'Antes de ejercicios: 13 parroquias, cuatro tipos y cero partidas. El panel refleja los datos realmente registrados.',
        'registros': 'Buscar Persona Ficticia UDES, libro UDES-EJ-01, folio 1, partida B-UDES-01, después del ejercicio 1.',
        'bautismos': 'Persona Ficticia UDES, parroquia seleccionada del catálogo, libro UDES-EJ-01 de Bautismo, 02/01/2020, folio 1, B-UDES-01.',
        'confirmaciones': 'Misma persona ficticia; libro UDES-EJ-01 de Confirmación, folio 1, C-UDES-01; padrino ficticio y referencia textual de bautismo.',
        'matrimonios': 'Dos personas ficticias de la misma custodia, libro UDES-EJ-01 de Matrimonio, folio 1, M-UDES-01; seleccionar otra persona contrayente.',
        'defunciones': 'Persona ficticia, libro UDES-EJ-01 de Defunción, exequias 02/01/2020, defunción 01/01/2020, folio 1, D-UDES-01.',
        'personas': 'Nombres Persona Ficticia; apellidos UDES Ejercicio; identificación FICTICIO-UDES-01; correo opcional ficticio@example.org.',
        'libros': 'Parroquia del ejercicio, tipo Bautismo y número UDES-EJ-01. Crear un libro por tipo si se evalúan cuatro sacramentos.',
        'solicitudes': 'Desde una segunda parroquia ficticia de trabajo, solicitar la referencia del bautismo B-UDES-01 con motivo Evaluación ficticia UDES.',
        'certificados': 'Preparar para el ID de la partida B-UDES-01. Es un ejercicio local; nunca presentarlo como certificado institucional real.',
        'aprobaciones': 'Párroco de la custodia autoriza; canciller aprueba y firma si requiere Curia. Administrador recibe restricción.',
        'documentos': 'Adjuntar un PDF de una página con texto SOPORTE FICTICIO UDES al ID de la partida del ejercicio.',
        'parroquias': 'Consultar por código una de las 13 parroquias. Para ejercicios de edición crear una comunidad denominada Parroquia Ficticia UDES, código UDES-EJ.',
        'usuarios': 'Crear Cuenta Ficticia UDES, parroco.ude@example.org, contraseña de ejercicio de al menos ocho caracteres, rol párroco y custodia del ejercicio.',
        'roles': 'Consultar capacidades de auditor; comprobar que no tiene edición de partidas ni firma. No modificar permisos sin registrar el cambio.',
        'auditoria': 'Buscar el evento CREAR de la partida del ejercicio y su fecha, usuario y custodia.',
        'respaldos': 'Crear un respaldo tras B-UDES-01; esperar completado, verificar y descargar el ZIP. El respaldo del origen sin archivo está señalado como no disponible.',
        'reportes': 'Tras crear una partida, actualizar el informe y contrastar el incremento con la consulta de registros.',
        'sacramentos': 'Consultar Bautismo, Confirmación, Matrimonio y Defunción. No existe acción de alta desde esta pantalla.',
        'configuracion': 'Consultar la sesión actual. Cambiar la contraseña solo si se desea dejar de usar admin123; luego volver a iniciar sesión.',
        'verificacion': 'Abrir el código del certificado ficticio firmado en el mismo computador; tras anular, el resultado pasa a no válido.',
    }
    return examples[key]


def user_manual(manifest, captures):
    m = UniversityManual('MANUAL DE USUARIO FINAL — SGD TIBÚ UDES', 'Sistema completo de gestión documental · Edición 3.0.0')
    m.toc()
    m.h('Capítulo 1. Información general')
    m.p('El sistema conserva y consulta información sacramental bajo custodia parroquial, tramita solicitudes entre parroquias, prepara certificados y conserva auditoría. Este manual se dirige al jurado UDES y a usuarios autorizados. Corresponde a las rutas React y al API realmente incluidos, sin rediseñar ni reducir el software.')
    m.p('La base de evaluación procede del origen parroquia, PostgreSQL 18.3. Incluye 13 parroquias, una cuenta administradora, cuatro tipos, 53 eventos de auditoría anonimizados, configuración y una referencia de respaldo histórico sin su archivo. No había personas, libros, partidas, solicitudes, certificados ni documentos en el origen. No se presentan datos inexistentes como resultados precargados.')
    m.p('Versiones: distribución Windows 3.0.0; API declarada 2.0.0; paquete frontend 1.0.0. Commit base 877cd91e1c890b4ff8204c5feb4dc14c53292ef8 con cambios locales, identificados por el inventario SHA-256 de fuentes.')
    m.h('Capítulo 2. Instalación para evaluadores')
    m.p('Destino: Windows 10/11 x64, perfil con permiso de escritura y navegador actualizado. Se necesita espacio para la extracción, el programa, la base y al menos dos respaldos. El tamaño exacto del ZIP consta en su archivo de comprobación. La ejecución local se verificó en este equipo; faltan pruebas en Windows 10 y 11 limpios. No se publica un mínimo de RAM obtenido de una prueba que no se realizó.')
    m.steps(['Guarde el ZIP y use Extraer todo en el Explorador. Mantenga juntas las carpetas; no ejecute desde dentro del ZIP.',
             'Opción portátil: abra 01_PROGRAMA/SGD_Tibu.exe. Opción instalada: abra 02_INSTALADOR/SGD_Tibu_Setup.exe y conserve Crear acceso directo.',
             'Espere mientras la ventana prepara PostgreSQL incluido en su perfil, restaura la copia y comprueba Alembic 0006. No pide instalar Python, Node ni PostgreSQL.',
             'Cuando indique Sistema disponible, se abrirá el navegador. Si no se abre, pulse Abrir sistema.',
             'Confirme el acceso, el directorio de 13 parroquias y el catálogo de cuatro tipos. Las listas inicialmente vacías reflejan el origen.',
             'Use Cerrar SGD en la ventana nativa al terminar. Cerrar una pestaña del navegador no detiene los servicios.'])
    m.p('Los datos persisten en %LOCALAPPDATA%\\SGD Tibu UDES\\datos, fuera de los binarios. La versión portátil se refiere a los archivos del programa: los datos y la protección DPAPI pertenecen al usuario Windows y no viajan automáticamente en el pendrive. Para otro usuario o computador use un respaldo y el procedimiento técnico de recuperación.')
    m.h('Capítulo 3. Inicio de sesión')
    m.table(['Campo', 'Valor / acción'], [('Tipo de acceso', 'Acceso diocesano / administración'), ('Usuario', 'admin@iglesia.org'), ('Contraseña', 'admin123'), ('Iniciar sesión', 'Valida identidad y abre el panel'), ('Cerrar sesión', 'Revoca la sesión actual')], [1, 2.5])
    m.p('Credenciales exclusivas de evaluación académica local autorizada. No publique la aplicación en red y no utilice esta contraseña en producción. Cinco fallos pueden bloquear la cuenta 15 minutos. Elegir una parroquia para una cuenta diocesana causa error de contexto. Para cuentas parroquiales debe seleccionar su parroquia activa.')
    m.image(EVIDENCE / 'capturas/login.png', 'Acceso real de la versión final. El selector debe estar en acceso diocesano para la cuenta de evaluación.')
    m.h('Capítulo 4. Interfaz principal')
    m.p('El menú lateral abre los módulos; la barra superior muestra contexto, búsqueda y controles de apariencia. El panel presenta cifras calculadas por el servidor. Los listados ofrecen actualización, paginación y exportación de la página cuando está implementada. Un botón deshabilitado o ausente puede depender del rol, estado, custodia o de una lista vacía. Guardar informa confirmación o muestra un mensaje de validación.')
    m.image(EVIDENCE / 'capturas/panel.png', 'Panel después de autenticar la copia distribuida, antes de crear registros sintéticos de prueba.')
    m.h('Capítulo 5. Roles, funciones y restricciones')
    from app.models.usuario import RolUsuario
    from app.services.permisos import PERMISOS, predeterminados
    descriptions = {
        'administrador': 'Administra cuentas, directorio, configuración, respaldos y permisos. Registra y prepara documentos. No autoriza ni firma certificados ni aprueba Curia.',
        'parroco': 'Custodia su parroquia, registra partidas y gestiona secretaría/consulta de su ámbito. Autoriza y firma certificados ordinarios de su custodia.',
        'secretario_parroquial': 'Registra, consulta y corrige en su custodia; prepara certificados. No autoriza ni firma.',
        'secretario_general': 'Coordina documentación y solicitudes a nivel diocesano y prepara certificados. No obtiene facultad de firma o aprobación de Curia.',
        'canciller': 'Revisa y aprueba trámites de Curia después de autorización parroquial; firma ese circuito. Consulta a nivel diocesano.',
        'auditor': 'Consulta auditoría y reportes globales. No escribe partidas ni obtiene acceso nominativo irrestricto ni firma.',
        'consulta': 'Lee dentro de la custodia de su parroquia. No modifica ni prepara o firma certificados.'}
    for role in RolUsuario:
        m.h(role.value, 2); m.p(descriptions[role.value])
        defaults = predeterminados(role.value)
        m.table(['Capacidad', 'Valor inicial'], [(label, 'Habilitada' if defaults[key] else 'Deshabilitada') for key, label, _ in PERMISOS], [2, 1])
    m.p('La base entregada incluye solo el administrador existente. Para evaluar otros cargos se crean cuentas ficticias desde Usuarios en la copia local. Los permisos editables no eliminan controles de custodia ni conceden facultades eclesiásticas a un cargo ajeno.')
    m.h('Capítulo 6. Módulos del software')
    m.table(['Módulo', 'Ruta real'], [(x['title'], x['route']) for x in MODULES], [1.4, 1])
    for number, module in enumerate(MODULES, 1):
        m.page(); m.h('6.' + str(number) + '. ' + module['title'], 2)
        m.p('Objetivo: ' + module['purpose']); m.p('Rol autorizado: ' + module['roles'] + '. Acceso: ' + module['route'])
        shots = [s for s in captures if s['name'] in {module['key'], module['key'] + '_formulario'}]
        for shot in shots:
            m.image(EVIDENCE / shot['file'], module['title'] + (' — formulario disponible' if shot['name'].endswith('_formulario') else ' — pantalla vigente'))
        if not shots:
            m.p('La pantalla o actuación depende de un cargo y un documento en el estado requerido. No se fabrica una captura con documentos inexistentes. Consulte el flujo y la evidencia de pruebas de actuaciones con datos ficticios.')
        m.h('Acceso, registro y consulta', 3); m.steps(module['steps'])
        fields = {}; buttons = []
        for shot in shots:
            for field in shot['fields']: fields[(field['name'], field['label'])] = field
            buttons.extend(shot['buttons'])
        m.h('Campos y filtros', 3)
        if fields: m.table(['Campo', 'Explicación'], [(f['label'] or f['name'], field_help(f)) for f in fields.values()], [1, 2.7])
        else: m.p('Los identificadores, fechas y estados se obtienen de los recursos consultados. No hay campos de alta habilitados en esta vista para la cuenta inicial.')
        if module['key'] in {'registros', 'bautismos', 'confirmaciones', 'matrimonios', 'defunciones'}:
            m.p('Filtros: nombre, libro, folio, partida y fechas Desde/Hasta. Buscar consulta al API; Limpiar filtros restablece la vista. Los resultados conservan el alcance de custodia.')
        m.h('Botones y confirmaciones', 3)
        rows = [(b, BUTTON_HELP.get(b, 'Ejecuta la acción indicada en su fila o formulario; la habilitación depende del permiso y estado.')) for b in dict.fromkeys(buttons) if b]
        if rows: m.table(['Control', 'Acción'], rows, [1, 2.7])
        else: m.p('Las actuaciones solo aparecen con el recurso, el rol y el estado adecuados. No se concede permiso al cambiar manualmente la URL.')
        m.p('Registro y modificación: siga los pasos anteriores. La confirmación de guardado aparece al recibir éxito del servidor; si hay error, el formulario conserva el contexto para corregirlo. Las correcciones de partidas requieren motivo y conservan historial. No existe borrado físico general de partidas; usuarios/parroquias se desactivan cuando el módulo lo permite. Certificados se anulan mediante actuación autorizada.')
        for heading, key in [('Validaciones', 'validations'), ('Errores posibles', 'errors'), ('Resultado esperado', 'result'), ('Relaciones', 'relations')]:
            m.p(heading + ': ' + module[key])
        m.p('Ejemplo ficticio: ' + module_example(module['key']))
    m.h('Capítulo 7. Procedimientos completos')
    procedures = [
        ('Registrar, consultar y corregir una partida', ['Inicie sesión y cree Parroquia Ficticia UDES desde el directorio para no modificar fichas institucionales.', 'Cree Persona Ficticia UDES en Personas, asignada a esa custodia.', 'Cree libro UDES-EJ-01 en Libros sacramentales con tipo Bautismo.', 'Abra Bautismos, pulse Registrar partida, elija primero custodia y después persona y libro.', 'Ingrese 02/01/2020, folio 1 y B-UDES-01. Guarde y revise Ver.', 'Busque por nombre o referencia y use Historial para comprobar el alta.', 'Use Corregir / nota con motivo Prueba ficticia UDES. Verifique el cambio y la conservación del anterior.']),
        ('Crear y atender una solicitud interparroquial', ['Prepare dos parroquias de ejercicio y una partida ficticia en la custodia de destino.', 'Cree cuentas ficticias de secretaría en origen y párroco o secretaría en destino, mediante Usuarios.', 'En la sesión de origen abra Solicitudes, busque por parroquia, libro, folio y número.', 'Seleccione referencia y motive Evaluación ficticia UDES; envíe la solicitud.', 'Entre con la cuenta custodiante del destino, revise y apruebe o rechace con motivo.', 'Regrese al origen y consulte el estado. Una decisión definitiva no se repite.']),
        ('Preparar, autorizar, aprobar Curia, firmar y anular', ['Con una partida completa, abra Certificados y prepare para su ID, vinculando solicitud aprobada si corresponde.', 'Para el circuito de Curia marque la competencia y escriba motivo antes de preparar.', 'Cierre sesión y entre como párroco de la custodia; use Autorizar.', 'En el circuito ordinario el párroco usa Firmar; en el circuito Curia entre como canciller y use Aprobar en Curia y después Firmar.', 'Descargue el PDF y revise número, referencia, instantánea y QR en el mismo equipo.', 'Con el cargo autorizado use Anular y escriba el motivo. Verifique que el QR pase a no válido. El historial permanece.']),
        ('Administrar usuarios y consultar auditoría', ['Administrador: entre a Usuarios, pulse Agregar y use solo correo ficticio example.org para el ejercicio.', 'Seleccione cargo y custodia; deje sin parroquia las funciones diocesanas.', 'Guarde y compruebe inicio de sesión de la cuenta en su contexto.', 'Edite o desactive una cuenta de ejercicio si corresponde; no desactive su propia cuenta.', 'Abra Auditoría y compruebe fecha, acción, usuario y custodia. El auditor no modifica estos eventos.'])]
    for title, steps in procedures: m.h(title, 2); m.steps(steps)
    m.h('Capítulo 8. Ejercicios para el jurado')
    m.table(['Caso', 'Datos y actuación', 'Resultado esperado'], [
        ('E1. Consulta inicial', 'Entrar con la cuenta entregada y abrir Parroquias/Sacramentos', '13 parroquias y cuatro tipos; partidas inicialmente vacías'),
        ('E2. Primera partida', 'Seguir el procedimiento con Parroquia Ficticia UDES y B-UDES-01', 'Alta visible en Bautismos y consulta general'),
        ('E3. Validación', 'Intentar fecha futura o repetir la misma referencia', 'Rechazo sin duplicar la partida'),
        ('E4. Corrección', 'Cambiar nota con motivo ficticio', 'Historial anterior/posterior disponible'),
        ('E5. Roles', 'Crear cuentas ficticias de párroco, canciller y consulta', 'Consulta sin escritura; administrador sin firma'),
        ('E6. Certificado', 'Preparar y seguir circuito ordinario o Curia con esas cuentas', 'PDF solo después de firma; anulación invalida código'),
        ('E7. Persistencia', 'Cerrar SGD, abrir de nuevo y buscar B-UDES-01', 'Registro conservado'),
        ('E8. Respaldo', 'Crear, verificar y descargar copia desde Respaldos', 'ZIP real, estado completado y verificación positiva')], [1, 1.9, 1.8])
    m.p('Los datos de estos ejercicios no vienen precargados. Las pruebas automatizadas crearon registros ficticios en un perfil de laboratorio distinto; no se mezclan con el dump entregado. No cambie ni elimine las 13 fichas institucionales para realizar ejercicios.')
    m.h('Capítulo 9. Soporte y errores frecuentes')
    troubleshooting(m)
    m.h('Capítulo 10. Glosario')
    m.table(['Término', 'Significado'], [('Custodia', 'Parroquia responsable y límite de acceso a sus documentos'), ('Partida', 'Asiento sacramental con referencia de libro, folio y número'), ('Curia', 'Instancia diocesana competente para determinados trámites'), ('Instantánea', 'Contenido fijado al preparar un certificado'), ('Firma', 'Actuación autenticada en este software; no firma digital certificada externa'), ('Dump', 'Respaldo PostgreSQL restaurable'), ('DPAPI', 'Protección de secretos vinculada al usuario Windows'), ('QR', 'Enlace para verificar el estado documental en el servidor local')], [1, 2.7])
    m.h('Capítulo 11. Anexos y referencias técnicas')
    m.p('Véanse inventario_modulos.csv, inventario_registros.csv, reporte_restauracion, manual técnico, OpenAPI, matriz de pruebas y manifiestos SHA-256. Las capturas de este manual fueron tomadas en Chrome contra el ejecutable final instalado. Las pantallas antiguas desconectadas no se presentan como módulos activos.')
    m.save(OUT / '04_MANUAL_USUARIO', 'MANUAL_USUARIO_FINAL_SGD_TIBU_UDES')


def troubleshooting(m):
    m.table(['Situación', 'Acción'], [
        ('No abre o falta un archivo', 'Extraiga todo el ZIP en una ruta corta y vuelva a abrir. Consulte Ver registros. No elimine la carpeta de datos.'),
        ('Primer inicio tarda', 'Espere a que initdb, restauración y comprobaciones terminen. No cierre la ventana durante la preparación.'),
        ('Puerto ocupado', 'El programa selecciona otro puerto libre. No necesita detener otra instalación PostgreSQL.'),
        ('DPAPI no puede leer', 'Use el mismo usuario Windows. En otro perfil recupere desde dump; no copie config.dat como configuración transferible.'),
        ('Fecha futura o referencia repetida', 'Corrija la fecha o consulte el registro existente. Un conflicto no autoriza a eliminarlo.'),
        ('Credenciales o contexto incorrectos', 'Seleccione acceso diocesano para admin@iglesia.org; respete mayúsculas de contraseña. Tras bloqueo espere 15 minutos.'),
        ('Sin permiso o no aparece Firmar', 'Compruebe rol, custodia y estado. Administrador no firma. Curia requiere autorización parroquial previa.'),
        ('Listas vacías', 'El origen no contenía partidas. Use los ejercicios ficticios en esta copia de evaluación.'),
        ('QR no abre desde teléfono', 'El servidor es local al computador. Verifique en el mismo navegador del equipo.'),
        ('Error de respaldo', 'Compruebe espacio y Ver registros. El pg_dump necesario está incluido. Una referencia histórica sin archivo no equivale a copia recuperable.'),
        ('Cerrar navegador deja procesos', 'Use Cerrar SGD en la ventana nativa. Espere a que se cierre antes de actualizar o apagar.'),
        ('Soporte', 'Conserve registros/sgd.log y postgresql.log; comunique el mensaje y paso al responsable del proyecto. No envíe config.dat ni secretos.')], [1.2, 2.8])


PURPOSES = {'fastapi':'API REST e inyección de dependencias', 'uvicorn':'Servidor ASGI local', 'sqlalchemy':'ORM, consultas y transacciones',
 'psycopg2-binary':'Controlador PostgreSQL', 'alembic':'Migraciones del esquema', 'python-dotenv':'Configuración de desarrollo; deshabilitada en escritorio',
 'pyjwt':'Tokens JWT', 'bcrypt':'Hashes de contraseñas', 'python-multipart':'Subida de PDF', 'email-validator':'Validación de correo',
 'reportlab':'PDF y QR del certificado', 'pypdf':'Validación de estructura y seguridad PDF', 'tzdata':'Zona America/Bogota en Windows',
 'pillow':'Figuras y capturas de documentación', 'react':'Componentes y estado UI', 'react-dom':'Renderizado de React', 'axios':'Cliente HTTP',
 'react-router-dom':'Navegación SPA', 'html2canvas':'Declarada para captura HTML; no importada por las pantallas conectadas',
 'jspdf':'Declarada para PDF frontend; los certificados vigentes los genera el backend', 'qrcode.react':'Declarada para QR frontend; el PDF/QR vigente se genera en backend',
 'vite':'Compilación frontend', '@vitejs/plugin-react':'Integración React en Vite', 'vitest':'Pruebas frontend', 'jsdom':'DOM para pruebas',
 'python-docx':'Generación DOCX', 'openpyxl':'Diccionario e inventarios XLSX', 'pytest':'Pruebas backend', 'httpx':'Cliente de aceptación HTTP'}


def dependencies():
    from openpyxl import Workbook
    from openpyxl.styles import Font
    from packaging.utils import canonicalize_name
    folder = OUT / '10_LIBRERIAS_Y_DEPENDENCIAS'
    rows = []
    direct = {canonicalize_name(x.split('==')[0]) for x in (ROOT / 'backend/requirements.txt').read_text().splitlines() if x and not x.startswith('#')}
    runtime = (ROOT / 'desktop/requirements-runtime.lock').read_text().splitlines()
    build = [x for x in (ROOT / 'desktop/requirements-build.txt').read_text().splitlines() if x and not x.startswith('-')]
    for line in dict.fromkeys(runtime + build):
        name = canonicalize_name(line.split('==')[0]); distribution = md.distribution(name)
        rows.append(dict(Libreria=name, Version=distribution.version, Tecnologia='Backend/runtime' if line in runtime else 'Herramienta documentación/pruebas',
                         Funcion=PURPOSES.get(name, distribution.metadata.get('Summary', 'Dependencia transitiva; véase Requires-Dist')),
                         Archivo='backend/requirements.txt + desktop/requirements-runtime.lock' if name in direct else ('desktop/requirements-runtime.lock' if line in runtime else 'desktop/requirements-build.txt'),
                         Instalacion='python -m pip install -r desktop/requirements-build.txt (entorno existente utilizado; no reinstalado en esta sesión)',
                         Dependencias='; '.join(distribution.requires or []) or 'Sin Requires-Dist declarado',
                         Compatibilidad=distribution.metadata.get('Requires-Python', 'No declarada; runtime comprobado Python 3.12.10 x64'),
                         Errores_frecuentes='Si falta módulo/DLL: reconstruir con el lock y verificar Python 3.12 x64; no instalar en el equipo del evaluador.',
                         Uso='Directa backend' if name in direct else ('Transitiva/runtime' if line in runtime else 'Solo construcción'),
                         Licencia=distribution.metadata.get('License-Expression') or distribution.metadata.get('License') or 'Véanse avisos del paquete'))
    lock = json.loads((ROOT / 'frontend/package-lock.json').read_text())
    package = json.loads((ROOT / 'frontend/package.json').read_text())
    for path, info in lock['packages'].items():
        if not path: continue
        name = path.split('node_modules/')[-1]
        metadata_path = ROOT / 'frontend' / path / 'package.json'
        metadata = json.loads(metadata_path.read_text(encoding='utf8')) if metadata_path.is_file() else {}
        rows.append(dict(Libreria=name, Version=info.get('version', ''), Tecnologia='Frontend/desarrollo' if info.get('dev') else 'Frontend',
                         Funcion=PURPOSES.get(name, metadata.get('description', 'Dependencia transitiva u opcional del árbol npm bloqueado')),
                         Archivo='frontend/package-lock.json: ' + path,
                         Instalacion='npm ci (no reinstalado en esta sesión); npm test y npm run build ejecutados',
                         Dependencias=json.dumps(info.get('dependencies', {}), ensure_ascii=False),
                         Compatibilidad=json.dumps(info.get('engines', package['engines']), ensure_ascii=False) + ('; plataforma: ' + str(info.get('os', 'general'))),
                         Errores_frecuentes='EBADENGINE: use Node compatible. Binario opcional: respete os/cpu del lock y reinstale desde lock. El evaluador no necesita npm.',
                         Uso='Directa' if name in package['dependencies'] else ('Desarrollo directa' if name in package['devDependencies'] else 'Transitiva/opcional'),
                         Licencia=str(info.get('license', 'Consultar distribución del paquete'))))
    headers = list(rows[0])
    with (folder / 'inventario_dependencias.csv').open('w', newline='', encoding='utf-8-sig') as file:
        writer = csv.DictWriter(file, fieldnames=headers); writer.writeheader(); writer.writerows(rows)
    dump_json(folder / 'inventario_dependencias.json', rows)
    wb = Workbook(); ws = wb.active; ws.title = 'Dependencias'; ws.append(headers)
    for row in rows: ws.append([str(row[k]) for k in headers])
    ws.freeze_panes='A2'; ws.auto_filter.ref=ws.dimensions
    for cell in ws[1]: cell.font = Font(name='Times New Roman', size=10, bold=True)
    for column in ws.columns: ws.column_dimensions[column[0].column_letter].width=32
    wb.save(folder / 'inventario_dependencias.xlsx')
    for source in ['backend/requirements.txt', 'backend/requirements-dev.txt', 'desktop/requirements-runtime.lock', 'desktop/requirements-build.txt', 'frontend/package.json', 'frontend/package-lock.json']:
        target = folder / source; target.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(ROOT / source, target)
    # Exact installed license texts, not just license names.
    notices = ['Avisos de los componentes usados. PostgreSQL: avisos en 01_PROGRAMA/postgresql. Python: runtime/LICENSE.txt. Tcl/Tk: runtime/tcl.']
    for line in runtime:
        dist = md.distribution(line.split('==')[0])
        for entry in dist.files or []:
            path = Path(dist.locate_file(entry))
            if path.is_file() and any(word in path.name.lower() for word in ['license', 'notice', 'copying']):
                try: notices.append('\n=== ' + line + ' / ' + path.name + ' ===\n' + path.read_text(encoding='utf8'))
                except UnicodeError: pass
    for path, info in lock['packages'].items():
        if not path: continue
        directory = ROOT / 'frontend' / path
        if not directory.is_dir(): continue
        for source in directory.iterdir():
            if source.is_file() and source.name.lower().startswith(('license', 'notice', 'copying')):
                try: notices.append('\n=== ' + path + ' ' + info.get('version','') + ' ===\n' + source.read_text(encoding='utf8'))
                except UnicodeError: pass
    (folder / 'LICENCIAS_TERCEROS.txt').write_text('\n'.join(notices), encoding='utf8')
    return rows


def technical_manual(manifest, schema, openapi, libraries):
    m = UniversityManual('MANUAL TÉCNICO FINAL — SGD TIBÚ UDES', 'Arquitectura, PostgreSQL, compilación y mantenimiento del software real')
    m.toc()
    m.h('1. Identificación y arquitectura')
    m.p('Distribución 3.0.0 sobre commit base 877cd91e1c890b4ff8204c5feb4dc14c53292ef8 y modificaciones locales. Las fuentes entregadas, sus hashes y el OpenAPI identifican la implementación efectiva. No se creó un sistema alternativo. El lanzador C# inicia Python 3.12.10 embebido, Tkinter administra el ciclo de vida, Uvicorn ejecuta FastAPI y sirve React compilado en el mismo origen; SQLAlchemy/psycopg2 conectan a PostgreSQL privado 18.3.')
    m.image(OUT / '07_DIAGRAMAS/arquitectura.png', 'Componentes del sistema y directorio persistente, separados de los binarios reemplazables.')
    m.p('El servidor HTTP escucha 127.0.0.1; prueba 8765 y reserva otro puerto si está ocupado. PostgreSQL usa un puerto libre distinto y autentica con SCRAM. Cada nuevo arranque del clúster puede seleccionar otro puerto y actualiza la URL protegida. No registra servicios Windows ni cambia el PostgreSQL instalado en el equipo.')
    m.h('2. Estructura del código')
    m.table(['Carpeta', 'Responsabilidad'], [('backend/app/api', 'Diez routers y operaciones REST'), ('backend/app/models', 'Modelos SQLAlchemy y relaciones'), ('backend/app/schemas', 'Validación Pydantic de entradas y salidas'), ('backend/app/services', 'Custodia, permisos, certificados, panel y respaldos'), ('backend/app/core', 'JWT, bcrypt, autorización, archivos y fechas'), ('backend/migrations', 'Seis revisiones Alembic 0001–0006'), ('frontend/src', 'App, Dashboard, ConnectedPages, ConnectedRecords, contexto y componentes'), ('desktop', 'Arranque, PostgreSQL privado, DPAPI, compilación, aceptación y documentos'), ('database', 'Esquema de referencia y catálogo institucional')], [1, 2.8])
    m.p('Las rutas vigentes se obtienen de Dashboard.jsx y App.jsx. Hay componentes antiguos en las fuentes que no están conectados; su mera presencia no demuestra funcionalidad. Cementerio no tiene ruta activa. Preparación, autorización, Curia, firma y anulación son actuaciones del módulo de certificados, no cinco aplicaciones diferentes.')
    m.h('3. Modelos, esquema y migraciones')
    m.table(['Tabla', 'Columnas', 'Clave primaria', 'Filas entregadas'], [(name, len(info['columns']), ', '.join(info['pk']['constrained_columns']), manifest['counts'][name]) for name, info in schema.items()], [1.3,.5,1,.6])
    m.p('El diccionario XLSX incluye columnas, tipos, NULL, valores por defecto, PK, FK, índices, restricciones y permisos. esquema_fisico.json y secuencias.json reflejan la copia migrada a 0006. El origen permanece en 0005; la migración 0006 se aplicó exclusivamente al laboratorio. Las restricciones PostgreSQL de la restauración se comprobaron como validadas.')
    for path in sorted((ROOT / 'backend/migrations/versions').glob('*.py')):
        tree=ast.parse(path.read_text(encoding='utf8')); doc=ast.get_docstring(tree) or 'Revisión de esquema; consulte operaciones upgrade.'
        m.p(path.name + ': ' + doc.split('\n')[0])
    m.p('No se usa create_all para instalar el producto: se restaura el dump y Alembic aplica la cadena compatible. El descenso destructivo está bloqueado. No adopte esquemas desconocidos ni migre una base productiva sin respaldo restaurado.')
    m.h('4. API REST y validaciones')
    m.p('Base local /api, token Authorization: Bearer. /health ejecuta SELECT 1. /api/auth/parroquias expone un catálogo mínimo; verificación pública devuelve metadatos mínimos y validez. OpenAPI completo incluido en 06_CODIGO_FUENTE/openapi.json. /docs puede requerir recursos Swagger externos; el JSON está disponible sin Internet.')
    routes=[]
    for path, methods in openapi['paths'].items():
        for method, operation in methods.items():
            if method in {'get','post','patch','put','delete'}: routes.append((method.upper(),path,operation.get('summary','')))
    m.table(['Método','Ruta','Operación'], routes, [.5,1.6,1.7])
    m.p('Pydantic rechaza campos extra, fechas futuras, referencias vacías y longitudes excedidas. HTTP: 401 sesión inválida; 403 permiso/custodia; 409 unicidad o transición concurrente; 413 archivo demasiado grande; 422 validación; 429 bloqueo; 503 persistencia. El manejador de errores no devuelve contraseñas ni cuerpos de solicitudes. Las transacciones y restricciones respaldan la validación del API.')
    m.h('5. Seguridad, permisos, auditoría y documentos')
    m.p('bcrypt protege contraseñas; JWT incluye expiración, jti y versión de credenciales. Sesiones persistidas admiten revocación. Cinco fallos producen bloqueo temporal. Las dependencias comprueban capacidad, cargo y custodia. Cambiar una política no concede facultades eclesiásticas ajenas al cargo. Administrador no sustituye al párroco o canciller.')
    m.p('DPAPI protege config.dat (URL del rol limitado y clave JWT) y postgresql.dat (credenciales aleatorias del administrador del clúster privado). Ambos son locales al mismo usuario Windows. El directorio elimina herencia de permisos y concede acceso al usuario y SYSTEM. La contraseña de inicialización se escribe temporalmente dentro de ese directorio protegido y se borra al finalizar initdb; no se transmite como argumento de proceso.')
    m.p('Auditoría conserva acciones y ámbito. Correcciones guardan anterior y posterior en notas_marginales. El certificado usa una instantánea y estados preparado, autorizado, aprobado_curia, firmado y anulado. Solo firmado se descarga. La firma es una actuación autenticada del software, no una firma digital certificada externa. Los PDF de soporte se validan y sus hashes comprueban integridad.')
    m.h('6. PostgreSQL: operación automática y mantenimiento')
    postgres_chapter(m)
    m.h('7. Dependencias exhaustivas y entornos')
    m.p('Escenario A — evaluadores: todos los componentes de ejecución vienen incluidos; no se ejecuta npm ni pip. Escenario B — ingeniería: requiere Python 3.12 x64, Node compatible y herramientas de construcción. El inventario adjunto CSV/XLSX/JSON documenta todas las bibliotecas del lock, incluso transitivas, opcionales y de desarrollo, con versión, función, archivo, instalación, requisitos, compatibilidad, problemas y licencia.')
    m.p('Se verificaron Python 3.12.10, Node 24.19.0, build frontend, pruebas y copia de las distribuciones exactas desde el entorno aislado existente. En esta sesión no se reinstalaron paquetes mediante pip/npm ci: no se presenta esa reinstalación como prueba realizada. Las restricciones Node del proyecto son ^22.22.2 || ^24.15.0 || >=26.0.0.')
    m.table(['Biblioteca','Versión','Ámbito','Función'], [(r['Libreria'],r['Version'],r['Tecnologia'],r['Funcion']) for r in libraries], [1,.5,1,2])
    m.h('8. Compilación y configuración del ejecutable')
    m.steps(['En una carpeta de fuentes completa cree un entorno aislado Python 3.12: python -m venv .build-venv. Instale desktop/requirements-build.txt. Es el procedimiento de reconstrucción; la reinstalación limpia de estas dependencias no se ejecutó en esta sesión.',
             'Instale dependencias frontend mediante npm ci con Node compatible. El build y las pruebas sí fueron ejecutados sobre las dependencias presentes.',
             'Ejecute desktop/Prepare-Toolchain.ps1 para descargar Python embebido oficial e Inno Setup; se valida la firma del compilador. La compilación de esta entrega reutilizó esas herramientas ya disponibles.',
             'Copie 03_BASE_DATOS/SGD_Tibu_Evaluacion.dump a .test-artifacts/final-udes-20261109/payload/sgd_tibu_real.dump, y manifiesto_base_evaluacion.json como manifest.json. No exporte ni conecte a la base original para reconstruir una entrega ya aprobada.',
             'Prepare herramientas en .test-artifacts/distribution/toolchain según Prepare-Toolchain.ps1. Proporcione los binarios PostgreSQL 18.3 en C:/Program Files/PostgreSQL/18 o use SGD_POSTGRES_BINARIES.',
             'Ejecute python desktop/final_release.py build. Este comando se ejecutó con éxito aquí y deja el instalador en .test-artifacts/final-udes-20261109/build/inno-output.',
             'El script de aceptación requiere Windows con escritorio y herramientas QA. Use python desktop/verify_final.py en un perfil de laboratorio nuevo; nunca reutilice un perfil con datos institucionales. Las capturas usan Chrome/Playwright, que son herramientas de QA y no requisitos del evaluador.'])
    m.p('build.py copia los archivos exactos de las distribuciones instaladas del venv aislado, genera el lock runtime, añade Python embebido, Tcl/Tk, libpq y PostgreSQL bin/lib/share. Compila Launcher.cs con csc de .NET Framework y el instalador con Inno Setup. El manifiesto instalado registra cada SHA-256. No copia el clúster del desarrollador ni .env.')
    m.h('9. Fragmentos reales explicados')
    for source,start,stop,explanation in [
        ('desktop/local_postgres.py', 57, 84, 'LocalPostgres valida la propiedad del clúster, protege el perfil y crea credenciales aleatorias. Una carpeta desconocida o parcial no se borra ni se adopta automáticamente.'),
        ('desktop/provision.py', 36, 76, 'Se verifica el SHA-256 antes de restaurar. pg_restore usa una transacción, no usa --clean y toma contraseña del entorno del proceso, no de argumentos. La restauración se limita a una base sin tablas.'),
        ('backend/app/core/security.py', 18, 45, 'bcrypt valida y compara hashes; JWT incluye expiración. La sesión persistida y la versión de usuario permiten revocación.'),
        ('backend/app/api/certificados.py', 114, 143, 'Autorizar exige párroco custodiante y estado preparado; la aprobación de Curia requiere el estado y el cargo propios. La administración técnica no obtiene un bypass.')]:
        m.code(source,start,stop); m.p(explanation)
    m.h('10. Mantenimiento, actualización y recuperación')
    m.steps(['Desde Respaldos cree y verifique una copia; descargue el ZIP a almacenamiento protegido.', 'Cierre sesión y use Cerrar SGD, esperando que terminen API y PostgreSQL.', 'Actualice binarios con el mismo usuario Windows. Nunca incluya la carpeta datos en el instalador.', 'En una nueva versión mayor PostgreSQL, no reutilice físicamente el clúster: respalde y restaure en una instancia compatible nueva, con validación técnica.', 'Compruebe autenticación, conteos, relaciones, archivos y una operación autorizada. Conserve la copia previa hasta aceptar el cambio.'])
    m.p('Desinstalar retira binarios y accesos; conserva el perfil de datos. Se comprobó en laboratorio la persistencia tras reinstalación, desinstalación y arranque portátil. Cambiar de usuario Windows requiere restaurar un dump; DPAPI no permite transferir secretos directamente. Consulte 11_RESPALDOS_Y_RECUPERACION.')
    troubleshooting(m)
    m.h('11. Pruebas y límites de aceptación')
    m.p('Backend: 109 aprobadas, una omitida porque la prueba del enum PostgreSQL no aplica a SQLite. Frontend: 91 aprobadas. Consulte resultados XML/JSON y matriz de aceptación para las pruebas del EXE real. Eliminar Python/Node del PATH en este equipo no equivale a probar una instalación Windows limpia. Windows 10/11 limpios, reinicio completo del sistema y validación institucional de firma/sello siguen pendientes.')
    m.h('12. Referencias')
    m.p('PostgreSQL: https://www.postgresql.org/download/windows/ ; https://www.postgresql.org/docs/18/app-initdb.html ; https://www.postgresql.org/docs/18/app-pg-ctl.html ; https://www.postgresql.org/docs/18/app-pgrestore.html ; https://www.postgresql.org/about/licence/ . Python embebido: https://docs.python.org/3.12/using/windows.html#the-embeddable-package . Las fuentes técnicas principales son el código, el esquema inspeccionado y los locks adjuntos.')
    m.save(OUT / '05_MANUAL_TECNICO', 'MANUAL_TECNICO_FINAL_SGD_TIBU_UDES')


def postgres_chapter(m):
    m.p('Versión utilizada: PostgreSQL 18.3 x64, compilado para Windows. La elección A fue construida y probada: binarios bin/lib/share incluidos, clúster privado en perfil Windows y sin servicio registrado. El instalador oficial y los binarios sin instalador están disponibles en https://www.postgresql.org/download/windows/. Se conservan server_license.txt y avisos de terceros.')
    m.table(['Tema','Evaluador: automático','Ingeniería: mantenimiento'], [
        ('Requisitos y descarga','Incluidos; no descarga PostgreSQL','Obtener versión 18 compatible desde sitio oficial; comprobar avisos y arquitectura x64'),
        ('Instalación Windows','No requiere servidor instalado aparte','Si usa un servidor externo, instalar Server y Command Line Tools; pgAdmin es opcional'),
        ('Configuración inicial','initdb UTF8, locale C, SCRAM','No use trust; restrinja host a 127.0.0.1 y proteja el directorio de datos'),
        ('Servicio','El lanzador ejecuta y detiene pg_ctl','No registra servicio; servicios de otras instalaciones permanecen independientes'),
        ('Administrador','sgd_local_admin y contraseña aleatoria DPAPI','No es una cuenta humana ni una contraseña pública; no compartir postgresql.dat'),
        ('Usuario SGD','sgd_eval_app sin superusuario ni creación de roles/bases','SELECT/INSERT/UPDATE/DELETE de tablas; solo SELECT en alembic_version; secuencias USAGE/SELECT'),
        ('Crear base','sgd_tibu_evaluacion nueva','Nunca usar postgres/template0/template1 ni reemplazar una base existente'),
        ('Restaurar','pg_restore, transacción y SHA-256','En pgAdmin cree BASE_NUEVA; Restore, formato Custom, sin propietario/privilegios; compare conteos'),
        ('psql','No se necesita para el uso cotidiano','psql -h 127.0.0.1 -p PUERTO -U USUARIO -W -d BASE; luego SELECT version(); y SELECT version_num FROM alembic_version;'),
        ('Alembic','Cadena 0001–0006 verificada','Configure DATABASE_URL explícita y ejecute el migrador solo sobre copia respaldada; no migre origen automáticamente'),
        ('Conexión','URL protegida, puerto de clúster propio','No pegar contraseñas en argumentos; usar -W o entorno temporal; comprobar host/puerto'),
        ('Tablas/relaciones','verify inspecciona columnas y revisión','Revisar esquema_fisico.json, pg_constraint y conteos antes/después'),
        ('Respaldo','pg_dump incluido desde Respaldos','Formato custom con --no-owner --no-privileges; respaldar también documentos'),
        ('Recuperación','No sobrescribe datos existentes','Restaurar en base nueva y verificar PDF/hashes, permisos, secuencias y autenticación'),
        ('Actualización','Instalador conserva perfil','Misma versión mayor: reemplazar binarios compatibles con respaldo; versión mayor: dump/restore en clúster nuevo'),
        ('Diagnóstico','Ver registros','Leer postgresql.log, comprobar pg_ctl status y espacio; revisar pg_hba sin desactivar autenticación')], [1,1.6,2])
    m.p('Restauración CLI documentada: pg_restore -h 127.0.0.1 -p PUERTO -U USUARIO -W --no-owner --no-privileges --exit-on-error --single-transaction -d BASE_NUEVA SGD_Tibu_Evaluacion.dump. En esta entrega se ejecutó el equivalente con credenciales aleatorias en entorno y los binarios incluidos. No use --clean sobre bases con información.')
    m.p('El diagrama de despliegue adjunto muestra los componentes verificados. Las pantallas de pgAdmin son un procedimiento de mantenimiento descrito; no se adjuntan capturas fabricadas ni se declara verificada una restauración interactiva mediante pgAdmin.')


def first_read():
    m = UniversityManual('LEEME PRIMERO — SGD TIBÚ UDES', 'Guía rápida para la profesora y el jurado')
    # Keep this guide short: the base class added one cover page.
    m.h('Abrir en Windows')
    m.steps(['Descargue SGD_TIBU_VERSION_FINAL_PROFESORA_UDES.zip a una carpeta local.', r'Use clic derecho → Extraer todo y elija una carpeta corta, por ejemplo C:\SGD. Las rutas muy profundas pueden impedir cargar bibliotecas de Windows. No ejecute dentro del ZIP.', 'Abra 01_PROGRAMA/SGD_Tibu.exe, o instale 02_INSTALADOR/SGD_Tibu_Setup.exe para crear acceso directo.', 'Espere: el primer inicio prepara PostgreSQL incluido y restaura la base automáticamente. No necesita herramientas de desarrollo ni contraseña PostgreSQL.', 'La ventana indicará Sistema disponible y abrirá el navegador. Si hace falta, pulse Abrir sistema.'])
    m.table(['Acceso','Valor'], [('Contexto','Acceso diocesano / administración'), ('Usuario','admin@iglesia.org'), ('Contraseña','admin123')], [1,2])
    m.p('Credenciales exclusivas de evaluación académica local autorizada. No publicar en red ni usar en producción.')
    m.h('Comprobar y evaluar')
    m.p('Abra Parroquias: hay 13. Abra Catálogo: cuatro tipos. Inicialmente no hay personas ni partidas porque la base original tampoco las tenía. Están disponibles los módulos del sistema completo: personas, libros, cuatro sacramentos, consultas, solicitudes, certificados, usuarios, roles, auditoría, reportes y respaldos. Autorizar y firmar requiere los cargos correspondientes, no solo administrador.')
    m.p('Prueba básica: cree Parroquia Ficticia UDES, una persona y un libro de Bautismo UDES-EJ-01; registre B-UDES-01 con fecha pasada. Búsquela, cierre y vuelva a abrir. Siga los ejercicios del capítulo 8 del manual de usuario para evaluar los demás cargos y el ciclo de certificados. Use exclusivamente datos ficticios en ejercicios.')
    m.h('Salir y resolver errores')
    m.p('Cierre sesión en el navegador y pulse Cerrar SGD en la ventana nativa. La base queda en su perfil Windows y permanece tras nuevas aperturas. Cerrar solo la pestaña no detiene el programa. En caso de error use Ver registros y consulte el capítulo 9. No borre la carpeta de datos ni envíe config.dat. Si falta un componente, extraiga el ZIP completo de nuevo.')
    m.p('Envíe al jurado únicamente el ZIP final y, opcionalmente, su archivo .sha256. Las pruebas en Windows limpio y después de un reinicio completo del computador siguen pendientes; el informe distingue esos puntos de las comprobaciones locales realizadas.')
    m.save(OUT / '09_GUIA_PROFESORA', 'LEEME_PRIMERO')


def copy_sources():
    inventory=[]
    allowed={'.py','.js','.jsx','.mjs','.json','.css','.html','.md','.txt','.ini','.mako','.sql','.svg','.ico','.ps1','.cs','.lock','.iss','.bat'}
    forbidden={'node_modules','__pycache__','uploads','backups','build','dist','.pytest_cache','venv','.venv','.test-artifacts','.test-tools','.test-runtime','.agents','.codex'}
    for folder in ['backend','frontend','database','desktop','launcher']:
        for directory, dirs, files in os.walk(ROOT / folder):
            dirs[:] = [d for d in dirs if d not in forbidden]
            for name in files:
                path=Path(directory)/name
                if path.suffix not in allowed or (name.startswith('.env') and name != '.env.example') or name in {'demo_accounts.json','test-results.json'}: continue
                relative=path.relative_to(ROOT); target=OUT/'06_CODIGO_FUENTE'/relative
                target.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(path,target)
                inventory.append(dict(archivo=relative.as_posix(),sha256=digest(path)))
    dump_json(OUT/'06_CODIGO_FUENTE/INVENTARIO_FUENTES_SHA256.json',inventory)
    (OUT/'06_CODIGO_FUENTE/README.md').write_text('# Fuentes de la entrega UDES 3.0.0\n\nConsulte 05_MANUAL_TECNICO. El flujo vigente es desktop/final_release.py build y desktop/verify_final.py.\nLos generadores de entregas antiguas se conservan como fuente histórica; no son el procedimiento de esta edición.\nNo se incluye .env, clúster del desarrollador ni credenciales privadas.\n',encoding='utf8')
    return inventory


def main():
    for folder in FOLDERS: (OUT/folder).mkdir(parents=True,exist_ok=True)
    manifest=json.loads((WORK/'payload/manifest.json').read_text())
    schema=json.loads((WORK/'esquema.json').read_text())
    captures=json.loads((EVIDENCE/'capturas.json').read_text())
    assert all(r['estado']=='APROBADA' for r in json.loads((EVIDENCE/'aceptacion.json').read_text()))
    print('Copiando programa y base comprobados…',flush=True)
    shutil.copytree(WORK/'build/embedded-app',OUT/'01_PROGRAMA',dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
    shutil.copy2(WORK/'build/inno-output/SGD_Tibu_Setup.exe',OUT/'02_INSTALADOR/SGD_Tibu_Setup.exe')
    database=OUT/'03_BASE_DATOS'
    shutil.copy2(WORK/'payload/sgd_tibu_real.dump',database/'SGD_Tibu_Evaluacion.dump')
    shutil.copy2(WORK/'payload/manifest.json',database/'manifiesto_base_evaluacion.json')
    for name in ['estructura_postgresql.sql','datos_evaluacion.sql','secuencias.json']:
        shutil.copy2(WORK/name,database/name)
    shutil.copy2(WORK/'esquema.json',database/'esquema_fisico.json')
    shutil.copytree(ROOT/'backend/migrations',database/'migraciones',dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
    with (database/'inventario_registros.csv').open('w',newline='',encoding='utf-8-sig') as file:
        writer=csv.writer(file); writer.writerow(['tabla','registros_origen','registros_entrega','observacion'])
        origin=json.loads((WORK/'preparacion.json').read_text())['filas_origen']
        for name,count in manifest['counts'].items():writer.writerow([name,origin[name],count,'Sesiones excluidas' if name=='sesiones' else 'Copia anonimizada conservando cantidad'])
    import desktop.manual_render as render
    render.OUT=WORK/'doc-intermedio'
    for folder in ['02_BASE_DATOS_POSTGRESQL','06_DIAGRAMAS']: (render.OUT/folder).mkdir(parents=True,exist_ok=True)
    render.dictionary(schema); render.diagrams(schema)
    shutil.copy2(render.OUT/'02_BASE_DATOS_POSTGRESQL/diccionario_datos.xlsx',database/'diccionario_datos.xlsx')
    shutil.copytree(render.OUT/'06_DIAGRAMAS',OUT/'07_DIAGRAMAS',dirs_exist_ok=True)
    shutil.copy2(OUT/'07_DIAGRAMAS/entidad_relacion.png',database/'diagrama_entidad_relacion.png')
    shutil.copy2(OUT/'07_DIAGRAMAS/entidad_relacion.mmd',database/'diagrama_entidad_relacion.mmd')
    (OUT/'07_DIAGRAMAS/despliegue.mmd').write_text('flowchart TB\n subgraph Equipo_Windows_x64\n A[SGD_Tibu.exe] --> B[Python embebido y Tkinter]\n B --> C[Uvicorn FastAPI en 127.0.0.1]\n C --> D[React compilado en navegador]\n B --> E[PostgreSQL 18.3 privado]\n C --> E\n E --> F[Perfil Windows: cluster persistente]\n C --> G[Documentos y respaldos privados]\n B --> H[DPAPI del mismo usuario Windows]\n end\n',encoding='utf8')
    from app.main import app
    openapi=app.openapi(); dump_json(OUT/'06_CODIGO_FUENTE/openapi.json',openapi)
    libraries=dependencies()
    copy_sources()
    with (OUT/'inventario_modulos.csv').open('w',newline='',encoding='utf-8-sig') as file:
        writer=csv.writer(file);writer.writerow(['modulo','ruta','roles','objetivo'])
        for module in MODULES:writer.writerow([module['title'],module['route'],module['roles'],module['purpose']])
    print('Generando manual de usuario…',flush=True); user_manual(manifest,captures)
    print('Generando manual técnico y dependencias…',flush=True); technical_manual(manifest,schema,openapi,libraries)
    first_read()
    shutil.copytree(EVIDENCE,OUT/'08_PRUEBAS',dirs_exist_ok=True)
    shutil.copytree(EVIDENCE/'capturas',OUT/'04_MANUAL_USUARIO/capturas',dirs_exist_ok=True)
    for source in ['backend-tests.xml','backend-tests.log','preparacion.json']:
        shutil.copy2(WORK/source,OUT/'08_PRUEBAS'/source)
    shutil.copy2(ROOT/'.test-artifacts/frontend-final-20261109.json',OUT/'08_PRUEBAS/frontend-tests.json')
    shutil.copy2(ROOT/'AUDITORIA_INICIAL_ENTREGA_UDES_20261109.md',OUT/'08_PRUEBAS/AUDITORIA_INICIAL.md')
    recovery=UniversityManual('RESPALDOS Y RECUPERACIÓN — SGD TIBÚ UDES','Procedimiento técnico sobre una base nueva')
    postgres_chapter(recovery)
    recovery.p('No copie una carpeta de clúster en ejecución. Para trasladar datos use el ZIP de Respaldos, que incluye base.dump, manifiesto y archivos documentales. La copia inicial de esta entrega no requiere documentos porque la tabla documentos está vacía.')
    recovery.p('Recuperación en otro equipo: extraiga el programa completo y permita crear un perfil local nuevo. Un ingeniero debe restaurar en una base vacía separada, verificar el contenido y configurar el rol limitado. No sustituya físicamente una base ya utilizada ni transfiera los archivos DPAPI de otro perfil. La automatización probada cubre la copia inicial; una recuperación de información posterior requiere revisión técnica para no sobrescribir datos.')
    recovery.save(OUT/'11_RESPALDOS_Y_RECUPERACION','RESPALDO_Y_RECUPERACION')
    report(manifest,libraries)
    print('Documentación y estructura final generadas.',flush=True)


def report(manifest,libraries):
    tests=json.loads((EVIDENCE/'aceptacion.json').read_text())
    rows=tests+[
        dict(prueba='Windows 10 x64 limpio',estado='PENDIENTE',procedimiento='Instalar en VM o equipo limpio sin runtimes de desarrollo',esperado='Mismo flujo',obtenido='Entorno no disponible',evidencia='No ejecutada'),
        dict(prueba='Windows 11 x64 limpio',estado='PENDIENTE',procedimiento='Instalar en VM o equipo limpio sin runtimes de desarrollo',esperado='Mismo flujo',obtenido='Entorno no disponible',evidencia='No ejecutada'),
        dict(prueba='Reinicio completo de Windows',estado='PENDIENTE',procedimiento='Reiniciar OS y volver a abrir',esperado='Datos persistentes',obtenido='No se reinició el computador del usuario',evidencia='No ejecutada')]
    with (OUT/'08_PRUEBAS/matriz_pruebas.csv').open('w',newline='',encoding='utf-8-sig') as file:
        writer=csv.DictWriter(file,fieldnames=['prueba','procedimiento','esperado','obtenido','evidencia','estado']);writer.writeheader();writer.writerows(rows)
    m=UniversityManual('INFORME DE PRUEBAS Y RESTAURACIÓN','Resultados reales del programa Windows final')
    for row in rows:
        m.h(row['prueba'],2)
        for key in ['procedimiento','esperado','obtenido','evidencia','estado']:m.p(key.capitalize()+': '+str(row.get(key,'')))
    m.p('Backend: 109 aprobadas, una omitida por no aplicar el enum PostgreSQL a SQLite. Frontend: 91 aprobadas. Las pruebas del ejecutable usaron sus componentes incluidos y crearon datos sintéticos en un perfil aparte. Esos datos no se agregaron al respaldo entregado. Las pruebas de repetición y restauración del dump se complementan con las comprobaciones PostgreSQL de la suite.')
    m.table(['Tabla','Filas entregadas'],list(manifest['counts'].items()),[2,1])
    m.save(OUT/'08_PRUEBAS','INFORME_PRUEBAS_Y_RESTAURACION')
    shutil.copy2(OUT/'08_PRUEBAS/restauracion.json',OUT/'03_BASE_DATOS/reporte_restauracion.json')
    text='''# Informe final de entrega — SGD Tibú UDES 3.0.0

Fecha: 9 de noviembre de 2026, America/Bogota.

El paquete contiene el sistema existente completo, React compilado, FastAPI, Python 3.12.10 y PostgreSQL 18.3 incluidos; ejecutable portátil y Setup reales. No requiere comandos ni instalación de herramientas de desarrollo para el evaluador. El primer inicio crea y restaura una base independiente, restringida a 127.0.0.1, con credenciales aleatorias protegidas por DPAPI.

Commit base: `877cd91e1c890b4ff8204c5feb4dc14c53292ef8`, con cambios locales previos y de esta entrega. No es un commit nuevo ni un árbol limpio. Véase INVENTARIO_FUENTES_SHA256.json para identificar exactamente el código incluido. API declarada 2.0.0; paquete frontend 1.0.0; distribución 3.0.0.

Acceso comprobado por API y Chrome: `admin@iglesia.org` / `admin123`, contexto **Acceso diocesano / administración**. Exclusivo de evaluación local; no publicar en red ni usar en producción.

## Base actual y privacidad

El origen contiene 13 parroquias, cuatro tipos de sacramento, una cuenta administradora y 53 eventos de auditoría. No contiene personas, libros, partidas, solicitudes, certificados ni documentos. Se conserva el contenido institucional autorizado y sus relaciones. Se anonimiza nombre de cuenta y texto libre de auditoría. Se excluyen 11 sesiones; se conserva una referencia histórica de respaldo marcada sin archivo operativo. El inventario CSV compara todas las tablas. Origen 0005; copia migrada a 0006 sin modificar el origen.

## Módulos

22 entradas documentadas en inventario_modulos.csv: acceso, panel, consulta, bautismo, confirmación, matrimonio, defunción, personas, libros, solicitudes, certificados, aprobaciones/firma, documentos, parroquias, reportes, usuarios, auditoría, roles, catálogo, respaldos, configuración y verificación pública local. Preparación, autorización, aprobación Curia, firma y anulación están dentro del ciclo de certificados. No se presenta Cementerio ni componentes antiguos desconectados como pantallas funcionales.

## Evidencias

Backend: 109 aprobadas, una omisión esperada por prueba PostgreSQL no aplicable a SQLite. Frontend: 91 aprobadas. La matriz documenta instalación real, primer inicio, restauración y relaciones, login API/Chrome, navegación, siete roles, cuatro sacramentos, solicitudes, certificados/PDF, Curia, anulación, auditoría, respaldo, instancia única, cierre, reapertura, actualización, desinstalación y versión portátil. Los registros ficticios de QA permanecen fuera del dump entregado.

## Pendientes de aceptación

- Extraer el ZIP en una carpeta local corta (por ejemplo, `C:/SGD`): se detectó un fallo al cargar una DLL en una ruta de laboratorio demasiado profunda. La comprobación de arranque utiliza un destino corto.
- Windows 10 y Windows 11 limpios sin runtimes del desarrollador: no ejecutado por falta de entorno limpio disponible.
- Reinicio completo de Windows y apertura posterior: no ejecutado; no se reinició el computador del usuario.
- Aceptación institucional del contenido y del mecanismo de firma/sello: requiere responsables de la Diócesis; la firma implementada es una actuación autenticada, no una firma digital certificada externa.
- Traslado de información posterior a otro usuario Windows requiere recuperación técnica; la portabilidad del programa no transfiere DPAPI ni el perfil de datos.
- No se afirma ejecución interactiva de pgAdmin ni reinstalación limpia de dependencias de ingeniería. Se documenta el procedimiento y se distingue de los comandos ejecutados.

## Enviar a la profesora

Enviar `SGD_TIBU_VERSION_FINAL_PROFESORA_UDES.zip` y opcionalmente su archivo `.sha256`. La guía está en 09_GUIA_PROFESORA/LEEME_PRIMERO.pdf. No enviar `.env`, carpetas `.test-artifacts`, configuraciones DPAPI ni respaldos privados del equipo de desarrollo.

El manifiesto SHA-256 identifica cada archivo. La comprobación CRC del ZIP, su extracción real y el arranque desde lo extraído se registran en el informe externo de integridad de entrega. La entrega es utilizable y tiene pruebas locales; la aceptación completa sigue condicionada a los pendientes indicados.
'''
    (OUT/'INFORME_FINAL_ENTREGA.md').write_text(text,encoding='utf8')
    (OUT/'10_LIBRERIAS_Y_DEPENDENCIAS/LEEME.md').write_text('Inventario exhaustivo de '+str(len(libraries))+' entradas de dependencias, incluyendo variantes npm opcionales por plataforma. Versiones tomadas de locks y metadatos instalados. Consulte las columnas Uso y Compatibilidad; un paquete declarado no implica importación por una pantalla activa.\n',encoding='utf8')


if __name__=='__main__':main()
