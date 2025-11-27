@echo off
setlocal

REM Launches every service (auth, chat, media, gateway) plus the Vite client.
REM Run `npm install` inside each folder once before using this helper.

set "BASEDIR=%~dp0"

echo Starting all services from: %BASEDIR%
echo.

REM Verify all folders exist before starting
call :checkFolder "%BASEDIR%services\auth-user-service"
call :checkFolder "%BASEDIR%services\chat-service"
call :checkFolder "%BASEDIR%services\media-ai-service"
call :checkFolder "%BASEDIR%services\api-gateway"
call :checkFolder "%BASEDIR%client"

echo.
echo All folders verified. Starting services...
echo.

start "" cmd /k "cd /d "%BASEDIR%services\auth-user-service" && npm run dev"
start "" cmd /k "cd /d "%BASEDIR%services\chat-service" && npm run dev"
start "" cmd /k "cd /d "%BASEDIR%services\media-ai-service" && npm run dev"
start "" cmd /k "cd /d "%BASEDIR%services\api-gateway" && npm run dev"
start "" cmd /k "cd /d "%BASEDIR%client" && npm run dev"

echo All processes started. Press Ctrl+C in each window to stop them.
goto :eof

:checkFolder
if not exist "%~1\package.json" (
  echo ERROR: Folder "%~1" does not exist or missing package.json
  pause
  exit /b 1
)
echo [OK] %~1
goto :eof
