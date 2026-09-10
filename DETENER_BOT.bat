@echo off
title PLIXORA.BO - Detener Bot
chcp 65001 >nul
echo ============================================================
echo   DETENIENDO BOT DE WHATSAPP - PLIXORA.BO
echo ============================================================
echo.

taskkill /f /im node.exe >nul 2>&1
echo [OK] Servidor del bot detenido correctamente.
echo.
timeout /t 3 /nobreak >nul
