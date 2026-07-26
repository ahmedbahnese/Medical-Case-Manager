@echo off
chcp 65001 >nul
title BSCH — System Update
echo ============================================================
echo  BSCH System Update
echo ============================================================
echo.

cd /d "%~dp0"

REM ── Pre-update backup ────────────────────────────────────────
echo Recommendation: Take a database backup before updating.
set /p DO_BACKUP="Create a database backup now? (Y/N): "
if /i "%DO_BACKUP%"=="Y" (
    call "%~dp0Backup.bat"
)

REM ── Check git ────────────────────────────────────────────────
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed.
    echo         Download from: https://git-scm.com
    pause
    exit /b 1
)

REM ── Check pnpm ───────────────────────────────────────────────
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] pnpm is not installed.
    echo         Install with: npm install -g pnpm
    pause
    exit /b 1
)

echo.
echo Step 1/4: Pulling latest code from GitHub...
git pull origin main
if errorlevel 1 (
    echo [ERROR] Failed to pull latest code.
    echo         Check your internet connection and Git configuration.
    pause
    exit /b 1
)

echo.
echo Step 2/4: Installing/updating dependencies...
call pnpm install
if errorlevel 1 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
)

echo.
echo Step 3/4: Building API server...
call pnpm --filter @workspace/api-server run build
if errorlevel 1 (
    echo [ERROR] API server build failed.
    pause
    exit /b 1
)

echo.
echo Step 4/4: Building frontend...
set BASE_PATH=/
set NODE_ENV=production
call pnpm --filter @workspace/bsch run build
if errorlevel 1 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Update completed successfully!
echo.
echo  Run StartServer.bat to start the updated server.
echo ============================================================
echo.
pause
