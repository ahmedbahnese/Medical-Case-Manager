@echo off
setlocal EnableExtensions EnableDelayedExpansion
title BSCH - Hospital Case Management System
cd /d "%~dp0"

echo ============================================================
echo  BSCH Hospital Case Management System
echo ============================================================
echo.

REM Find Node.js in PATH first. Scheduled tasks may not inherit the user's PATH.
set "NODE_EXE="
where node >nul 2>&1
if not errorlevel 1 set "NODE_EXE=node.exe"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if defined ProgramFiles(x86) if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE_EXE (
    echo [ERROR] Node.js was not found.
    echo Install Node.js on this computer and restart Windows.
    echo The server cannot start without node.exe.
    pause
    exit /b 1
)

REM Check that the production build is present.
if not exist "artifacts\api-server\dist\index.mjs" (
    echo [ERROR] Production build not found.
    echo Run Update.bat first to build the application.
    pause
    exit /b 1
)

REM Load simple KEY=VALUE entries from .env.
if exist ".env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do (
        if not "%%a"=="" set "%%a=%%b"
    )
) else (
    echo [WARNING] .env file not found. Defaults will be used.
    echo Copy .env.example to .env and fill in your values.
    echo.
)

REM Defaults for the LAN server.
if "%PORT%"=="" set "PORT=8080"
if "%NODE_ENV%"=="" set "NODE_ENV=production"
if "%LOG_LEVEL%"=="" set "LOG_LEVEL=info"
if "%HOST%"=="" set "HOST=0.0.0.0"
set "FRONTEND_DIR=artifacts\bsch\dist\public"

REM BSCH uses a local SQLite database; no PostgreSQL service is required.
echo Server host: %HOST%
echo Server port: %PORT%
echo.
echo Local IP addresses:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4 Address"') do (
    set "_ip=%%a"
    set "_ip=!_ip: =!"
    echo   http://!_ip!:%PORT%
)
echo.
echo Share one of the URLs above with devices on the hospital LAN.
echo Press Ctrl+C to stop the server.
echo ============================================================
echo.

"%NODE_EXE%" --enable-source-maps artifacts\api-server\dist\index.mjs
exit /b %errorlevel%
