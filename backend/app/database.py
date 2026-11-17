from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, connect_args={'check_same_thread': False} if settings.DATABASE_URL.startswith('sqlite') else {})
if settings.DATABASE_URL.startswith('sqlite'):
    @event.listens_for(engine, 'connect')
    def enable_foreign_keys(connection, _):
        connection.execute('PRAGMA foreign_keys=ON')
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
Base = declarative_base()
def get_db():
    with SessionLocal() as db:
        try:
            yield db
        except Exception:
            db.rollback()
            raise
def init_db():
    """Explicit NEW development/test database setup. Existing schemas use Alembic."""
    import app.models
    Base.metadata.create_all(engine)
