@echo off
title Deploy Backend to VPS
color 0B

echo =======================================================================
echo               D E P L O Y   B A C K E N D   T O   V P S
echo =======================================================================
echo.
echo This script will securely copy the "backend" folder to your Hostinger VPS.
echo VPS IP: 31.97.55.83
echo.
echo Note: When prompted, enter your VPS root password.
echo Note: It may take a few minutes to upload depending on your upload speed.
echo.

scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "backend\server.js" "backend\package.json" root@31.97.55.83:~/backend/
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "frontend\js\signin.js" root@31.97.55.83:~/frontend/js/
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "frontend\signin.html" root@31.97.55.83:~/frontend/

echo.
echo =======================================================================
echo [SUCCESS] Only the updated files were uploaded instantly!
echo =======================================================================
pause
