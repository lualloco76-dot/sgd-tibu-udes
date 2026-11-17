"""GUI launcher, setup wizard and loopback-only in-process production server."""
import argparse
import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import secrets
import socket
import sys
import threading
import time
import urllib.request
import webbrowser

ROOT = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(ROOT / 'backend'))
sys.path.insert(0, str(ROOT))
os.environ['SGD_DESKTOP'] = '1'
os.environ['DATABASE_URL'] = 'sqlite://'  # Prevent any developer .env from being selected during setup imports.
os.environ['SECRET_KEY'] = secrets.token_urlsafe(48)
if (ROOT / 'runtime/tcl').is_dir():
    os.environ['TCL_LIBRARY'] = str(ROOT / 'runtime/tcl/tcl8.6')
    os.environ['TK_LIBRARY'] = str(ROOT / 'runtime/tcl/tk8.6')

from desktop.secure_config import data_dir, read, save, crypt
from desktop.provision import initialize, verify, detected_postgres, assets

logger = logging.getLogger('sgd.desktop')


def report(path, **values):
    if path:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        Path(path).write_text(json.dumps(values, ensure_ascii=False, indent=2), encoding='utf-8')


def friendly(error):
    if isinstance(error, (ValueError, RuntimeError)):
        return str(error)
    if isinstance(error, (ConnectionError, TimeoutError, OSError)):
        return 'No se pudo abrir la conexión. Compruebe el servicio PostgreSQL, el host y el puerto.'
    return 'PostgreSQL o la configuración no están disponibles. Compruebe servicio, contraseña, permisos y versión. Detalle técnico: ' + type(error).__name__


def request(url, token=None):
    headers = {'X-SGD-Control': token} if token else {}
    req = urllib.request.Request(url, data=b'' if token else None, headers=headers)
    with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(req, timeout=2) as response:
        return json.load(response)


class Instance:
    def __init__(self):
        import msvcrt
        self.file = (data_dir() / 'instance.lock').open('a+b')
        if os.fstat(self.file.fileno()).st_size == 0:
            self.file.write(b'0'); self.file.flush()
        self.file.seek(0)
        try:
            msvcrt.locking(self.file.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            self.file.close()
            raise RuntimeError('Ya hay una instancia abierta') from None

    def close(self):
        import msvcrt
        self.file.seek(0)
        msvcrt.locking(self.file.fileno(), msvcrt.LK_UNLCK, 1)
        self.file.close()


class Server:
    def __init__(self, config):
        self.config = config
        self.postgres = None
        self.server = None
        self.thread = None
        self.socket = None

    def start(self):
        if self.config is None or self.config.get('managed_postgres'):
            from desktop.local_postgres import LocalPostgres, binaries
            self.postgres = LocalPostgres()
            self.config = self.postgres.configure(self.config)
            os.environ['PG_DUMP_PATH'] = str(binaries() / 'pg_dump.exe')
        if self.config.get('mode') != 'real' or self.config.get('edition') != 'evaluadores-real':
            raise ValueError('Esta entrega requiere la configuración de la base real. Use Configurar PostgreSQL con una base nueva')
        verify(self.config['database_url'])
        import uvicorn
        # Set both environment and already-imported settings: setup may have loaded the ORM.
        values = dict(DATABASE_URL=self.config['database_url'], SECRET_KEY=self.config['secret_key'],
                      UPLOAD_DIR=str(data_dir() / 'documentos'), BACKUP_DIR=str(data_dir() / 'respaldos'),
                      CORS_ORIGINS='', BACKUP_SCHEDULER_ENABLED='true')
        if os.environ.get('PG_DUMP_PATH'):
            values['PG_DUMP_PATH'] = os.environ['PG_DUMP_PATH']
        os.environ.update(values)
        from app.config import settings
        for key, value in values.items():
            setattr(settings, key, value)
        settings.CORS_ORIGINS = []
        settings.BACKUP_SCHEDULER_ENABLED = True
        from sqlalchemy import create_engine
        import app.database as database
        database.engine.dispose()
        database.engine = create_engine(self.config['database_url'], pool_pre_ping=True, connect_args={'connect_timeout': 8}, hide_parameters=True)
        database.SessionLocal.configure(bind=database.engine)
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        if os.name == 'nt':
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        try:
            self.socket.bind(('127.0.0.1', self.config.get('port', 8765)))
        except OSError:
            self.socket.bind(('127.0.0.1', 0))
        self.socket.listen(128)
        self.port = self.socket.getsockname()[1]
        self.url = 'http://127.0.0.1:' + str(self.port)
        settings.PUBLIC_BASE_URL = self.url
        self.token = secrets.token_urlsafe(48)
        from app.main import app, mount_frontend
        from fastapi import Request, HTTPException
        mount_frontend(assets() / 'frontend' / 'build')

        @app.post('/__desktop/stop', include_in_schema=False)
        def stop(request: Request):
            if not secrets.compare_digest(request.headers.get('x-sgd-control', ''), self.token):
                raise HTTPException(403, 'Control local no autorizado')
            self.server.should_exit = True
            return {'estado': 'cerrando'}

        self.server = uvicorn.Server(uvicorn.Config(app, host='127.0.0.1', port=self.port, log_config=None,
                                                   access_log=False, timeout_graceful_shutdown=20))
        self.thread = threading.Thread(target=lambda: self.server.run(sockets=[self.socket]), name='sgd-api', daemon=True)
        self.thread.start()
        for _ in range(160):
            if not self.thread.is_alive():
                raise RuntimeError('El servicio interno no pudo iniciarse. Consulte los registros')
            try:
                if request(self.url + '/health')['estado'] == 'disponible':
                    save('instance.dat', {'url': self.url, 'token': self.token, 'pid': os.getpid()})
                    return
            except Exception:
                time.sleep(.2)
        self.stop()
        raise RuntimeError('El servicio interno no respondió en el tiempo previsto')

    def stop(self):
        if self.server:
            self.server.should_exit = True
        if self.thread:
            self.thread.join(timeout=25)
        if self.socket:
            self.socket.close()
        if self.postgres:
            import app.database as database
            database.engine.dispose()
            self.postgres.stop()
        (data_dir() / 'instance.dat').unlink(missing_ok=True)


def wizard(parent, finished, capture=None):
    import tkinter as tk
    from tkinter import ttk
    window = tk.Toplevel(parent)
    window.title('SGD Tibú · Configuración de PostgreSQL')
    window.resizable(False, False)
    body = ttk.Frame(window, padding=24)
    body.grid()
    ttk.Label(body, text='Preparar el SGD Diócesis de Tibú', font=('Segoe UI', 14, 'bold')).grid(row=0, column=0, columnspan=2, sticky='w', pady=(0, 12))
    found = detected_postgres()
    ttk.Label(body, text=('PostgreSQL detectado: ' + ', '.join(Path(p).name for p in found)) if found else 'No se detectó PostgreSQL en la ruta habitual. Instale PostgreSQL 18 x64.').grid(row=1, column=0, columnspan=2, sticky='w')
    ttk.Label(body, text='La contraseña administrativa se utiliza en memoria y se descarta.').grid(row=2, column=0, columnspan=2, sticky='w', pady=(0, 12))
    defaults = [('host', 'Host local', '127.0.0.1'), ('port', 'Puerto PostgreSQL', '5432'),
                ('database', 'Base exclusiva del SGD', 'sgd_tibu_evaluadores'), ('role', 'Usuario limitado de aplicación', 'sgd_tibu_eval_app'),
                ('admin_user', 'Usuario administrador PostgreSQL', 'postgres'), ('admin_password', 'Contraseña PostgreSQL', '')]
    variables, entries = {}, []
    for row, (key, label, default) in enumerate(defaults, 3):
        ttk.Label(body, text=label).grid(row=row, column=0, sticky='w', padx=(0, 16), pady=4)
        var = tk.StringVar(value=default); variables[key] = var
        entry = ttk.Entry(body, textvariable=var, width=36, show='•' if 'password' in key else '')
        entry.grid(row=row, column=1, sticky='ew', pady=4); entries.append(entry)
    allow = tk.BooleanVar(value=False)
    ttk.Label(body, text='Se restaurará la base real. Cuenta conservada: admin@iglesia.org.').grid(row=9, column=0, columnspan=2, sticky='w', pady=8)
    ttk.Checkbutton(body, text='Tengo un respaldo y autorizo reutilizar o migrar esta base SGD existente', variable=allow).grid(row=10, column=0, columnspan=2, sticky='w')
    status = tk.StringVar(value='La inicialización en una base nueva conserva los datos y la cuenta de esta entrega.')
    ttk.Label(body, textvariable=status, wraplength=600).grid(row=11, column=0, columnspan=2, sticky='w', pady=12)
    busy = False
    def submit():
        nonlocal busy
        if busy: return
        values = {key: var.get() for key, var in variables.items()}
        values.update(mode='real', allow_existing=allow.get())
        if not values['admin_password']:
            status.set('Ingrese la contraseña administrativa de PostgreSQL.'); return
        busy = True; button.configure(state='disabled')
        for entry in entries: entry.configure(state='disabled')
        queue = []
        def work():
            try:
                config = initialize(values, lambda message: queue.append(('progress', message)))
                save('config.dat', config)
                queue.append(('done', config))
            except Exception as error:
                logger.error('Configuración fallida (%s)', type(error).__name__)
                queue.append(('error', friendly(error)))
            finally:
                values.pop('admin_password', None); values.pop('password', None)
        def poll():
            nonlocal busy
            while queue:
                kind, value = queue.pop(0)
                if kind == 'progress': status.set(value)
                elif kind == 'error':
                    variables['admin_password'].set('')
                    for entry in entries: entry.configure(state='normal')
                    status.set(value); busy = False; button.configure(state='normal'); return
                else:
                    for var in variables.values(): var.set('')
                    window.destroy(); finished(value); return
            window.after(100, poll)
        threading.Thread(target=work, daemon=True, name='sgd-configuracion').start()
        poll()
    button = ttk.Button(body, text='Comprobar e inicializar', command=submit)
    button.grid(row=12, column=1, sticky='e')
    ttk.Button(body, text='Cancelar', command=lambda: window.destroy() if not busy else None).grid(row=12, column=0, sticky='w')
    window.protocol('WM_DELETE_WINDOW', lambda: window.destroy() if not busy else None)
    window.grab_set()
    if capture:
        def screenshot():
            from PIL import ImageGrab
            window.update()
            ImageGrab.grab(bbox=(window.winfo_rootx(), window.winfo_rooty(), window.winfo_rootx() + window.winfo_width(), window.winfo_rooty() + window.winfo_height())).save(capture)
            parent.destroy()
        window.after(1200, screenshot)


def gui(args):
    import tkinter as tk
    from tkinter import ttk
    root = tk.Tk(); root.title('SGD Diócesis de Tibú'); root.resizable(False, False)
    try: root.iconbitmap(str(assets() / 'launcher' / 'launcher.ico'))
    except Exception: pass
    body = ttk.Frame(root, padding=24); body.grid()
    ttk.Label(body, text='SGD Diócesis de Tibú', font=('Segoe UI', 16, 'bold')).grid(sticky='w')
    status = tk.StringVar(value='Comprobando configuración y PostgreSQL…')
    ttk.Label(body, textvariable=status, wraplength=540).grid(sticky='w', pady=16)
    server = None
    opening = False
    def close():
        if opening: return
        if server: server.stop()
        root.destroy()
    def ready(config):
        nonlocal opening
        if server or opening: return
        opening = True
        queue = []
        def work():
            candidate = Server(config)
            try:
                candidate.start(); queue.append((candidate, None))
            except Exception as error:
                candidate.stop(); logger.error('Inicio fallido (%s)', type(error).__name__); queue.append((None, friendly(error)))
        def poll():
            nonlocal server, opening
            if not queue: root.after(100, poll); return
            server, error = queue.pop(0); opening = False
            if error: status.set(error); return
            status.set('Sistema disponible en ' + server.url + '\nMantenga esta ventana abierta. Use Cerrar SGD para detenerlo.')
            open_button.configure(state='normal')
            config_button.configure(state='disabled')
            if not args.no_browser: webbrowser.open(server.url + '/login')
            report(args.result, estado='disponible', url=server.url, pid=os.getpid())
        threading.Thread(target=work, daemon=True).start(); poll()
    open_button = ttk.Button(body, text='Abrir sistema', state='disabled', command=lambda: webbrowser.open(server.url + '/login'))
    open_button.grid(sticky='ew', pady=4)
    config_button = ttk.Button(body, text='Configurar PostgreSQL', command=lambda: wizard(root, ready) if not opening else None)
    config_button.grid(sticky='ew', pady=4)
    ttk.Button(body, text='Ver registros', command=lambda: os.startfile(str(data_dir() / 'registros'))).grid(sticky='ew', pady=4)
    ttk.Button(body, text='Cerrar SGD', command=close).grid(sticky='ew', pady=4)
    root.protocol('WM_DELETE_WINDOW', close)
    def first():
        try:
            config = read('config.dat')
            if args.preview_wizard:
                wizard(root, ready, args.preview_wizard)
            elif config: ready(config)
            else: ready(None)
        except Exception as error:
            status.set(friendly(error))
    root.after(100, first)
    def watch():
        if server and server.thread and not server.thread.is_alive(): close(); return
        root.after(500, watch)
    root.after(500, watch)
    try: root.mainloop()
    finally:
        if server: server.stop()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--serve-only', action='store_true')
    parser.add_argument('--configure-env', action='store_true')
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--stop', action='store_true')
    parser.add_argument('--result')
    parser.add_argument('--preview-wizard')
    args = parser.parse_args()
    data_dir().mkdir(parents=True, exist_ok=True)
    logs = data_dir() / 'registros'; logs.mkdir(exist_ok=True)
    handler = RotatingFileHandler(logs / 'sgd.log', maxBytes=2_000_000, backupCount=5, encoding='utf-8')
    handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(name)s %(message)s'))
    logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)
    lock = None; server = None
    try:
        if args.stop:
            state = read('instance.dat')
            if state: request(state['url'] + '/__desktop/stop', state['token'])
            report(args.result, estado='cerrando' if state else 'sin_instancia'); return 0
        try:
            lock = Instance()
        except RuntimeError:
            state = read('instance.dat')
            if state:
                request(state['url'] + '/health')
                if not args.no_browser: webbrowser.open(state['url'] + '/login')
                report(args.result, estado='instancia_existente', url=state['url'], pid=state['pid']); return 0
            raise RuntimeError('El SGD se está configurando o iniciando. Espere y vuelva a abrirlo') from None
        if args.configure_env:
            options = json.loads(os.environ.pop('SGD_SETUP_JSON'))
            try:
                config = initialize(options)
                save('config.dat', config)
                report(args.result, estado='configurado', **config['verification'])
            finally:
                options.clear()
            return 0
        if args.check:
            config = read('config.dat')
            if not config: raise ValueError('Complete el asistente de primer inicio')
            report(args.result, estado='correcto', **verify(config['database_url'])); return 0
        if args.serve_only:
            config = read('config.dat')
            server = Server(config); server.start()
            report(args.result, estado='disponible', url=server.url, pid=os.getpid())
            while server.thread.is_alive(): server.thread.join(.5)
        else:
            gui(args)
        return 0
    except Exception as error:
        logger.error('Operación fallida (%s)', type(error).__name__)
        report(args.result, estado='error', detalle=friendly(error), tipo=type(error).__name__)
        if not (args.serve_only or args.configure_env or args.check or args.stop):
            import ctypes
            ctypes.windll.user32.MessageBoxW(None, friendly(error), 'SGD Diócesis de Tibú', 0x10)
        return 1
    finally:
        if server: server.stop()
        if lock: lock.close()


if __name__ == '__main__':
    raise SystemExit(main())
