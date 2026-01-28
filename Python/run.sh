#!/bin/bash
# Run script for Polymarket Copy Trading Bot (Python Version)
# This script helps run the bot on Linux/Mac

echo "========================================"
echo "Polymarket Copy Trading Bot - Python"
echo "========================================"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "[ERROR] Python is not installed or not in PATH"
    echo ""
    echo "Please install Python 3.9+ from https://www.python.org/downloads/"
    echo ""
    exit 1
fi

# Use python3 if available, otherwise python
PYTHON_CMD=$(command -v python3 2>/dev/null || command -v python)

echo "[OK] Python found"
$PYTHON_CMD --version
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "[WARNING] .env file not found!"
    echo ""
    echo "Please create a .env file with your configuration."
    echo "You can copy from TypeScriptVersion/.env or create a new one."
    echo ""
    echo "Required variables:"
    echo "  - USER_ADDRESSES"
    echo "  - PROXY_WALLET"
    echo "  - PRIVATE_KEY"
    echo "  - CLOB_HTTP_URL"
    echo "  - CLOB_WS_URL"
    echo "  - MONGO_URI"
    echo "  - RPC_URL"
    echo "  - USDC_CONTRACT_ADDRESS"
    echo ""
    exit 1
fi

echo "[OK] .env file found"
echo ""

# Check if dependencies are installed
if ! $PYTHON_CMD -c "import pymongo" &> /dev/null; then
    echo "[INFO] Installing dependencies..."
    $PYTHON_CMD -m pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install dependencies"
        exit 1
    fi
    echo "[OK] Dependencies installed"
    echo ""
fi

echo "[INFO] Starting bot..."
echo ""

# Run the bot
$PYTHON_CMD -m src.main

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Bot exited with error"
    exit 1
fi
