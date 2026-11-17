from typing import Literal
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field, StrictBool
from sqlalchemy import update, func
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.core.security import get_usuario_actual, utcnow, aware
from app.core.deps import requiere_admin
from app.core.roles import ROLES
from app.config import settings
from app.models.administracion import PoliticaRol, Respaldo
from app.models.usuario import Usuario
from app.services.access import audit
from app.services.permisos import catalogo, editables, PERMISOS
from app.services import respaldos

router = APIRouter(tags=['administracion'])


class CambioPermisos(BaseModel):
    model_config = ConfigDict(extra='forbid')
    revision: int = Field(ge=0)
    permisos: dict[str, StrictBool]


@router.get('/roles/')
def roles(db: Session = Depends(get_db), user=Depends(get_usuario_actual)):
    counts = dict(db.query(Usuario.rol, func.count()).group_by(Usuario.rol).all()) if user.rol == 'administrador' else {}
    return {'roles': [{**row, 'usuarios': counts.get(row['id'])} for row in catalogo(db)],
            'permisos': [{'id': key, 'nombre': name, 'descripcion': description} for key, name, description in PERMISOS]}


@router.patch('/roles/{rol}')
def cambiar_permisos(rol: str, data: CambioPermisos, db: Session = Depends(get_db), user=Depends(requiere_admin)):
    if rol not in ROLES:
        raise HTTPException(404, 'Rol no encontrado')
    if not data.permisos or set(data.permisos) - set(editables(rol)):
        raise HTTPException(422, 'La selección incluye permisos protegidos o no modificables para este cargo')
    row = db.get(PoliticaRol, rol)
    if row is None:
        if data.revision != 0:
            raise HTTPException(409, 'Los permisos cambiaron. Actualice la página antes de guardar')
        row = PoliticaRol(rol=rol, permisos={}, revision=0)
        db.add(row)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, 'Otro administrador modificó este rol. Actualice la página') from None
    changes = {**row.permisos, **data.permisos}
    result = db.execute(update(PoliticaRol).where(PoliticaRol.rol == rol, PoliticaRol.revision == data.revision)
                        .values(permisos=changes, revision=data.revision + 1, actualizado=utcnow(), actualizado_por=user.id))
    if result.rowcount != 1:
        raise HTTPException(409, 'Los permisos cambiaron. Actualice la página antes de guardar')
    audit(db, user, 'CAMBIAR_PERMISOS', 'politicas_roles', detalle=f'rol={rol};permisos=' + ','.join(sorted(data.permisos)))
    db.commit()
    return next(item for item in catalogo(db) if item['id'] == rol)


class Programacion(BaseModel):
    model_config = ConfigDict(extra='forbid')
    frecuencia: Literal['manual', 'diario', 'semanal']
    hora: int = Field(ge=0, le=23, strict=True)


def resumen_config(config):
    return {'frecuencia': config.frecuencia, 'hora': config.hora, 'proximo': aware(config.proximo) if config.proximo else None,
            'en_curso': config.en_curso, 'zona_horaria': 'America/Bogota', 'programador_activo': settings.BACKUP_SCHEDULER_ENABLED}


@router.get('/respaldos/configuracion')
def config_respaldos(db: Session = Depends(get_db), user=Depends(requiere_admin)):
    engine = db.get_bind()
    last = db.query(Respaldo).filter_by(estado='completado').order_by(Respaldo.creado.desc()).first()
    return {**resumen_config(respaldos.configuracion(db)), 'motor': engine.dialect.name,
            'ultimo_respaldo': {'id': last.id, 'terminado': aware(last.terminado), 'tamano': last.tamano} if last else None,
            'herramienta_disponible': engine.dialect.name == 'sqlite' or bool(respaldos.pg_dump_path())}


@router.patch('/respaldos/configuracion')
def programar(data: Programacion, db: Session = Depends(get_db), user=Depends(requiere_admin)):
    config = respaldos.configuracion(db)
    if data.frecuencia != 'manual' and not settings.BACKUP_SCHEDULER_ENABLED:
        raise HTTPException(409, 'El programador está deshabilitado en este servidor')
    config.frecuencia, config.hora = data.frecuencia, data.hora
    config.proximo = respaldos.siguiente(data.frecuencia, data.hora)
    audit(db, user, 'PROGRAMAR_RESPALDOS', 'respaldos', detalle=f'frecuencia={data.frecuencia};hora={data.hora};zona=America/Bogota')
    db.commit()
    return resumen_config(config)


@router.get('/respaldos/')
def listar(db: Session = Depends(get_db), user=Depends(requiere_admin), skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100)):
    rows = db.query(Respaldo).order_by(Respaldo.creado.desc()).offset(skip).limit(limit).all()
    return [{column.name: (aware(value) if column.name in {'creado', 'terminado', 'verificado'} and value else value)
             for column in Respaldo.__table__.columns for value in [getattr(row, column.name)]} for row in rows]


@router.post('/respaldos/', status_code=202)
def crear(tasks: BackgroundTasks, db: Session = Depends(get_db), user=Depends(requiere_admin)):
    job = respaldos.reservar(db, user)
    factory = sessionmaker(bind=db.get_bind(), expire_on_commit=False)
    tasks.add_task(respaldos.ejecutar, factory, job.id)
    return {'id': job.id, 'estado': job.estado}


def obtener(db, id):
    job = db.get(Respaldo, id)
    if not job:
        raise HTTPException(404, 'Respaldo no encontrado')
    if job.estado != 'completado':
        raise HTTPException(409, 'El respaldo aún no está disponible')
    return job


@router.post('/respaldos/{id}/verificar')
def verificar(id: str, db: Session = Depends(get_db), user=Depends(requiere_admin)):
    job = obtener(db, id)
    respaldos.comprobar(respaldos.ruta(job.id), job.sha256)
    job.verificado = utcnow()
    audit(db, user, 'VERIFICAR_RESPALDO', 'respaldos', detalle=f'id={id}')
    db.commit()
    return {'mensaje': 'Integridad del respaldo verificada', 'sha256': job.sha256, 'verificado': job.verificado}


@router.get('/respaldos/{id}/descargar')
def descargar(id: str, db: Session = Depends(get_db), user=Depends(requiere_admin)):
    job = obtener(db, id)
    path = respaldos.ruta(job.id)
    respaldos.comprobar(path, job.sha256)
    audit(db, user, 'DESCARGAR_RESPALDO', 'respaldos', detalle=f'id={id}')
    db.commit()
    return FileResponse(path, media_type='application/zip', filename=f'respaldo-sgd-{job.id}.zip')
