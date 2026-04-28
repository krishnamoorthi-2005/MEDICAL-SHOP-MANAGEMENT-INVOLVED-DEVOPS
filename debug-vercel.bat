@echo off
REM Vercel Backend Debugging Script for Windows
REM This script helps identify why your backend isn't working on Vercel

echo.
echo 🔍 Medical Shop Management - Vercel Backend Debugging
echo ======================================================
echo.

REM Check 1: Local Backend
echo 📡 Test 1: Local Backend Connection
echo ------------------------------------
timeout /t 1 /nobreak >nul

curl -s -X GET http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Local backend is running on port 3001
) else (
    echo ✗ Local backend not responding
    echo    Start backend with: cd backend ^&^& npm run dev
)
echo.

REM Check 2: Vercel Deployment
echo ☁️  Test 2: Vercel Deployment
echo ----------------------------
set /p PROJECT_NAME="Enter your Vercel project name (e.g., medical-shop-management): "

if "%PROJECT_NAME%"=="" (
    echo ✗ No project name provided
) else (
    set VERCEL_URL=https://%PROJECT_NAME%.vercel.app
    echo Testing: %VERCEL_URL%/api/health
    
    for /f "tokens=*" %%A in ('curl -s -X GET "%VERCEL_URL%/api/health" -o nul -w "%%{http_code}"') do set HTTP_CODE=%%A
    
    if "%HTTP_CODE%"=="200" (
        echo ✓ Backend is responding!
    ) else (
        echo ✗ Backend returned HTTP %HTTP_CODE%
        if "%HTTP_CODE%"=="000" (
            echo    Can't connect to Vercel. Check URL.
        )
    )
)
echo.

REM Check 3: Environment Variables
echo 🔐 Test 3: Environment Variables
echo --------------------------------
if exist ".env.local" (
    echo ✓ .env.local file exists
    echo    - Check frontend API URL: grep VITE_API_URL .env.local
) else (
    echo ⚠ .env.local not found (needed for local testing)
)

if exist "backend\.env" (
    echo ✓ backend\.env file exists
    echo    - Check MongoDB URL: grep MONGODB_URI backend\.env
) else (
    echo ⚠ backend\.env not found (needed for backend)
)
echo.

REM Check 4: Git Status
echo 📦 Test 4: Git Status
echo --------------------
git status >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%A in ('git status --short ^| find /c /v ""') do set UNCOMMITTED=%%A
    if %UNCOMMITTED% equ 0 (
        echo ✓ All changes committed
    ) else (
        echo ✗ You have %UNCOMMITTED% uncommitted changes
        echo    Run: git add . ^&^& git commit -m "fix"
    )
) else (
    echo ✗ Not a git repository
)
echo.

REM Check 5: API Files
echo 📄 Test 5: Required Files
echo ------------------------
if exist "vercel.json" (
    echo ✓ vercel.json exists
) else (
    echo ✗ vercel.json missing
)

if exist "api\index.js" (
    echo ✓ api\index.js exists
) else (
    echo ✗ api\index.js missing
)

if exist "src\lib\api.ts" (
    findstr /M "VITE_API_URL" src\lib\api.ts >nul
    if %errorlevel% equ 0 (
        echo ✓ src\lib\api.ts uses VITE_API_URL
    ) else (
        echo ⚠ src\lib\api.ts might not use VITE_API_URL
    )
) else (
    echo ✗ src\lib\api.ts missing
)
echo.

REM Check 6: Node Version
echo 🟢 Test 6: Node Version
echo ---------------------
for /f "tokens=*" %%A in ('node -v') do set NODE_VERSION=%%A
echo Current Node: %NODE_VERSION%
echo ✓ Node version detected
echo.

REM Check 7: Package.json
echo 📋 Test 7: Dependencies
echo ----------------------
findstr /M "express" package.json>nul
if %errorlevel% equ 0 (
    echo ✓ Express is installed
) else (
    echo ✗ Express not found in package.json
)

findstr /M "mongoose" backend\package.json>nul
if %errorlevel% equ 0 (
    echo ✓ Mongoose is installed
) else (
    echo ⚠ Mongoose not found (needed for MongoDB)
)
echo.

REM Final Recommendations
echo 💡 Recommendations
echo ------------------
echo 1. Check Vercel Dashboard for environment variables:
echo    https://vercel.com ^-^> Select Project ^-^> Settings ^-^> Environment Variables
echo.
echo 2. View deployment logs:
echo    Vercel Dashboard ^-^> Deployments ^-^> Select Latest ^-^> Function Logs
echo.
echo 3. Ensure these env vars are set on Vercel:
echo    • VITE_API_URL
echo    • MONGODB_URI
echo    • JWT_SECRET
echo    • FRONTEND_URL
echo.
echo 4. Test endpoints:
echo    https://%PROJECT_NAME%.vercel.app/api/health
echo    https://%PROJECT_NAME%.vercel.app/api/test
echo.
echo 5. Redeploy if you made changes:
echo    git push origin main
echo.

echo ======================================================
echo ✨ Debugging complete!
echo.
pause
