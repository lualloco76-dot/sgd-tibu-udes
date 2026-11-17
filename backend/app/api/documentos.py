import hashlib
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.documento import Documento
from app.models.registro import RegistroSacramental as Registro
from app.models.usuario import Usuario
from app.schemas.documento import DocumentoOut
from app.core.security import get_usuario_actual
from app.core.deps import requiere_escritura
from app.core.storage import guardar_archivo, ruta_segura
from app.services.access import scope, custodia, custodia_escritura, audit
router=APIRouter(prefix='/documentos',tags=['documentos'])
@router.post('/',response_model=DocumentoOut,status_code=201)
async def subir(registro_id: int, tipo_documento: str=Query(...,min_length=1,max_length=100),archivo: UploadFile=File(...),db: Session=Depends(get_db),user: Usuario=Depends(requiere_escritura)):
    record=db.get(Registro,registro_id)
    if not record: raise HTTPException(404,'Registro no encontrado')
    custodia_escritura(user,record.parroquia_id)
    path, digest=await guardar_archivo(archivo)
    name=Path((archivo.filename or 'documento.pdf').replace('\\','/')).name[:200]
    try:
        obj=Documento(registro_id=registro_id,tipo_documento=tipo_documento,nombre_archivo=name,ruta_archivo=str(path),hash_sha256=digest,subido_por=user.id)
        db.add(obj);db.flush();audit(db,user,'SUBIR_DOCUMENTO','documentos',obj.id,parroquia_id=record.parroquia_id);db.commit()
    except Exception:
        db.rollback();path.unlink(missing_ok=True);raise
    return obj
@router.get('/',response_model=list[DocumentoOut])
def listar(db: Session=Depends(get_db),user: Usuario=Depends(get_usuario_actual),skip: int=Query(0,ge=0),limit: int=Query(50,ge=1,le=200)):
    query=scope(db.query(Documento,Registro).join(Registro),Registro,user)
    return [{**DocumentoOut.model_validate(doc).model_dump(),
             'referencia': {key: getattr(record,key) for key in ['libro','folio','numero']}}
            for doc,record in query.order_by(Documento.id.desc()).offset(skip).limit(limit).all()]
@router.get('/{id}/descargar')
def descargar(id: int,db: Session=Depends(get_db),user: Usuario=Depends(get_usuario_actual)):
    obj=db.get(Documento,id)
    if not obj: raise HTTPException(404,'Documento no encontrado')
    record=db.get(Registro,obj.registro_id);custodia(user,record.parroquia_id)
    path=ruta_segura(obj.ruta_archivo)
    if hashlib.sha256(path.read_bytes()).hexdigest()!=obj.hash_sha256: raise HTTPException(409,'Integridad del archivo no verificada')
    audit(db,user,'DESCARGAR','documentos',id,parroquia_id=record.parroquia_id);db.commit()
    return FileResponse(path,media_type='application/pdf',filename=obj.nombre_archivo,headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})
