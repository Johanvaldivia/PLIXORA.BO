@echo off
title PLIXORA.BO - Sistema Completo
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   INICIANDO SISTEMA PLIXORA.BO Y BOT DE WHATSAPP
echo ============================================================
echo.

REM 1. Iniciar el bot en una ventana dedicada en segundo plano
echo [1/2] Iniciando bot de WhatsApp en segundo plano...
start "PLIXORA Bot Server" cmd /k "cd /d ""%~dp0whatsapp-bot"" && call start-bot.bat"

REM 2. Abrir el sistema web en el navegador predeterminado
echo [2/2] Abriendo sistema PLIXORA.BO en el navegador...
timeout /t 2 /nobreak >nul
start "" "%~dp0index.html"

echo.
echo ============================================================
echo   SISTEMA Y BOT INICIADOS CORRECTAMENTE
echo   - Sistema:  index.html
echo   - Bot / QR: http://localhost:3000/qr
echo ============================================================
timeout /t 4 /nobreak >nul
exit
