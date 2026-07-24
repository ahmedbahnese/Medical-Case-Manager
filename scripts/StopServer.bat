@echo off
title Stop BSCH Server
echo Stopping BSCH server...

REM Kill the Node.js process running on port 8080
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080 " ^| findstr "LISTENING"') do (
    echo Terminating process %%a on port 8080...
    taskkill /PID %%a /F >nul 2>&1
)

echo BSCH server stopped.
pause
