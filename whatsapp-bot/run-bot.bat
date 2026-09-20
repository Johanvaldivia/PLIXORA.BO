@echo off
cd /d "%~dp0"

:loop
node server.js
echo [%date% %time%] Servidor Baileys detenido. Reiniciando en 4 segundos...
timeout /t 4 >nul 2>&1
goto loop
