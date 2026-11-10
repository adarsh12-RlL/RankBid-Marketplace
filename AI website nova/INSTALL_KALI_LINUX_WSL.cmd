@echo off
setlocal
title Nova Safe Kali WSL Installer
echo.
echo Nova Safe Kali WSL Installer
echo ============================
echo This installs Kali Linux for legal local lab and defensive learning only.
echo Do not use it to attack accounts, Wi-Fi, websites, devices, or people.
echo.
where wsl.exe >nul 2>nul
if errorlevel 1 (
  echo WSL is not available yet on this Windows install.
  echo Open Windows Features and enable "Windows Subsystem for Linux" and "Virtual Machine Platform".
  echo Then restart Windows and run this file again.
  start ms-settings:optionalfeatures
  pause
  exit /b 1
)
echo Current WSL status:
wsl.exe --status
echo.
echo About to run:
echo   wsl.exe --install -d kali-linux
echo.
set /p NOVA_CONFIRM=Type YES to install Kali Linux WSL now: 
if /i not "%NOVA_CONFIRM%"=="YES" (
  echo Cancelled. Nothing was installed.
  pause
  exit /b 0
)
echo Installing Kali Linux through WSL...
wsl.exe --install -d kali-linux
if errorlevel 1 (
  echo.
  echo WSL install command failed or needs Microsoft Store.
  echo Opening Microsoft Store search for Kali Linux.
  start ms-windows-store://search/?query=Kali%%20Linux
  pause
  exit /b 1
)
echo.
echo Kali install command finished. If Windows asks for restart, restart first.
echo After setup, run OPEN_KALI_LINUX.cmd or tell Nova: open kali linux
pause
