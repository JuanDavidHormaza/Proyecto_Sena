@echo off
chcp 65001 >nul
title WorkLex - Arranque Automático

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Ocurrió un fallo durante el inicio de WorkLex.
    pause
    exit /b %ERRORLEVEL%
)

pause
