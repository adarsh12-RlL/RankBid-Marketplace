@echo off
cd /d "%~dp0"
echo Installing/fixing Nova AI packages...
py -m pip install --upgrade pip
py -m pip install -r requirements.txt
if errorlevel 1 (
  echo.
  echo If PyAudio failed, try:
  echo py -m pip install pipwin
  echo py -m pipwin install pyaudio
)
echo.
echo Starting Nova AI web GUI...
py nova_ai_ultimate.py --web
pause
