"""Emergency local password reset after verifying operator access to the target database."""
import argparse
from getpass import getpass
from sqlalchemy import create_engine, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.models.usuario import Usuario
from app.services.access import audit

def main():
    parser = argparse.ArgumentParser(description='Restablecimiento local de emergencia; preferir API autenticada /usuarios/{id}/restablecer')
    parser.add_argument('--database-url', required=True)
    parser.add_argument('--email', required=True)
    parser.add_argument('--confirm-target', action='store_true')
    args = parser.parse_args()
    if not args.confirm_target:
        parser.error('Confirme identidad institucional y base elegida con --confirm-target')
    password = getpass('Contraseña nueva (mínimo 8 caracteres): ')
    if password != getpass('Confirmar contraseña: '):
        parser.error('Las contraseñas no coinciden')
    password_hash = hash_password(password)
    engine = create_engine(args.database_url)
    try:
        with Session(engine) as db:
            user = db.scalar(select(Usuario).where(Usuario.email == args.email.strip().lower()).with_for_update())
            if not user:
                parser.error('Cuenta no encontrada')
            user.password_hash = password_hash
            user.token_version += 1
            user.intentos_fallidos = 0
            user.bloqueado_hasta = None
            audit(db, None, 'RESTABLECER_PASSWORD_LOCAL', 'usuarios', user.id, parroquia_id=user.parroquia_id)
            db.commit()
        print('Contraseña restablecida y sesiones anteriores invalidadas.')
    finally:
        engine.dispose()
    return 0

if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except SQLAlchemyError as error:
        print('Operación no completada (' + type(error).__name__ + '). Revise conexión y esquema migrado.')
        raise SystemExit(1)

