@echo off
chcp 65001 > nul
cd /d "%~dp0"

git add .
for /f "tokens=1-5 delims=:/ " %%a in ("%date% %time%") do set DT=%%c-%%b-%%a %%d:%%e
git commit -m "Update %DT%"
git push origin main

echo.
echo Готово! Сайт обновится через минуту.
timeout /t 3 /nobreak > nul
