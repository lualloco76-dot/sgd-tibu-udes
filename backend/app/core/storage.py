"""Bounded, private PDF storage; paths and original names are never trusted."""
import hashlib
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from fastapi import HTTPException
from pypdf import PdfReader
from pypdf.generic import IndirectObject
from app.config import settings


def validar_pdf(data):
    if not data.startswith(b'%PDF-') or b'%%EOF' not in data[-1024:]:
        raise HTTPException(422, 'Se requiere un PDF válido')
    try:
        reader = PdfReader(BytesIO(data), strict=True)
        if reader.is_encrypted or not 1 <= len(reader.pages) <= 1000:
            raise ValueError('PDF cifrado, vacío o demasiado extenso')
        pending, visited = [reader.trailer], set()
        forbidden = {'/JS', '/JavaScript', '/OpenAction', '/AA', '/Launch', '/RichMedia', '/EmbeddedFiles', '/XFA'}
        count = 0
        while pending:
            obj = pending.pop()
            if isinstance(obj, IndirectObject):
                identity = (obj.idnum, obj.generation)
                if identity in visited:
                    continue
                visited.add(identity)
                obj = obj.get_object()
            count += 1
            if count > 100000:
                raise ValueError('Estructura PDF demasiado compleja')
            if isinstance(obj, dict):
                if forbidden.intersection(obj) or str(obj.get('/Type')) == '/EmbeddedFile':
                    raise ValueError('Contenido activo o adjuntos incrustados')
                pending.extend(obj.values())
            elif isinstance(obj, (list, tuple)):
                pending.extend(obj)
    except Exception as exc:
        raise HTTPException(422, 'PDF inválido, cifrado o con contenido activo no permitido') from exc


async def guardar_archivo(archivo):
    data = await archivo.read(settings.MAX_UPLOAD_BYTES + 1)
    if len(data) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(413, 'PDF excede el tamaño permitido')
    validar_pdf(data)
    root = Path(settings.UPLOAD_DIR).resolve()
    root.mkdir(parents=True, exist_ok=True)
    path = root / (uuid4().hex + '.pdf')
    path.write_bytes(data)
    return path, hashlib.sha256(data).hexdigest()


def ruta_segura(ruta):
    root = Path(settings.UPLOAD_DIR).resolve()
    path = Path(ruta).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise HTTPException(404, 'Archivo no disponible')
    return path
