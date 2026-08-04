@echo off
REM =============================================================
REM PLIXORA.BO - WhatsApp Bot Launcher (auto-restart)
REM Mantiene el bot vivo: si se cae o crashea, lo reinicia.
REM =============================================================
cd /d "%~dp0"

:loop
echo [%date% %time%] Iniciando bot...
node server.js
echo [%date% %time%] El bot se detuvo (codigo %errorlevel%). Reiniciando en 5s...
timeout /t 5 /nobreak >nul
goto loop