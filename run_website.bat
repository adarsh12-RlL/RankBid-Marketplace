@echo off
setlocal
title RankBid - Local Website
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1" -Mode serve
if errorlevel 1 pause
