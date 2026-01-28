@echo off
REM Run script for Polymarket Copy Trading Bot (Python Version)
REM This script helps run the bot on Windows

echo ========================================
echo Polymarket Copy Trading Bot - Python
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo.
    echo Please install Python 3.9+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo [OK] Python found
python --version
echo.

REM Check if .env file exists
if not exist .env (
    echo [WARNING] .env file not found!
    echo.
    echo Please create a .env file with your configuration.
    echo You can copy from TypeScriptVersion/.env or create a new one.
    echo.
    echo Required variables:
    echo   - USER_ADDRESSES
    echo   - PROXY_WALLET
    echo   - PRIVATE_KEY
    echo   - CLOB_HTTP_URL
    echo   - CLOB_WS_URL
    echo   - MONGO_URI
    echo   - RPC_URL
    echo   - USDC_CONTRACT_ADDRESS
    echo.
    pause
    exit /b 1
)

echo [OK] .env file found
echo.

REM Check if dependencies are installed
python -c "import pymongo" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing dependencies...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
    echo.
)

echo [INFO] Starting bot...
echo.

REM Run the bot
python -m src.main

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Bot exited with error code %errorlevel%
    pause
    exit /b %errorlevel%
)

pause
