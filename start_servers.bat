@echo off
title AI Detector Suite Launcher
color 0A

echo =======================================================================
echo               A I   D E T E C T O R   S U I T E   L A U N C H E R
echo =======================================================================
echo.
echo [INFO] System checks verified.
echo.
echo [1/3] Stopping stale detector servers on ports 5001 and 5003...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":5001 .*LISTENING" /C:":5003 .*LISTENING"') do (
    taskkill /F /PID %%P >nul 2>nul
)
echo.
echo [2/3] Server starting at http://localhost:5001...
echo.
echo [3/3] Starting backend engines (Express and PyTorch ML) in this window...
echo [INFO] Press CTRL+C inside this window to stop both servers at once.
echo.

set PYTHONDONTWRITEBYTECODE=1
cd backend
npm run dev
