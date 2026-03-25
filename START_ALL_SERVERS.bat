@echo off
echo.
echo ========================================
echo Pharmacy Management System - Full Startup
echo ========================================
echo.

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo [2/4] Installing frontend dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo [3/4] Starting backend server...
echo Backend will run on http://localhost:5000
start cmd /k "cd backend && npm run dev"

echo.
echo [4/4] Starting frontend development server...
echo Frontend will run on http://localhost:8080
timeout /t 3 /nobreak
start cmd /k "npm run dev"

echo.
echo ========================================
echo ✅ Both servers starting...
echo ========================================
echo.
echo Frontend: http://localhost:8080
echo Backend:  http://localhost:5000
echo API Docs: http://localhost:5000/api
echo Health:   http://localhost:5000/api/health
echo.
echo Close either terminal window to stop the respective server.
echo.
pause
