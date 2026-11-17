"""Exercise the normal GUI and default-browser launch path in the lab profile."""
import ctypes
from ctypes import wintypes
import json
from pathlib import Path
import subprocess
import sys
import time
from PIL import ImageGrab

sys.path.insert(0,str(Path(__file__).resolve().parent))
from validate import LAB,PUBLIC,run,write


def main():
    exe=LAB/'installed/SGD_Tibu.exe';result=LAB/'gui-start.json'
    result.unlink(missing_ok=True)
    process=subprocess.Popen([str(exe),'--result',str(result)])
    user=ctypes.WinDLL('user32',use_last_error=True)
    user.FindWindowW.restype=wintypes.HWND
    user.GetWindowTextLengthW.argtypes=[wintypes.HWND]
    user.GetWindowTextW.argtypes=[wintypes.HWND,wintypes.LPWSTR,ctypes.c_int]
    try:
        for _ in range(150):
            if result.exists():break
            assert process.poll() is None
            time.sleep(.2)
        value=json.loads(result.read_text());assert value['estado']=='disponible'
        hwnd=user.FindWindowW(None,'SGD Diócesis de Tibú');assert hwnd
        time.sleep(1)
        ImageGrab.grab(window=int(hwnd)).save(PUBLIC/'capturas/lanzador_disponible.png')
        titles=[]
        callback_type=ctypes.WINFUNCTYPE(wintypes.BOOL,wintypes.HWND,wintypes.LPARAM)
        @callback_type
        def callback(handle,_):
            size=user.GetWindowTextLengthW(handle)
            if size:
                buffer=ctypes.create_unicode_buffer(size+1);user.GetWindowTextW(handle,buffer,size+1)
                if 'Archivo diocesano' in buffer.value:titles.append('Ventana de navegador con el título de la aplicación')
            return True
        for _ in range(40):
            user.EnumWindows(callback,0)
            if titles:break
            time.sleep(.2)
        assert titles,'No se observó una ventana de navegador con el título del SGD'
        write('inicio-normal.json',dict(ventana_nativa=True,servidor_disponible=True,navegador_predeterminado_observado=True,apertura_sin_terminal=True))
    finally:
        run([exe,'--stop']);process.wait(timeout=40)
    print('Inicio normal con ventana nativa y navegador predeterminado comprobado')


if __name__=='__main__':main()
