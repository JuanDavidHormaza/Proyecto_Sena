"""
ElevenLabsService - Servicio de síntesis de voz con caché automático en MinIO.

Garantiza:
1. Zero-leak: Las credenciales de ElevenLabs nunca se envían al frontend.
2. Caché persistente en MinIO bucket 'exam-audios' para evitar llamadas duplicadas y costos de API.
3. Resiliencia: si la API de ElevenLabs falla o no hay API key configurada, retorna None
   para que el frontend use fallback (Web Speech API).
"""

import hashlib
import logging
import requests
from django.conf import settings
from .storage_service import StorageService, StorageUnavailableError

logger = logging.getLogger(__name__)


class ElevenLabsService:
    BUCKET_NAME = StorageService.BUCKETS.get('EXAM_AUDIOS', 'exam-audios')

    @classmethod
    def get_cache_key(cls, text: str, question_id: str = None) -> str:
        """Genera un nombre de archivo único determinista basado en el contenido del texto."""
        normalized = (text or '').strip().lower()
        hash_digest = hashlib.sha256(normalized.encode('utf-8')).hexdigest()[:16]
        if question_id:
            return f"tts_q{question_id}_{hash_digest}.mp3"
        return f"tts_{hash_digest}.mp3"

    @classmethod
    def get_or_create_audio(cls, text: str, question_id: str = None) -> dict:
        """
        Retorna la URL del audio proxied (/api/media/exam-audios/...).
        Si ya existe en MinIO, lo devuelve directamente sin llamar a ElevenLabs.
        Si no existe, invoca la API de ElevenLabs, lo guarda en MinIO y retorna la URL.
        """
        clean_text = (text or '').strip()
        if not clean_text:
            return {'audio_url': None, 'cached': False, 'error': 'Texto vacío'}

        file_key = cls.get_cache_key(clean_text, question_id)

        # 1. Verificar si ya está en caché en MinIO
        try:
            if StorageService.file_exists(cls.BUCKET_NAME, file_key):
                logger.info(f"Audio encontrado en caché de MinIO: {file_key}")
                return {
                    'audio_url': StorageService.get_proxy_url(cls.BUCKET_NAME, file_key),
                    'file_key': file_key,
                    'cached': True,
                }
        except Exception as e:
            logger.warning(f"No se pudo verificar caché en MinIO para {file_key}: {e}")

        # 2. Si no está en caché, generar con ElevenLabs
        api_key = getattr(settings, 'ELEVENLABS_API_KEY', '').strip()
        if not api_key:
            logger.info("ELEVENLABS_API_KEY no configurada. Notificando fallback a frontend.")
            return {
                'audio_url': None,
                'cached': False,
                'fallback': 'browser_speech_synthesis',
                'message': 'API Key no configurada, usar síntesis local en cliente'
            }

        voice_id = getattr(settings, 'ELEVENLABS_VOICE_ID', '21m00Tcm4TlvDq8ikWAM') # Rachel
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": api_key,
        }

        payload = {
            "text": clean_text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }

        try:
            logger.info(f"Generando audio con ElevenLabs para: '{clean_text[:40]}...'")
            response = requests.post(url, json=payload, headers=headers, timeout=15)

            if response.status_code == 200:
                audio_bytes = response.content
                # Guardar en MinIO
                proxy_url = StorageService.upload_file(
                    bucket_name=cls.BUCKET_NAME,
                    file_key=file_key,
                    file_data=audio_bytes,
                    content_type='audio/mpeg'
                )
                logger.info(f"Audio cacheado en MinIO: {proxy_url}")
                return {
                    'audio_url': proxy_url,
                    'file_key': file_key,
                    'cached': False,
                }
            else:
                logger.error(f"Error de ElevenLabs API (HTTP {response.status_code}): {response.text}")
                return {
                    'audio_url': None,
                    'cached': False,
                    'fallback': 'browser_speech_synthesis',
                    'error': f"ElevenLabs API error: {response.status_code}"
                }

        except Exception as e:
            logger.error(f"Excepción al conectar con ElevenLabs: {e}")
            return {
                'audio_url': None,
                'cached': False,
                'fallback': 'browser_speech_synthesis',
                'error': str(e)
            }
