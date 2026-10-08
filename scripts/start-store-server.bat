@echo off
REM ==============================================================================
REM MedStock ERP — Standalone Store Server Automation Script (Windows)
REM Zero-Internet Local LAN Pharmacy Appliance Starter
REM ==============================================================================

setlocal enabledelayedexpansion

set PORT=3000
set HOST=0.0.0.0
if "%DATABASE_URL%"=="" set DATABASE_URL=postgresql://mederp:mederp@localhost:5432/mederp

echo ======================================================================
echo   MedStock ERP — Commercial Store Server Initializer
echo   Offline-First Zero-Internet Counter Billing & Inventory Appliance
echo ======================================================================

REM 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js v18+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js !NODE_VER! detected.

REM 2. Check PostgreSQL service
where pg_isready >nul 2>nul
if %errorlevel% equ 0 (
    pg_isready -h localhost -p 5432 -q
    if !errorlevel! neq 0 (
        echo [WARNING] PostgreSQL service is not running. Attempting to start...
        net start postgresql-x64-15 2>nul || net start postgresql 2>nul
        timeout /t 2 >nul
    )
)

REM 3. Run Database Migrations
echo [INFO] Synchronizing database schema...
call npx drizzle-kit push

REM 4. Seed initial data if database is empty
call npx tsx scripts/db-check-and-seed.ts

echo ======================================================================
echo   Store Server Ready for Counter Billing & Tablet Terminals
echo ======================================================================
echo   Local Terminal: http://localhost:%PORT%
echo   Open http://localhost:%PORT%/settings/network to pair secondary devices.
echo ======================================================================

call npx vite dev --host %HOST% --port %PORT%
