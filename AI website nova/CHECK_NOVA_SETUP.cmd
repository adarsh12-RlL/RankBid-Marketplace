@echo off
title Nova AI Setup Check
cd /d "%~dp0"
echo Checking Nova setup without launching the assistant...
set "PYTHON_CMD="
if exist "C:\Python313\Lib\encodings\__init__.py" if exist "C:\Python313\python.exe" set "PYTHON_CMD=C:\Python313\python.exe"
if not defined PYTHON_CMD if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
if not defined PYTHON_CMD where python >nul 2>nul && python -c "import encodings" >nul 2>nul && set "PYTHON_CMD=python"
if not defined PYTHON_CMD where py >nul 2>nul && py -c "import encodings" >nul 2>nul && set "PYTHON_CMD=py"
if not defined PYTHON_CMD (
    echo Python is not installed correctly.
    echo Install Python 3.13 from https://www.python.org/downloads/windows/
    pause
    exit /b 1
)
"%PYTHON_CMD%" nova_ai_ultimate.py --check
pause
