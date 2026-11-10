@echo off
title Nova Hindi Voice Setup
cd /d "%~dp0"
echo This will ask Windows permission to install Hindi speech/text-to-speech support.
echo Press YES on the Windows permission popup if it appears.
echo.
set "PYTHON_CMD="
if exist "C:\Python313\Lib\encodings\__init__.py" if exist "C:\Python313\python.exe" set "PYTHON_CMD=C:\Python313\python.exe"
if not defined PYTHON_CMD if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
if not defined PYTHON_CMD where python >nul 2>nul && python -c "import encodings" >nul 2>nul && set "PYTHON_CMD=python"
if not defined PYTHON_CMD where py >nul 2>nul && py -c "import encodings" >nul 2>nul && set "PYTHON_CMD=py"
if not defined PYTHON_CMD (
    echo Python is not installed correctly.
    pause
    exit /b 1
)
"%PYTHON_CMD%" -c "import nova_ai_ultimate as n; ok,msg=n.setup_hindi_voice(); print(msg)"
echo.
echo After Windows finishes installing Hindi voice, restart Nova.
pause
