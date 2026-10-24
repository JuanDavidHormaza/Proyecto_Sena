#!/bin/bash
set -e

echo "=== [1/4] Verificando y configurando PostgreSQL ==="
# Intentar entrar con admin o worklex_admin y fijar Admin123*
docker compose exec worklex_persistencia psql -U admin -d sena -c "ALTER USER admin WITH PASSWORD 'Admin123*';" 2>/dev/null || \
docker compose exec worklex_persistencia psql -U worklex_admin -d sena -c "ALTER USER admin WITH PASSWORD 'Admin123*';" 2>/dev/null || \
docker compose exec -u postgres worklex_persistencia psql -c "ALTER USER admin WITH PASSWORD 'Admin123*';" 2>/dev/null || true

# Asegurar que la base sena exista y admin tenga permisos completos
docker compose exec worklex_persistencia psql -U admin -c "CREATE DATABASE sena OWNER admin;" 2>/dev/null || true
docker compose exec worklex_persistencia psql -U admin -d sena -c "GRANT ALL PRIVILEGES ON DATABASE sena TO admin; GRANT ALL ON SCHEMA public TO admin;" 2>/dev/null || true

echo "=== [2/4] Verificando tablas del Esquema ==="
# Consultar cuántas tablas hay en la base sena
TABLE_COUNT=$(docker compose exec worklex_persistencia psql -U admin -d sena -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d '[:space:]' || echo "0")
echo "Tablas detectadas en el esquema público: $TABLE_COUNT"

echo "=== [3/4] Levantando Backend y aplicando Esquema si falta ==="
docker compose up -d --force-recreate worklex_backend

# Esperar a que el backend responda
sleep 5

# Si hay pocas o ninguna tabla, forzar migraciones completas
if [ "$TABLE_COUNT" -lt "5" ]; then
    echo "Esquema vacío o incompleto. Reconstruyendo esquema con Django migrate..."
    docker compose exec worklex_backend python manage.py migrate --noinput
else
    echo "Esquema detectado intacto ($TABLE_COUNT tablas). Ejecutando migraciones pendientes..."
    docker compose exec worklex_backend python manage.py migrate
fi

echo "=== [4/4] Verificando usuarios en la plataforma ==="
docker compose exec worklex_backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
print(f'Total de cuentas de usuario disponibles: {User.objects.count()}')
"

echo "=== ¡Listo! Backend operativo con la base de datos y esquema correctos ==="
