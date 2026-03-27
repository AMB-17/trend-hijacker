@echo off
REM 🚀 ONE-COMMAND RAILWAY DEPLOYMENT (Windows)
REM Copy & paste this entire script to command prompt or PowerShell

setlocal enabledelayedexpansion

cls
echo.
echo ════════════════════════════════════════════════════
echo    🚀 TREND HIJACKER - RAILWAY DEPLOYMENT SCRIPT 🚀
echo ════════════════════════════════════════════════════
echo.

REM Step 1: Login to Railway
echo 📍 Step 1/5: Logging into Railway...
echo    → Your browser will open to authorize with GitHub
echo.
call railway login
if errorlevel 1 (
    echo ❌ Railway login failed. Make sure railway CLI is installed.
    echo    Run: npm install -g railway
    exit /b 1
)

echo.
echo ✅ Step 1 Complete!
echo.

REM Step 2: Initialize Project
echo 📍 Step 2/5: Initializing Railway project...
echo    → Project name: trend-hijacker
echo.
cd /d d:\workspace
call railway init
if errorlevel 1 (
    echo ⚠️  Railway init returned an error. Continuing...
)

echo.
echo ✅ Step 2 Complete!
echo.

REM Step 3: Add PostgreSQL
echo 📍 Step 3/5: Adding PostgreSQL database...
echo    → ⏱️  This may take a minute...
echo.
call railway add postgres
if errorlevel 1 (
    echo ⚠️  PostgreSQL might already be added. Continuing...
)

echo.
echo ✅ Step 3 Complete!
echo.

REM Step 4: Add Redis
echo 📍 Step 4/5: Adding Redis cache...
echo    → ⏱️  This may take a minute...
echo.
call railway add redis
if errorlevel 1 (
    echo ⚠️  Redis might already be added. Continuing...
)

echo.
echo ✅ Step 4 Complete!
echo.

REM Step 5: Deploy
echo 📍 Step 5/5: Deploying application...
echo    → ⏱️  This takes 2-3 minutes...
echo    → Watch for deployment progress below
echo.
call railway up
if errorlevel 1 (
    echo ❌ Deployment failed. Check railway logs:
    echo    railway logs
    exit /b 1
)

echo.
echo ════════════════════════════════════════════════════
echo    ✅ DEPLOYMENT COMPLETE!
echo ════════════════════════════════════════════════════
echo.
echo 🎉 Your app is now LIVE!
echo.
echo 📍 Next steps:
echo    1. Open: https://your-project.railway.app
echo    2. You should see the Trend Hijacker dashboard
echo    3. Verify API: /api/trends
echo    4. Check health: /health
echo.
echo 📊 View your deployment:
echo    railway status
echo    railway logs
echo    railway env
echo.
echo 🚀 You're live in production!
echo.
pause
