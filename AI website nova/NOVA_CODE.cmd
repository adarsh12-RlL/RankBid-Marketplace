@echo off
title Free Nova Code Assistant
color 0b
echo =======================================================
echo          FREE NOVA CODE (Claude Code Alternative)
echo =======================================================
echo Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed or not in PATH!
    pause
    exit /b
)

echo Checking required libraries...
python -c "import requests" >nul 2>&1
if errorlevel 1 (
    echo Installing requests library...
    pip install requests
)

cls
python nova_code.py
pause
