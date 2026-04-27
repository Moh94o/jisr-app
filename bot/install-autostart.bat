@echo off
REM Registers a Task Scheduler entry that starts the bot every time you sign in to Windows.
REM Run this once. To remove it later: schtasks /Delete /TN "JisrMuqeemBot" /F

setlocal
set TASK_NAME=JisrMuqeemBot
set START_SCRIPT=%~dp0start.bat

schtasks /Create /SC ONLOGON /TN "%TASK_NAME%" /TR "\"%START_SCRIPT%\"" /RL LIMITED /F
if %errorlevel%==0 (
  echo.
  echo  Auto-start enabled. The bot will launch every time you sign in.
) else (
  echo.
  echo  Failed to register the scheduled task.
)
echo.
timeout /t 3 >nul
