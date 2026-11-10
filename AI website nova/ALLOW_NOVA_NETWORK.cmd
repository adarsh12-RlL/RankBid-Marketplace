@echo off
title Nova AI - Allow Network
cd /d "%~dp0"
echo This opens a Windows administrator prompt to allow:
echo - Python/Nova outbound API internet
echo - Nova Mobile Mode on local private Wi-Fi port 8765
echo.
echo Only run this on your own laptop and trusted network.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath powershell -Verb RunAs -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File','%~dp0ALLOW_NOVA_NETWORK.ps1')"
echo If the UAC popup appeared, press Yes and follow the admin window.
pause
