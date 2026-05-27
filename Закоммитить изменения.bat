@echo off
chcp 65001 > nul
cd /d "%~dp0"

git add .
git commit -m "Update %date% %time%"
git push origin main

echo.
echo Done! Site will update in ~1 minute.
timeout /t 3 /nobreak > nul
