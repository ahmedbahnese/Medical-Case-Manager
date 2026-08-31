@echo off
setlocal
cd /d "%~dp0"
set "NGROK_EXE=%~dp0ngrok.exe"
set "NGROK_CONFIG=%APPDATA%\BSCH\ngrok.yml"

echo ================================================
echo BSCH - Public HTTPS Link
echo ================================================
echo.

if not exist "%NGROK_EXE%" (
  echo لم يتم العثور على ngrok.exe بجوار هذا الملف.
  echo ضع ملف ngrok.exe داخل نفس مجلد البرنامج ثم شغّل الملف مرة أخرى.
  echo التحميل الرسمي: https://ngrok.com/download/windows
  pause
  exit /b 1
)

if not exist "%NGROK_CONFIG%" (
  echo لم يتم إعداد مفتاح ngrok لهذا السيرفر.
  echo افتح نافذة أوامر جديدة ونفذ:
  echo.
  echo   ngrok config add-authtoken YOUR_AUTHTOKEN
  echo.
  echo ثم شغّل هذا الملف مرة أخرى.
  pause
  exit /b 1
)

echo تأكد أن برنامج BSCH يعمل على المنفذ 8080.
echo سيتم الآن فتح نافذة النفق، والرابط الظاهر فيها هو الرابط الذي ترسله للمستخدمين.
echo لا تغلق نافذة النفق أثناء الاستخدام.
echo.
start "BSCH HTTPS Tunnel" cmd /k ""%NGROK_EXE%" http 8080 --config "%NGROK_CONFIG%""
exit /b 0
