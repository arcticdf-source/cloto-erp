@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo === Сохранение изменений на GitHub ===
echo.

git add .

set /p MSG="Что изменили? (напишите и нажмите Enter): "
if "%MSG%"=="" set MSG=Update

git commit -m "%MSG%"
git push origin main

echo.
echo === Готово! Сайт обновится через 1 минуту ===
echo Адрес: https://arcticdf-source.github.io/cloto-erp/
echo.
pause
