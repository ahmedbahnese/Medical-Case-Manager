@echo off
setlocal EnableExtensions

set "BASE=%~dp0"
if not exist "%BASE%tunnel-config.bat" (
  echo Missing tunnel-config.bat. Copy tunnel-config.example.bat and edit it first.
  exit /b 2
)
call "%BASE%tunnel-config.bat"

if not exist "%PLINK%" (
  echo Plink not found: %PLINK%
  exit /b 3
)
if not exist "%SSH_KEY%" (
  echo SSH key not found: %SSH_KEY%
  exit /b 4
)

for %%D in ("%TUNNEL_LOG%") do if not exist "%%~dpD" mkdir "%%~dpD"

:reconnect
>>"%TUNNEL_LOG%" echo [%date% %time%] Connecting to %VPS_HOST%:%VPS_PORT%
"%PLINK%" -batch -N -T -ssh -P %VPS_PORT% -i "%SSH_KEY%" -no-antispoof -R 127.0.0.1:%REMOTE_PORT%:127.0.0.1:%LOCAL_PORT% %VPS_USER%@%VPS_HOST% >>"%TUNNEL_LOG%" 2>&1
>>"%TUNNEL_LOG%" echo [%date% %time%] Tunnel stopped with code %errorlevel%. Retrying in 10 seconds.
timeout /t 10 /nobreak >nul
goto reconnect
