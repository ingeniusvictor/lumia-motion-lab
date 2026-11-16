@echo off
setlocal
cd /d "%~dp0"
title LUMIA MOTION R9 LAB - Portal independiente
echo ======================================================
echo   LUMIA MOTION LAB R8/R9 - PORTAL INDEPENDIENTE
echo ======================================================
echo.
echo Este lanzador NO abre la LUMIA principal, ni Ollama,
echo ni los servicios de vision. No cierra otros procesos.
echo.
if not exist "%~dp0INICIAR_LUMIA_SERVIDOR.py" goto NO_SERVER
if not exist "%~dp0LUMIA_VITA_NATURAL_V05.vrm" goto NO_AVATAR

where py >nul 2>nul
if not errorlevel 1 (
  py -3 -c "import sys; assert sys.version_info.major == 3" >nul 2>nul
  if not errorlevel 1 goto RUN_PY
)
where python >nul 2>nul
if not errorlevel 1 (
  python -c "import sys; assert sys.version_info.major == 3" >nul 2>nul
  if not errorlevel 1 goto RUN_PYTHON
)
echo ERROR: Falta Python 3 o no esta disponible.
goto ERROR

:RUN_PY
echo Iniciando desde puerto 5190; si esta ocupado,
echo el servidor probara 5191-5200 y abrira la URL real.
echo Mantiene esta ventana abierta mientras funciona.
echo.
py -3 "%~dp0INICIAR_LUMIA_SERVIDOR.py" --port 5190
set "CODE=%errorlevel%"
goto STOPPED

:RUN_PYTHON
echo Iniciando desde puerto 5190; si esta ocupado,
echo el servidor probara 5191-5200 y abrira la URL real.
echo Mantiene esta ventana abierta mientras funciona.
echo.
python "%~dp0INICIAR_LUMIA_SERVIDOR.py" --port 5190
set "CODE=%errorlevel%"
goto STOPPED

:NO_SERVER
echo ERROR: No se encuentra INICIAR_LUMIA_SERVIDOR.py.
goto ERROR

:NO_AVATAR
echo ERROR: No se encuentra el VRM aprobado en este laboratorio.
echo Ejecuta PREPARAR_LUMIA_MOTION_R9_LAB.ps1 -Mode Prepare.
goto ERROR

:ERROR
set "CODE=1"

:STOPPED
echo.
if not "%CODE%"=="0" echo ERROR: El servidor termino con codigo %CODE%.
echo La ventana debe permanecer abierta para que funcione el portal.
echo Presiona una tecla para cerrar esta ventana.
pause >nul
exit /b %CODE%
