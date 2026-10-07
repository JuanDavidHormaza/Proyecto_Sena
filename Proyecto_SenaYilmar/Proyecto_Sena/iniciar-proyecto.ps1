# ==============================================================================
# WORKLEX - Despliegue de Infraestructura Unificada (DevOps / Senior Architect)
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "         WORKLEX - INICIALIZACION Y DESPLIEGUE DE SERVICIOS           " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Resolver el directorio de trabajo donde reside docker-compose.yml
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (Test-Path "$ScriptDir\docker-compose.yml") {
    $ProjectRoot = $ScriptDir
} elseif (Test-Path "$ScriptDir\Proyecto_Sena\docker-compose.yml") {
    $ProjectRoot = "$ScriptDir\Proyecto_Sena"
} elseif (Test-Path "$PWD\docker-compose.yml") {
    $ProjectRoot = $PWD.Path
} elseif (Test-Path "$PWD\Proyecto_Sena\docker-compose.yml") {
    $ProjectRoot = "$PWD\Proyecto_Sena"
} else {
    $ProjectRoot = $ScriptDir
}

Set-Location $ProjectRoot
Write-Host "[1/3] Directorio del proyecto: $ProjectRoot" -ForegroundColor Yellow

# 2. Verificar que Docker daemon este activo
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker no responde"
    }
} catch {
    Write-Host "ERROR CRITICO: Docker Desktop no esta ejecutandose o el daemon no responde." -ForegroundColor Red
    Write-Host "Por favor inicia Docker Desktop y ejecuta este script nuevamente." -ForegroundColor Red
    exit 1
}

# 3. Garantizar la existencia de la red externa compartida
Write-Host "[2/3] Verificando red compartida 'worklex_network'..." -ForegroundColor Yellow
$networkExists = docker network ls --filter "name=^worklex_network$" --format "{{.Name}}"
if (-not $networkExists) {
    Write-Host "  + Creando red compartida externa 'worklex_network'..." -ForegroundColor Cyan
    docker network create worklex_network | Out-Null
    Write-Host "  -> Red 'worklex_network' creada exitosamente." -ForegroundColor Green
} else {
    Write-Host "  -> Red 'worklex_network' ya existe." -ForegroundColor Green
}

# 4. Levantar la infraestructura unificada
Write-Host "[3/3] Desplegando servicios con Docker Compose (COMPOSE_FILE)..." -ForegroundColor Yellow
Write-Host "  Ejecutando: docker compose up -d --build" -ForegroundColor DarkGray

docker compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo el despliegue con docker compose." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "        DESPLIEGUE COMPLETADO Y SERVICIOS EN EJECUCION                " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Servicios y Puntos de Acceso:" -ForegroundColor Cyan
Write-Host " - Frontend SPA:         http://localhost:5173"
Write-Host " - Proxy WAF (Nginx):    http://localhost / https://localhost"
Write-Host " - Backend API:          http://localhost:8000/api/"
Write-Host " - Django Admin:         http://localhost:8000/admin/"
Write-Host " - MinIO S3 API:         http://localhost:9000"
Write-Host " - MinIO Web Console:    http://localhost:9001 (admin / Admin123*)"
Write-Host " - Keycloak Auth:        http://localhost:8080"
Write-Host " - HashiCorp Vault:      http://localhost:8200"
Write-Host " - PostgreSQL:           localhost:5432 (DB: SENA, User: admin)"
Write-Host ""
