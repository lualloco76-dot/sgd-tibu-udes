import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from app.api import auth, usuarios, personas, sacramentos, registros, documentos, auditoria, institucional, certificados, administracion
from app.config import settings
@asynccontextmanager
async def lifespan(app):
    from app.database import SessionLocal
    from app.services.respaldos import iniciar_programador
    stop = iniciar_programador(SessionLocal) if settings.BACKUP_SCHEDULER_ENABLED else None
    yield
    if stop:
        stop.set()

app=FastAPI(title='Gestor Documental Parroquial - Diócesis de Tibú',version='2.0.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=settings.CORS_ORIGINS,allow_credentials=False,allow_methods=['GET','POST','PATCH','OPTIONS'],allow_headers=['Authorization','Content-Type'])
@app.middleware('http')
async def security_headers(request: Request, call_next):
    response=await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['Referrer-Policy']='no-referrer'
    response.headers['Cache-Control']='no-store'
    return response
@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Do not reflect request bodies, passwords or religious data in validation errors.
    errors = [{'loc': list(e['loc']), 'msg': e['msg'], 'type': e['type']} for e in exc.errors()]
    return JSONResponse(status_code=422, content={'detail': errors})
@app.exception_handler(IntegrityError)
async def integrity_error(request, exc):
    return JSONResponse(status_code=409,content={'detail':'Operación incompatible con la integridad o unicidad de los datos'})
@app.exception_handler(SQLAlchemyError)
async def database_error(request, exc):
    logging.getLogger('sgd').error('Error de persistencia en %s (%s)',request.url.path,type(exc).__name__)
    return JSONResponse(status_code=503,content={'detail':'Persistencia no disponible. Revise conexión y migraciones'})
for module in [auth,usuarios,personas,sacramentos,registros,documentos,auditoria,institucional,certificados,administracion]:
    app.include_router(module.router,prefix='/api')
@app.get('/')
def root():
    if getattr(settings, 'FRONTEND_DIR', None):
        from fastapi.responses import FileResponse
        return FileResponse(str(__import__('pathlib').Path(settings.FRONTEND_DIR) / 'index.html'))
    return {'mensaje':'API SGD Diócesis de Tibú','version':'2.0.0','documentacion':'/docs'}
@app.get('/health')
def health():
    from sqlalchemy import text
    from app.database import engine
    with engine.connect() as connection: connection.execute(text('SELECT 1'))
    return {'estado':'disponible'}


def mount_frontend(directory):
    """Serve the precompiled SPA after API routes, including browser deep links."""
    from pathlib import Path
    from fastapi import HTTPException
    from fastapi.responses import FileResponse
    root = Path(directory).resolve()
    if not (root / 'index.html').is_file():
        raise RuntimeError('Falta el frontend compilado de la distribución')
    settings.FRONTEND_DIR = str(root)

    @app.get('/{path:path}', include_in_schema=False)
    def frontend(path: str):
        if path == 'api' or path.startswith('api/') or path.startswith('__desktop'):
            raise HTTPException(404, 'Ruta no disponible')
        target = (root / path).resolve()
        if not target.is_relative_to(root):
            raise HTTPException(404, 'Ruta no disponible')
        if target.is_file():
            return FileResponse(target)
        if '.' in Path(path).name or path.startswith('assets/'):
            raise HTTPException(404, 'Recurso no disponible')
        return FileResponse(root / 'index.html')
