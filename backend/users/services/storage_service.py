"""
StorageService - Servicio de almacenamiento interno para WorkLex basado en MinIO / S3.

Reglas del servicio:
1. Conexión lazy a MinIO mediante red interna Docker (minio:9000).
2. Cero URLs directas a MinIO: el servicio genera URIs relativas de proxy Django (/api/media/...).
3. Arranque desacoplado y resiliente: si MinIO está apagado o reiniciando, Django no se cae.
4. Soporte para streaming de archivos multimedia con FileResponse / StreamingHttpResponse.
"""

import io
import logging
import mimetypes
import os
from typing import Optional, Tuple, BinaryIO, Union
from urllib.parse import quote

from django.conf import settings

logger = logging.getLogger(__name__)


class StorageError(Exception):
    """Excepción base para errores de almacenamiento."""
    pass


class StorageUnavailableError(StorageError):
    """Excepción lanzada cuando MinIO o el servicio de almacenamiento no está accesible."""
    pass


class StorageFileNotFoundError(StorageError):
    """Excepción lanzada cuando el archivo solicitado no existe en el bucket."""
    pass


class StorageInvalidRangeError(StorageError):
    """Excepción lanzada cuando el rango de bytes solicitado no es válido (HTTP 416)."""
    pass


class StorageService:
    """
    Cliente de almacenamiento S3/MinIO con inicialización lazy y manejo desacoplado de errores.
    """

    _client = None
    _buckets_verified = set()

    # Buckets estándar del sistema WorkLex
    BUCKETS = getattr(settings, 'MINIO_BUCKETS', {
        'DICTIONARY_IMAGES': 'dictionary-images',
        'DICTIONARY_AUDIOS': 'dictionary-audios',
        'DICTIONARY_VIDEOS': 'dictionary-videos',
        'EXAM_AUDIOS': 'exam-audios',
        'EXAM_SUBMISSIONS': 'exam-submissions',
    })

    @classmethod
    def get_client(cls):
        """
        Obtiene el cliente boto3 S3 de manera lazy.
        Si boto3 no está disponible o falla la instanciación, genera una excepción controlada.
        """
        if cls._client is not None:
            return cls._client

        try:
            import boto3
            from botocore.client import Config
        except ImportError:
            logger.error("boto3 no está instalado en el entorno de Python.")
            raise StorageUnavailableError("El cliente boto3 no está disponible en el backend.")

        endpoint = getattr(settings, 'MINIO_ENDPOINT', 'minio:9000')
        use_ssl = getattr(settings, 'MINIO_USE_SSL', False)
        if str(endpoint).startswith(('http://', 'https://')):
            endpoint_url = str(endpoint)
        else:
            protocol = 'https' if use_ssl else 'http'
            endpoint_url = f"{protocol}://{endpoint}"

        access_key = getattr(settings, 'MINIO_ACCESS_KEY', 'admin')
        secret_key = getattr(settings, 'MINIO_SECRET_KEY', 'Admin123*')

        try:
            cls._client = boto3.client(
                's3',
                endpoint_url=endpoint_url,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=Config(
                    signature_version='s3v4',
                    connect_timeout=3,
                    read_timeout=10,
                    retries={'max_attempts': 2}
                ),
                region_name='us-east-1'
            )
            return cls._client
        except Exception as e:
            logger.error(f"Error inicializando cliente S3 MinIO: {e}")
            raise StorageUnavailableError(f"No fue posible conectar con MinIO: {e}")

    @classmethod
    def ensure_bucket_exists(cls, bucket_name: str) -> bool:
        """
        Verifica si un bucket existe de forma idempotente, creándolo si es necesario.
        Retorna True si el bucket está listo, False si no pudo verificarse por desconexión.
        """
        if bucket_name in cls._buckets_verified:
            return True

        try:
            client = cls.get_client()
            client.head_bucket(Bucket=bucket_name)
            cls._buckets_verified.add(bucket_name)
            return True
        except StorageUnavailableError:
            return False
        except Exception as e:
            # Puede ser 404 Not Found -> crearlo
            error_code = getattr(getattr(e, 'response', {}), 'get', lambda _: {})('Error', {}).get('Code', '')
            if error_code in ('404', 'NoSuchBucket', 'NotFound') or '404' in str(e):
                try:
                    client = cls.get_client()
                    client.create_bucket(Bucket=bucket_name)
                    cls._buckets_verified.add(bucket_name)
                    logger.info(f"Bucket creado exitosamente: {bucket_name}")
                    return True
                except Exception as create_err:
                    logger.warning(f"No se pudo crear el bucket '{bucket_name}': {create_err}")
                    return False
            else:
                logger.warning(f"Verificación de bucket '{bucket_name}' no disponible: {e}")
                return False

    @classmethod
    def ensure_all_buckets(cls):
        """Intenta asegurar todos los buckets estándar de forma silenciosa y no bloqueante."""
        for name in cls.BUCKETS.values():
            try:
                cls.ensure_bucket_exists(name)
            except Exception as e:
                logger.warning(f"Bucket '{name}' pendiente de inicialización: {e}")

    @classmethod
    def upload_file(
        cls,
        bucket_name: str,
        file_key: str,
        file_data: Union[bytes, BinaryIO, io.BytesIO],
        content_type: Optional[str] = None
    ) -> str:
        """
        Sube un archivo a MinIO y retorna la URL relativa de proxy para el frontend.
        Ejemplo retornado: '/api/media/dictionary-images/word-123.jpg'
        """
        client = cls.get_client()
        cls.ensure_bucket_exists(bucket_name)

        # Determinar tipo de contenido si no se proporcionó
        if not content_type:
            guessed_type, _ = mimetypes.guess_type(file_key)
            content_type = guessed_type or 'application/octet-stream'

        # Normalizar datos a bytes o archivo binario
        body = file_data
        if hasattr(file_data, 'read'):
            # Objeto tipo archivo (Django UploadedFile, BytesIO)
            if hasattr(file_data, 'seek'):
                file_data.seek(0)
            body = file_data.read()
        elif not isinstance(file_data, bytes):
            body = bytes(file_data)

        try:
            client.put_object(
                Bucket=bucket_name,
                Key=file_key,
                Body=body,
                ContentType=content_type
            )
            logger.info(f"Archivo subido exitosamente a MinIO: {bucket_name}/{file_key}")
            return cls.get_proxy_url(bucket_name, file_key)
        except Exception as e:
            logger.error(f"Fallo al subir archivo a MinIO ({bucket_name}/{file_key}): {e}")
            raise StorageUnavailableError(f"Error al almacenar archivo en MinIO: {e}")

    @classmethod
    def get_file_stream(cls, bucket_name: str, file_key: str, byte_range: Optional[str] = None) -> Tuple[BinaryIO, str, int, Optional[str]]:
        """
        Obtiene el stream de lectura de un objeto en MinIO.
        Retorna (stream, content_type, content_length, content_range).
        Lanza StorageFileNotFoundError si el objeto no existe.
        Lanza StorageUnavailableError si MinIO no responde.
        """
        client = cls.get_client()

        try:
            params = {'Bucket': bucket_name, 'Key': file_key}
            if byte_range:
                params['Range'] = byte_range
            response = client.get_object(**params)
            stream = response['Body']
            raw_content_type = response.get('ContentType')

            # Detección robusta de MIME Type para audio/imagen/video
            guessed_type, _ = mimetypes.guess_type(file_key)
            ext = os.path.splitext(file_key)[1].lower()
            extension_mime_map = {
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.m4a': 'audio/mp4',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.jfif': 'image/jpeg',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
            }

            if ext in extension_mime_map:
                content_type = extension_mime_map[ext]
            elif guessed_type:
                content_type = guessed_type
            elif raw_content_type and raw_content_type != 'application/octet-stream':
                content_type = raw_content_type
            else:
                content_type = 'application/octet-stream'

            content_length = response.get('ContentLength', 0)
            content_range = response.get('ContentRange', None)
            return stream, content_type, content_length, content_range
        except StorageUnavailableError:
            raise
        except Exception as e:
            error_code = getattr(getattr(e, 'response', {}), 'get', lambda _: {})('Error', {}).get('Code', '')
            if error_code in ('NoSuchKey', '404', 'NotFound') or 'NoSuchKey' in str(e):
                raise StorageFileNotFoundError(f"Archivo '{file_key}' no encontrado en el bucket '{bucket_name}'.")
            if error_code in ('InvalidRange', '416') or 'InvalidRange' in str(e):
                raise StorageInvalidRangeError(f"Rango de bytes no satisfacible para '{file_key}'.")
            
            # Posible caída de red o timeout
            logger.error(f"Error al consultar archivo en MinIO ({bucket_name}/{file_key}): {e}")
            raise StorageUnavailableError(f"Servicio de almacenamiento no accesible: {e}")

    @classmethod
    def delete_file(cls, bucket_name: str, file_key: str) -> bool:
        """
        Elimina un archivo de MinIO. Retorna True si se ejecutó con éxito.
        """
        client = cls.get_client()
        try:
            client.delete_object(Bucket=bucket_name, Key=file_key)
            return True
        except Exception as e:
            logger.warning(f"Error al eliminar archivo '{file_key}' de '{bucket_name}': {e}")
            return False

    @classmethod
    def file_exists(cls, bucket_name: str, file_key: str) -> bool:
        """
        Verifica si un archivo existe en MinIO sin descargarlo.
        """
        client = cls.get_client()
        try:
            client.head_object(Bucket=bucket_name, Key=file_key)
            return True
        except Exception:
            return False

    @classmethod
    def get_proxy_url(cls, bucket_name: str, file_key: str) -> str:
        """
        Genera la URL relativa de proxy para el frontend.
        Cero exposición de MinIO: el frontend consulta directamente a Django.
        Ejemplo: /api/media/dictionary-images/sample.jpg
        """
        prefix = getattr(settings, 'MINIO_PUBLIC_URL_PREFIX', '/api/media/').rstrip('/')
        return f"{prefix}/{bucket_name}/{file_key}"
