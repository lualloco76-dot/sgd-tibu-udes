"""Hosted same-origin entrypoint; refuses development fallbacks."""
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
os.environ['SGD_DESKTOP'] = '1'
if len(os.environ.get('SECRET_KEY', '')) < 32:
    raise RuntimeError('Configure SECRET_KEY de al menos 32 caracteres')
from sqlalchemy.engine import make_url
url = make_url(os.environ['DATABASE_URL'])
if url.get_backend_name() != 'postgresql':
    raise RuntimeError('El despliegue requiere PostgreSQL explícito')
if url.host not in {'127.0.0.1', 'localhost'} and url.query.get('sslmode') not in {'require', 'verify-full'}:
    raise RuntimeError('PostgreSQL remoto requiere sslmode=require o verify-full')
public_url = os.environ.get('PUBLIC_BASE_URL') or os.environ.get('RENDER_EXTERNAL_URL')
if not public_url or not public_url.startswith('https://'):
    raise RuntimeError('Configure PUBLIC_BASE_URL HTTPS para QR de certificados')
os.environ['PUBLIC_BASE_URL'] = public_url.rstrip('/')
os.environ.setdefault('BACKUP_SCHEDULER_ENABLED', 'false')
os.environ.setdefault('UPLOAD_DIR', '/var/data/sgd/uploads')
os.environ.setdefault('BACKUP_DIR', '/var/data/sgd/backups')
from ejecutar_schema import migrate
migrate(os.environ['DATABASE_URL'])
if os.environ.get('DEMO_SEED_ENABLED') == 'true':
    sys.path.insert(0, str(ROOT / 'scripts'))
    os.environ['QA_DATABASE_URL'] = os.environ['DATABASE_URL']
    os.environ['QA_PASSWORD'] = os.environ['DEMO_PASSWORD']
    from qa import seed
    seed()
    # qa.seed configures local file paths only for the seeding process.
    from app.config import settings
    settings.UPLOAD_DIR = '/var/data/sgd/uploads'
    settings.BACKUP_DIR = '/var/data/sgd/backups'
    settings.PUBLIC_BASE_URL = public_url.rstrip('/')
from app.main import app, mount_frontend
mount_frontend(ROOT / 'frontend/build')
import uvicorn
uvicorn.run(app, host='0.0.0.0', port=int(os.environ.get('PORT', '8000')), access_log=False)
