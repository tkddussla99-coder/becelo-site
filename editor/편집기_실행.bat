@echo off
cd /d "%~dp0"
start "" http://localhost:8901
node server.js
pause
