@echo off
chcp 65001 >nul
title BSCH — Database Backup
echo ============================================================
echo  BSCH Database Backup
echo ============================================================
echo.

cd /d "%~dp0"

REM ── Check pg_dump ────────────────────────────────────────────
pg_dump --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] pg_dump not found.
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

REM ── Create backup directory ───────────────────────────────────
set BACKUP_DIR=%~dp0backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM ── Generate timestamped filename ────────────────────────────
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value 2^>nul') do set dt=%%a
if "%dt%"=="" (
    set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
    set TIMESTAMP=%TIMESTAMP: =0%
) else (
    set TIMESTAMP=%dt:~0,8%_%dt:~8,6%
)
set BACKUP_FILE=%BACKUP_DIR%\bsch_backup_%TIMESTAMP%.sql

echo Database : %PGUSER%@%PGHOST%:%PGPORT%/%PGDATABASE%
echo Backup to: %BACKUP_FILE%
echo.

pg_dump -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -F plain -f "%BACKUP_FILE%"

if errorlevel 1 (
    echo.
    echo [ERROR] Backup failed!
    echo         Check that PostgreSQL is running and credentials in .env are correct.
    pause
    exit /b 1
)

echo.
echo [OK] Backup completed: %BACKUP_FILE%
echo.

REM ── Keep only the last 30 backups ────────────────────────────
set /a COUNT=0
for /f "skip=30 delims=" %%f in ('dir /b /o-d "%BACKUP_DIR%\bsch_backup_*.sql" 2^>nul') do (
    echo Removing old backup: %%f
    del "%BACKUP_DIR%\%%f"
)

echo Done. Backups stored in: %BACKUP_DIR%
echo.
pause
