@echo off
title Nova AI - Install Optional Media Tools
cd /d "%~dp0"
echo This installs optional local media tools for Nova.
echo Pillow is used for photo editing. FFmpeg is used for MP4 video crop/merge.
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
"%PYTHON_CMD%" -m pip install --upgrade Pillow
where winget >nul 2>nul
if %errorlevel%==0 (
    echo.
    echo Installing FFmpeg with winget. A Windows permission popup may appear.
    winget install -e --id Gyan.FFmpeg
) else (
    echo winget not found. Install FFmpeg manually from https://ffmpeg.org/
)
echo.
echo Done. Restart Nova after installing media tools.
pause
