"""Create an administrator explicitly; no credentials or database are selected implicitly."""
import argparse
from getpass import getpass
from sqlalchemy import create_engine, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.models.usuario import Usuario
from app.services.access import audit
from pydantic import EmailStr, TypeAdapter

def main():
    parser = argparse.ArgumentParser(description='Alta inicial de administrador diocesano en base explícita ya migrada')
    parser.add_argument('--database-url', required=True)
    parser.add_argument('--email', required=True)
    parser.add_argument('--nombre', required=True)
    parser.add_argument('--confirm-target', action='store_true')
    args = parser.parse_args()
    if not args.confirm_target:
        parser.error('Revise la base de destino; se requiere --confirm-target')
    if not 2 <= len(args.nombre.strip()) <= 200:
        parser.error('El nombre debe tener entre 2 y 200 caracteres')
    email = str(TypeAdapter(EmailStr).validate_python(args.email.strip().lower()))
    password = getpass('Contraseña nueva (mínimo 8 caracteres): ')
    if password != getpass('Confirmar contraseña: '):
        parser.error('Las contraseñas no coinciden')
    password_hash = hash_password(password)
    engine = create_engine(args.database_url)
    try:
        with Session(engine) as db:
            if db.scalar(select(Usuario.id).where(Usuario.email == email)):
                parser.error('La cuenta ya existe; no se modifica ni se restablece')
            user = Usuario(nombre=args.nombre.strip(), email=email, password_hash=password_hash, rol='administrador', activo=True)
            db.add(user)
            db.flush()
            audit(db, user, 'CREAR_ADMIN_INICIAL', 'usuarios', user.id)
            db.commit()
        print('Administrador creado. Inicie sesión mediante la aplicación.')
    finally:
        engine.dispose()
    return 0

if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except SQLAlchemyError as error:
        print('Operación no completada (' + type(error).__name__ + '). Revise conexión y esquema migrado.')
        raise SystemExit(1)

