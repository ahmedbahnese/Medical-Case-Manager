@echo off
title BSCH Update
echo ============================================================
echo  BSCH System Update
echo ============================================================

cd /d "%~dp0.."

echo Step 1: Pulling latest code from GitHub...
git pull origin main
if errorlevel 1 (
    echo ERROR: Failed to pull latest code. Check your internet connection and Git configuration.
    pause
    exit /b 1
)

echo Step 2: Installing/updating dependencies...
call pnpm install
if errorlevel 1 (
    echo ERROR: Dependency installation failed.
    pause
    exit /b 1
)

echo Step 3: Building API server...
call pnpm --filter @workspace/api-server run build
if errorlevel 1 (
    echo ERROR: API server build failed.
    pause
    exit /b 1
)

echo Step 4: Building frontend...
set BASE_PATH=/
set NODE_ENV=production
call pnpm --filter @workspace/bsch run build
if errorlevel 1 (
    echo ERROR: Frontend build failed.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Update completed successfully!
echo  Restart the server using StartServer.bat
echo ============================================================
pause
