@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title BSCH - نظام إدارة الحالات الطبية
echo ============================================================
echo  BSCH Hospital Case Management System
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
        set "_k=%%a"
        if not "!_k:~0,1!"=="#" if not "%%a"=="" (
            set "%%a=%%b"
        )
    )
) else (
    echo [WARNING] .env file not found. Defaults will be used.
    echo           Copy .env.example to .env and fill in your values.
    echo.
)

REM ── Defaults ─────────────────────────────────────────────────
if "%PORT%"==""      set PORT=8080
if "%NODE_ENV%"==""  set NODE_ENV=production
if "%LOG_LEVEL%"==""  set LOG_LEVEL=info
if "%HOST%"==""       set HOST=0.0.0.0

REM ── Tell the API server where the built frontend lives ───────
set FRONTEND_DIR=artifacts\bsch\dist\public

REM ── BSCH uses a local SQLite database; no PostgreSQL service is required.

REM ── Show local IP addresses ───────────────────────────────────
echo  Server host: %HOST%
echo  Server port: %PORT%
echo.
echo  Local IP addresses (share one of these with hospital staff):
echo  ────────────────────────────────────────────────────────────
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4 Address"') do (
    set "_ip=%%a"
    set "_ip=!_ip: =!"
    echo    http://!_ip!:%PORT%
)
echo.
echo  If none shown, open Command Prompt and run: ipconfig
echo.
echo  How to install as an app on other devices:
echo    Android / Windows : open the URL in Chrome, tap "Install" when prompted
echo    iPhone / iPad     : open in Safari -> Share -> Add to Home Screen
echo.
echo  Press Ctrl+C to stop the server.
echo ============================================================
echo.

node --enable-source-maps artifacts\api-server\dist\index.mjs
