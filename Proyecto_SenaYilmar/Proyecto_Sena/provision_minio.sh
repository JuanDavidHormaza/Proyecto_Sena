#!/bin/sh
set -e

echo "============================================================"
echo "    WORKLEX - PROVISIONADOR AUTOMÁTICO DE MINIO (mc)        "
echo "============================================================"

MINIO_HOST="${MINIO_ENDPOINT:-http://minio:9000}"
USER="${MINIO_ROOT_USER:-admin}"
PASSWORD="${MINIO_ROOT_PASSWORD:-Admin123*}"

echo "Esperando que el servicio MinIO esté listo en $MINIO_HOST..."
MAX_RETRIES=30
COUNT=0

until mc alias set localminio "$MINIO_HOST" "$USER" "$PASSWORD" >/dev/null 2>&1 && mc admin info localminio >/dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
        echo "ERROR: MinIO no respondió después de $MAX_RETRIES intentos."
        exit 1
    fi
    echo "Intento $COUNT/$MAX_RETRIES - MinIO no disponible aún. Reintentando en 2s..."
    sleep 2
done

echo "Conexión exitosa a MinIO."

# 1. Creación idempotente de buckets requeridos
REQUIRED_BUCKETS="dictionary-audios dictionary-images dictionary-videos exam-audios exam-submissions"

echo "Verificando / Creando buckets requeridos..."
for bucket in $REQUIRED_BUCKETS; do
    if mc ls "localminio/$bucket" >/dev/null 2>&1; then
        echo "  - Bucket '$bucket' ya existe."
    else
        echo "  + Creando bucket '$bucket'..."
        mc mb "localminio/$bucket" || true
    fi
done

# 2. Aplicación de políticas públicas de descarga (Obligatoria e Idempotente)
echo "Configurando política pública de descarga para buckets multimedia..."
mc anonymous set download localminio/dictionary-audios || true
mc anonymous set download localminio/dictionary-images || true
mc anonymous set download localminio/dictionary-videos || true

echo "Políticas de acceso anónimo aplicadas correctamente."

# 3. Sincronización automática de archivos multimedia desde seeds
echo "Sincronizando archivos multimedia iniciales..."

# Audios desde /minio-seed o backend/media_source
if [ -d "/minio-seed/dictionary-audios" ] && [ "$(ls -A /minio-seed/dictionary-audios 2>/dev/null)" ]; then
    echo "  -> Sincronizando audios desde /minio-seed/dictionary-audios..."
    mc cp --recursive "/minio-seed/dictionary-audios/" localminio/dictionary-audios/ || true
fi

for aud_dir in /seeds/media_source/adso/ADSO/SONIDOS /seeds/media_source/audios /seeds/audios; do
    if [ -d "$aud_dir" ] && [ "$(ls -A "$aud_dir" 2>/dev/null)" ]; then
        echo "  -> Sincronizando audios desde $aud_dir hacia localminio/dictionary-audios..."
        mc cp --recursive "$aud_dir/" localminio/dictionary-audios/ || true
        break
    fi
done

# Imágenes desde /minio-seed o backend/media_source
if [ -d "/minio-seed/dictionary-images" ] && [ "$(ls -A /minio-seed/dictionary-images 2>/dev/null)" ]; then
    echo "  -> Sincronizando imágenes desde /minio-seed/dictionary-images..."
    mc cp --recursive "/minio-seed/dictionary-images/" localminio/dictionary-images/ || true
fi

for img_dir in /seeds/media_source/adso/ADSO/IM* /seeds/media_source/images /seeds/images; do
    if [ -d "$img_dir" ] && [ "$(ls -A "$img_dir" 2>/dev/null)" ]; then
        echo "  -> Sincronizando imágenes desde $img_dir hacia localminio/dictionary-images..."
        mc cp --recursive "$img_dir/" localminio/dictionary-images/ || true
        break
    fi
done

# Videos (tolerante a carpetas vacías o inexistentes)
if [ -d "/minio-seed/dictionary-videos" ] && [ "$(ls -A /minio-seed/dictionary-videos 2>/dev/null)" ]; then
    echo "  -> Sincronizando videos desde /minio-seed/dictionary-videos..."
    mc cp --recursive "/minio-seed/dictionary-videos/" localminio/dictionary-videos/ || true
fi

for vid_dir in /seeds/media_source/videos /seeds/videos; do
    if [ -d "$vid_dir" ] && [ "$(ls -A "$vid_dir" 2>/dev/null)" ]; then
        echo "  -> Sincronizando videos desde $vid_dir hacia localminio/dictionary-videos..."
        mc cp --recursive "$vid_dir/" localminio/dictionary-videos/ || true
        break
    fi
done

echo "============================================================"
echo "    PROVISIONAMIENTO DE MINIO COMPLETADO CON ÉXITO         "
echo "============================================================"
exit 0
