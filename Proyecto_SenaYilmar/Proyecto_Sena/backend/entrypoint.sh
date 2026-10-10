#!/bin/sh
set -e

echo "Esperando PostgreSQL en ${POSTGRES_HOST:-worklex_persistencia}:${POSTGRES_PORT:-5432}..."
until python -c "import socket; s = socket.socket(); s.connect(('${POSTGRES_HOST:-worklex_persistencia}', int('${POSTGRES_PORT:-5432}'))); s.close()" 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL disponible."

echo "Ejecutando migraciones de base de datos..."
python manage.py migrate --fake-initial

echo "Recopilando archivos estáticos de Django (collectstatic)..."
python manage.py collectstatic --noinput

echo "Inicializando vocabulario ADSO..."
(python manage.py import_adso_dictionary || python manage.py seed_adso_dictionary) || true
python manage.py create_superadmin || true
(python manage.py upload_adso_assets || true)

exec "$@"
