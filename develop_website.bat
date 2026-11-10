@echo off
setlocal
title RankBid - Development
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1" -Mode dev
if errorlevel 1 pause
