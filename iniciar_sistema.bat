@echo off
setlocal
cd /d "%~dp0"
if /i "%~1"=="backend" goto backend
if /i "%~1"=="frontend" goto frontend
if not "%~1"=="" goto usage
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0launcher\Start-System.ps1"
set "launcher_exit=%errorlevel%"
if not "%launcher_exit%"=="0" pause
exit /b %launcher_exit%
:backend
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0launcher\Start-System.ps1" -Component backend -NoBrowser
set "launcher_exit=%errorlevel%"
if not "%launcher_exit%"=="0" pause
exit /b %launcher_exit%
:frontend
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0launcher\Start-System.ps1" -Component frontend -NoBrowser
set "launcher_exit=%errorlevel%"
if not "%launcher_exit%"=="0" pause
exit /b %launcher_exit%
:usage
echo Uso: iniciar.bat [backend o frontend]
echo Sin argumentos inicia los dos servicios y abre el sistema.
exit /b 1
