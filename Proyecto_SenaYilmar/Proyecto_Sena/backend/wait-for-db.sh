#!/bin/sh

echo "Esperando PostgreSQL..."

while ! nc -z worklex_persistencia 5432; do
  sleep 1
done

echo "PostgreSQL disponible."