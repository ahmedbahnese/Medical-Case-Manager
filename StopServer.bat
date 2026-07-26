@echo off
chcp 65001 >nul
title Stop BSCH Server
echo ============================================================
echo  BSCH — Stopping server
echo ============================================================
echo.

REM Load PORT from .env if available
set PORT=8080
if exist "%~dp0.env" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0.env") do (
        if "%%a"=="PORT" set PORT=%%b
    )
)

set KILLED=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    echo Terminating process %%a (port %PORT%)...
    taskkill /PID %%a /F >nul 2>&1
    set KILLED=1
)

if "%KILLED%"=="1" (
    echo BSCH server stopped successfully.
) else (
    echo No BSCH server process found on port %PORT%.
)

echo.
pause
