@echo off
setlocal

echo LAN Share - Building standalone executable
echo.

where bun >nul 2>nul
if errorlevel 1 (
    echo Bun is not installed. Please install it first: https://bun.sh/
    exit /b 1
)

echo Creating dist directory...
if not exist dist mkdir dist

echo Installing dependencies...
call bun install
if errorlevel 1 exit /b 1

echo Building frontend...
call bun run build:frontend
if errorlevel 1 exit /b 1
echo Frontend built successfully in dist\static\
echo.

echo Building backend...
call bun run build:backend
if errorlevel 1 exit /b 1

echo Backend standalone executable created at dist\lan-share.exe
echo.

echo Cleaning up...
if exist node_modules rmdir /s /q node_modules
if exist frontend\node_modules rmdir /s /q frontend\node_modules
if exist backend\node_modules rmdir /s /q backend\node_modules
if exist bun.lock del /f bun.lock

echo.
echo Build completed successfully!
echo.
echo Distribution ready in dist\:
echo   - Executable: dist\lan-share.exe
echo   - Frontend assets: dist\static\
echo.
echo To run the application:
echo   start.bat
