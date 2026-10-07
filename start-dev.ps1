# ==============================================================================
# WORKLEX - Launcher Raíz para PowerShell
# ==============================================================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$SubProjectScript = Join-Path $ScriptDir "Proyecto_SenaYilmar\Proyecto_Sena\start-dev.ps1"

if (Test-Path $SubProjectScript) {
    & $SubProjectScript
} else {
    Write-Host "ERROR: No se encontró $SubProjectScript" -ForegroundColor Red
}
