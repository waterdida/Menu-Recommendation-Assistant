@echo off
setlocal

cd /d "%~dp0"

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo PowerShell was not found. Please install PowerShell or run start.ps1 manually.
  echo.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
set EXIT_CODE=%ERRORLEVEL%

echo.
if not "%EXIT_CODE%"=="0" (
  echo Startup failed. Please check the messages above and logs in the logs folder.
) else (
  echo Startup script finished.
)

echo Press any key to close this window.
pause >nul
exit /b %EXIT_CODE%
