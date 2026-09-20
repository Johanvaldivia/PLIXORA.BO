@echo off
title PLIXORA.BO - WhatsApp Bot (Baileys Engine)
chcp 65001 >nul
color 0A
REM =============================================================
REM PLIXORA.BO - WhatsApp Bot Launcher v3.0 (Baileys Engine)
REM =============================================================
cd /d "%~dp0"

echo ============================================================
echo   PLIXORA.BO - BOT DE WHATSAPP (MOTOR BAILEYS v3.0)
echo   Cero Chrome - 40 MB RAM - Cola Anti-Colisión
echo ============================================================
echo.

REM Comprobar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no está instalado o no se encuentra en el PATH.
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

REM Abrir página QR en el navegador tras 2 segundos en segundo plano
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000/qr"

:loop
echo [%date% %time%] Iniciando servidor Baileys...
node server.js
echo.
echo [%date% %time%] El servidor se detuvo (código %errorlevel%).
echo Reiniciando en 4 segundos... (Presiona Ctrl+C para detener)
timeout /t 4 /nobreak >nul
goto loop