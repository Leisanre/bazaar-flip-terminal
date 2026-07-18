@echo off
title Bazaar Flip Terminal Server
cd /d "%~dp0"
echo ============================================
echo   Bazaar Flip Terminal - server
echo   Keep this window open while you play.
echo   It restarts itself if anything crashes.
echo ============================================
:loop
call npx tsx server/index.ts
echo.
echo Server stopped (crash or update) - restarting in 3s... Press Ctrl+C to quit.
timeout /t 3 /nobreak >nul
goto loop
