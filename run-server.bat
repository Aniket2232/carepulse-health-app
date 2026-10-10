@echo off
title CarePulse Health - Auth Service (Node.js & Express)
echo =======================================================
echo Starting CarePulse Auth Service on http://localhost:5000...
echo =======================================================
cd /d "%~dp0"
node src/server.js
pause
