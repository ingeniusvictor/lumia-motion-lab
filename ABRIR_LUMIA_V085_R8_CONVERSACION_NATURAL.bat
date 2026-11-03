@echo off
setlocal
cd /d "%~dp0"
title LUMIA Motion Intelligence v0.8.5 R8 - Conversacion natural
echo Iniciando L.U.M.I.A. MOTION ...
echo Este lanzador primero inicia el servidor y luego abre el navegador.
echo.
where py >nul 2>nul
if errorlevel 1 goto CHECK_PYTHON
py -3 -c "import sys; print(sys.version_info.major)" >nul 2>nul
if errorlevel 1 goto CHECK_PYTHON
goto RUN_PY

:CHECK_PYTHON
where python >nul 2>nul
if errorlevel 1 goto NO_PYTHON
python -c "import sys; print(sys.version_info.major)" >nul 2>nul
if errorlevel 1 goto NO_PYTHON
goto RUN_PYTHON

:RUN_PY
py -3 "%~dp0INICIAR_LUMIA_SERVIDOR.py"
set "CODE=%errorlevel%"
goto END

:RUN_PYTHON
python "%~dp0INICIAR_LUMIA_SERVIDOR.py"
set "CODE=%errorlevel%"
goto END

:NO_PYTHON
echo ERROR: No se encontro un Python funcional con py -3 ni con python.
echo Instala Python 3 desde https://www.python.org/downloads/ y vuelve a ejecutar.
set "CODE=1"
goto END

:END
echo.
if not "%CODE%"=="0" echo ERROR de inicio, codigo %CODE%. Revisa los mensajes anteriores.
echo Presiona una tecla para cerrar esta ventana.
pause >nul
exit /b %CODE%
