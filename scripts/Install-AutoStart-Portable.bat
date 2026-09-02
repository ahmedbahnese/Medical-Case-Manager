@echo off
setlocal
 title BSCH - Auto Start Setup
set "APP=%~dp0..\electron\dist-electron\BSCH-Portable-x64-1.0.0.exe"
if not exist "%APP%" set "APP=%~dp0..\electron\dist-electron\BSCH-Portable-ia32-1.0.0.exe"
if not exist "%APP%" (
  echo [ERROR] لم يتم العثور على نسخة Portable.
  echo ضع هذا الملف داخل مجلد المشروع بجوار مجلد electron.
  pause
  exit /b 1
)
for %%A in ("%APP%") do set "APP_FULL=%%~fA"
schtasks /delete /tn "BSCH Auto Start" /f >nul 2>&1
schtasks /create /tn "BSCH Auto Start" /sc onlogon /delay 0000:15 /tr "\"%APP_FULL%\"" /f
if errorlevel 1 (
  echo [ERROR] تعذر إنشاء التشغيل التلقائي.
  pause
  exit /b 1
)
echo [OK] سيتم تشغيل BSCH تلقائيًا عند تسجيل الدخول إلى Windows.
echo لا تحذف مجلد البرنامج أو تغيّر مكانه بعد ذلك.
pause
