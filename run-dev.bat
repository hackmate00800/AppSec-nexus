@echo off
title AppSec Nexus - Cybersecurity & Web Pentesting Platform
cd /d "%~dp0"
echo ============================================================
echo   AppSec Nexus - Desktop Cybersecurity Platform
echo ============================================================
echo.
echo Initializing environment and toolchains...
set PATH=%~dp0tools\compiler\w64devkit\bin;%~dp0tools\bin;%PATH%

echo.
echo Launching AppSec Nexus Desktop Window...
call npm run tauri dev
pause
