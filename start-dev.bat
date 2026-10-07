@echo off
chcp 65001 >nul
title WorkLex - Arranque Automático

if exist "%~dp0Proyecto_SenaYilmar\Proyecto_Sena\start-dev.bat" (
    call "%~dp0Proyecto_SenaYilmar\Proyecto_Sena\start-dev.bat"
) else if exist "%~dp0start-dev.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1"
) else (
    echo [ERROR] No se localizó el directorio de despliegue de WorkLex.
    pause
    exit /b 1
)
