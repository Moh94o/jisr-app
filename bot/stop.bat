@echo off
setlocal
set found=0
for /f "tokens=2 delims==" %%P in ('wmic process where "name='node.exe' and CommandLine like '%%muqeem-bot.mjs%%'" get ProcessId /value 2^>nul ^| find "="') do (
  taskkill /F /PID %%P >nul 2>&1
  echo  Stopped bot PID %%P
  set found=1
)
if %found%==0 echo  No bot process found.
echo.
timeout /t 2 >nul
