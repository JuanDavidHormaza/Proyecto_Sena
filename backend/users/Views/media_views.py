"""
media_views.py - Vistas para el streaming y proxy de archivos multimedia de MinIO a través de Django.

Garantiza:
1. Cero URLs directas a MinIO (ni localhost:9000 ni minio:9000).
2. Streaming transparente con StreamingHttpResponse y cabeceras de rango/caché.
3. Resiliencia total: si MinIO está inactivo, responde con JSON controlado sin tumbar Django.
"""

import logging
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from ..authentication import OptionalJWTAuthentication
from ..services.storage_service import (
    StorageService,
    StorageError,
    StorageUnavailableError,
    StorageFileNotFoundError,
    StorageInvalidRangeError,
)

logger = logging.getLogger(__name__)


class MediaProxyAPIView(APIView):
    """
    GET /api/media/<str:bucket_name>/<path:file_key>
    
    Proxy de streaming seguro para archivos multimedia desde MinIO.
    Permite que etiquetas <img>, <audio> y <video> consuman los recursos
    directamente desde la URL pública de Django sin exponer MinIO y sin
    requerir cabeceras de autorización manuales (AllowAny sin autenticación).
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, bucket_name: str, file_key: str):
        import mimetypes
        from urllib.parse import unquote
        clean_key = unquote(file_key).strip('/')
        clean_bucket = bucket_name.strip()
        byte_range = request.META.get('HTTP_RANGE')

        try:
            try:
                stream, content_type, content_length, content_range = StorageService.get_file_stream(
                    bucket_name=clean_bucket,
                    file_key=clean_key,
                    byte_range=byte_range
                )
            except StorageFileNotFoundError:
                # Fallback resiliente para tolerar diferencias de minúsculas o prefijos
                fallback_keys = [
                    clean_key.lower(),
                    clean_key.replace("adso_", ""),
                    clean_key.lower().replace("adso_", ""),
                    f"adso_{clean_key.lower()}",
                ]
                found = False
                for fb_key in fallback_keys:
                    if fb_key != clean_key:
                        try:
                            stream, content_type, content_length, content_range = StorageService.get_file_stream(
                                bucket_name=clean_bucket,
                                file_key=fb_key,
                                byte_range=byte_range
                            )
                            clean_key = fb_key
                            found = True
                            break
                        except StorageFileNotFoundError:
                            continue
                if not found:
                    raise

            # Generador en trozos para evitar cargar archivos grandes en memoria
            def file_iterator(body_stream, chunk_size=65536):
                try:
                    while True:
                        chunk = body_stream.read(chunk_size)
                        if not chunk:
                            break
                        yield chunk
                finally:
                    if hasattr(body_stream, 'close'):
                        body_stream.close()

            status_code = status.HTTP_206_PARTIAL_CONTENT if content_range else status.HTTP_200_OK

            # Deducción precisa de tipo MIME
            guessed_type, _ = mimetypes.guess_type(clean_key)
            if not guessed_type:
                lower_k = clean_key.lower()
                if lower_k.endswith('.png'):
                    guessed_type = 'image/png'
                elif lower_k.endswith(('.jpg', '.jpeg')):
                    guessed_type = 'image/jpeg'
                elif lower_k.endswith('.webp'):
                    guessed_type = 'image/webp'
                elif lower_k.endswith('.svg'):
                    guessed_type = 'image/svg+xml'
                elif lower_k.endswith('.mp3'):
                    guessed_type = 'audio/mpeg'
                elif lower_k.endswith('.wav'):
                    guessed_type = 'audio/wav'
                elif lower_k.endswith('.webm'):
                    guessed_type = 'audio/webm'
                elif clean_bucket == 'dictionary-images':
                    guessed_type = 'image/png'
                elif clean_bucket in ('dictionary-audios', 'exam-audios'):
                    guessed_type = 'audio/mpeg'
                else:
                    guessed_type = 'application/octet-stream'

            final_content_type = content_type or guessed_type or 'application/octet-stream'

            response = StreamingHttpResponse(
                file_iterator(stream),
                content_type=final_content_type,
                status=status_code
            )

            if content_length:
                response['Content-Length'] = str(content_length)

            if content_range:
                response['Content-Range'] = content_range

            response['Accept-Ranges'] = 'bytes'
            if clean_bucket == 'dictionary-images' or final_content_type.startswith('image/'):
                response['Cache-Control'] = 'public, max-age=31536000, immutable'
            else:
                response['Cache-Control'] = 'public, max-age=604800, immutable'
            response['X-Content-Type-Options'] = 'nosniff'

            return response

        except StorageFileNotFoundError as e:
            logger.warning(f"MediaProxy 404: {clean_bucket}/{clean_key} - {e}")
            return JsonResponse(
                {'error': 'File not found', 'bucket': clean_bucket, 'file_key': clean_key},
                status=status.HTTP_404_NOT_FOUND
            )

        except StorageInvalidRangeError as e:
            logger.warning(f"MediaProxy 416: {clean_bucket}/{clean_key} - {e}")
            return JsonResponse(
                {'error': 'Rango solicitado no satisfacible', 'bucket': clean_bucket, 'file_key': clean_key},
                status=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE
            )

        except StorageUnavailableError as e:
            logger.warning(f"MediaProxy 503 (MinIO inaccesible): {clean_bucket}/{clean_key} - {e}")
            return JsonResponse(
                {
                    'error': 'Service Unavailable: MinIO storage is temporarily unreachable',
                    'bucket': clean_bucket,
                    'file_key': clean_key
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as e:
            logger.error(f"MediaProxy controlado 503: {e}")
            return JsonResponse(
                {'error': 'Service Unavailable', 'bucket': clean_bucket, 'file_key': clean_key},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


class MediaUploadAPIView(APIView):
    """
    POST /api/media/upload/
    
    Subida directa de archivos multimedia al storage interno de MinIO.
    Requiere autenticación (Admin / SuperAdmin / Docente según bucket).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        uploaded_file = request.FILES.get('file')
        bucket_name = request.data.get('bucket', 'dictionary-images')

        if not uploaded_file:
            return Response({'error': 'No se proporcionó ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validación RBAC: Diccionario restringido a ADMIN y SUPERADMIN
        user = request.user
        user_role = str(getattr(user, 'role_id', '') or getattr(user, 'role', '')).upper()
        if bucket_name.startswith('dictionary-') and user_role not in ('SUPERADMIN', 'ADMIN'):
            return Response(
                {'error': 'Acceso restringido: Solo ADMIN y SUPERADMIN pueden subir multimedia al diccionario.'},
                status=status.HTTP_403_FORBIDDEN
            )

        import uuid
        import os
        ext = os.path.splitext(uploaded_file.name)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}{ext}"

        try:
            proxy_url = StorageService.upload_file(
                bucket_name=bucket_name,
                file_key=unique_filename,
                file_data=uploaded_file,
                content_type=uploaded_file.content_type
            )

            return Response({
                'file_key': unique_filename,
                'bucket': bucket_name,
                'proxy_url': proxy_url,
                'url': proxy_url, # Alias estándar para frontend
                'size': uploaded_file.size,
                'content_type': uploaded_file.content_type
            }, status=status.HTTP_201_CREATED)

        except StorageUnavailableError as e:
            return Response({
                'error': 'No se pudo guardar el archivo: MinIO no disponible.',
                'detail': str(e)
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            return Response({'error': f'Error al subir archivo: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
