@echo off
setlocal EnableExtensions
 title BSCH Partial Update v1.2.1

if /I not "%OS%"=="Windows_NT" (
  echo [ERROR] This update works on Windows only.
  pause
  exit /b 1
)

rem Request administrator rights because installed files are under Program Files.
fltmc >nul 2>&1
if errorlevel 1 (
  echo Requesting administrator rights...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b 0
)

set "APP_ROOT=%ProgramFiles(x86)%\BSCH"
if not exist "%APP_ROOT%\resources" set "APP_ROOT=%ProgramFiles%\BSCH"
if not exist "%APP_ROOT%\resources" set "APP_ROOT=C:\Program Files (x86)\BSCH"
if not exist "%APP_ROOT%\resources" (
  echo [ERROR] BSCH installation was not found.
  echo Expected: C:\Program Files (x86)\BSCH
  pause
  exit /b 1
)

set "PATCH_URL=https://github.com/ahmedbahnese/Medical-Case-Manager/releases/download/v1.2.1/BSCH-Update-v1.2.1-files.zip"
set "WORK=%TEMP%\BSCH-Update-v1.2.1-%RANDOM%"
set "ZIP=%WORK%\patch.zip"
set "VBS=%WORK%\extract.vbs"
mkdir "%WORK%" >nul 2>&1

echo Downloading BSCH partial update...
powershell -NoProfile -ExecutionPolicy Bypass -Command "(New-Object Net.WebClient).DownloadFile('%PATCH_URL%','%ZIP%')"
if not exist "%ZIP%" (
  echo [ERROR] Could not download the update package.
  pause
  exit /b 1
)

>"%VBS%" echo Set sh = CreateObject("Shell.Application")
>>"%VBS%" echo Set src = sh.NameSpace(WScript.Arguments(0))
>>"%VBS%" echo Set dst = sh.NameSpace(WScript.Arguments(1))
>>"%VBS%" echo dst.CopyHere src.Items, 20
cscript //nologo "%VBS%" "%ZIP%" "%WORK%\files" >nul
set /a WAIT_COUNT=0
:wait_extract
if exist "%WORK%\files\app.asar" goto extracted
set /a WAIT_COUNT+=1
if %WAIT_COUNT% GEQ 30 (
  echo [ERROR] Could not extract the update package.
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto wait_extract
:extracted

set "APP_ASAR=%WORK%\files\app.asar"
set "API_SRC=%WORK%\files\api-server\dist"
set "WEB_SRC=%WORK%\files\public"
if not exist "%APP_ASAR%" (
  echo [ERROR] Invalid update package: app.asar is missing.
  pause
  exit /b 1
)
if not exist "%API_SRC%\index.mjs" (
  echo [ERROR] Invalid update package: API files are missing.
  pause
  exit /b 1
)
if not exist "%WEB_SRC%\index.html" (
  echo [ERROR] Invalid update package: frontend files are missing.
  pause
  exit /b 1
)

echo Stopping BSCH before replacing application files...
taskkill /IM BSCH.exe /T /F >nul 2>&1
timeout /t 2 /nobreak >nul

if not exist "%APP_ROOT%\resources\api-server\dist" mkdir "%APP_ROOT%\resources\api-server\dist"
if not exist "%APP_ROOT%\resources\public" mkdir "%APP_ROOT%\resources\public"

copy /Y "%APP_ASAR%" "%APP_ROOT%\resources\app.asar" >nul
if errorlevel 1 goto failed
xcopy "%API_SRC%\*" "%APP_ROOT%\resources\api-server\dist\" /E /I /Y >nul
if errorlevel 1 goto failed
xcopy "%WEB_SRC%\*" "%APP_ROOT%\resources\public\" /E /I /Y >nul
if errorlevel 1 goto failed

>"%APP_ROOT%\resources\BSCH-update-version.txt" echo v1.2.1
>"%APP_ROOT%\resources\BSCH-update-date.txt" echo %DATE% %TIME%

echo.
echo [OK] BSCH partial update v1.2.1 completed.
echo SQLite database was not deleted or replaced.
echo Start BSCH normally now.
rmdir /S /Q "%WORK%" >nul 2>&1
pause
exit /b 0

:failed
echo.
echo [ERROR] Could not copy the update files.
echo Close BSCH and run this file again as administrator.
rmdir /S /Q "%WORK%" >nul 2>&1
pause
exit /b 1
