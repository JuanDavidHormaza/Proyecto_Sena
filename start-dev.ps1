# ==============================================================================
# WORKLEX - Script de Inicio y Verificación Automática (1-Clic)
# Entorno 100% Autónomo para Windows / PowerShell
# ==============================================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "       WORKLEX - ARRANQUE Y APROVISIONAMIENTO AUTOMATIZADO           " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Determinar el directorio raíz correcto del proyecto
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (Test-Path "$ScriptDir\docker-compose.yml") {
    $ProjectRoot = $ScriptDir
} elseif (Test-Path "$ScriptDir\Proyecto_SenaYilmar\Proyecto_Sena\docker-compose.yml") {
    $ProjectRoot = "$ScriptDir\Proyecto_SenaYilmar\Proyecto_Sena"
} else {
    $ProjectRoot = $PWD.Path
}

Set-Location $ProjectRoot
Write-Host "[1/5] Directorio de trabajo establecido en: $ProjectRoot" -ForegroundColor Yellow

# 2. Verificar que Docker esté ejecutándose
Write-Host "[2/5] Verificando estado del motor Docker..." -ForegroundColor Yellow
$dockerReady = $false
try {
    $dockerCheck = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerReady = $true
    }
} catch {
    $dockerReady = $false
}

if (-not $dockerReady) {
    Write-Host "ADVERTENCIA: Docker no responde. Intentando iniciar Docker Desktop..." -ForegroundColor Yellow
    $dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktopPath) {
        Start-Process $dockerDesktopPath
        Write-Host "Esperando inicio de Docker Desktop (hasta 45 segundos)..." -ForegroundColor Yellow
        $waitRetries = 0
        while ($waitRetries -lt 15) {
            Start-Sleep -Seconds 3
            $waitRetries++
            docker info > $null 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dockerReady = $true
                break
            }
            Write-Host "  Esperando daemon de Docker... ($waitRetries/15)" -ForegroundColor DarkGray
        }
    }
    
    if (-not $dockerReady) {
        Write-Host "ERROR CRÍTICO: Docker no está en ejecución." -ForegroundColor Red
        Write-Host "Por favor inicia Docker Desktop y ejecuta este script nuevamente." -ForegroundColor Red
        exit 1
    }
}
Write-Host "  -> Docker daemon activo y listo." -ForegroundColor Green

# 3. Garantizar la existencia de la red externa compartida
Write-Host "[3/5] Verificando red externa 'worklex_network'..." -ForegroundColor Yellow
$networkExists = docker network ls --filter "name=^worklex_network$" --format "{{.Name}}"
if (-not $networkExists) {
    Write-Host "  + Creando red compartida 'worklex_network'..." -ForegroundColor Cyan
    docker network create worklex_network | Out-Null
    Write-Host "  -> Red 'worklex_network' creada con éxito." -ForegroundColor Green
} else {
    Write-Host "  -> Red 'worklex_network' ya existe." -ForegroundColor Green
}

# 4. Desplegar los servicios mediante Docker Compose
Write-Host "[4/5] Levantando servicios unificados (Docker Compose)..." -ForegroundColor Yellow
Write-Host "  (Ejecutando orquestación con COMPOSE_FILE definido en .env)..." -ForegroundColor DarkGray

# docker compose up -d --build
docker compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Falló el despliegue con docker compose." -ForegroundColor Red
    exit 1
}
Write-Host "  -> Contenedores iniciados correctamente." -ForegroundColor Green

# 5. Validación activa de servicios (espera hasta que respondan HTTP 200)
Write-Host "[5/5] Validando disponibilidad y estado HTTP de los servicios..." -ForegroundColor Yellow

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$MaxSeconds = 45,
        [int[]]$ExpectedCodes = @(200, 301, 302, 401)
    )

    Write-Host -NoNewline "  Verificando $Name ($Url)... "
    $elapsed = 0
    $success = $false
    $statusCode = 0

    while ($elapsed -lt $MaxSeconds) {
        try {
            $req = [System.Net.HttpWebRequest]::Create($Url)
            $req.Timeout = 3000
            $req.AllowAutoRedirect = $false
            $req.Method = "GET"
            $resp = $req.GetResponse()
            $statusCode = [int]$resp.StatusCode
            $resp.Close()
            if ($ExpectedCodes -contains $statusCode) {
                $success = $true
                break
            }
        } catch [System.Net.WebException] {
            if ($_.Response) {
                $statusCode = [int]$_.Response.StatusCode
                if ($ExpectedCodes -contains $statusCode) {
                    $success = $true
                    break
                }
            }
        } catch {
            # Continuar esperando
        }

        Start-Sleep -Seconds 2
        $elapsed += 2
    }

    if ($success) {
        Write-Host "OK (HTTP $statusCode)" -ForegroundColor Green
        return $true
    } else {
        Write-Host "TIMEOUT ($statusCode)" -ForegroundColor Red
        return $false
    }
}

Write-Host "Esperando inicio completo de componentes web y APIs..." -ForegroundColor DarkGray
Start-Sleep -Seconds 4

$minioOk   = Test-Endpoint -Name "MinIO API (S3)"       -Url "http://localhost:9000/minio/health/live" -ExpectedCodes @(200)
$minioWeb  = Test-Endpoint -Name "MinIO Consola Web"   -Url "http://localhost:9001"                  -ExpectedCodes @(200)
$backendOk = Test-Endpoint -Name "Backend API (Django)" -Url "http://localhost:8000/api/dictionary/"   -ExpectedCodes @(200, 401)
$frontOk   = Test-Endpoint -Name "Frontend (Vite)"      -Url "http://localhost:5173"                  -ExpectedCodes @(200)
$proxyOk   = Test-Endpoint -Name "Nginx Proxy (CRS)"    -Url "http://localhost"                       -ExpectedCodes @(200, 301, 302)

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "             WORKLEX - ENTORNO 100% OPERATIVO                       " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Acceso a la plataforma:" -ForegroundColor Cyan
Write-Host "  * Aplicación Web (Frontend):      http://localhost:5173" -ForegroundColor White
Write-Host "  * Nginx Reverse Proxy:            http://localhost  /  https://localhost" -ForegroundColor White
Write-Host "  * Backend API & Diccionario:      http://localhost:8000/api/" -ForegroundColor White
Write-Host "  * Consola MinIO Storage:          http://localhost:9001  (User: admin / Pass: Admin123*)" -ForegroundColor White
Write-Host "  * MinIO S3 API:                   http://localhost:9000" -ForegroundColor White
Write-Host "  * Keycloak Autenticación:         http://localhost:8080" -ForegroundColor White
Write-Host "  * HashiCorp Vault:                http://localhost:8200" -ForegroundColor White
Write-Host "  * PostgreSQL Persistencia:        localhost:5432  (DB: SENA / User: admin)" -ForegroundColor White
Write-Host ""
Write-Host "SuperAdmin inicial disponible:" -ForegroundColor Cyan
Write-Host "  * Email:    superadmin@worklex.com" -ForegroundColor Yellow
Write-Host "  * Password: SuperAdmin123*" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para detener el stack completo:" -ForegroundColor Gray
Write-Host "  docker compose down" -ForegroundColor Gray
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""
