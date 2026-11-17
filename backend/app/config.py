"""Environment configuration. Legacy database is never selected automatically."""
import os
from pathlib import Path
from dotenv import load_dotenv
BASE_DIR = Path(__file__).resolve().parent.parent
if os.getenv('SGD_DESKTOP') != '1':
    load_dotenv(BASE_DIR / '.env')
class Settings:
    SECRET_KEY = os.getenv('SECRET_KEY', '')
    ALGORITHM = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '30'))
    DATABASE_URL = os.getenv('DATABASE_URL', f"sqlite:///{(BASE_DIR / 'sgd_desarrollo.db').as_posix()}")
    UPLOAD_DIR = os.getenv('UPLOAD_DIR', str(BASE_DIR / 'uploads'))
    PUBLIC_BASE_URL = os.getenv('PUBLIC_BASE_URL', 'http://localhost:8000').rstrip('/')
    CORS_ORIGINS = [origin.strip() for origin in os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',') if origin.strip()]
    MAX_UPLOAD_BYTES = 10 * 1024 * 1024
    BACKUP_DIR = os.getenv('BACKUP_DIR', str(BASE_DIR / 'backups'))
    PG_DUMP_PATH = os.getenv('PG_DUMP_PATH', 'pg_dump')
    BACKUP_SCHEDULER_ENABLED = os.getenv('BACKUP_SCHEDULER_ENABLED', 'true').lower() == 'true'
settings = Settings()
