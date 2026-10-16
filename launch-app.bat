@echo off
title Launch AppSec Nexus Standalone
cd /d "%~dp0"

echo ============================================================
echo   AppSec Nexus - Standalone Desktop Launcher
echo ============================================================
echo.
echo Configuring security toolchains and environment...
set PATH=%~dp0tools\compiler\w64devkit\bin;%~dp0tools\bin;%PATH%

echo Launching AppSec-Nexus.exe...
start "" "%~dp0AppSec-Nexus.exe"

echo AppSec Nexus is starting in its desktop window.
timeout /t 3 /nobreak >nul
exit
