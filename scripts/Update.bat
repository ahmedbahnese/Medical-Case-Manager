@echo off
setlocal
 title BSCH - تحديث النظام
cd /d "%~dp0.."
echo ============================================================
echo BSCH Update - للمطور فقط
echo ============================================================

git --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git غير مثبت. لا تستخدم هذا الملف على جهاز التشغيل العادي.
  echo استخدم نسخة Portable أو Setup بدلًا منه.
  pause
  exit /b 1
)
pnpm --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] pnpm غير مثبت. لا يمكن بناء التحديث على هذا الجهاز.
  pause
  exit /b 1
)

echo [1/4] Pulling latest code from GitHub...
git pull origin main
if errorlevel 1 goto failed

echo [2/4] Installing dependencies...
call pnpm install
if errorlevel 1 goto failed

echo [3/4] Building API...
call pnpm --filter @workspace/api-server run build
if errorlevel 1 goto failed

echo [4/4] Building frontend...
set BASE_PATH=/
set NODE_ENV=production
call pnpm --filter @workspace/bsch run build
if errorlevel 1 goto failed

echo.
echo [OK] Update completed successfully.
echo Restart the application now.
pause
exit /b 0

:failed
echo.
echo [ERROR] Update failed. The update was NOT completed.
pause
exit /b 1
