@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "TASK_NAME=BSCH Medical Case Manager LAN Server"
set "START_SCRIPT=%~dp0StartServer.bat"

if not exist "%START_SCRIPT%" (
    echo [ERROR] لم يتم العثور على StartServer.bat
    pause
    exit /b 1
)

REM تشغيل الخادم عند إقلاع Windows مع تأخير بسيط حتى تبدأ الشبكة.
schtasks /Create /TN "%TASK_NAME%" /TR "\"%START_SCRIPT%\"" /SC ONSTART /DELAY 0000:30 /RU SYSTEM /RL HIGHEST /F
if errorlevel 1 (
    echo [ERROR] فشل تثبيت التشغيل التلقائي.
    echo شغّل هذا الملف باستخدام Run as administrator.
    pause
    exit /b 1
)

echo تم تثبيت التشغيل التلقائي لخادم BSCH.
echo سيتم تشغيله بعد كل إعادة تشغيل لـ Windows.
echo لإلغاء التشغيل التلقائي شغّل Remove-LAN-AutoStart.bat
pause
