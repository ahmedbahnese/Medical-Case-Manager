@echo off
setlocal EnableExtensions

set "BASE=%~dp0"
set "TASK_NAME=BSCH Reverse Tunnel"

if not exist "%BASE%tunnel-config.bat" (
  echo Missing tunnel-config.bat. Copy tunnel-config.example.bat and edit it first.
  exit /b 2
)

rem Runs after network initialization and restarts if the process exits.
schtasks /Create /TN "%TASK_NAME%" /TR "\"%BASE%start-tunnel.bat\"" /SC ONSTART /DELAY 0000:30 /RL LIMITED /F
if errorlevel 1 (
  echo Could not register scheduled task. Run this file as Administrator.
  exit /b 3
)

echo Installed: %TASK_NAME%
echo To remove it: schtasks /Delete /TN "%TASK_NAME%" /F
