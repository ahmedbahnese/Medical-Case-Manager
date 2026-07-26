@echo off
chcp 65001 >nul
title BSCH - نظام إدارة الحالات الطبية
echo ============================================================
echo  BSCH Hospital Case Management System
echo  Starting server...
echo ============================================================
echo.

cd /d "%~dp0"

REM ── Check Node.js ────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed.
    echo         Download from: https://nodejs.org  (v20 LTS or newer)
    pause
    exit /b 1
)

REM ── Check that the app is built ──────────────────────────────
if not exist "artifacts\api-server\dist\index.mjs" (
    echo [ERROR] Production build not found.
    echo         Run Update.bat first to build the application.
    pause
    exit /b 1
)

REM ── Load .env ────────────────────────────────────────────────
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        set "line=%%a"
        if not "!line:~0,1!"=="#" if not "%%a"=="" (
            set "%%a=%%b"
        )
    )
) else (
    echo [WARNING] .env file not found. Using defaults.
    echo           Copy .env.example to .env and fill in your values.
    echo.
)

REM ── Defaults ─────────────────────────────────────────────────
if "%PORT%"==""         set PORT=8080
if "%NODE_ENV%"==""     set NODE_ENV=production
if "%LOG_LEVEL%"==""    set LOG_LEVEL=info

REM ── Check PostgreSQL ─────────────────────────────────────────
pg_isready -h localhost -p 5432 >nul 2>&1
if errorlevel 1 (
    echo [WARNING] PostgreSQL does not appear to be running on port 5432.
    echo           Make sure PostgreSQL is started before using the application.
    echo.
)

echo  Server URL: http://localhost:%PORT%
echo  Press Ctrl+C to stop.
echo ============================================================
echo.

node --enable-source-maps artifacts\api-server\dist\index.mjs
