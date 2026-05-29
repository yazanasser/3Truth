@echo off
title AI Detector Suite Launcher
color 0A

echo =======================================================================
echo               A I   D E T E C T O R   S U I T E   L A U N C H E R
echo =======================================================================
echo.
echo [INFO] System checks verified.
echo.
echo [1/2] Opening Web Browser to http://localhost:5001...
start http://localhost:5001
echo.
echo [2/2] Starting backend engines (Express and PyTorch ML) in this window...
echo [INFO] Press CTRL+C inside this window to stop both servers at once.
echo.

cd backend
npm run dev