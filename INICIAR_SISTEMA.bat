@echo off
title PLIXORA.BO - Sistema Completo
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   ABRIENDO SISTEMA PLIXORA.BO
echo   Conectado al Bot Virtual 24/7 (Oracle Cloud)
echo ============================================================
echo.

REM Abrir el sistema web en el navegador predeterminado
echo Abriendo sistema PLIXORA.BO en tu navegador...
start "" "%~dp0index.html"

echo.
echo ============================================================
echo   SISTEMA ACTIVO
echo   - Plataforma: index.html
echo   - Bot Virtual: http://plixora-bot.duckdns.org:3000
echo   - PC Local: Ningun proceso en segundo plano requerido
echo ============================================================
timeout /t 2 /nobreak >nul
exit
