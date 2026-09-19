@echo off
title PLIXORA.BO - Detener Bot
chcp 65001 >nul
echo ============================================================
echo   DETENIENDO BOT DE WHATSAPP - PLIXORA.BO
echo ============================================================
echo.

echo [1/3] Deteniendo procesos de Node.js...
taskkill /f /im node.exe >nul 2>&1

echo [2/3] Limpiando procesos de navegador huérfanos del bot...
powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process -Filter \"Name = 'chrome.exe' or Name = 'msedge.exe'\" | Where-Object { $_.CommandLine -like '*wwebjs_auth*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

echo [3/3] Eliminando bloqueos de sesión...
del /f /q "%~dp0whatsapp-bot\.wwebjs_auth\session\lockfile" >nul 2>&1
del /f /q "%~dp0whatsapp-bot\.wwebjs_auth\session\Singleton*" >nul 2>&1
del /f /q "%~dp0whatsapp-bot\.wwebjs_auth\session\DevToolsActivePort" >nul 2>&1
del /f /q "%~dp0whatsapp-bot\.wwebjs_auth\session\Default\LOCK" >nul 2>&1
del /f /q "%~dp0whatsapp-bot\.wwebjs_auth\session\Default\lockfile" >nul 2>&1

echo.
echo [OK] Bot de WhatsApp detenido y desbloqueado por completo.
echo.
timeout /t 3 >nul 2>&1
