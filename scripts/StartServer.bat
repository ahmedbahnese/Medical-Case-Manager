@echo off
title BSCH - نظام إدارة الحالات الطبية
echo ============================================================
echo  BSCH Hospital Case Management System
echo  Starting server...
echo ============================================================

cd /d "%~dp0.."

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Please install Node.js 20+ from https://nodejs.org
    pause
    exit /b 1
)

REM Check if PostgreSQL is running
pg_isready -h localhost -p 5432 >nul 2>&1
if errorlevel 1 (
    echo WARNING: PostgreSQL does not appear to be running on port 5432.
    echo Make sure PostgreSQL is started before using the application.
)

REM Set environment variables
set PORT=8080
set NODE_ENV=production

REM Load .env if it exists
if exist ".env" (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" set %%a=%%b
    )
)

echo Starting API server on port %PORT%...
echo Open your browser to: http://localhost:%PORT%
echo.
echo Press Ctrl+C to stop the server.
echo ============================================================

node --enable-source-maps artifacts\api-server\dist\index.mjs
