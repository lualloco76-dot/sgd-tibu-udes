from io import BytesIO
from html import escape
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.barcode.qr import QrCodeWidget
from app.config import settings
from app.core.dates import issued_at

def generar_pdf(cert):
    output=BytesIO();styles=getSampleStyleSheet()
    document=SimpleDocTemplate(output,pagesize=A4,title=cert.numero,author='SGD Diócesis de Tibú')
    snap=cert.instantanea
    story=[Paragraph('Diócesis de Tibú',styles['Title']),Paragraph(escape(snap['parroquia']),styles['Heading2']),Paragraph('Certificado de '+escape(snap['sacramento']),styles['Heading1'])]
    items={'Número de certificado':cert.numero,'Fecha de expedición':issued_at(cert.fecha_emision),'Titular':snap['persona'],'Fecha del registro':snap['fecha_celebracion'],'Libro':snap['libro'],'Folio':snap['folio'],'Partida':snap['numero'],'Lugar':snap.get('lugar'),'Ministro':snap.get('ministro'),'Notas':snap.get('notas')}
    for key,value in items.items():
        if value: story.append(Paragraph('<b>'+escape(key)+':</b> '+escape(str(value)),styles['Normal']));story.append(Spacer(1,8))
    for key,value in snap.get('datos',{}).items():
        if value is not None: story.append(Paragraph(escape(key.replace('_',' '))+': '+escape(str(value)),styles['Normal']))
    story.append(Spacer(1,20))
    story.append(Paragraph('Autenticidad: consulte el código QR. Este documento no incorpora firma digital criptográfica. La firma o sello institucional debe ser validado por la parroquia custodiante.',styles['Normal']))
    url=settings.PUBLIC_BASE_URL+'/api/certificados/verificar/'+cert.codigo_verificacion
    widget=QrCodeWidget(url);x0,y0,x1,y1=widget.getBounds();size=110
    drawing=Drawing(size,size,transform=[size/(x1-x0),0,0,size/(y1-y0),0,0]);drawing.add(widget);story.append(drawing)
    url_style = ParagraphStyle('VerificationURL', parent=styles['Normal'], fontSize=8, leading=11)
    story.append(Paragraph(escape(url), url_style))
    document.build(story)
    return output.getvalue()
