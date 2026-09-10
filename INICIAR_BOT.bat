@echo off
title PLIXORA.BO - Bot Launcher
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   INICIANDO BOT DE WHATSAPP - PLIXORA.BO
echo ============================================================
echo.

cd whatsapp-bot
call start-bot.bat
