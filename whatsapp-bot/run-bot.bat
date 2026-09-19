@echo off
cd /d "%~dp0"

:loop
powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'chrome.exe' -or $_.Name -eq 'msedge.exe') -and ($_.CommandLine -like '*wwebjs_auth*' -or $_.CommandLine -like '*whatsapp-bot*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
del /f /q "%~dp0.wwebjs_auth\session\lockfile" >nul 2>&1
del /f /q "%~dp0.wwebjs_auth\session\Singleton*" >nul 2>&1
del /f /q "%~dp0.wwebjs_auth\session\DevToolsActivePort" >nul 2>&1
del /f /q "%~dp0.wwebjs_auth\session\Default\LOCK" >nul 2>&1
del /f /q "%~dp0.wwebjs_auth\session\Default\lockfile" >nul 2>&1

node server.js

echo [%date% %time%] Servidor detenido. Reiniciando en 4 segundos...
timeout /t 4 >nul 2>&1
goto loop
