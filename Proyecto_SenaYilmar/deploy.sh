#!/usr/bin/env bash
# ==============================================================================
# Script de Despliegue Automatizado - WorkLex SENA (VPS Clouding)
# Dominio: https://worklexsena.shop
# ==============================================================================
set -euo pipefail

# Colores para salida informativa
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}       INICIANDO DESPLIEGUE WORKLEX SENA            ${NC}"
echo -e "${BLUE}====================================================${NC}"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$PROJECT_DIR/Proyecto_Sena" ]; then
    cd "$PROJECT_DIR/Proyecto_Sena"
else
    cd "$PROJECT_DIR"
fi

# 1. Validar existencia de .env
if [ ! -f .env ]; then
    echo -e "${RED}[ERROR] El archivo .env no existe en $(pwd).${NC}"
    echo -e "${YELLOW}Crea el archivo .env con las credenciales requeridas antes de continuar.${NC}"
    exit 1
fi

# 2. Descargar últimos cambios del repositorio Git
echo -e "\n${YELLOW}[1/6] Sincronizando repositorio con Git...${NC}"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
git fetch origin "${CURRENT_BRANCH}"
git reset --hard "origin/${CURRENT_BRANCH}"
echo -e "${GREEN}✓ Código actualizado a la última versión de ${CURRENT_BRANCH}.${NC}"

# 3. Asegurar permisos en directorios críticos y certificados SSL
echo -e "\n${YELLOW}[2/6] Verificando persistencia y certificados SSL...${NC}"
mkdir -p ./certbot/conf ./certbot/www ./proxy/logs
echo -e "${GREEN}✓ Directorios de certificados y logs verificados sin alterar volúmenes.${NC}"

# 4. Reconstruir contenedores de aplicación (Backend y Frontend)
echo -e "\n${YELLOW}[3/6] Reconstruyendo imágenes de Backend y Frontend...${NC}"
docker compose build --pull worklex_backend worklex_frontend
echo -e "${GREEN}✓ Imágenes docker actualizadas correctamente.${NC}"

# 5. Reiniciar servicios preservando volúmenes de base de datos
echo -e "\n${YELLOW}[4/6] Levantando servicios en segundo plano...${NC}"
# IMPORTANTE: Nunca se usa 'down -v'. 'up -d' actualiza contenedores in-place
docker compose up -d --remove-orphans
echo -e "${GREEN}✓ Contenedores en ejecución.${NC}"

# 6. Esperar a que PostgreSQL esté disponible y ejecutar migraciones
echo -e "\n${YELLOW}[5/6] Esperando disponibilidad de PostgreSQL para migraciones...${NC}"
RETRIES=30
until docker compose exec -T worklex_persistencia pg_isready -U admin -d SENA > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
    echo "Esperando que PostgreSQL esté listo... (${RETRIES} intentos restantes)"
    sleep 2
    RETRIES=$((RETRIES-1))
done

if [ $RETRIES -eq 0 ]; then
    echo -e "${RED}[ERROR] PostgreSQL no respondió a tiempo.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL disponible. Ejecutando migraciones de Django...${NC}"
docker compose exec -T worklex_backend python manage.py migrate --noinput

# 7. Tareas post-despliegue (Archivos estáticos y semillas)
echo -e "\n${YELLOW}[6/6] Verificando salud del sistema...${NC}"
docker compose exec -T worklex_backend python manage.py create_superadmin || true

# Limpieza ligera de imágenes huérfanas (sin tocar volúmenes ni cache activa)
docker image prune -f > /dev/null 2>&1 || true

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}   ¡DESPLIEGUE COMPLETADO EXITOSAMENTE!            ${NC}"
echo -e "${GREEN}   URL: https://worklexsena.shop                    ${NC}"
echo -e "${GREEN}====================================================${NC}"

# Mostrar estado de contenedores
docker compose ps
