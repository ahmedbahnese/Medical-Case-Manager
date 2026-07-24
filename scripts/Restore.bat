@echo off
title BSCH Restore
echo ============================================================
echo  BSCH Database Restore
echo ============================================================
echo.
echo WARNING: This will OVERWRITE all current data!
echo.

REM Set defaults
set PGHOST=localhost
set PGPORT=5432
set PGUSER=bsch_user
set PGDATABASE=bsch_db

REM Load .env if present
if exist "%~dp0..\.env" (
    for /f "tokens=1,2 delims==" %%a in (%~dp0..\.env) do (
        if "%%a"=="DB_USER"     set PGUSER=%%b
        if "%%a"=="DB_NAME"     set PGDATABASE=%%b
        if "%%a"=="DB_HOST"     set PGHOST=%%b
        if "%%a"=="DB_PORT"     set PGPORT=%%b
    )
)

REM Show available backups
set BACKUP_DIR=%~dp0..\backups
echo Available backups:
echo.
dir /b /o-d "%BACKUP_DIR%\bsch_backup_*.sql" 2>nul
echo.

REM Prompt for backup file
set /p BACKUP_FILE="Enter full path to the backup file (or filename from above): "

if not exist "%BACKUP_DIR%\%BACKUP_FILE%" (
    if not exist "%BACKUP_FILE%" (
        echo ERROR: File not found.
        pause
        exit /b 1
    )
    set RESTORE_PATH=%BACKUP_FILE%
) else (
    set RESTORE_PATH=%BACKUP_DIR%\%BACKUP_FILE%
)

set /p CONFIRM="Type YES to confirm restore from %RESTORE_PATH%: "
if /i not "%CONFIRM%"=="YES" (
    echo Restore cancelled.
    pause
    exit /b 0
)

echo Restoring from: %RESTORE_PATH%
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -f "%RESTORE_PATH%"

if errorlevel 1 (
    echo ERROR: Restore failed.
    pause
    exit /b 1
)

echo Restore completed successfully.
pause
