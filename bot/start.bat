@echo off
setlocal
cd /d "%~dp0"

REM Stop any previous bot instance first to avoid duplicates
for /f "tokens=2 delims==" %%P in ('wmic process where "name='node.exe' and CommandLine like '%%muqeem-bot.mjs%%'" get ProcessId /value 2^>nul ^| find "="') do (
  taskkill /F /PID %%P >nul 2>&1
)

REM Launch detached so the bot keeps running after this window closes
start "Jisr Muqeem Bot" /min cmd /c "node muqeem-bot.mjs >> bot.log 2>&1"

echo.
echo  Jisr Muqeem Bot started — runs every 10 minutes.
echo  Log file: %~dp0bot.log
echo  To stop: run stop.bat
echo.
timeout /t 3 >nul
