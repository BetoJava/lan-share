@echo off
setlocal enabledelayedexpansion

echo LAN Share - Standalone startup (Windows)
echo.

set "EXECUTABLE_PATH=dist\lan-share.exe"
set "PORT_VAL=%PORT%"
if "%PORT_VAL%"=="" set "PORT_VAL=3009"

if not exist "%EXECUTABLE_PATH%" (
    echo Standalone executable not found at %EXECUTABLE_PATH%
    echo Please run build.bat first to create the executable in dist\.
    exit /b 1
)

if defined HOST_IP (
    echo IP specified manually: %HOST_IP%
    set "IP=%HOST_IP%"
    goto :found_ip
)

echo Detecting network IP...

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /r "IPv4.*[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*"') do (
    set "CANDIDATE=%%a"
    set "CANDIDATE=!CANDIDATE: =!"
    if not "!CANDIDATE!"=="127.0.0.1" (
        set "IP=!CANDIDATE!"
        goto :found_ip
    )
)

echo Could not detect network IP automatically.
echo.
echo Alternative solutions:
echo   - Run: ipconfig
echo   - Or specify manually: set HOST_IP=your_ip ^&^& start.bat
exit /b 1

:found_ip
echo IP detected: %IP%
echo.
echo Configuration:
echo   IP: %IP%
echo   Port: %PORT_VAL%
echo   Executable: %EXECUTABLE_PATH%
echo.

set "HOST_IP=%IP%"
set "PORT=%PORT_VAL%"

echo Access URLs:
echo   Computer: http://localhost:%PORT_VAL%
echo   Mobile:   http://%IP%:%PORT_VAL%
echo.

echo Starting LAN Share server...
echo.

"%EXECUTABLE_PATH%"
