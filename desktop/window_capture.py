"""Capture only windows created by this validation run, without desktop contents."""
import ctypes
from ctypes import wintypes
import os
from pathlib import Path
import subprocess
import sys
import time
from PIL import ImageGrab

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.test-artifacts/distribution/evidence/capturas'
LAB = ROOT / '.test-artifacts/distribution/lab'


def windows(pid):
    user = ctypes.WinDLL('user32', use_last_error=True)
    found = []
    callback_type = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    user.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
    user.IsWindowVisible.argtypes = [wintypes.HWND]
    @callback_type
    def callback(hwnd, _):
        value = wintypes.DWORD()
        user.GetWindowThreadProcessId(hwnd, ctypes.byref(value))
        if value.value == pid and user.IsWindowVisible(hwnd): found.append(hwnd)
        return True
    user.EnumWindows(callback, 0)
    return found


def capture_installer():
    installer = ROOT / '.test-artifacts/distribution/inno-output/SGD_Tibu_Setup.exe'
    # Inno Setup starts a child setup process. Find only windows with its exact
    # setup caption; no image of the rest of the desktop is captured.
    process = subprocess.Popen([str(installer), '/SP-', '/DIR=' + str(LAB / 'ui-preview')])
    user = ctypes.WinDLL('user32', use_last_error=True)
    user.FindWindowW.restype = wintypes.HWND
    hwnd = None
    for _ in range(80):
        hwnd = user.FindWindowW(None, 'Instalar') or user.FindWindowW(None, 'Instalación') or user.FindWindowW(None, 'Instalación de SGD Diócesis de Tibú') or user.FindWindowW(None, 'Instalar - SGD Diócesis de Tibú')
        if hwnd: break
        handles = windows(process.pid)
        if handles: hwnd = handles[-1]; break
        time.sleep(.1)
    if not hwnd: raise RuntimeError('No se encontró la ventana del instalador')
    time.sleep(.5)
    ImageGrab.grab(window=int(hwnd)).save(OUT / 'instalador_requisito.png')
    user.PostMessageW.argtypes = [wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM]
    # WM_COMMAND IDCANCEL affects this installer window only.
    user.PostMessageW(hwnd, 0x111, 2, 0)
    try: process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        user.PostMessageW(hwnd, 0x10, 0, 0)


def capture_wizard():
    env = os.environ.copy(); env['SGD_DATA_DIR'] = str(LAB / 'wizard-preview')
    executable = LAB / 'installed/SGD_Tibu.exe'
    result = subprocess.run([str(executable), '--no-browser', '--preview-wizard', str(OUT / 'asistente_postgresql.png')], env=env, timeout=25)
    assert result.returncode == 0 and (OUT / 'asistente_postgresql.png').exists()


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    capture_installer()
    capture_wizard()
    print('Capturados instalador y asistente reales')
