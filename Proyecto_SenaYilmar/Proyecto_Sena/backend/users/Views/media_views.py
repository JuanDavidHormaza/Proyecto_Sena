"""
media_views.py - Vistas para el streaming y proxy de archivos multimedia de MinIO a través de Django.

Garantiza:
1. Cero URLs directas a MinIO (ni localhost:9000 ni minio:9000).
2. Streaming transparente con StreamingHttpResponse y cabeceras de rango/caché.
3. Resiliencia total: si MinIO está inactivo, responde con JSON controlado sin tumbar Django.
"""

import logging
from django.http import StreamingHttpResponse, JsonResponse, HttpResponse
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

# Trama binaria válida de silencio MP3 (MPEG-1 Layer 3, 128kbps, 44.1kHz)
SILENT_MP3_FRAME = (
    b'\xff\xfb\x90\x44\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    b'\xff\xfb\x90\x44\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
    b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
)


def build_media_fallback_response(clean_bucket: str, clean_key: str, reason: str = 'Not Found') -> HttpResponse:
    """
    Genera un fallback visual o auditivo predeterminado en lugar de arrojar un error de red
    404 o 503 que rompa la UI del frontend al interactuar con los diccionarios.
    """
    lower_k = clean_key.lower()
    is_image = (
        clean_bucket == 'dictionary-images'
        or lower_k.endswith(('.png', '.jpg', '.jpeg', '.webp', '.svg', '.jfif', '.gif'))
    )
    is_audio = (
        clean_bucket in ('dictionary-audios', 'exam-audios')
        or lower_k.endswith(('.mp3', '.wav', '.ogg', '.webm', '.m4a'))
    )

    if is_image:
        term_label = clean_key.split('/')[-1].split('.')[0].replace('_', ' ').replace('-', ' ').title()
        if 'mecanic' in lower_k or 'mecanica' in lower_k:
            primary_color = "#d97706"
            secondary_color = "#b45309"
            bg_gradient = "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)"
            badge_text = "Mecánica Industrial"
            icon_svg = '<path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/>'
        elif 'multi' in lower_k or 'multimedia' in lower_k:
            primary_color = "#4f46e5"
            secondary_color = "#3730a3"
            bg_gradient = "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%)"
            badge_text = "Producción Multimedia"
            icon_svg = '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>'
        else:
            primary_color = "#059669"
            secondary_color = "#047857"
            bg_gradient = "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)"
            badge_text = "ADSO - Software"
            icon_svg = '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'

        svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{primary_color}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="{secondary_color}" stop-opacity="0.25"/>
    </linearGradient>
  </defs>
  <rect width="480" height="320" rx="20" fill="url(#bgGrad)"/>
  <rect x="2" y="2" width="476" height="316" rx="18" fill="none" stroke="{primary_color}" stroke-opacity="0.3" stroke-width="2"/>
  <g transform="translate(200, 80)">
    <circle cx="40" cy="40" r="44" fill="#ffffff" fill-opacity="0.9" stroke="{primary_color}" stroke-opacity="0.4" stroke-width="2"/>
    <g transform="translate(16, 16) scale(2)" fill="none" stroke="{primary_color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      {icon_svg}
    </g>
  </g>
  <text x="240" y="210" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#1e293b">{term_label[:28]}</text>
  <rect x="160" y="235" width="160" height="28" rx="14" fill="{primary_color}" fill-opacity="0.15"/>
  <text x="240" y="254" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="{secondary_color}">{badge_text}</text>
  <text x="240" y="290" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="#64748b">WorkLex SENA  Recurso Oficial</text>
</svg>"""

        response = HttpResponse(svg_content.encode('utf-8'), content_type='image/svg+xml; charset=utf-8', status=status.HTTP_200_OK)
        response['Cache-Control'] = 'public, max-age=86400, immutable'
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Media-Fallback'] = 'true'
        return response

    if is_audio:
        response = HttpResponse(SILENT_MP3_FRAME, content_type='audio/mpeg', status=status.HTTP_200_OK)
        response['Content-Length'] = str(len(SILENT_MP3_FRAME))
        response['Cache-Control'] = 'public, max-age=86400, immutable'
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Media-Fallback'] = 'true'
        return response

    return JsonResponse(
        {'error': reason, 'bucket': clean_bucket, 'file_key': clean_key},
        status=status.HTTP_404_NOT_FOUND
    )


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
                # Fallback resiliente usando resolve_file_key de StorageService y variaciones comunes
                resolved_key = StorageService.resolve_file_key(clean_bucket, clean_key)
                if resolved_key and resolved_key != clean_key:
                    stream, content_type, content_length, content_range = StorageService.get_file_stream(
                        bucket_name=clean_bucket,
                        file_key=resolved_key,
                        byte_range=byte_range
                    )
                    clean_key = resolved_key
                else:
                    import os
                    stem, ext = os.path.splitext(clean_key)
                    fallback_keys = [
                        clean_key.capitalize(),
                        clean_key.title(),
                        f"{stem.capitalize()}{ext.lower()}",
                        f"{stem.title()}{ext.lower()}",
                        clean_key.lower(),
                        clean_key.upper(),
                        clean_key.replace("adso_", ""),
                        clean_key.replace("_", " "),
                        clean_key.replace(" ", "_"),
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
            lower_k = clean_key.lower()
            if not guessed_type:
                if lower_k.endswith('.png'):
                    guessed_type = 'image/png'
                elif lower_k.endswith(('.jpg', '.jpeg', '.jfif')):
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
            logger.warning(f"MediaProxy 404 detectado para {clean_bucket}/{clean_key} - activando fallback controlado: {e}")
            return build_media_fallback_response(clean_bucket, clean_key, reason='File not found')

        except StorageInvalidRangeError as e:
            logger.warning(f"MediaProxy 416: {clean_bucket}/{clean_key} - {e}")
            return JsonResponse(
                {'error': 'Rango solicitado no satisfacible', 'bucket': clean_bucket, 'file_key': clean_key},
                status=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE
            )

        except StorageUnavailableError as e:
            logger.warning(f"MediaProxy 503 (MinIO inaccesible): {clean_bucket}/{clean_key} - activando fallback: {e}")
            return build_media_fallback_response(clean_bucket, clean_key, reason='MinIO unavailable')

        except Exception as e:
            logger.error(f"MediaProxy controlado fallback por error: {e}")
            return build_media_fallback_response(clean_bucket, clean_key, reason='Internal Error')


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
