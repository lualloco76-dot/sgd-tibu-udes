"""Current-user Windows DPAPI storage. Never stores PostgreSQL admin credentials."""
import ctypes
from ctypes import wintypes
import json
import os
from pathlib import Path


class Blob(ctypes.Structure):
    _fields_ = [('size', wintypes.DWORD), ('data', ctypes.POINTER(ctypes.c_byte))]


def data_dir():
    override = os.environ.get('SGD_DATA_DIR')
    return Path(override) if override else Path(os.environ['LOCALAPPDATA']) / 'SGD Tibu UDES' / 'datos'


def crypt(value, decrypt=False):
    if os.name != 'nt':
        raise RuntimeError('La distribución de escritorio requiere Windows')
    buffer = ctypes.create_string_buffer(value)
    source = Blob(len(value), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_byte)))
    destination = Blob()
    library = ctypes.WinDLL('crypt32', use_last_error=True)
    fn = library.CryptUnprotectData if decrypt else library.CryptProtectData
    fn.argtypes = [ctypes.POINTER(Blob), ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
                   ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(Blob)]
    fn.restype = wintypes.BOOL
    ok = fn(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(destination))
    if not ok:
        raise RuntimeError('Windows no pudo proteger o leer la configuración del usuario actual')
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    kernel.LocalFree.argtypes = [ctypes.c_void_p]
    try:
        return ctypes.string_at(destination.data, destination.size)
    finally:
        kernel.LocalFree(destination.data)


def save(name, value):
    root = data_dir()
    root.mkdir(parents=True, exist_ok=True)
    temporary = root / (name + '.tmp')
    temporary.write_bytes(crypt(json.dumps(value, ensure_ascii=False).encode('utf-8')))
    temporary.replace(root / name)


def read(name):
    path = data_dir() / name
    return json.loads(crypt(path.read_bytes(), decrypt=True)) if path.exists() else None
