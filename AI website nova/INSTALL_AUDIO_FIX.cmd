@echo off
title Nova AI Audio Fix
echo Installing/upgrading audio packages...
py -m pip install --upgrade pip
py -m pip install pyttsx3 SpeechRecognition pyaudio pywin32 requests python-dotenv pyautogui pyperclip pygetwindow edge-tts
echo.

echo If PyAudio fails, try: py -m pip install pipwin && py -m pipwin install pyaudio
echo.
echo Now restart Nova AI and click Test Voice.
pause
