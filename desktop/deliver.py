"""Generate the reviewable Windows delivery, manuals and synthetic-only ZIP."""
from collections import Counter
from datetime import datetime
import hashlib
from html import escape
import importlib.metadata as md
import json
import math
import os
from pathlib import Path
import re
import shutil
import sys
import xml.etree.ElementTree as ET
import zipfile
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / 'backend'))
os.environ.update(SGD_DESKTOP='1', DATABASE_URL='sqlite://', SECRET_KEY='documentation-only-' + 'x' * 48)
from desktop.manual_content import MODULES, FIELD_HELP, BUTTON_HELP
from docx import Document
from docx.shared import Inches, Pt, Cm
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak, Preformatted
from PIL import Image as PILImage, ImageDraw, ImageFont

BUILD = ROOT / '.test-artifacts/distribution'
EVIDENCE = BUILD / 'evidence'
OUT = ROOT / 'SGD_TIBU_PROGRAMA_LISTO_PARA_USAR'
DATE = datetime.now(ZoneInfo('America/Bogota')).strftime('%d/%m/%Y')
FOLDERS = ['01_INSTALADOR','02_BASE_DATOS_POSTGRESQL','03_MANUAL_USUARIO','04_MANUAL_TECNICO','05_CODIGO_FUENTE','06_DIAGRAMAS','07_ACCESOS_DEMO','08_PRUEBAS']
SOURCES = [
 ('PostgreSQL: instaladores Windows', 'https://www.postgresql.org/download/windows/'),
 ('PostgreSQL 18: pg_dump', 'https://www.postgresql.org/docs/18/app-pgdump.html'),
 ('PostgreSQL 18: pg_restore', 'https://www.postgresql.org/docs/18/app-pgrestore.html'),
 ('Python 3.12: distribución embebida en Windows', 'https://docs.python.org/3.12/using/windows.html#the-embeddable-package'),
 ('Python 3.12.10: distribución oficial', 'https://www.python.org/downloads/release/python-31210/'),
 ('Inno Setup: distribución y firmas', 'https://jrsoftware.org/isdl.php'),
 ('Microsoft: CryptProtectData', 'https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata'),
]


def load(name):
    return json.loads((EVIDENCE / name).read_text(encoding='utf8'))


def hashfile(path):
    with Path(path).open('rb') as f: return hashlib.file_digest(f, 'sha256').hexdigest()


class Manual:
    def __init__(self, title, subtitle):
        self.title = title; self.items = []
        self.doc = Document()
        section = self.doc.sections[0]
        section.top_margin = section.bottom_margin = Cm(2)
        section.left_margin = section.right_margin = Cm(2)
        for style in self.doc.styles:
            if style.type in (1, 2):
                style.font.name = 'Times New Roman'; style.font.size = Pt(12)
        for name in ['Heading 1','Heading 2','Heading 3','Title','Subtitle']:
            self.doc.styles[name].font.name = 'Times New Roman'
            self.doc.styles[name].font.size = Pt(12)
            self.doc.styles[name].font.bold = True
        self.doc.styles['Normal'].paragraph_format.space_after = Pt(6)
        self.doc.styles['Normal'].paragraph_format.line_spacing = 1.15
        footer = section.footer.paragraphs[0]
        footer.alignment = 2
        run = footer.add_run('SGD Diócesis de Tibú · Página '); run.font.size = Pt(10)
        field = OxmlElement('w:fldSimple'); field.set(qn('w:instr'), 'PAGE'); footer._p.append(field)
        for name, file in [('TNR','times.ttf'),('TNR-Bold','timesbd.ttf')]:
            if name not in pdfmetrics.getRegisteredFontNames(): pdfmetrics.registerFont(TTFont(name, str(Path(os.environ['WINDIR']) / 'Fonts' / file)))
        self.body = ParagraphStyle('body', fontName='TNR',fontSize=12,leading=16,spaceAfter=7,splitLongWords=True,allowWidows=0,allowOrphans=0)
        self.heading = ParagraphStyle('heading',parent=self.body,fontName='TNR-Bold',spaceBefore=12,spaceAfter=8,keepWithNext=True)
        self.small = ParagraphStyle('note',parent=self.body,fontSize=10,leading=13)
        self.h(title); self.p(subtitle); self.p('Versión 2.1.0 · Fecha de preparación: ' + DATE + ' · America/Bogota')

    def h(self, value, level=1):
        self.doc.add_heading(value, level=min(level,3)); self.items.append(Paragraph(escape(value),self.heading))

    def p(self, value, small=False):
        paragraph = self.doc.add_paragraph(str(value))
        if small:
            for run in paragraph.runs: run.font.size = Pt(10)
        self.items.append(Paragraph(escape(str(value)).replace('\n','<br/>'),self.small if small else self.body))

    def steps(self, values):
        for index, value in enumerate(values,1): self.p(str(index) + '. ' + value)

    def table(self, headers, rows, widths=None):
        if not rows: return
        table = self.doc.add_table(rows=1, cols=len(headers)); table.style = 'Table Grid'
        for cell, text in zip(table.rows[0].cells,headers):
            cell.text = str(text)
            for p in cell.paragraphs:
                for r in p.runs: r.bold = True
        for row in rows:
            for cell, text in zip(table.add_row().cells,row): cell.text = str(text)
        data = [[Paragraph(escape(str(value)),self.body) for value in row] for row in [headers,*rows]]
        width = A4[0] - 4*28.3464567
        if widths is None: widths = [width/len(headers)]*len(headers)
        else: widths = [width*x/sum(widths) for x in widths]
        pdf = Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
        pdf.setStyle(TableStyle([('GRID',(0,0),(-1,-1),.35,colors.HexColor('#777777')),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#eeeeee')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
        self.items.append(pdf); self.items.append(Spacer(1,8))

    def image(self, path, caption):
        path = Path(path)
        if not path.exists():
            self.p('Captura no disponible: ' + caption + '. Esta ausencia no se presenta como evidencia de ejecución.'); return
        with PILImage.open(path) as image: width,height=image.size
        factor=min(6.5/width,5.5/height)
        self.doc.add_picture(str(path),width=Inches(width*factor))
        self.items.append(Image(str(path),width=width*factor*72,height=height*factor*72))
        self.p(caption,small=True)

    def code(self, source, start, stop):
        lines=(ROOT/source).read_text(encoding='utf8').splitlines()
        self.p('Fragmento real: ' + source + ', líneas ' + str(start) + ' a ' + str(stop) + '.',small=True)
        for line in lines[start-1:stop]: self.p(line or ' ')

    def page(self):
        self.doc.add_page_break(); self.items.append(PageBreak())

    def save(self, folder, stem):
        folder = Path(folder); folder.mkdir(parents=True,exist_ok=True)
        self.doc.save(folder / (stem + '.docx'))
        def footer(canvas,document):
            canvas.setFont('TNR',10);canvas.drawRightString(A4[0]-56.7,30,'SGD Diócesis de Tibú · Página '+str(document.page))
        pdf=SimpleDocTemplate(str(folder/(stem+'.pdf')),pagesize=A4,rightMargin=Cm(2).pt,leftMargin=Cm(2).pt,topMargin=Cm(2).pt,bottomMargin=Cm(2).pt,title=self.title,author='Proyecto SGD Diócesis de Tibú')
        pdf.build(self.items,onFirstPage=footer,onLaterPages=footer)


def field_help(item):
    help = FIELD_HELP.get(item['name'])
    if not help:
        if item['type']=='checkbox': help='Activa o desactiva la opción indicada por la etiqueta; se guarda solo al confirmar el formulario.'
        elif item.get('options'): help='Seleccione una de las opciones del catálogo que ofrece el servidor para este campo.'
        elif item['type']=='password': help='Contraseña individual oculta; no la copie a registros ni documentación.'
        else: help='Diligencie el dato indicado por la etiqueta en este formulario; el servidor valida formato y autorización.'
    details=[]
    if item.get('required'):details.append('Obligatorio')
    if item.get('minLength',-1)>0:details.append('Mínimo '+str(item['minLength'])+' caracteres')
    if item.get('maxLength',-1)>0:details.append('Máximo '+str(item['maxLength'])+' caracteres en la interfaz')
    if item.get('min'):details.append('Mínimo '+str(item['min']))
    if item.get('max'):details.append('Máximo '+str(item['max']))
    return help + (' '+'. '.join(details)+'.' if details else '')


def module_guide(manual, module, index, captures):
    key,title,roles,route,purpose,steps,example,validations,result,errors,relations=module
    manual.page();manual.h(str(index)+'. '+title)
    manual.h('Finalidad',2);manual.p(purpose)
    manual.h('Roles habilitados y acceso',2);manual.p(roles+'. Ruta: '+route+'. Los permisos descritos son los predeterminados; Roles y permisos muestra la política efectiva.')
    shots=[c for c in captures if c['name']==key or c['name']==key+'_formulario']
    if not shots and key=='verificacion':shots=[c for c in captures if c['name']=='verificacion']
    for shot in shots:
        manual.image(EVIDENCE/shot['file'],'Captura real de '+title+' · rol '+shot['role']+' · ejecutable instalado, frontend compilado y PostgreSQL 18.3 ficticio. Archivo completo: '+shot['file'])
    manual.h('Procedimiento',2);manual.steps(steps)
    fields=[];seen=set()
    for shot in shots:
        for field in shot['fields']:
            identity=(field['name'],field['label'])
            if identity not in seen:fields.append((field['label'] or field['name'],field_help(field)));seen.add(identity)
    manual.h('Campos de la pantalla',2)
    if fields:manual.table(['Campo','Explicación y validación'],fields,[1,2.8])
    else:manual.p('Esta pantalla presenta datos calculados o de consulta y no ofrece un formulario de alta. Los identificadores, fechas y estados se obtienen del servidor; no se editan sobre la tabla.')
    manual.h('Botones y acciones',2)
    buttons=list(dict.fromkeys(button for shot in shots for button in shot['buttons'] if button))
    explanations=[]
    for button in buttons:
        description=BUTTON_HELP.get(button)
        if description is None:
            if button.startswith('Actualizar'):description='Vuelve a consultar la información vigente del servidor sin modificar los registros.'
            elif button.startswith('Guardar'):description='Valida y guarda los campos del formulario correspondiente.'
            elif button in ['Tarjetas','Tabla']:description='Cambia la presentación del directorio sin modificar los datos.'
            elif 'respaldo' in button.lower():description='Ejecuta la acción de respaldo indicada; revise el estado del trabajo antes de descargar.'
            elif 'permisos' in button.lower():description='Consulta o confirma la política de permisos; las facultades protegidas permanecen restringidas.'
            elif button in ['Administrador','Párroco','Secretario Parroquial','Secretario General','Canciller','Auditor','Consulta']:description='Selecciona el perfil para revisar sus permisos; la selección no cambia el rol de la cuenta autenticada.'
            else:description='Ejecuta la acción indicada sobre la sección o fila seleccionada. La disponibilidad depende del permiso y del estado; revise el mensaje del servidor antes de continuar.'
        explanations.append((button,description))
    if explanations:manual.table(['Botón','Efecto'],explanations,[1,2.8])
    else:manual.p('La navegación y los enlaces de consulta no modifican datos. No hay acciones de edición disponibles en esta vista.')
    manual.h('Ejemplo ficticio completo',2);manual.p(example)
    manual.h('Validaciones y restricciones',2);manual.p(validations)
    manual.h('Resultado esperado',2);manual.p(result)
    manual.h('Errores frecuentes y solución',2);manual.p(errors)
    manual.h('Relación con otros módulos',2);manual.p(relations)


def user_manual(captures):
    m=Manual('Manual de usuario · Sistema de Gestión Documental de la Diócesis de Tibú','Guía operativa de los módulos conectados de la versión vigente, con ejemplos ficticios y capturas de la distribución instalada.')
    m.h('Alcance y estado de aceptación')
    m.p('El paquete funciona localmente con PostgreSQL 18 x64 y contiene su runtime, backend y frontend compilado. Las pruebas descritas se realizaron en un equipo de desarrollo. No se ha comprobado la instalación en una máquina virtual limpia ni el reinicio de Windows. No se certifica el criterio de entrega final hasta completar esas pruebas.')
    m.h('Índice de módulos')
    m.table(['N.º','Módulo','Ruta'],[(i,entry[1],entry[3]) for i,entry in enumerate(MODULES,1)],[.4,1.7,1.5])
    m.h('Primer uso y trabajo diario')
    m.steps(['Instale PostgreSQL 18 x64 con servidor y herramientas de línea de comandos. No instale Python ni Node para usar el SGD.','Ejecute 01_INSTALADOR/SGD_Tibu_Setup.exe y acepte la instalación para su usuario Windows.','En el asistente, ingrese la conexión PostgreSQL y elija Real o Demostración. Use bases distintas para cada modo.','En modo real, defina su correo y contraseña temporal de administrador; cámbiela al primer acceso. En demostración use exclusivamente las cuentas ficticias de 07_ACCESOS_DEMO.','Abra SGD Diócesis de Tibú desde el escritorio. Espere la comprobación y el navegador. Mantenga abierta la ventana del SGD.','Al terminar, cierre sesión en el navegador y pulse Cerrar SGD en la ventana del programa. Cerrar solamente el navegador no detiene el servicio interno.'])
    m.h('Conceptos de custodia y ciclo documental')
    if (EVIDENCE/'capturas/cambio_temporal.png').exists():
        m.image(EVIDENCE/'capturas/cambio_temporal.png','Cambio obligatorio de contraseña en la instalación real ficticia de laboratorio. Los módulos permanecen bloqueados hasta completar el cambio.')
    m.p('Persona identifica al titular. Partida es el asiento de un tipo sacramental, asociado a parroquia, libro, folio y número. Documento es un soporte PDF. Solicitud coordina acceso a un asiento de otra parroquia. Certificado conserva una instantánea del asiento y un ciclo de actuaciones. La custodia limita la lectura y escritura incluso cuando el botón está visible.')
    from app.core.roles import ROLES
    from app.services.permisos import predeterminados,PERMISOS
    m.h('Los siete roles y sus permisos reales')
    for role in ROLES:
        m.h(role,2)
        active=predeterminados(role)
        m.table(['Capacidad','Predeterminado'],[(name,'Habilitado' if active[key] else 'No habilitado') for key,name,_ in PERMISOS],[2,1])
        m.p({'administrador':'Administra técnica y globalmente; no autoriza certificados, no aprueba Curia ni firma.', 'parroco':'Trabaja en su parroquia, administra solo secretaría parroquial y consulta, autoriza y firma ordinarios de su custodia.', 'secretario_parroquial':'Registra en su parroquia y prepara documentos; no autoriza, firma ni aprueba Curia.', 'secretario_general':'Coordina solicitudes y prepara certificados con lectura global; no firma ni aprueba Curia.', 'canciller':'Supervisa, aprueba y firma los certificados de Curia previamente autorizados; no recibe escritura parroquial predeterminada.', 'auditor':'Revisa auditoría y métricas de control; no obtiene por ello partidas nominativas ni escritura.', 'consulta':'Lee registros autorizados de su parroquia; no crea, corrige ni prepara certificados.'}[role])
        shot=next(c for c in captures if c['name']=='rol_'+role);m.image(EVIDENCE/shot['file'],'Panel real de la cuenta ficticia con rol '+role+'.')
    for i,module in enumerate(MODULES,1):module_guide(m,module,i,captures)
    m.page();m.h('Tutorial integrado: registrar y corregir una partida')
    m.steps(['Entre como administrador, párroco o secretario parroquial de Ficticia A.','Abra Personas y registre Segunda Persona Ficticia con identificación FICTICIO_A_002. Anote el ID.','Abra Libros sacramentales y cree DEMO-2 de Bautismo en Ficticia A.','Abra Bautismos y Registrar partida. Seleccione primero Ficticia A, después la persona y DEMO-2.','Use fecha 12/04/2020, folio 2 y número B-002. Ingrese datos adicionales ficticios y Guarde.','Busque B-002 en Consulta de partidas, pulse Ver y compruebe fecha, titular y referencia.','Pulse Corregir / nota, cambie un dato documental y explique un motivo de al menos cinco caracteres. Guarde y revise Historial.','Agregue una nota marginal con texto y motivo; compruebe que conserva las notas anteriores.'])
    m.h('Tutorial integrado: certificado ordinario, Curia y anulación')
    m.steps(['Secretario parroquial: prepare el certificado de la partida ficticia completa. Déjelo sin competencia de Curia para el primer ejemplo.','Párroco de Ficticia A: abra el certificado preparado, revise trazabilidad, pulse Autorizar y confirme un motivo.','Párroco: pulse Firmar, confirme el motivo, compruebe firmado y descargue el PDF.','Abra Verificar autenticidad; observe número, fecha y parroquia sin nombres. El QR solo es accesible en el equipo local.','Prepare otro certificado con Requiere aprobación Curia y un motivo documental ficticio.','Párroco: autorice el nuevo certificado. Canciller: pulse Aprobar en Curia, confirme; después Firmar y confirme.','Párroco custodio o canciller autorizado: pulse Anular, explique el motivo y confirme. La consulta de autenticidad pasa a no válida y el historial se conserva.'])
    for name in ['ordinario_autorizar','ordinario_firmar','ordinario_firmado','curia_aprobar','curia_firmar','curia_firmado','ordinario_anular','verificacion']:
        shot=next((c for c in captures if c['name']==name),None)
        if shot:m.image(EVIDENCE/shot['file'],'Actuación real ficticia: '+name.replace('_',' ')+'. Los motivos se registran en auditoría.')
    m.h('Tutorial integrado: solicitud entre parroquias')
    m.steps(['Secretaría de Ficticia A: busque la referencia de Ficticia B, libro DEMO-1, folio 1, partida 1.','Solicite el acceso con un motivo ficticio. La búsqueda externa entrega referencias, no una ficha completa.','El custodio de Ficticia B o el administrador autorizado revisa la solicitud pendiente y decide con motivo. Para una prueba completa cree una cuenta de esa custodia desde Usuarios.','La secretaría de origen comprueba el resultado aprobado o rechazado. Una solicitud ya decidida no se resuelve otra vez.','Cuando el circuito lo permita, el certificado debe referir esa solicitud aprobada y el mismo registro. La aprobación no convierte al solicitante en custodio de toda la otra parroquia.'])
    m.h('Controles comunes y recuperación de la sesión')
    m.p('Buscar en el archivo abre la búsqueda rápida; Ctrl+K también permite acceder a ella. La estrella guarda favoritos en el navegador para la cuenta. La luna cambia la apariencia local. La exportación CSV corresponde únicamente a la página actual. La paginación usa lotes y las listas se filtran en el servidor. En una vista de error use Actualizar o recupere la sesión; no repita Guardar si ya se informó éxito.')
    m.h('Soporte: qué registrar y qué proteger')
    m.p('Informe fecha, módulo, operación, rol, estado visible y número de referencia ficticio o el mínimo necesario. Adjunte el registro local de error revisado y la versión del programa. No envíe contraseñas, config.dat, respaldos privados ni capturas con información sacramental real. Los registros están en %LOCALAPPDATA%\\SGD Tibu\\datos\\registros.')
    m.save(OUT/'03_MANUAL_USUARIO','Manual_Usuario_SGD_Tibu')


def technical_manual(schema, openapi):
    m=Manual('Manual técnico y de instalación · SGD Diócesis de Tibú','Instalación sin herramientas de desarrollo, arquitectura existente, administración PostgreSQL y reconstrucción del instalador.')
    m.h('Estado de esta distribución')
    m.p('Candidato de entrega instalado y probado localmente. La matriz de pruebas y sus evidencias se incluyen en 08_PRUEBAS. Está pendiente la instalación en Windows 10 y Windows 11 limpios y el reinicio completo de esos sistemas. Hyper-V está disponible como comando, pero esta sesión no tiene autorización para consultar o administrar sus máquinas. No se afirma compatibilidad verificada en equipos que no se probaron.')
    m.h('Parte A. Instalación sencilla')
    m.h('A1. Requisitos y versión de PostgreSQL',2)
    m.p('Use Windows 10 u 11 de 64 bits con las actualizaciones del sistema y un navegador. El instalador admite arquitectura x64 compatible y mínimo Windows 10; la validación local se efectuó en Windows NT 10.0.26300 x64. El único software que instala el destinatario por separado es PostgreSQL 18 x64. La versión comprobada en el laboratorio fue 18.3. El asistente exige versión mayor 18 para ceñirse al alcance probado; no se afirma que versiones anteriores sean incompatibles con todo el código.')
    m.p('Python 3.12.10 x64, Tcl/Tk, FastAPI y dependencias se incluyen en el programa. Node y NPM solo se usan al compilar. El lanzador nativo usa .NET Framework que forma parte de estas versiones de Windows. Se recomienda espacio libre para programa, base, documentos y al menos dos respaldos completos; calcule la capacidad según sus archivos, no solo el tamaño del instalador.')
    m.h('A2. Descargar PostgreSQL desde el sitio oficial',2)
    m.steps(['Abra https://www.postgresql.org/download/windows/ y siga el enlace del instalador certificado por EDB.','Seleccione PostgreSQL de la rama 18, Windows x86-64. Compruebe proveedor y firma antes de ejecutarlo.','Guarde el instalador y ejecútelo con los permisos que requiera PostgreSQL. El SGD no solicita privilegios de administrador de Windows para su instalación por usuario.'])
    m.image(EVIDENCE/'capturas/postgresql_descarga.png','Sitio oficial de PostgreSQL para Windows; una captura web no demuestra una reinstalación de PostgreSQL en máquina limpia.')
    m.h('A3. Opciones durante la instalación de PostgreSQL',2)
    m.steps(['Conserve una carpeta de programa y una carpeta de datos local con espacio suficiente.','Seleccione PostgreSQL Server y Command Line Tools. pgAdmin 4 es recomendable para administración gráfica. Stack Builder no es necesario para este SGD.','Defina una contraseña administrativa fuerte para postgres, anótela en un gestor seguro y no la incluya en el ZIP.','Mantenga puerto 5432 salvo que ya esté ocupado. Si elige otro, úselo después en el asistente.','Complete el instalador. No es necesario añadir extensiones, instalar servidores web ni abrir el puerto al exterior.'])
    m.p('Estas son instrucciones para el instalador externo; no se reproducen como capturas ficticias sus pantallas ni se afirma haberlo ejecutado de nuevo en un equipo limpio.')
    m.h('A4. Comprobar el servicio',2)
    m.steps(['Abra Servicios de Windows desde Inicio.','Localice el servicio PostgreSQL de la versión 18, normalmente postgresql-x64-18. Debe figurar En ejecución. Configure inicio automático conforme a la política del equipo.','Si usa pgAdmin, registre una conexión a 127.0.0.1 y al puerto elegido y compruebe que puede acceder con postgres.','Una comprobación técnica equivalente es pg_isready.exe -h 127.0.0.1 -p 5432 desde las herramientas PostgreSQL. Esto es opcional para ingenieros; el asistente verifica la conexión sin terminal.'])
    m.h('A5. Instalar el SGD',2)
    m.steps(['Descomprima completamente el ZIP recibido.','Abra 01_INSTALADOR/SGD_Tibu_Setup.exe.','Lea el requisito PostgreSQL y los avisos de distribución.','Conserve la carpeta propuesta para el usuario Windows y complete la instalación.','Se crean los accesos SGD Diócesis de Tibú en escritorio y menú Inicio. Al finalizar puede abrir el asistente.'])
    m.image(EVIDENCE/'capturas/instalador_requisito.png','Ventana real del instalador estándar Inno Setup que informa el requisito PostgreSQL.')
    m.h('A6. Asistente de conexión y creación automática',2)
    m.image(EVIDENCE/'capturas/asistente_postgresql.png','Asistente gráfico real del programa instalado. No contiene credenciales ingresadas.')
    m.table(['Campo','Qué indicar'],[
      ('Host local','127.0.0.1, localhost o ::1. El asistente limita PostgreSQL a conexión local.'),('Puerto PostgreSQL','5432 o el puerto que eligió al instalar PostgreSQL.'),('Base exclusiva del SGD','Nombre nuevo, por ejemplo sgd_tibu_real o sgd_tibu_demo. Solo letras minúsculas, números y guion bajo; 3 a 48 caracteres.'),('Usuario limitado de aplicación','Nombre exclusivo, por ejemplo sgd_tibu_real_app. No use postgres como usuario de la aplicación.'),('Usuario administrador PostgreSQL','postgres u otra cuenta administrativa con capacidad para crear base, rol y esquema.'),('Contraseña PostgreSQL','Clave administrativa usada únicamente durante esta operación en memoria.'),('Correo del administrador SGD','Solo para una base real nueva. No es el usuario de PostgreSQL.'),('Contraseña temporal SGD','Solo para una base real nueva; mínimo 8 caracteres. Debe cambiarse al primer acceso.'),('Modo','Real crea solo el administrador inicial. Demostración crea dos parroquias ficticias, personas, libros, ocho partidas y siete cuentas de prueba.'),('Autorización de base existente','Marque solo con respaldo previo y cuando conoce la base SGD que va a reutilizar o migrar.')],[1.2,2.8])
    m.steps(['Diligencie los campos y el modo. Pulse Comprobar e inicializar.','El programa comprueba host, puerto, versión y credenciales; crea una base nueva si falta, ejecuta Alembic y carga solo los datos del modo seleccionado.','Concede al usuario de aplicación conexión, uso del esquema, operaciones de datos y secuencias, sin superusuario ni creación de esquemas. Comprueba las columnas de todas las tablas y versión 0006.','Guarda la URL limitada y la clave JWT cifradas con DPAPI para su usuario Windows; descarta la contraseña administrativa.','Inicia el servidor local, comprueba /health y abre /login en el navegador.'])
    m.p('Una base ajena, sin marca de esta instalación, se rechaza. Una base demo no se reutiliza como real. Repetir la configuración no elimina filas ni vuelve a crear cuentas presentes. Si una operación de infraestructura se interrumpe, pueden quedar base o rol gestionados; corrija la causa y repita con autorización de base existente. Nunca elimine la base para intentar resolver un mensaje de error.')
    m.h('A7. Primer ingreso y verificación de módulos',2)
    m.steps(['Real: entre con su correo diocesano y contraseña temporal. Reemplácela por una distinta; el sistema bloquea los módulos hasta completar el cambio.','Como administrador real, cree una parroquia activa, libros y cuentas con sus roles. La base real no contiene datos ficticios de partidas.','Demo: use el documento ACCESOS_DEMOSTRACION.txt y el contexto indicado para cada cuenta.','Abra Panel, Personas, cuatro tipos de partidas, Solicitudes, Certificados, Gestión documental, Directorio, Reportes, Usuarios, Roles, Auditoría y Respaldos según el rol.','Cierre sesión, pulse Cerrar SGD y vuelva a abrir el acceso directo. Después de reiniciar Windows, abra el mismo acceso y compruebe que PostgreSQL está iniciado. Este último paso está pendiente de ejecución en el laboratorio limpio.'])
    m.h('Parte B. Administración para ingenieros')
    m.h('B1. Arquitectura y procesos',2)
    m.p('El lanzador desktop/Launcher.cs ejecuta únicamente runtime/pythonw.exe incluido y espera su terminación; no usa shell ni busca Python o Node en PATH. desktop/runtime.py presenta Tkinter, comprueba PostgreSQL e inicia Uvicorn en un hilo del mismo proceso Python. FastAPI conserva los routers existentes bajo /api y sirve la compilación React desde frontend/build. PostgreSQL persiste identidades, custodia, sesiones, políticas, registros, solicitudes, certificados y auditoría. Los PDF y ZIP se guardan en el perfil del usuario.')
    m.image(OUT/'06_DIAGRAMAS/arquitectura.png','Arquitectura real de la distribución y límites de almacenamiento.')
    m.h('B2. Elección de distribución',2)
    m.p('Se evaluó PyInstaller con carpeta de archivos. Un instalador experimental fue bloqueado como posible software no deseado; la revisión automática rechazó ejecutarlo después de la detección. No se desactivó antivirus ni se reutilizó el binario bloqueado. La alternativa final usa el paquete embebido oficial de Python y un instalador estándar Inno Setup 7.1.1. Se verificaron firmas del proveedor Python Software Foundation y del instalador de herramientas Pyrsys B.V. antes de usarlos.')
    m.p('El paquete embebido de Python no incluye Tkinter por defecto; la construcción añade tkinter, _tkinter.pyd, Tcl/Tk y zlib1.dll desde la instalación oficial Python 3.12 usada para compilar. Se comprobó la apertura gráfica real del asistente. python312._pth limita la búsqueda a las carpetas incluidas; no consulta dependencias del entorno de desarrollo. La elección mantiene el código original visible y evita extracción de código empaquetado en cada inicio.')
    m.h('B3. Carpetas y datos persistentes',2)
    m.table(['Ubicación','Contenido y mantenimiento'],[
      ('%LOCALAPPDATA%\\Programs\\SGDTibu','Archivos instalados. Inno Setup puede reemplazarlos al actualizar y retirarlos al desinstalar.'),('%LOCALAPPDATA%\\SGD Tibu\\datos\\config.dat','Configuración protegida con DPAPI del usuario. Incluye conexión limitada y clave JWT, nunca contraseña administrativa PostgreSQL.'),('datos/documentos','PDF internos con nombres aleatorios. Su hash y ruta están en documentos.'),('datos/respaldos','ZIP privados de respaldo. Tras descargar, conserve una copia externa protegida.'),('datos/registros/sgd.log','Errores y estado con rotación de hasta cinco archivos de 2 MB, más el actual.'),('datos/instance.lock e instance.dat','Exclusión de instancia y control local protegido. El archivo de bloqueo puede permanecer cerrado sin representar un proceso activo.'),('backend/app','API, modelos SQLAlchemy, esquemas Pydantic y servicios vigentes.'),('backend/migrations','Cadena Alembic original y ampliación 0006.'),('frontend/src','Código React; Dashboard y ConnectedPages/ConnectedRecords son la interfaz conectada.'),('desktop','Construcción, asistente, protección de configuración, validación y generador de entrega.')],[1.2,2.8])
    m.p('El perfil DPAPI no se comparte entre usuarios Windows ni se transfiere como configuración portable. En otro perfil debe configurarse de nuevo. No incluya config.dat, documentos ni respaldos privados en una nueva entrega. Los puertos del backend y la base son distintos; el backend prueba 8765 y si está ocupado reserva otro puerto libre sin detener procesos ajenos.')
    m.h('B4. Tecnologías y versiones',2)
    purposes={'fastapi':'Define rutas, inyección de dependencias y documentación OpenAPI.','uvicorn':'Servidor ASGI ejecutado dentro del runtime incluido.','sqlalchemy':'ORM, transacciones, consultas y metadatos de PostgreSQL.','psycopg2-binary':'Controlador PostgreSQL con libpq.','alembic':'Aplica migraciones versionadas; no se usa create_all en instalación normal.','python-dotenv':'Configuración de desarrollo. En escritorio se deshabilita la lectura del .env del proyecto.','pyjwt':'Firma y valida tokens JWT con expiración, jti y versión.','bcrypt':'Hash y comprobación de contraseñas.','python-multipart':'Recepción de formularios multipart para PDF.','email-validator':'Validación de direcciones en esquemas y asistente real.','reportlab':'Generación del PDF y QR del certificado.','pypdf':'Inspección estructural de PDF y rechazo de contenido activo.','tzdata':'Zona America/Bogota en instalaciones Windows.','pillow':'Captura dirigida de ventana para evidencia; soporte gráfico incluido.'}
    purposes.update({'annotated-doc':'Metadatos de documentación que utiliza FastAPI en sus parámetros.','annotated-types':'Restricciones de tipos Annotated utilizadas por Pydantic.','anyio':'Abstracción de concurrencia asíncrona de Starlette y FastAPI.','charset-normalizer':'Detección y normalización de codificaciones utilizada por ReportLab.','click':'Definición del CLI de Uvicorn; el uso cotidiano inicia el servidor desde Python.','dnspython':'Resolución y validaciones de dominios en email-validator.','greenlet':'Cambio de contexto que SQLAlchemy utiliza en su infraestructura de ejecución.','h11':'Implementación del protocolo HTTP/1.1 que usa Uvicorn.','idna':'Normalización de nombres de dominio internacionales para correo y URL.','mako':'Motor de plantillas de Alembic para generar revisiones.','markupsafe':'Escape de texto utilizado por Mako.','opentelemetry-api':'Interfaces de instrumentación transitivas; no se configura exportación a un servicio remoto.','pydantic':'Esquemas de entrada/salida, validación y serialización.','pydantic-core':'Motor compilado de validación de Pydantic.','starlette':'Capa ASGI, respuestas, middleware y ciclo de vida bajo FastAPI.','typing-extensions':'Compatibilidad de anotaciones de tipo requeridas por las bibliotecas.','typing-inspection':'Inspección de anotaciones que utiliza Pydantic.'})
    lock=(ROOT/'desktop/requirements-runtime.lock').read_text().splitlines()
    m.table(['Dependencia y versión','Uso'],[(entry,purposes.get(entry.split('==')[0],'Dependencia transitiva requerida por las bibliotecas anteriores; versión bloqueada para reconstrucción.')) for entry in lock],[1.3,2.7])
    package=json.loads((ROOT/'frontend/package.json').read_text())
    locknode=json.loads((ROOT/'frontend/package-lock.json').read_text())
    m.table(['Frontend','Versión instalada en compilación'],[(name,locknode['packages'].get('node_modules/'+name,{}).get('version',version)) for name,version in {**package['dependencies'],**package['devDependencies']}.items()],[2,1])
    m.p('Los paquetes Vite, Vitest, jsdom y el plugin React son herramientas de construcción y prueba; no se instalan ni ejecutan en el equipo destinatario. Node requerido para recompilar: '+package['engines']['node']+'. Python incluido: 3.12.10 x64. PostgreSQL probado: 18.3 x64. Inno Setup de construcción: 7.1.1 x64.')
    m.p('La distribución de escritorio se identifica como 2.1.0; la API existente conserva su versión OpenAPI '+openapi['info']['version']+'. No se modificó la versión funcional del API para ocultar esa distinción.')
    m.h('B5. Modelos, validaciones e integridad',2)
    m.p('El diccionario físico incluye las 15 tablas ORM y alembic_version, todas sus columnas, tipos, nulabilidad, valores por defecto, claves, índices y comprobaciones. Se generó desde una base PostgreSQL recién migrada, no desde un esquema supuesto. Consulte diccionario_datos.xlsx, esquema_fisico.json, estructura.sql y el diagrama ER. Los esquemas Pydantic completos están en openapi.json y ESQUEMAS_API.json.')
    m.table(['Tabla','Finalidad'],[(name,table_purpose(name)) for name in schema],[1.3,2.7])
    m.p('Los esquemas rechazan campos extra y validan fechas, tamaños, identificadores y referencias. La API aplica custodia y permisos además de claves foráneas y unicidad. Partidas: fecha no futura, libro configurado y referencia única por custodia y tipo. PDF: límite de 10 MiB, estructura válida y sin contenido activo. Matrimonio: otra persona existente, distinta y de la misma parroquia. Solicitudes y certificados: transiciones condicionadas y bloqueo de fila o actualización condicional ante concurrencia.')
    m.code('backend/app/schemas/registro.py',1,30)
    m.p('El fragmento anterior muestra validación de escritura. El esquema de lectura tolera datos históricos incompletos, pero eso no habilita emitir un certificado antes de completarlos.')
    m.h('B6. Migraciones y actualización de esquema',2)
    m.table(['Revisión','Efecto'],[('0001','Línea base de usuarios, personas, sacramentos, registros, documentos y auditoría.'),('0002','Custodia, parroquias, libros, solicitudes, certificados, notas y sesiones.'),('0003','Roles institucionales y ciclo diferenciado de certificación.'),('0004','Directorio y campos de ubicación de parroquias.'),('0005','Políticas persistentes de rol y configuración e historial de respaldos.'),('0006','Indicador debe_cambiar_password. No altera credenciales existentes ni elimina datos.')],[.7,3.3])
    m.p('El asistente exige respaldo y autorización para reutilizar una base SGD existente. La migración usa temporalmente las credenciales administrativas introducidas. La cuenta limitada no puede crear tablas ni modificar alembic_version. Cada inicio comprueba versión y columnas; si falta migración, muestra que debe abrir Configurar. No se ejecuta un downgrade destructivo. El CLI histórico ejecutar_schema.py solo adopta una base sin versión con revisión y --adopt-legacy explícito; nunca se usa esa adopción automáticamente en el asistente.')
    m.h('B7. Autenticación, autorización y seguridad local',2)
    m.p('Las contraseñas usan bcrypt. La sesión JWT requiere exp, sub y jti, y coincide con una fila sesiones activa y token_version del usuario. El bloqueo tras cinco fallos dura 15 minutos. Desactivar usuario, cambiar rol o contraseña invalida sesiones según el mecanismo real. Los permisos efectivos se consultan en cada petición desde politicas_roles y valores predeterminados, sin confiar en permisos enviados por el navegador.')
    m.p('El cambio obligatorio de contraseña se verifica en la dependencia get_usuario_actual: antes del reemplazo solo permite /auth/me, /auth/change-password y /auth/logout. El servidor rechaza la reutilización de la misma contraseña. En modo demo las cuentas ficticias se habilitan para evaluar; no se crean en el modo real. El modo real es una base nueva, no una promoción de los datos demo.')
    start=next(i for i,line in enumerate((ROOT/'backend/app/core/security.py').read_text().splitlines(),1) if 'def get_usuario_actual' in line)
    m.code('backend/app/core/security.py',start,start+28)
    m.p('La autorización eclesiástica no se deriva de ser administrador técnico. canAuthorizeCert se reserva al párroco, canApproveCuria al canciller y canSignCert a párroco y canciller. El alcance de custodia sigue aplicándose. El mecanismo firma una actuación en el sistema, no un PDF mediante certificado digital acreditado.')
    m.h('B8. API y endpoints reales',2)
    m.p('Base local: http://127.0.0.1:PUERTO/api. Autenticación: Authorization: Bearer TOKEN. /health comprueba SELECT 1. /api/auth/parroquias es el catálogo mínimo público; /api/certificados/verificar/{codigo} devuelve metadatos mínimos públicos. El resto requiere sesión según sus dependencias. Las rutas conservan barras finales cuando el router las define. /docs necesita recursos de interfaz Swagger desde su proveedor; para documentación sin Internet use el openapi.json incluido.')
    rows=[]
    for path,value in openapi['paths'].items():
        for method,operation in value.items():
            if method in {'get','post','patch','put','delete'}:
                protected='Bearer' if operation.get('security') else 'Público / salud'
                rows.append((method.upper()+' '+path,operation.get('summary','')+' · '+protected))
    m.table(['Endpoint','Operación'],rows,[1.8,2.2])
    m.p('Los modelos de entrada y salida, respuestas y parámetros se conservan íntegros en openapi.json. 401 corresponde a sesión no válida; 403 a permiso, custodia o contraseña temporal; 409 a conflicto de estado o unicidad; 413 a archivo grande; 422 a validación; 429 a bloqueo de intentos; 503 a persistencia no disponible. El cliente presenta mensajes sin mostrar contraseñas o cuerpos sensibles.')
    m.h('B9. Auditoría y manejo de errores',2)
    m.p('services.access.audit registra usuario, acción, entidad, ID, fecha, detalle y custodia. Certificados separa preparar, autorizar, aprobar Curia, firmar, descargar y anular. Correcciones guardan antes y después en notas_marginales. Respaldos conserva sus propias fechas, estados, hash y errores resumidos. La interfaz no ofrece editar o borrar auditoría. La API sanea errores de SQLAlchemy y validación; el lanzador solo registra el tipo de error en operaciones de configuración para evitar guardar credenciales.')
    m.h('B10. Respaldo automático y manual',2)
    m.steps(['Cree un respaldo desde Respaldos con una cuenta administradora. Espere completado y pulse Verificar y Descargar.','Copie el ZIP a un almacenamiento protegido fuera de la carpeta del programa. Incluye base.dump, documentos referenciados, manifiesto con hashes y RESTAURAR.txt.','Mantenga abierta la aplicación para la programación diaria o semanal. No es un servicio Windows.','Para un respaldo administrativo independiente, use PostgreSQL 18 pg_dump con --format=custom --no-owner --no-privileges y una base explícita. Use -W para pedir contraseña; no la ponga en la línea de comandos ni en un .bat.','Compruebe el archivo con pg_restore --list y pruebe la restauración completa en una base nueva. Conservar el archivo y un hash no prueba por sí solo que el sistema se pueda recuperar.'])
    m.p('Ejemplo manual con herramientas PostgreSQL, desde una terminal de ingeniero:')
    m.p('pg_dump -h 127.0.0.1 -p 5432 -U postgres -W -Fc --no-owner --no-privileges -d sgd_tibu_real -f sgd_tibu_real_respaldo.dump')
    m.h('B11. Restaurar mediante pgAdmin o línea de comandos',2)
    m.steps(['Cierre el SGD y conserve una copia inalterada de la base y documentos actuales. Nunca restaure sobre la única copia disponible.','En pgAdmin cree una base nueva, por ejemplo sgd_tibu_recuperacion, codificación UTF8. Elija Restore y el archivo .dump de formato Custom; active no owner/no privileges según la interfaz y revise el log.','Equivalente: createdb -h 127.0.0.1 -p 5432 -U postgres -W sgd_tibu_recuperacion. Después: pg_restore -h 127.0.0.1 -p 5432 -U postgres -W --no-owner --no-privileges --exit-on-error -d sgd_tibu_recuperacion ARCHIVO.dump. No use --clean en una base existente.','Compare revisión Alembic, tablas, conteos y relaciones con el manifiesto. Para el dump demo incluido hay siete cuentas, dos parroquias, dos personas, ocho libros, ocho partidas y cuatro tipos; no contiene sesiones ni certificados emitidos.','Restaure documentos del ZIP y compruebe cada SHA-256 contra manifiesto y documentos.hash_sha256. Las rutas ruta_archivo son absolutas dentro del perfil; si cambia de equipo, concilie esas rutas en la copia de recuperación para que queden dentro del nuevo directorio de documentos.','Solo después de validar el origen y el modo, marque administrativamente la base recuperada: COMMENT ON DATABASE sgd_tibu_recuperacion IS \'SGD_TIBU:real\'; use SGD_TIBU:demo si corresponde al respaldo ficticio. No marque un respaldo demo como real.','Configure el SGD con el nombre recuperado, un usuario de aplicación exclusivo y autorización de base existente. El asistente concede los permisos de datos y verifica el esquema; no reescribe cuentas ya presentes.','Autentique cuentas autorizadas, consulte una partida, descargue un documento y revise auditoría antes de adoptar la recuperación.'])
    m.p('estructura.sql contiene solo DDL. Ejecutarla no carga las cuentas ni datos demo. Para reconstruir desde código prefiera las migraciones del asistente; para recuperar una copia use el dump. La restauración real probada se documenta en 08_PRUEBAS/restauracion.json con comparación de filas y hashes por tabla.')
    m.h('B12. Actualizar sin perder datos',2)
    m.steps(['Cree y restaure un respaldo en una base de prueba antes de actualizar.','Cierre sesión y pulse Cerrar SGD. Compruebe que no hay trabajos de respaldo activos.','Ejecute el nuevo instalador con el mismo usuario Windows. Actualiza archivos del programa y conserva la base y la carpeta de datos separada.','Si el esquema necesita migración, abra Configurar, ingrese los datos de esa base, credenciales administrativas y marque que tiene respaldo y autoriza la actualización.','Compruebe versión, autenticación, partida, documento y auditoría. Conserve los respaldos previos hasta aceptar la versión.','Para volver atrás no baje la revisión Alembic destructivamente: recupere base y archivos en una copia independiente y ejecute la versión correspondiente.'])
    m.h('B13. Mantenimiento y solución de problemas',2)
    m.table(['Síntoma','Acción'],[
      ('No conecta con PostgreSQL','Revise servicio, puerto, credenciales y rama 18. El asistente detecta rutas habituales; una instalación personalizada sigue siendo utilizable si responde al host y puerto.'),('Puerto del SGD ocupado','El programa reserva otro puerto local libre y abre la URL correcta. No cierre procesos ajenos para liberar puertos.'),('Ya hay una instancia','El bloqueo por perfil reutiliza la URL de la instancia existente. Si se está configurando, espere; el bloqueo se libera al terminar el proceso.'),('Configuración DPAPI no legible','Abra con el mismo usuario Windows. Si cambió de perfil, vuelva a configurar la conexión; no intente copiar secretos como texto.'),('Migración pendiente o columna ausente','Respalde, cierre y abra Configurar con autorización. No utilice create_all sobre una base existente.'),('PDF o documento no disponible','Revise archivo, hash y directorio permitido; restaure base y documentos de una copia coherente.'),('Respaldo fallido','Compruebe herramientas PostgreSQL, versión de pg_dump, espacio libre y todos los PDF referenciados.'),('El QR no abre en otro dispositivo','La dirección es local por diseño. La exposición de red requiere un proyecto explícito de autenticación, TLS y despliegue; no cambie simplemente --host a 0.0.0.0.'),('Cerrar el navegador no apaga la API','Use Cerrar SGD en la ventana nativa. El cierre del servidor espera peticiones y detiene el programador.'),('Antivirus informa una detección','Detenga la ejecución, conserve hash y reporte, investigue el artefacto y use una reconstrucción verificada. No desactive la protección ni añada exclusiones para forzar una instalación.')],[1.2,2.8])
    m.h('B14. Recompilar desde el código fuente',2)
    m.steps(['Extraiga 05_CODIGO_FUENTE como un proyecto completo, conservando backend, frontend, desktop y launcher.','En el equipo de ingeniería instale Python 3.12 x64 y Node compatible. No son requisitos del destinatario.','Cree un venv aislado: python -m venv .build-venv. Instale: ./.build-venv/Scripts/python.exe -m pip install -r desktop/requirements-build.txt.','Ejecute desktop/Prepare-Toolchain.ps1. Descarga Python embebido oficial e Inno Setup y exige la firma válida del compilador.','En frontend ejecute npm ci. Vuelva a la raíz.','Ejecute ./.build-venv/Scripts/python.exe desktop/build.py. El script bloquea dependencias transitivas, compila React con /api, prepara Python y Tcl/Tk, compila el lanzador con csc de Windows y construye Inno Setup.','El artefacto aparece en .test-artifacts/distribution/inno-output/SGD_Tibu_Setup.exe. Verifique el manifiesto y pruebe primero en laboratorio.','Ejecute las pruebas backend y frontend. Para PostgreSQL use exclusivamente una base sgd_test sintética, como exige safe_database.py.','Reproduzca validate.py, capture.mjs y recovery.py en un laboratorio separado. Para regenerar documentación y ZIP ejecute desktop/deliver.py cuando existan las evidencias requeridas.','Complete la matriz de instalación limpia en Windows 10 y Windows 11, reinicie ambos entornos y pruebe actualización desde la versión anterior antes de declarar aceptada la entrega.'])
    m.p('La reconstrucción usa Windows, porque no se declara compilación cruzada de un instalador Windows desde otro sistema. Si cambia el bloqueo de dependencias, prepare una carpeta embedded-app nueva; el script se detiene para no mezclar versiones viejas y nuevas. Las herramientas de prueba no se incluyen en el runtime que utiliza el destinatario.')
    m.h('B15. Código real explicado',2)
    m.code('desktop/secure_config.py',1,51)
    m.p('crypt usa las funciones DPAPI de Windows y libera la memoria asignada. save escribe primero un archivo temporal cifrado y lo reemplaza al terminar. No cifra con una contraseña fija incluida en el código.')
    m.code('desktop/Launcher.cs',7,32)
    m.p('El lanzador construye argumentos con reglas de comillas de Windows y ejecuta directamente pythonw.exe incluido. No usa cmd, PowerShell, npm ni un servidor de desarrollo.')
    m.h('B16. Fuentes oficiales y trazabilidad',2)
    for title,url in SOURCES:m.p(title+': '+url,small=True)
    m.p('Las instrucciones funcionales se derivan del código fuente incluido y de capturas actuales; no se sustituyen los comportamientos implementados por funciones hipotéticas. El inventario SHA-256 registra los archivos de fuente y el manifiesto final registra los archivos de entrega.',small=True)
    m.save(OUT/'04_MANUAL_TECNICO','Manual_Tecnico_Instalacion_SGD_Tibu')


def table_purpose(name):
    return {'alembic_version':'Revisión de esquema aplicada.','usuarios':'Identidad, contraseña bcrypt, rol, custodia y estado de acceso.','personas':'Ficha del titular de asientos, con custodia parroquial.','sacramentos':'Catálogo de los cuatro tipos de partida.','registros_sacramentales':'Asientos con persona, tipo, custodia, referencia de libro y datos adicionales.','documentos':'Metadatos, ubicación privada y SHA-256 de soportes PDF.','auditoria':'Eventos trazables del servidor y su alcance de custodia.','parroquias':'Directorio institucional, código, ubicación y disponibilidad.','libros':'Libros por parroquia y tipo de partida.','solicitudes':'Trámites entre parroquias y su decisión.','certificados':'Instantánea y actuaciones del ciclo documental.','notas_marginales':'Historial anterior/posterior de correcciones y notas.','sesiones':'Identificador jti, usuario, expiración y revocación.','politicas_roles':'Capacidades editables y revisión por cargo.','configuracion_respaldos':'Programación y reserva del trabajo de respaldo.','respaldos':'Historial, estado, hash, tamaño y verificación de copias.'}.get(name,'Tabla de la aplicación según el esquema físico inspeccionado.')


def dictionary(schema):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
    from app.core.roles import ROLES
    from app.services.permisos import predeterminados, PERMISOS
    wb=Workbook();wb.remove(wb.active)
    sheets={
      'Tablas':[['Tabla','Finalidad','Columnas','Clave primaria']],
      'Columnas':[['Tabla','Columna','Tipo PostgreSQL','Acepta NULL','Valor por defecto','Autoincremento','PK','FK','Descripción']],
      'Relaciones':[['Tabla hija','Columnas','Tabla padre','Columnas padre','Nombre','Opciones']],
      'Unicidad':[['Tabla','Restricción','Columnas']],
      'Comprobaciones':[['Tabla','Restricción','Expresión SQL']],
      'Indices':[['Tabla','Nombre','Columnas','Único','Opciones']],
      'Permisos':[['Rol','Capacidad','Nombre','Predeterminado']],
    }
    for name,info in schema.items():
        pk=info['pk']['constrained_columns']
        sheets['Tablas'].append([name,table_purpose(name),len(info['columns']),', '.join(pk)])
        for column in info['columns']:
            foreign=[fk for fk in info['foreign_keys'] if column['name'] in fk['constrained_columns']]
            description=FIELD_HELP.get(column['name']) or {
              'id':'Identificador primario interno; no se introduce como dato libre en altas normales.',
              'password_hash':'Hash bcrypt; nunca contraseña en texto plano.', 'token_version':'Versión de credenciales que invalida sesiones previas.',
              'intentos_fallidos':'Número de fallos de autenticación desde el último reinicio de contador.', 'bloqueado_hasta':'Fin del bloqueo temporal de autenticación.',
              'debe_cambiar_password':'Impide usar módulos antes de reemplazar la contraseña temporal.', 'estado':'Estado del ciclo del recurso; sus valores válidos se detallan en Comprobaciones.',
              'instantanea':'Copia JSON del contenido de la partida al preparar el certificado.', 'ruta_archivo':'Ruta privada del PDF dentro del directorio configurado.',
              'hash_sha256':'Resumen SHA-256 del archivo documental para verificar integridad.', 'permisos':'JSON con cambios editables de las capacidades de rol.',
              'revision':'Versión de concurrencia de la política de rol.', 'codigo_verificacion':'Código aleatorio para consultar validez y metadatos mínimos.',
              'anterior':'Contenido JSON anterior a una corrección o nota.', 'posterior':'Contenido JSON posterior a una corrección o nota.',
              'version_num':'Revisión Alembic vigente.', 'datos':'JSON con campos específicos del tipo de partida.', 'detalle':'Detalle saneado de un evento o resultado.',
              'revocada':'Si es verdadero, el identificador de sesión deja de ser válido.', 'expira':'Fecha de expiración de la sesión.',
            }.get(column['name'])
            if not description:
                if column['name'].startswith('fecha') or column['type'].startswith('TIMESTAMP'):description='Fecha y hora del evento indicado por el nombre; consulte el modelo y la actuación relacionada.'
                elif foreign:description='Referencia a '+foreign[0]['referred_table']+' mediante clave foránea.'
                else:description='Atributo '+column['name'].replace('_',' ')+' de '+name+'. Véanse el modelo y las restricciones físicas adjuntas.'
            sheets['Columnas'].append([name,column['name'],column['type'],'Sí' if column['nullable'] else 'No',str(column.get('default') or ''),str(column.get('autoincrement',False)),'Sí' if column['name'] in pk else 'No', '; '.join(fk['referred_table']+'.'+','.join(fk['referred_columns']) for fk in foreign),description])
        for fk in info['foreign_keys']:sheets['Relaciones'].append([name,','.join(fk['constrained_columns']),fk['referred_table'],','.join(fk['referred_columns']),fk['name'],json.dumps(fk.get('options',{}),ensure_ascii=False)])
        for unique in info['unique']:sheets['Unicidad'].append([name,unique['name'],','.join(unique['column_names'])])
        for check in info['checks']:sheets['Comprobaciones'].append([name,check['name'],check['sqltext']])
        for index in info['indexes']:sheets['Indices'].append([name,index['name'],','.join(index['column_names']),str(index['unique']),json.dumps(index.get('dialect_options',{}))])
    for role in ROLES:
        for key,label,_ in PERMISOS:sheets['Permisos'].append([role,key,label,predeterminados(role)[key]])
    for name,rows in sheets.items():
        ws=wb.create_sheet(name)
        for row in rows:ws.append(row)
        ws.freeze_panes='A2';ws.auto_filter.ref=ws.dimensions
        for cell in ws[1]:cell.font=Font(name='Times New Roman',size=12,bold=True,color='FFFFFF');cell.fill=PatternFill('solid',fgColor='174438')
        for row in ws.iter_rows(min_row=2):
            for cell in row:cell.font=Font(name='Times New Roman',size=12);cell.alignment=Alignment(vertical='top',wrap_text=True)
        for i in range(1,ws.max_column+1):ws.column_dimensions[get_column_letter(i)].width=min(70,max(18,max(len(str(row[i-1])) for row in rows[:35])*.7))
    wb.save(OUT/'02_BASE_DATOS_POSTGRESQL/diccionario_datos.xlsx')


def diagrams(schema):
    folder=OUT/'06_DIAGRAMAS'
    font=ImageFont.truetype(str(Path(os.environ['WINDIR'])/'Fonts/times.ttf'),20)
    bold=ImageFont.truetype(str(Path(os.environ['WINDIR'])/'Fonts/timesbd.ttf'),22)
    # Four wide columns, table height based on every physical column. Full-size
    # artifact remains readable by zoom; separate dictionaries explain semantics.
    names=list(schema)
    groups=[names[i::4] for i in range(4)]
    positions={};width=3200;heights=[]
    for x,group in enumerate(groups):
        y=100
        for name in group:
            height=60+len(schema[name]['columns'])*30
            positions[name]=(40+x*800,y,730,height);y+=height+85
        heights.append(y)
    height=max(heights)+40
    image=PILImage.new('RGB',(width,height),'white');draw=ImageDraw.Draw(image)
    draw.text((40,25),'SGD Tibú · Modelo entidad-relación físico · PostgreSQL 18 · Alembic 0006',fill='#173f34',font=bold)
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}"><rect width="100%" height="100%" fill="white"/><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 Z" fill="#7c8e88"/></marker></defs>']
    mermaid=['erDiagram'];dot=['digraph ER { rankdir=LR; node [shape=record];']
    for name,info in schema.items():
        mermaid.append('  '+name+' {')
        for column in info['columns']:
            type=re.sub('[^A-Za-z0-9_]','_',column['type'])
            mermaid.append('    '+type+' '+column['name']+(' PK' if column['name'] in info['pk']['constrained_columns'] else ''))
        mermaid.append('  }')
        for fk in info['foreign_keys']:
            parent=fk['referred_table']; a=positions[name];b=positions[parent]
            start=(a[0]+a[2],a[1]+25);end=(b[0],b[1]+25)
            draw.line([start,(start[0]+20,start[1]),(end[0]-20,end[1]),end],fill='#a0aaa6',width=2)
            draw.polygon([end,(end[0]-10,end[1]-5),(end[0]-10,end[1]+5)],fill='#7c8e88')
            svg.append(f'<path d="M {start[0]},{start[1]} C {start[0]+60},{start[1]} {end[0]-60},{end[1]} {end[0]},{end[1]}" fill="none" stroke="#a0aaa6" stroke-width="2" marker-end="url(#arrow)"/>')
            label=','.join(fk['constrained_columns'])
            mermaid.append('  '+parent+' ||--o{ '+name+' : "'+label+'"')
            dot.append('  "'+parent+'" -> "'+name+'" [label="'+label+'"];')
    for name,(x,y,w,h) in positions.items():
        draw.rectangle((x,y,x+w,y+h),fill='white',outline='#173f34',width=2)
        draw.rectangle((x,y,x+w,y+45),fill='#173f34');draw.text((x+12,y+8),name,fill='white',font=bold)
        svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="white" stroke="#173f34" stroke-width="2"/><rect x="{x}" y="{y}" width="{w}" height="45" fill="#173f34"/><text x="{x+12}" y="{y+30}" fill="white" font-family="Times New Roman" font-size="22">{escape(name)}</text>')
        for i,column in enumerate(schema[name]['columns']):
            key='PK ' if column['name'] in schema[name]['pk']['constrained_columns'] else ('FK ' if any(column['name'] in f['constrained_columns'] for f in schema[name]['foreign_keys']) else '')
            text=key+column['name']+' : '+column['type']+(' NULL' if column['nullable'] else ' NOT NULL')
            draw.text((x+12,y+50+i*30),text,fill='#17261f',font=font)
            svg.append(f'<text x="{x+12}" y="{y+72+i*30}" fill="#17261f" font-family="Times New Roman" font-size="20">{escape(text)}</text>')
    image.save(folder/'entidad_relacion.png');(folder/'entidad_relacion.svg').write_text(''.join(svg)+'</svg>',encoding='utf8')
    (folder/'entidad_relacion.mmd').write_text('\n'.join(mermaid),encoding='utf8')
    (folder/'entidad_relacion.dot').write_text('\n'.join(dot+['}']),encoding='utf8')
    # Small runtime diagram.
    image=PILImage.new('RGB',(1600,680),'white');d=ImageDraw.Draw(image)
    boxes=[(40,80,430,240,'Acceso directo y lanzador C#\nPython oficial incluido\nVentana Tkinter'),(590,80,1030,240,'Uvicorn + FastAPI existente\n127.0.0.1:puerto local\nReact compilado + /api'),(1190,80,1560,240,'PostgreSQL 18 x64\nUsuario limitado\nMigraciones 0001 a 0006'),(590,400,1030,610,'Perfil Windows del usuario\nDPAPI: config.dat\nDocumentos, respaldos y registros')]
    for x1,y1,x2,y2,label in boxes:
        d.rounded_rectangle((x1,y1,x2,y2),radius=10,fill='#f2f6f4',outline='#173f34',width=3);d.multiline_text((x1+22,y1+28),label,font=bold,fill='#173f34',spacing=12)
    for start,end in [((430,160),(590,160)),((1030,160),(1190,160)),((810,240),(810,400))]:
        d.line((start,end),fill='#173f34',width=4)
        if end[1]==start[1]:d.polygon([end,(end[0]-15,end[1]-8),(end[0]-15,end[1]+8)],fill='#173f34')
        else:d.polygon([end,(end[0]-8,end[1]-15),(end[0]+8,end[1]-15)],fill='#173f34')
    d.text((40,20),'SGD Diócesis de Tibú · Arquitectura de distribución local',font=bold,fill='#173f34')
    image.save(folder/'arquitectura.png')
    (folder/'arquitectura.mmd').write_text('flowchart LR\n A[Acceso directo y lanzador] --> B[Python oficial y ventana Tkinter]\n B --> C[Uvicorn y FastAPI en loopback]\n C --> D[React compilado y API]\n C --> E[PostgreSQL 18 con usuario limitado]\n C --> F[Perfil Windows: DPAPI, documentos y respaldos]\n',encoding='utf8')
    (folder/'ciclo_certificado.mmd').write_text('stateDiagram-v2\n [*] --> preparado\n preparado --> autorizado: Párroco custodio\n autorizado --> firmado: Párroco en circuito ordinario\n autorizado --> aprobado_curia: Canciller si requiere Curia\n aprobado_curia --> firmado: Canciller\n preparado --> anulado\n autorizado --> anulado\n aprobado_curia --> anulado\n firmado --> anulado\n',encoding='utf8')


def test_report():
    m=Manual('Reporte de instalación y pruebas · SGD Tibú','Resultados ejecutados, alcance de laboratorio y aceptación pendiente en Windows limpio.')
    m.h('Conclusión de aceptación')
    m.p('El instalador estándar y el programa incluido funcionan en las pruebas locales descritas. El paquete es un candidato de entrega. El criterio de aceptación final del solicitante permanece PENDIENTE porque no se dispone de una máquina Windows limpia autorizada y no se reinició Windows. No se sustituye esa comprobación por ejecutar el programa con PATH reducido.')
    installer=load('instalador.json');browser=load('navegador.json')
    m.p('Equipo comprobado: '+installer['windows']+'; '+installer['arquitectura']+'. PostgreSQL 18.3 en clúster nuevo de pruebas, enlazado exclusivamente a 127.0.0.1:55453. No se leyó backend/.env ni se abrió la base de uso habitual. Las cuentas, parroquias, personas y partidas son ficticias.')
    m.h('Matriz de resultados reales')
    checks=[
      ('Compilación React','APROBADA','Compilación Vite en modo producción, dirección relativa /api. Sin Vite o Node en destino.'),
      ('Instalador autónomo','APROBADA','Inno Setup instala runtime oficial, código backend, dependencias y frontend compilado. Logs de instalación conservados en el laboratorio.'),
      ('Inicio habitual','APROBADA','Se abrió la ventana nativa, comprobó el backend y se observó la ventana del navegador predeterminado con el título de la aplicación.'),
      ('Asistente gráfico','APROBADA','Se abrió y capturó la ventana real. Se corrigió la dependencia zlib1.dll de Tcl durante la validación.'),
      ('Configuración desde la interfaz','APROBADA','Se diligenciaron los controles Tkinter del ejecutable instalado y se invocó su botón real; creó y comprobó otra base ficticia.'),
      ('Inicialización demo','APROBADA','Base nueva, rol limitado, migraciones hasta 0006, dos parroquias y siete cuentas ficticias.'),
      ('Idempotencia','APROBADA','Reejecución sin autorización de base existente se rechaza; autorizada conserva conteos.'),
      ('Credenciales y DPAPI','APROBADA','No se persiste la contraseña administrativa; config.dat no contiene la URL en texto plano.'),
      ('Permisos PostgreSQL','APROBADA','Rol sin superusuario, creación de base/roles, replicación o bypass RLS; sin CREATE en public ni UPDATE en alembic_version.'),
      ('Siete accesos reales','APROBADA','Siete roles autenticados mediante /api/auth/login, /auth/me y navegación real en navegador.'),
      ('Consulta de módulos','APROBADA','Nueve endpoints de consulta comprobados para cada rol; 19 módulos y siete paneles capturados.'),
      ('Certificado ordinario','APROBADA','Preparar, autorizar, firmar, PDF, verificar y anular; administrador no autoriza.'),
      ('Certificado Curia','APROBADA','Autorización parroquial, aprobación de canciller, firma, PDF y anulación.'),
      ('Respaldo desde la API','APROBADA','Trabajo real usa pg_dump del PostgreSQL instalado; copia completada, tamaño y SHA-256 comprobados.'),
      ('Instancia única','APROBADA','Segunda apertura reutiliza PID de Python y URL de la instancia activa.'),
      ('Cierre y reapertura','APROBADA','Cierre por control local autenticado; servidor concluye y se abre nuevamente.'),
      ('Reinstalación','APROBADA','Mismo instalador aplicado nuevamente; filas y hashes por tabla se conservan.'),
      ('Modo real','APROBADA','Base separada sin cuentas públicas demo. Contraseña temporal bloquea módulos hasta cambiarse.'),
      ('Dump y restauración','APROBADA','Dump nuevo solo demo; restauración a base nueva con igualdad de filas y hashes.'),
      ('Siete cuentas del dump restaurado','APROBADA','Se configuró el ejecutable contra la restauración y se autentificaron los siete correos y contraseñas demo mediante la API real.'),
      ('PostgreSQL detenido y reiniciado','APROBADA','Se detuvo únicamente el clúster de laboratorio; el programa informó el fallo y reconectó después de arrancarlo. No es reinicio de Windows.'),
      ('Interfaz instalada','APROBADA',str(browser['screenshots'])+' capturas; '+str(len(browser['errors']))+' errores JavaScript. Chrome '+browser['browser']+'.'),
      ('Windows 10 limpio','PENDIENTE','No se ejecutó en una VM limpia sin Python, Node ni herramientas de desarrollo.'),
      ('Windows 11 limpio','PENDIENTE','El host de desarrollo no es un equipo limpio. Consulta a Hyper-V denegada por permisos.'),
      ('Reinicio de Windows','PENDIENTE','No se reinició el sistema operativo. Reapertura de aplicación no equivale a reinicio de Windows.'),
      ('Actualización entre versiones','PENDIENTE PARCIAL','Se probó reinstalación de la misma versión; resta validar migración y actualización desde cada versión distribuida anterior.'),
    ]
    m.table(['Caso','Resultado','Evidencia y límite'],checks,[1.1,.8,2.1])
    m.h('Pruebas automatizadas disponibles')
    totals=[]
    for file,label in [('backend-postgresql.xml','Suite backend SQLite y PostgreSQL'),('password-temporal.xml','Ampliación: contraseña temporal')]:
        suite=ET.parse(EVIDENCE/file).getroot().find('testsuite')
        passed=int(suite.attrib['tests'])-int(suite.attrib.get('failures',0))-int(suite.attrib.get('errors',0))-int(suite.attrib.get('skipped',0))
        totals.append((label,str(passed)+' aprobadas; '+suite.attrib.get('skipped','0')+' omitidas',suite.attrib.get('time','')+' segundos'))
    frontend=json.loads((BUILD/'frontend.json').read_text())
    totals.append(('Frontend Vitest',str(frontend['numPassedTests'])+' aprobadas; '+str(frontend['numFailedTests'])+' fallidas','JSON de resultados incluido'))
    m.table(['Conjunto','Resultado','Duración / origen'],totals,[1.6,1.4,1.4])
    m.p('La suite completa aprobó 107 casos y omitió un caso específico de PostgreSQL al ejecutar su parámetro SQLite. Los dos casos nuevos de contraseña temporal se ejecutaron después y pasaron en ambos motores. No se suman ejecuciones repetidas como casos funcionales diferentes. Hay avisos de deprecación en herramientas de prueba que no se presentan como fallos del sistema.')
    m.h('Incidencias encontradas y resolución')
    m.steps(['El lanzador original requería herramientas de desarrollo: se preparó una distribución con runtime incluido y frontend compilado.','Un empaquetado experimental PyInstaller fue bloqueado y no se volvió a ejecutar. Se reemplazó por Python oficial firmado e Inno Setup; no se modificó antivirus.','La primera prueba de duplicados encontró una lectura de un byte bloqueado en Windows: se cambió la comprobación de tamaño y se repitió la prueba correctamente.','La primera apertura del asistente mostró una dependencia Tcl faltante: se incluyó zlib1.dll y se volvió a abrir y capturar el asistente real.','Los primeros intentos de pytest PostgreSQL fallaron por el directorio temporal compartido: se usó un directorio nuevo bajo el proyecto y la suite completó 107 aprobados.','La validación VM limpia sigue pendiente por falta de permisos de Hyper-V. No se creó una evidencia ni una captura falsa para declararla aprobada.'])
    m.h('Guion obligatorio de aceptación pendiente')
    m.steps(['Prepare una VM Windows 10 x64 sin Python, Node, NPM ni herramientas de desarrollo; tome snapshot. Repita después en Windows 11.','Instale PostgreSQL 18 x64 desde la fuente oficial, incluyendo herramientas de línea de comandos.','Transfiera este ZIP, verifique su SHA-256 y ejecute el instalador estándar.','Complete el asistente en modo demo con una base nueva. Registre pantalla final y logs sin contraseñas.','Abra el acceso directo y compruebe backend empaquetado, frontend compilado y siete accesos.','Ejecute una partida, solicitud entre custodias, certificado ordinario y de Curia, soporte PDF, auditoría y respaldo.','Cierre y reabra; reinicie Windows, espere PostgreSQL y abra de nuevo el acceso directo.','Aplique una actualización desde la versión anterior real distribuida y verifique filas, documentos y acceso.','Guarde capturas y logs, anote versión exacta de Windows y PostgreSQL y firme el acta de aceptación. Solo entonces cambie el estado del paquete a entrega final aceptada.'])
    m.image(EVIDENCE/'capturas/asistente_postgresql.png','Captura real local del asistente; no es una captura de instalación en VM limpia.')
    m.save(OUT/'08_PRUEBAS','Reporte_Instalacion_y_Pruebas')


def copy_sources():
    target=OUT/'05_CODIGO_FUENTE'
    forbidden={'node_modules','venv','.venv','__pycache__','.git','uploads','backups','build','.test-tools','.test-runtime','.pytest_cache','.test-artifacts'}
    allow={'.py','.js','.jsx','.css','.html','.json','.ini','.mako','.md','.txt','.ps1','.cs','.iss','.svg','.ico','.lock','.sql'}
    inventory=[]
    for directory in ['backend','frontend','desktop','launcher','database']:
        for path in sorted((ROOT/directory).rglob('*')):
            if not path.is_file():continue
            relative=path.relative_to(ROOT)
            if forbidden.intersection(relative.parts):continue
            if path.name.startswith('.env') and path.name!='.env.example':continue
            if path.name in {'test-results.json'} or path.suffix not in allow:continue
            dest=target/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,dest)
            inventory.append(dict(archivo=relative.as_posix(),bytes=path.stat().st_size,sha256=hashfile(path)))
    (target/'README.md').write_text('# Código fuente del SGD Tibú\n\nEste árbol contiene backend, frontend, desktop, launcher y database del proyecto existente.\nLa distribución funciona con PostgreSQL 18 y el runtime incluido; no exige herramientas de desarrollo al destinatario.\n\nPara reconstruir el instalador, siga desktop/README.md y el Manual_Tecnico_Instalacion_SGD_Tibu de la carpeta 04_MANUAL_TECNICO del ZIP.\nLos requisitos Python y Node de esas instrucciones son únicamente del equipo de ingeniería.\n\nINVENTARIO_FUENTES_SHA256.json registra los archivos originales copiados.\nCOMPONENTES_VIGENTES.txt identifica los módulos conectados.\nLICENCIAS_TERCEROS.txt conserva los avisos de las dependencias.\nNo se incluye configuración privada ni bases reales.\n',encoding='utf8')
    (target/'INVENTARIO_FUENTES_SHA256.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding='utf8')
    active=['App.jsx','components/Dashboard.jsx','components/Login.jsx','components/PasswordRequired.jsx','components/ConnectedPages.jsx','components/ConnectedRecords.jsx','components/Overview.jsx','components/ParishDirectory.jsx','components/RolePermissions.jsx','components/BackupCenter.jsx','components/WorkspaceBar.jsx','components/Sidebar.jsx','components/shared/ConnectedUI.jsx','context/AuthContext.jsx','api/axiosConfig.js']
    (target/'COMPONENTES_VIGENTES.txt').write_text('Entrada: frontend/index.html -> src/index.js -> App.jsx.\nRutas reales definidas en Dashboard.jsx.\n\nComponentes conectados principales:\n'+'\n'.join('frontend/src/'+name for name in active)+'\n\nOtros componentes históricos permanecen como código original; no se convierten en módulos activos ni se describen como funciones disponibles.\nNo se incluye .env, datos locales, uploads, backups, venv ni node_modules.\n',encoding='utf8')


def notices():
    text=['AVISOS DE DEPENDENCIAS DE TERCEROS','El código del proyecto conserva la titularidad y condiciones de sus autores.','Python oficial: véase LICENSE.txt incluido en runtime.','Tcl/Tk: véanse license.terms incluidos con Tcl/Tk.','Las licencias siguientes se copian desde las dependencias utilizadas.\n']
    app=BUILD/'embedded-app'
    runtime=app/'runtime/Lib/site-packages'
    for path in sorted(runtime.glob('*.dist-info')):
        text.append('\n=== '+path.name+' ===\n')
        for file in sorted(path.rglob('*')):
            if file.is_file() and any(word in file.name.lower() for word in ['license','copying','notice']):
                try:text.append(file.read_text(encoding='utf8'))
                except UnicodeError:pass
    lock=json.loads((ROOT/'frontend/package-lock.json').read_text())
    for name,package in lock['packages'].items():
        if not name or package.get('dev'):continue
        text.append('\n=== '+name+' '+package.get('version','')+' · licencia '+str(package.get('license','Consultar paquete'))+' ===\n')
        folder=ROOT/'frontend'/name
        if folder.exists():
            for file in sorted(folder.glob('*')):
                if file.is_file() and file.name.lower().startswith(('license','copying','notice')):
                    try:text.append(file.read_text(encoding='utf8'))
                    except UnicodeError:pass
    (OUT/'05_CODIGO_FUENTE/LICENCIAS_TERCEROS.txt').write_text('\n'.join(text),encoding='utf8')


def database_files():
    folder=OUT/'02_BASE_DATOS_POSTGRESQL'
    for name in ['sgd_tibu_demo.dump','estructura.sql']:shutil.copy2(EVIDENCE/'base'/name,folder/name)
    shutil.copytree(ROOT/'backend/migrations',folder/'migraciones',dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
    shutil.copy2(EVIDENCE/'esquema.json',folder/'esquema_fisico.json')
    (folder/'Inicializar_SGD.ps1').write_text("$ErrorActionPreference = 'Stop'\n$exe = Join-Path $env:LOCALAPPDATA 'Programs/SGDTibu/SGD_Tibu.exe'\nif (-not (Test-Path -LiteralPath $exe)) { throw 'Instale primero SGD_Tibu_Setup.exe' }\nStart-Process -FilePath $exe\n",encoding='utf8')
    check = '''param([string]$ExecutablePath = (Join-Path $env:LOCALAPPDATA 'Programs/SGDTibu/SGD_Tibu.exe'))
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $ExecutablePath)) { throw 'Instale primero el SGD' }
$resultado = Join-Path $env:TEMP ('sgd-check-' + [guid]::NewGuid().ToString('N') + '.json')
$p = Start-Process -FilePath $ExecutablePath -ArgumentList @('--check','--no-browser','--result',('"' + $resultado + '"')) -WindowStyle Hidden -Wait -PassThru
if (Test-Path -LiteralPath $resultado) { Get-Content -LiteralPath $resultado; Remove-Item -LiteralPath $resultado }
if ($p.ExitCode -ne 0) { throw 'No se confirmó la conexión. Revise el mensaje y el servicio PostgreSQL.' }
'''
    (folder/'Comprobar_Conexion.ps1').write_text(check,encoding='utf8')
    (folder/'LEEME_BASE_DATOS.txt').write_text('BASE DE DEMOSTRACIÓN EXCLUSIVAMENTE FICTICIA\n\nsgd_tibu_demo.dump es formato custom de PostgreSQL 18.3, sin propietarios ni privilegios específicos del laboratorio.\nContiene siete cuentas públicas demo, dos parroquias ficticias, dos personas, ocho libros, ocho partidas y cuatro tipos; no contiene sesiones ni certificados emitidos.\n\nLa instalación normal no exige restaurarlo: el asistente aplica las migraciones y carga la misma semilla ficticia solo en modo demo.\n\nRestauración manual: cree una BASE_NUEVA y ejecute con las herramientas PostgreSQL 18:\npg_restore -h 127.0.0.1 -p 5432 -U postgres -W --no-owner --no-privileges --exit-on-error -d BASE_NUEVA sgd_tibu_demo.dump\n\nNo use --clean ni una base con información existente. estructura.sql es solo DDL, sin cuentas.\nPara abrir una restauración demo mediante el asistente, tras verificarla marque la base como SGD_TIBU:demo y autorice su reutilización, según el manual técnico.\nEl diccionario físico y las migraciones 0001 a 0006 acompañan la copia.\nNo utilice estas cuentas en producción; cree una instalación real nueva.\n',encoding='utf8')


def first_read():
    m=Manual('LEEME PRIMERO · SGD Diócesis de Tibú','Programa local para Windows x64 con Python, FastAPI y React compilado incluidos.')
    m.h('Qué debe instalar el destinatario')
    m.p('Solo PostgreSQL 18 x64 por separado. Incluya servidor y herramientas de línea de comandos; pgAdmin es recomendable. No necesita Python, Node, NPM, Visual Studio Code ni abrir terminales para utilizar el SGD.')
    m.steps(['Instale PostgreSQL desde https://www.postgresql.org/download/windows/ y conserve su contraseña administrativa de forma privada.','Descomprima este ZIP y abra 01_INSTALADOR/SGD_Tibu_Setup.exe.','En el asistente indique host 127.0.0.1, puerto y credenciales PostgreSQL. Elija una base nueva y un usuario de aplicación exclusivo.','Seleccione Demostración para las cuentas ficticias de 07_ACCESOS_DEMO, o Real para crear su propio administrador sin datos demo.','Espere la creación de base, migraciones y comprobación. En Real, cambie la contraseña temporal al primer acceso.','Abra SGD Diócesis de Tibú desde el escritorio. Mantenga abierta la ventana del SGD y use Cerrar SGD al terminar.'])
    m.h('Estado de validación: candidato de entrega')
    m.p('Se probaron el instalador, los siete accesos, módulos, certificados, respaldos, restauración, cierre, reapertura y reinstalación local sin pérdida de datos. Falta ejecutar la prueba obligatoria en Windows 10 y Windows 11 limpios y después de reiniciar Windows. Esta sesión no tiene permisos de Hyper-V para realizarla. Por eso el paquete todavía no se declara una entrega final aceptada.')
    m.h('Dónde encontrar cada elemento')
    m.table(['Carpeta','Contenido'],[(folder,description) for folder,description in zip(FOLDERS,['Instalador estándar autónomo.','Dump ficticio restaurado y comprobado, DDL, migraciones, diccionario y scripts.','Manual de usuario en DOCX y PDF con capturas vigentes.','Manual técnico e instalación en DOCX y PDF.','Fuente existente y nueva capa de distribución, con dependencias bloqueadas.','Diagrama ER y arquitectura editables y en imagen.','Siete cuentas ficticias individuales, solo para modo demostración.','Reporte real, JSON/XML de pruebas y matriz de aceptación pendiente.'])],[1,2.5])
    m.h('Conservar datos al actualizar')
    m.p('El programa se instala en %LOCALAPPDATA%\\Programs\\SGDTibu. Los datos están en PostgreSQL y en %LOCALAPPDATA%\\SGD Tibu\\datos. Respalde base y documentos antes de actualizar. El instalador y la desinstalación no eliminan la base ni esa carpeta de datos.')
    m.h('Límites del modo local')
    m.p('El servidor solo escucha 127.0.0.1. El QR verifica el estado en el mismo equipo. La firma registra una actuación autenticada, no una firma digital certificada por un proveedor acreditado. El instalador del proyecto no tiene certificado propio de firma de código; los binarios oficiales de Python y el compilador utilizado sí fueron comprobados mediante sus firmas de proveedor.')
    m.save(OUT,'LEEME_PRIMERO')


def main():
    for folder in FOLDERS:(OUT/folder).mkdir(parents=True,exist_ok=True)
    captures=load('capturas.json');schema=load('esquema.json')
    from app.main import app
    openapi=app.openapi()
    source=OUT/'05_CODIGO_FUENTE'
    (source/'openapi.json').write_text(json.dumps(openapi,ensure_ascii=False,indent=2),encoding='utf8')
    (source/'ESQUEMAS_API.json').write_text(json.dumps(openapi['components']['schemas'],ensure_ascii=False,indent=2),encoding='utf8')
    copy_sources();notices();database_files();dictionary(schema);diagrams(schema)
    shutil.copy2(BUILD/'inno-output/SGD_Tibu_Setup.exe',OUT/'01_INSTALADOR/SGD_Tibu_Setup.exe')
    shutil.copy2(ROOT/'desktop/AVISOS_DISTRIBUCION.txt',OUT/'01_INSTALADOR/AVISOS_DISTRIBUCION.txt')
    accounts=json.loads((ROOT/'desktop/demo_accounts.json').read_text())
    lines=['ACCESOS DE DEMOSTRACIÓN — EXCLUSIVAMENTE FICTICIOS','Comprobados mediante autenticación real API y navegador.','Estos accesos NO se crean en una instalación Real. No use una base demo para datos reales.','Para uso real cree una base nueva y su administrador individual; el sistema exige cambiar su contraseña temporal.','']
    for item in accounts:
        context='Parroquia Ficticia A (DEMO_A)' if item['role'] in {'parroco','secretario_parroquial','consulta'} else 'Acceso diocesano / administración'
        lines += ['Rol: '+item['role'],'Usuario (correo): '+item['email'],'Contraseña temporal ficticia: '+item['password'],'Contexto de inicio: '+context,'']
    (OUT/'07_ACCESOS_DEMO/ACCESOS_DEMOSTRACION.txt').write_text('\n'.join(lines),encoding='utf8')
    destination=OUT/'03_MANUAL_USUARIO/capturas';shutil.copytree(EVIDENCE/'capturas',destination,dirs_exist_ok=True)
    for path in EVIDENCE.iterdir():
        if path.is_file() and path.name not in {'capture-url.json'}:
            shutil.copy2(path,OUT/'08_PRUEBAS'/path.name)
    shutil.copy2(BUILD/'frontend.json',OUT/'08_PRUEBAS/frontend-vitest.json')
    (OUT/'08_PRUEBAS/ACEPTACION_PENDIENTE.json').write_text(json.dumps(dict(estado='CANDIDATO_DE_ENTREGA',windows_10_limpio='PENDIENTE',windows_11_limpio='PENDIENTE',reinicio_windows='PENDIENTE',actualizacion_version_anterior='PENDIENTE',motivo='Sin autorización para acceder a VM Hyper-V; no se reinició el host de trabajo',pruebas_locales='Ver Reporte_Instalacion_y_Pruebas.pdf y evidencias reales'),ensure_ascii=False,indent=2),encoding='utf8')
    print('Generando manual de usuario…',flush=True);user_manual(captures)
    print('Generando manual técnico…',flush=True);technical_manual(schema,openapi)
    print('Generando reporte y lectura inicial…',flush=True);test_report();first_read()
    for folder,base,short in [('03_MANUAL_USUARIO','Manual_Usuario_SGD_Tibu','Manual_Usuario'),('04_MANUAL_TECNICO','Manual_Tecnico_Instalacion_SGD_Tibu','Manual_Tecnico')]:
        for extension in ['docx','pdf']:shutil.copy2(OUT/folder/(base+'.'+extension),OUT/folder/(short+'.'+extension))
    manifest=[]
    for file in sorted(OUT.rglob('*')):
        if file.is_file() and file != OUT/'MANIFIESTO_SHA256.json':manifest.append(dict(archivo=file.relative_to(OUT).as_posix(),bytes=file.stat().st_size,sha256=hashfile(file)))
    (OUT/'MANIFIESTO_SHA256.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
    forbidden={'.env','config.dat','instance.dat','lab.dat','entorno-privado.json','parroquia.db','sgd_desarrollo.db'}
    assert not [file for file in OUT.rglob('*') if file.name in forbidden or 'node_modules' in file.parts or 'venv' in file.parts]
    archive=ROOT/'SGD_TIBU_PROGRAMA_LISTO_PARA_USAR.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as zip:
        for path in sorted(OUT.rglob('*')):
            if path.is_file():zip.write(path,path.relative_to(OUT.parent).as_posix())
    digest=hashfile(archive)
    Path(str(archive)+'.sha256').write_text(digest+'  '+archive.name+'\n',encoding='ascii')
    with zipfile.ZipFile(archive) as zip:
        assert zip.testzip() is None
        assert all(hashlib.sha256(zip.read(OUT.name+'/'+entry['archivo'])).hexdigest()==entry['sha256'] for entry in manifest)
    print(json.dumps(dict(zip=archive.name,bytes=archive.stat().st_size,sha256=digest,archivos=len(manifest),estado='Candidato: pendiente aceptación en Windows limpio'),ensure_ascii=False),flush=True)


if __name__=='__main__':main()


