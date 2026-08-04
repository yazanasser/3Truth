@echo off
title AI Detector Suite Launcher (Hard Reset)
color 0C

echo =======================================================================
echo               A I   D E T E C T O R   S U I T E   L A U N C H E R
echo                      (HARD RESET MODE ACTIVATED)
echo =======================================================================
echo.
echo [INFO] Initiating total protocol wipe...
echo.
echo [1/4] Terminating all background engines...
taskkill /F /IM node.exe >nul 2>nul
taskkill /F /IM python.exe >nul 2>nul
taskkill /F /IM py.exe >nul 2>nul
echo.
echo [2/4] Wiping old python cache (starting new protocol)...
FOR /d /r . %%d in (__pycache__) DO @IF EXIST "%%d" rd /s /q "%%d" >nul 2>nul
del /S /Q *.pyc >nul 2>nul
echo.
echo [3/4] Server starting at http://localhost:5001...
echo.
echo [4/4] Starting NEW protocol backend engines (Express and PyTorch ML)...
echo [INFO] Press CTRL+C inside this window to stop both servers at once.
echo.

set PYTHONDONTWRITEBYTECODE=1
cd backend
npm run dev
