@echo off
setlocal
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0stop-ui.ps1"
