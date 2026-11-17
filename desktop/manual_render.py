"""DOCX/PDF rendering and physical schema documentation for the real release."""
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
from desktop.manual_labels_real import FIELD_HELP, BUTTON_HELP
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
EVIDENCE = ROOT / '.test-artifacts/evaluadores-real/evidence'
OUT = ROOT / 'SGD_TIBU_ENTREGA_EVALUADORES'
DATE = datetime.now(ZoneInfo('America/Bogota')).strftime('%d/%m/%Y')

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
        self.h(title); self.p(subtitle); self.p('Versión ' + os.environ.get('SGD_RELEASE_VERSION', '2.2.0') + ' · Fecha de preparación: ' + DATE + ' · America/Bogota')

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
        for cell in ws[1]:cell.font=Font(name='Times New Roman',size=10,bold=True,color='FFFFFF');cell.fill=PatternFill('solid',fgColor='174438')
        for row in ws.iter_rows(min_row=2):
            for cell in row:cell.font=Font(name='Times New Roman',size=10);cell.alignment=Alignment(vertical='top',wrap_text=True)
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
