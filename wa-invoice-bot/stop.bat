@echo off
for /f "tokens=2 delims==" %%P in ('wmic process where "name='node.exe' and CommandLine like '%%wa-invoice-bot.mjs%%'" get ProcessId /value 2^>nul ^| find "="') do (
  taskkill /F /PID %%P >nul 2>&1
)
echo  Jisr WA Invoice Bot stopped.
timeout /t 2 >nul
