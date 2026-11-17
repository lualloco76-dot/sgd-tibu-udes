"""Private PostgreSQL cluster owned by this local academic distribution.

Never discovers, edits, registers or stops an installed PostgreSQL service.
Cluster and DPAPI credentials live outside replaceable application binaries.
"""
import csv
import io
import os
from pathlib import Path
import secrets
import socket
import subprocess
import tempfile

from desktop.secure_config import data_dir, read, save


def binaries():
    return Path(__file__).resolve().parents[1] / 'postgresql' / 'bin'


def run(arguments, timeout=90):
    # A detached PostgreSQL process can inherit pipe handles on Windows. Files
    # avoid waiting for the lifetime of the server when pg_ctl has already exited.
    with tempfile.TemporaryFile() as output:
        result = subprocess.run([str(x) for x in arguments], stdout=output, stderr=output,
                                timeout=timeout, creationflags=subprocess.CREATE_NO_WINDOW)
        output.seek(0)
        result.stdout = output.read()
        result.stderr = b''
    if result.returncode:
        # Only PostgreSQL command diagnostics; never log connection URLs/passwords.
        log = data_dir() / 'registros' / 'postgresql-comandos.log'
        log.parent.mkdir(parents=True, exist_ok=True)
        with log.open('ab') as output:
            output.write(result.stdout + result.stderr)
        raise RuntimeError('PostgreSQL local no pudo completar ' + Path(arguments[0]).stem +
                           '. Consulte Ver registros. Los datos existentes se conservaron.')
    return result


def free_port():
    with socket.socket() as connection:
        connection.bind(('127.0.0.1', 0))
        return connection.getsockname()[1]


def protect_profile():
    """Remove inherited broad access before writing private cluster files."""
    result = run(['whoami.exe', '/user', '/fo', 'csv', '/nh'])
    sid = next(csv.reader(io.StringIO(result.stdout.decode('utf8', errors='replace').strip())))[1]
    if not sid.startswith('S-1-5-'):
        raise RuntimeError('No se pudo identificar el perfil Windows para proteger sus datos')
    run(['icacls.exe', data_dir(), '/inheritance:r', '/grant:r',
         '*' + sid + ':(OI)(CI)F', '*S-1-5-18:(OI)(CI)F'])


class LocalPostgres:
    def __init__(self):
        self.root = data_dir() / 'postgresql-18'
        self.running = False
        self.state = None

    def start(self, progress=lambda message: None):
        if not (binaries() / 'initdb.exe').is_file():
            raise RuntimeError('Faltan los componentes PostgreSQL incluidos. Extraiga todo el ZIP o reinstale el SGD')
        data_dir().mkdir(parents=True, exist_ok=True)
        protect_profile()
        (data_dir() / 'registros').mkdir(exist_ok=True)
        self.state = read('postgresql.dat')
        if self.state is None:
            if self.root.exists():
                raise RuntimeError('Existe una carpeta PostgreSQL sin configuración protegida. Se conservó; solicite recuperación técnica')
            self.state = dict(owner='SGD_TIBU_UDES_3', user='sgd_local_admin',
                              password=secrets.token_urlsafe(48), port=free_port())
            save('postgresql.dat', self.state)
        if self.state.get('owner') != 'SGD_TIBU_UDES_3':
            raise RuntimeError('La instancia PostgreSQL no pertenece a esta edición del SGD')
        if not (self.root / 'PG_VERSION').exists():
            if self.root.exists() and any(self.root.iterdir()):
                raise RuntimeError('La inicialización PostgreSQL está incompleta. Consulte los registros; no se borró ningún archivo')
            progress('Preparando PostgreSQL incluido, sin instalar servicios…')
            password_file = data_dir() / 'postgresql-inicializacion.tmp'
            try:
                password_file.write_text(self.state['password'] + '\n', encoding='utf8')
                run([binaries() / 'initdb.exe', '-D', self.root, '-U', self.state['user'],
                     '--pwfile', password_file, '--encoding=UTF8', '--locale=C',
                     '--auth-host=scram-sha-256', '--auth-local=scram-sha-256'])
                # This cluster accepts only authenticated loopback connections.
                (self.root / 'pg_hba.conf').write_text(
                    'host all all 127.0.0.1/32 scram-sha-256\n', encoding='ascii')
            finally:
                password_file.unlink(missing_ok=True)
        if (self.root / 'PG_VERSION').read_text().strip() != '18':
            raise RuntimeError('La versión del clúster requiere mantenimiento técnico. No se intentó convertirla')
        status = subprocess.run([str(binaries() / 'pg_ctl.exe'), '-D', str(self.root), 'status'],
                                capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
        if status.returncode:
            # A new free port avoids touching another local PostgreSQL installation.
            self.state['port'] = free_port()
            save('postgresql.dat', self.state)
            progress('Iniciando la base de evaluación local…')
            run([binaries() / 'pg_ctl.exe', '-D', self.root, '-l',
                 data_dir() / 'registros' / 'postgresql.log', '-o',
                 '-h 127.0.0.1 -p ' + str(self.state['port']), '-w', '-t', '60', 'start'])
        self.running = True
        # Verify this is our own data directory, including after crash recovery.
        import psycopg2
        with psycopg2.connect(host='127.0.0.1', port=self.state['port'], user=self.state['user'],
                              password=self.state['password'], dbname='postgres', connect_timeout=8) as connection:
            with connection.cursor() as cursor:
                cursor.execute('SHOW data_directory')
                if Path(cursor.fetchone()[0]).resolve() != self.root.resolve():
                    self.running = False
                    raise RuntimeError('El puerto no corresponde a la base privada del SGD')
        return self.state

    def configure(self, config=None, progress=lambda message: None):
        from desktop.provision import initialize, verify
        from sqlalchemy.engine import make_url
        state = self.start(progress)
        if config is None:
            config = initialize(dict(host='127.0.0.1', port=state['port'],
                                     database='sgd_tibu_evaluacion', role='sgd_eval_app',
                                     admin_user=state['user'], admin_password=state['password'], mode='real'), progress)
            config['managed_postgres'] = True
        else:
            config['database_url'] = make_url(config['database_url']).set(port=state['port']).render_as_string(hide_password=False)
            config['verification'] = verify(config['database_url'])
        save('config.dat', config)
        return config

    def stop(self):
        if self.running:
            run([binaries() / 'pg_ctl.exe', '-D', self.root, '-m', 'fast', '-w', '-t', '60', 'stop'])
            self.running = False
