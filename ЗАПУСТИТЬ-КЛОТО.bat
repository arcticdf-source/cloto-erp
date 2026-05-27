@echo off
chcp 65001 > nul
title Kloto ERP

cd /d "%~dp0"

set LOGIN=admin
set PASS=cloto2026
set PORT=8080

if exist "cloto.config.txt" (
  for /f "eol=; tokens=1,* delims==" %%A in (cloto.config.txt) do (
    if /i "%%A"=="LOGIN" set LOGIN=%%B
    if /i "%%A"=="PASS"  set PASS=%%B
    if /i "%%A"=="PORT"  set PORT=%%B
  )
)

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js not found. Download: https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
)

start "Kloto Server" cmd /c "set AUTH_USER=%LOGIN%&& set AUTH_PASS=%PASS%&& set PORT=%PORT%&& set HOST=127.0.0.1&& node auth-server.js & pause"

timeout /t 3 /nobreak > nul
start "" http://localhost:%PORT%/portal.html

echo Done. Browser opening...
timeout /t 5 /nobreak > nul
