@echo off
setlocal
cd /d "%~dp0"

REM Stop any previous instance to avoid duplicate sends
for /f "tokens=2 delims==" %%P in ('wmic process where "name='node.exe' and CommandLine like '%%wa-invoice-bot.mjs%%'" get ProcessId /value 2^>nul ^| find "="') do (
  taskkill /F /PID %%P >nul 2>&1
)

REM Launch detached so it keeps running after this window closes
start "Jisr WA Invoice Bot" /min cmd /c "node wa-invoice-bot.mjs >> bot.log 2>&1"

echo.
echo  Jisr WA Invoice Bot started.
echo  Log file: %~dp0bot.log
echo  To stop: run stop.bat
echo.
timeout /t 3 >nul
