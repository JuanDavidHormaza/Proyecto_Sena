"""
===============================================================================
WorkLex - Almacenamiento multimedia (MinIO)

Reemplaza por completo a Supabase Storage. Usa el contenedor `worklex_media`
(servicio MinIO definido en docker-compose.media.yml).

Jerarquía de carpetas dentro de cada bucket (S3-compatible):

    {bucket-por-tipo}/{programa}/{ficha}/{archivo}

Es decir, cada TIPO de medio (imagen, audio, video) tiene su PROPIO bucket
-> así cada uno "carga y tiene su espacio" de forma aislada, como pidió el
usuario. Dentro de ese bucket, el árbol de carpetas es Programa -> Ficha.

Esto permite navegar el contenido de dos formas sin duplicar nada:
  - Forma normal:  Programa -> Ficha -> [Imágenes | Audios | Videos]
  - Forma inversa: [Imágenes | Audios | Videos] -> Programa -> Ficha
===============================================================================
"""

import os
import unicodedata
import re
import uuid
from datetime import timedelta

from django.conf import settings

try:
    from minio import Minio
    from minio.error import S3Error
except ImportError:  # pragma: no cover - se instala via requirements.txt
    Minio = None
    S3Error = Exception


# ─── Buckets por tipo de medio (cada uno con su propio espacio) ──────────────
BUCKET_IMAGES = "worklex-images"
BUCKET_AUDIOS = "worklex-audios"
BUCKET_VIDEOS = "worklex-videos"
BUCKET_SPEAKING = "student-speaking"  # grabaciones de pronunciación del quiz

ALL_BUCKETS = [BUCKET_IMAGES, BUCKET_AUDIOS, BUCKET_VIDEOS, BUCKET_SPEAKING]

MEDIA_TYPE_TO_BUCKET = {
    "image": BUCKET_IMAGES,
    "audio": BUCKET_AUDIOS,
    "video": BUCKET_VIDEOS,
}


def _normalize_segment(value: str) -> str:
    """Convierte 'Análisis de Datos' -> 'analisis-de-datos' (seguro para rutas)."""
    value = (value or "").strip()
    if not value:
        return "sin-asignar"
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "sin-asignar"


def build_object_key(program: str, ficha: str, filename: str) -> str:
    """Construye la ruta {programa}/{ficha}/{uuid}-{archivo} dentro del bucket."""
    program_slug = _normalize_segment(program)
    ficha_slug = _normalize_segment(ficha or "sin-ficha")
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", filename.strip())
    unique_name = f"{uuid.uuid4().hex[:8]}-{safe_name}"
    return f"{program_slug}/{ficha_slug}/{unique_name}"


_client = None


def get_client():
    """Cliente MinIO (singleton simple)."""
    global _client
    if _client is not None:
        return _client

    if Minio is None:
        raise RuntimeError(
            "El paquete 'minio' no está instalado. Agrega 'minio' a requirements.txt"
        )

    endpoint = os.getenv("MINIO_ENDPOINT", "worklex_media:9000")
    access_key = os.getenv("MINIO_ACCESS_KEY", "admin")
    secret_key = os.getenv("MINIO_SECRET_KEY", "")
    secure = os.getenv("MINIO_SECURE", "false").lower() in ("1", "true", "yes")

    _client = Minio(
        endpoint,
        access_key=access_key,
        secret_key=secret_key,
        secure=secure,
    )
    return _client


def ensure_buckets():
    """Crea los buckets si no existen y los deja con lectura pública (anon)."""
    import json

    client = get_client()
    for bucket in ALL_BUCKETS:
        try:
            if not client.bucket_exists(bucket):
                client.make_bucket(bucket)
            # Política de solo-lectura anónima: permite que el navegador
            # descargue imágenes/audios/videos sin autenticación, igual que
            # las URLs públicas de Supabase Storage.
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": ["*"]},
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{bucket}/*"],
                    }
                ],
            }
            client.set_bucket_policy(bucket, json.dumps(policy))
        except S3Error as exc:
            print(f"[media_storage] No se pudo preparar el bucket {bucket}: {exc}")


def _public_base_url() -> str:
    return os.getenv("MINIO_PUBLIC_URL", "http://localhost:9000").rstrip("/")


def build_public_url(bucket: str, object_key: str) -> str:
    return f"{_public_base_url()}/{bucket}/{object_key}"


def upload_bytes(media_type: str, program: str, ficha: str, filename: str, data: bytes, content_type: str = "") -> dict:
    """
    Sube un archivo al bucket correspondiente a su tipo, organizado por
    programa/ficha. Devuelve {bucket, object_key, url}.
    """
    bucket = MEDIA_TYPE_TO_BUCKET.get(media_type)
    if not bucket:
        raise ValueError(f"Tipo de medio inválido: {media_type}")

    ensure_buckets()
    client = get_client()
    object_key = build_object_key(program, ficha, filename)

    import io
    client.put_object(
        bucket,
        object_key,
        io.BytesIO(data),
        length=len(data),
        content_type=content_type or "application/octet-stream",
    )

    return {
        "bucket": bucket,
        "object_key": object_key,
        "url": build_public_url(bucket, object_key),
    }


def upload_speaking_audio(audio_bytes: bytes, filename: str, storage_path: str) -> str:
    """
    Sube una grabación de pronunciación (speaking) al bucket dedicado
    'student-speaking', organizada como {storage_path}/{filename}
    (storage_path suele ser "{nivel}/user_{id}").
    """
    ensure_buckets()
    client = get_client()
    object_key = f"{storage_path}/{filename}" if storage_path else f"responses/{filename}"

    import io
    client.put_object(
        BUCKET_SPEAKING,
        object_key,
        io.BytesIO(audio_bytes),
        length=len(audio_bytes),
        content_type="audio/webm",
    )
    return build_public_url(BUCKET_SPEAKING, object_key)


def download_object_bytes(bucket: str, object_key: str) -> bytes:
    """Descarga el contenido completo de un objeto (por ejemplo, un Excel)."""
    client = get_client()
    response = client.get_object(bucket, object_key)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def delete_object(bucket: str, object_key: str) -> None:
    try:
        client = get_client()
        client.remove_object(bucket, object_key)
    except S3Error as exc:
        print(f"[media_storage] Error eliminando {bucket}/{object_key}: {exc}")


def list_objects(bucket: str, prefix: str = "") -> list:
    """Lista objetos de un bucket (opcionalmente filtrados por prefijo)."""
    try:
        client = get_client()
        ensure_buckets()
        objects = client.list_objects(bucket, prefix=prefix, recursive=True)
        result = []
        for obj in objects:
            result.append({
                "object_key": obj.object_name,
                "size": obj.size,
                "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                "url": build_public_url(bucket, obj.object_name),
            })
        return result
    except Exception as exc:
        print(f"[media_storage] Error listando bucket {bucket}: {exc}")
        return []
