@echo off
title BSCH Backup
echo ============================================================
echo  BSCH Database Backup
echo ============================================================

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

REM Create backup directory
set BACKUP_DIR=%~dp0..\backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Generate filename with timestamp
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do set dt=%%a
set TIMESTAMP=%dt:~0,8%_%dt:~8,6%
set BACKUP_FILE=%BACKUP_DIR%\bsch_backup_%TIMESTAMP%.sql

echo Creating backup: %BACKUP_FILE%

pg_dump -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -F plain -f "%BACKUP_FILE%"

if errorlevel 1 (
    echo ERROR: Backup failed! Make sure PostgreSQL is running and credentials are correct.
    pause
    exit /b 1
)

echo.
echo Backup completed successfully: %BACKUP_FILE%
echo.

REM Keep only the last 10 backups
set count=0
for /f "skip=10 delims=" %%f in ('dir /b /o-d "%BACKUP_DIR%\bsch_backup_*.sql" 2^>nul') do (
    echo Removing old backup: %%f
    del "%BACKUP_DIR%\%%f"
)

pause
