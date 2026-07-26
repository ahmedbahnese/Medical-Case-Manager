@echo off
chcp 65001 >nul
title BSCH — Database Restore
echo ============================================================
echo  BSCH Database Restore
echo ============================================================
echo.
echo  WARNING: This will OVERWRITE ALL current data!
echo           Make sure you have a backup of the current state.
echo.

cd /d "%~dp0"

REM ── Check psql ───────────────────────────────────────────────
psql --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] psql not found.
    echo         Make sure PostgreSQL bin directory is in your PATH.
    echo         Default: C:\Program Files\PostgreSQL\16\bin
    pause
    exit /b 1
)

REM ── Defaults ─────────────────────────────────────────────────
set PGHOST=localhost
set PGPORT=5432
set PGUSER=bsch_user
set PGDATABASE=bsch_db
set PGPASSWORD=

REM ── Load from .env ───────────────────────────────────────────
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        if "%%a"=="DB_HOST"     set PGHOST=%%b
        if "%%a"=="DB_PORT"     set PGPORT=%%b
        if "%%a"=="DB_USER"     set PGUSER=%%b
        if "%%a"=="DB_NAME"     set PGDATABASE=%%b
        if "%%a"=="DB_PASSWORD" set PGPASSWORD=%%b
    )
)

REM ── Show available backups ────────────────────────────────────
set BACKUP_DIR=%~dp0backups
echo Available backups in %BACKUP_DIR%:
echo.
dir /b /o-d "%BACKUP_DIR%\bsch_backup_*.sql" 2>nul
if errorlevel 1 echo   (none found)
echo.

REM ── Prompt for file ──────────────────────────────────────────
set /p BACKUP_INPUT="Enter backup filename (from list above) or full path: "

if exist "%BACKUP_DIR%\%BACKUP_INPUT%" (
    set RESTORE_PATH=%BACKUP_DIR%\%BACKUP_INPUT%
) else if exist "%BACKUP_INPUT%" (
    set RESTORE_PATH=%BACKUP_INPUT%
) else (
    echo.
    echo [ERROR] File not found: %BACKUP_INPUT%
    pause
    exit /b 1
)

echo.
echo Database   : %PGUSER%@%PGHOST%:%PGPORT%/%PGDATABASE%
echo Restore from: %RESTORE_PATH%
echo.

set /p CONFIRM="Type YES to confirm restore (this cannot be undone): "
if /i not "%CONFIRM%"=="YES" (
    echo.
    echo Restore cancelled.
    pause
    exit /b 0
)

echo.
echo Restoring...
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -f "%RESTORE_PATH%"

if errorlevel 1 (
    echo.
    echo [ERROR] Restore failed. Check the error messages above.
    pause
    exit /b 1
)

echo.
echo [OK] Restore completed successfully.
echo      Restart the server for changes to take effect.
echo.
pause
