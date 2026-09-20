@echo off
title PLIXORA.BO - Detener Bot
chcp 65001 >nul
echo ============================================================
echo   DETENIENDO BOT DE WHATSAPP - PLIXORA.BO
echo ============================================================
echo.

echo [1/1] Deteniendo servidor de WhatsApp...
powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -like '*server.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

echo.
echo [OK] Bot de WhatsApp detenido correctamente.
echo.
timeout /t 2 >nul 2>&1
