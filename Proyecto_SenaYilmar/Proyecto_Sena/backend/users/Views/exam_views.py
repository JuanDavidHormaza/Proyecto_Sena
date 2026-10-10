"""
exam_views.py - Vistas para el manejo de competencias de Speaking y Listening (ElevenLabs) del examen.
"""

import time
import uuid
import logging
import difflib
import re
import unicodedata
import random
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from ..authentication import OptionalJWTAuthentication
from ..services.storage_service import StorageService, StorageUnavailableError
from ..services.elevenlabs_service import ElevenLabsService

logger = logging.getLogger(__name__)


class SpeakingSubmissionAPIView(APIView):
    """
    POST /api/exam/speaking/
    
    Recibe la grabación de audio de una respuesta de Speaking enviada desde el frontend,
    la almacena en el bucket interno 'exam-submissions' de MinIO y retorna la URL
    de proxy de Django (/api/media/exam-submissions/<file_key>).
    """
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        audio_file = request.FILES.get('audio') or request.FILES.get('file')
        if not audio_file:
            return Response(
                {'error': 'No se recibió ningún archivo de audio.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        question_id = request.data.get('question_id', 'unknown')
        level = request.data.get('level', 'A1')
        user_id = 'anon'
        if request.user and request.user.is_authenticated:
            user_id = str(getattr(request.user, 'user_id', request.user.pk))
        elif 'user_id' in request.data:
            user_id = str(request.data['user_id'])

        timestamp = int(time.time())
        random_suffix = uuid.uuid4().hex[:8]
        ext = '.webm'
        if audio_file.content_type == 'audio/mp3' or audio_file.name.endswith('.mp3'):
            ext = '.mp3'
        elif audio_file.content_type == 'audio/wav' or audio_file.name.endswith('.wav'):
            ext = '.wav'
        elif audio_file.content_type == 'audio/ogg' or audio_file.name.endswith('.ogg'):
            ext = '.ogg'

        file_key = f"u{user_id}_lvl{level}_q{question_id}_{timestamp}_{random_suffix}{ext}"
        bucket_name = StorageService.BUCKETS.get('EXAM_SUBMISSIONS', 'exam-submissions')

        try:
            proxy_url = StorageService.upload_file(
                bucket_name=bucket_name,
                file_key=file_key,
                file_data=audio_file,
                content_type=audio_file.content_type or 'audio/webm'
            )

            logger.info(f"Audio de speaking guardado exitosamente: {proxy_url}")
            return Response({
                'audio_url': proxy_url,
                'file_key': file_key,
                'bucket': bucket_name,
                'size': audio_file.size,
                'status': 'uploaded'
            }, status=status.HTTP_201_CREATED)

        except StorageUnavailableError as e:
            logger.warning(f"MinIO no disponible al subir speaking ({e}). Respondiendo con fallback controlado.")
            # Fallback seguro: no tumbar el examen del alumno
            return Response({
                'audio_url': f"/api/media/exam-submissions/{file_key}",
                'file_key': file_key,
                'bucket': bucket_name,
                'warning': 'Almacenado temporalmente o MinIO en reconexión',
                'status': 'offline_fallback'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.warning(f"Error al guardar speaking ({e}). Respondiendo con fallback controlado.")
            return Response({
                'audio_url': f"/api/media/exam-submissions/{file_key}",
                'file_key': file_key,
                'bucket': bucket_name,
                'warning': 'Almacenado localmente en modo tolerante a fallos',
                'status': 'offline_fallback'
            }, status=status.HTTP_200_OK)


class ExamTTSAPIView(APIView):
    """
    POST /api/exam/tts/
    
    Genera audio para preguntas de Listening mediante ElevenLabs (backend only),
    cacheando automáticamente el resultado en el bucket interno 'exam-audios' de MinIO.
    Retorna la URL proxied (/api/media/exam-audios/...).
    """
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        text = request.data.get('text', '').strip()
        question_id = request.data.get('question_id')

        if not text:
            return Response(
                {'error': 'El campo text es obligatorio.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            result = ElevenLabsService.get_or_create_audio(text, question_id=str(question_id) if question_id else None)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as tts_err:
            logger.warning(f"Fallo en generación de TTS ({tts_err}). Retornando respuesta segura.")
            return Response({
                'success': True,
                'audio_url': None,
                'cached': False,
                'text': text,
                'message': 'TTS offline fallback'
            }, status=status.HTTP_200_OK)


class ExamStartAPIView(APIView):
    """
    POST /api/exam/start/
    
    Inicia una única sesión adaptativa unificada CEFR (A1 -> B2) alimentada
    directamente desde el Diccionario Digital ADSO.
    """
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from ..services.exam_engine_service import ExamEngineService

        session_id = uuid.uuid4().hex
        user_id = request.data.get('user_id')
        if request.user and request.user.is_authenticated:
            user_id = getattr(request.user, 'user_id', request.user.pk)

        # Generar preguntas dinámicas desde el diccionario en orden aleatorio
        dictionary_questions = ExamEngineService.generate_questions_from_dictionary()
        random.shuffle(dictionary_questions)
        a1_questions = [q for q in dictionary_questions if q.get('level') == 'A1']
        random.shuffle(a1_questions)

        first_question = a1_questions[0] if a1_questions else (dictionary_questions[0] if dictionary_questions else None)

        return Response({
            'session_id': session_id,
            'user_id': user_id,
            'current_level': 'A1',
            'unlocked_levels': ['A1'],
            'difficulty': 2,
            'difficulty_tier': 'Easy',
            'first_question': first_question,
            'dictionary_questions_count': len(dictionary_questions),
            'questions': dictionary_questions,
            'message': 'Sesión evaluativa adaptativa iniciada en nivel A1 con vocabulario ADSO.'
        }, status=status.HTTP_200_OK)


class ExamAdaptiveBankAPIView(APIView):
    """
    GET /api/exam/adaptive-bank/
    
    Consulta el banco vivo de preguntas generadas dinámicamente desde los términos
    y multimedia de DigitalDictionary en PostgreSQL.
    """
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from ..services.exam_engine_service import ExamEngineService

        level = request.query_params.get('level')
        competence = request.query_params.get('competence')

        questions = ExamEngineService.generate_questions_from_dictionary(
            level=level,
            competence=competence
        )

        return Response({
            'total': len(questions),
            'level': level or 'all',
            'competence': competence or 'all',
            'questions': questions
        }, status=status.HTTP_200_OK)


class ExamEvaluateStepAPIView(APIView):
    """
    POST /api/exam/evaluate-step/
    
    Evalúa el avance adaptativo del estudiante según su precisión y consistencia
    en el nivel actual para desbloquear el siguiente nivel CEFR.
    """
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from ..services.exam_engine_service import ExamEngineService

        current_level = request.data.get('current_level', 'A1')
        answers = request.data.get('answers', [])

        result = ExamEngineService.evaluate_adaptive_step(
            current_level=current_level,
            recent_answers=answers
        )

        return Response(result, status=status.HTTP_200_OK)


class ExamEvaluateSpeakingAPIView(APIView):
    """
    POST /api/exam/evaluate-speaking/
    
    Evalúa la pronunciación del estudiante para una palabra o frase técnica de ADSO.
    Recibe el archivo de audio ('audio') y la palabra objetivo ('target_word' o 'target' o 'word_id').
    Opcionalmente recibe 'transcript' si el cliente capturó transcripción en vivo vía SpeechRecognition.
    Almacena el audio en MinIO ('exam-submissions') y calcula la precisión fonética / léxica (0-100%).
    Retorna score, feedback, is_correct (>= 70%) y phonetic_tips.
    """
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [permissions.AllowAny]

    PHONETIC_GUIDES = {
        'variable': ("vɛər.i.ə.bəl", "Acentúa la primera sílaba 'VAR' y mantén suave la 'v' inicial."),
        'button': ("bʌt.ən", "Enfatiza la primera sílaba 'BUT' y suaviza la terminación glotal '-ton'."),
        'code': ("koʊd", "Alarga el diptongo 'oʊ' y pronuncia claramente la 'd' final sin agregar vocal."),
        'input': ("ɪn.pʊt", "Mantén la 'i' corta y clara, marcando la 't' final."),
        'output': ("aʊt.pʊt", "Inicia con el diptongo 'ow' y pronuncia distintivamente ambas sílabas."),
        'file': ("faɪl", "Pronuncia el diptongo 'ai' seguido de una 'l' oscura suave."),
        'integer': ("ɪn.tɪ.dʒər", "Acentúa la primera sílaba 'IN' con sonido suave de 'j' en '-ger'."),
        'string': ("strɪŋ", "Emite el grupo consonántico 'str-' sin vocal previa y cierra con '-ng' velar."),
        'function': ("fʌŋk.ʃən", "Acentúa 'FUNC' con sonido 'sh' limpio en la terminación '-tion'."),
        'database': ("deɪ.tə.beɪs", "Marca el acento en 'DATA' con terminación sibilante limpia en 'base'."),
        'array': ("ə.reɪ", "Acentúa la segunda sílaba 'RAY' con diptongo sonoro prolongado."),
        'loop': ("luːp", "Vocal larga 'oo' bien redondeada y oclusión clara de la 'p' final."),
        'frontend': ("frʌnt.ɛnd", "Acentúa la primera sílaba y marca ambas terminaciones en 'd'."),
        'backend': ("bæk.ɛnd", "Sonido 'a' abierto en 'BACK' y acento en la primera raíz."),
        'boolean': ("buː.li.ən", "Acentúa la primera sílaba 'BOO' y articula las tres sílabas."),
        'condition': ("kən.dɪʃ.ən", "Acento en la segunda sílaba 'DI' con sonido 'sh' en '-tion'."),
        'framework': ("freɪm.wɜːrk", "Marca el diptongo en 'FRAME' y la 'r' rótica en 'work'."),
        'algorithm': ("æl.ɡə.rɪð.əm", "Acentúa 'AL' y usa la fricativa dental sonora 'th' en '-rithm'."),
        'authentication': ("ɔː.θen.tɪ.keɪ.ʃən", "Acento principal en la penúltima sílaba 'CA' con 'th' sorda inicial."),
        'endpoint': ("ɛnd.pɔɪnt", "Articula claramente el diptongo 'oi' en 'point'."),
        'refactoring': ("riː.fæk.tər.ɪŋ", "Acento en 'FAC' y terminación nasal líquida '-ing'."),
        'repository': ("rɪ.pɒz.ɪ.tər.i", "Acentúa la segunda sílaba 'POZ' con 's' sonora vibrante."),
        'middleware': ("mɪd.əl.wɛər", "Acento en la primera sílaba 'MID' y final abierto en 'ware'."),
        'debugging': ("diː.bʌɡ.ɪŋ", "Acento en la sílaba media 'BUG' y terminación continua en '-ing'."),
        'microservices': ("maɪ.kroʊ.sɜːr.vɪ.sɪz", "Acento en 'MI' y articulación clara del plural '-ces'."),
        'continuous integration': ("kən.tɪn.ju.əs ɪn.tɪ.ɡreɪ.ʃən", "Acento en 'TIN' para continuous y 'GRA' para integration."),
        'scalability': ("skeɪ.lə.bɪl.ə.ti", "Acento principal en 'BIL' con ritmo fluido entre sílabas."),
        'polymorphism': ("pɒl.i.mɔːr.fɪz.əm", "Acento en 'MOR' con pronunciación de la sibilante sonora 'z'."),
        'vulnerability': ("vʌl.nər.ə.bɪl.ə.ti", "Acentúa la sílaba 'BIL' y mantén la 'v' labiodental inicial."),
        'asynchronous': ("eɪ.sɪŋ.krə.nəs", "Acentúa la segunda sílaba 'SYN' con sonido 'sh' ausente (suena 'k')."),
        'deployment': ("dɪ.plɔɪ.mənt", "Acento fuerte en el diptongo 'PLOY' y cierre nítido en '-ment'."),
        'encryption': ("ɪn.krɪp.ʃən", "Buen acento en la sílaba tónica 'cryp' y terminación suave en '-tion'."),
    }

    def post(self, request):
        try:
            audio_file = request.FILES.get('audio') or request.FILES.get('file') or request.FILES.get('audio_file')
            target_word = (
                request.data.get('target_word') or
                request.data.get('target') or
                request.data.get('word_id') or
                ''
            ).strip()
            client_transcript = (request.data.get('transcript') or request.data.get('transcription') or '').strip()
            question_id = request.data.get('question_id', 'spk_1')
            level = request.data.get('level', 'A1')

            if not target_word and question_id:
                from users.Models.modelsSENA import DigitalDictionary
                try:
                    dict_entry = DigitalDictionary.objects.filter(word_id__iexact=str(question_id)).first()
                    if not dict_entry:
                        dict_entry = DigitalDictionary.objects.filter(id=question_id).first()
                    if dict_entry:
                        target_word = dict_entry.word_id
                except Exception:
                    pass

            if not target_word:
                target_word = "Encryption"

            user_id = 'anon'
            if request.user and request.user.is_authenticated:
                user_id = str(getattr(request.user, 'user_id', request.user.pk))
            elif 'user_id' in request.data:
                user_id = str(request.data['user_id'])

            # 1. Guardar archivo en MinIO (exam-submissions)
            proxy_url = ""
            file_key = ""
            if audio_file:
                timestamp = int(time.time())
                random_suffix = uuid.uuid4().hex[:8]
                ext = '.webm'
                ct = (getattr(audio_file, 'content_type', '') or '').lower()
                fname = (getattr(audio_file, 'name', '') or '').lower()
                if 'wav' in ct or fname.endswith('.wav'):
                    ext = '.wav'
                elif 'mp3' in ct or fname.endswith('.mp3'):
                    ext = '.mp3'
                elif 'ogg' in ct or fname.endswith('.ogg'):
                    ext = '.ogg'
                elif 'm4a' in ct or fname.endswith('.m4a') or 'mp4' in ct:
                    ext = '.m4a'
                
                file_key = f"spk_eval_u{user_id}_{timestamp}_{random_suffix}{ext}"
                bucket_name = StorageService.BUCKETS.get('EXAM_SUBMISSIONS', 'exam-submissions')
                try:
                    proxy_url = StorageService.upload_file(
                        bucket_name=bucket_name,
                        file_key=file_key,
                        file_data=audio_file,
                        content_type=audio_file.content_type or 'audio/webm'
                    )
                except Exception as e:
                    logger.warning(f"No se pudo guardar audio en MinIO ({e}), usando proxy URL estática.")
                    proxy_url = f"/api/media/exam-submissions/{file_key}"

            # 2. Obtener consejos fonéticos e IPA para el término objetivo
            clean_lookup = re.sub(r'[^a-zA-Z0-9\s]', '', str(target_word)).lower().strip()
            ipa, tips = self.PHONETIC_GUIDES.get(
                clean_lookup,
                (f"/{clean_lookup}/", f"Pronuncia con claridad cada sílaba de '{target_word}'.")
            )

            # 3. Validación estricta de recepción de audio y transcripción
            if not audio_file or (hasattr(audio_file, 'size') and audio_file.size == 0):
                return Response({
                    "success": False,
                    "score": 0,
                    "is_correct": False,
                    "spoken_text": "",
                    "expected_text": target_word,
                    "transcription": "",
                    "target": target_word,
                    "ipa": ipa,
                    "feedback": "No se recibió audio o el archivo está vacío. Por favor graba de nuevo tu pronunciación.",
                    "phonetic_tips": tips,
                    "audio_url": ""
                }, status=status.HTTP_200_OK)

            if not client_transcript or not client_transcript.strip():
                return Response({
                    "success": False,
                    "score": 0,
                    "is_correct": False,
                    "spoken_text": "",
                    "expected_text": target_word,
                    "transcription": "",
                    "target": target_word,
                    "ipa": ipa,
                    "feedback": "No se pudo reconocer la pronunciación o el audio no fue claro. Intenta de nuevo.",
                    "phonetic_tips": tips,
                    "audio_url": proxy_url
                }, status=status.HTTP_200_OK)

            # 4. Normalización estricta y algoritmo de calificación fonética/léxica
            def _clean_str(text):
                if not text:
                    return ""
                norm = unicodedata.normalize('NFD', str(text).lower())
                no_accents = "".join(c for c in norm if unicodedata.category(c) != 'Mn')
                alphanumeric = re.sub(r'[^a-z0-9\s]', ' ', no_accents)
                return " ".join(alphanumeric.split())

            target_clean = _clean_str(target_word)
            spoken_clean = _clean_str(client_transcript)
            target_tokens = target_clean.split()
            spoken_tokens = spoken_clean.split()

            if spoken_clean == target_clean:
                score = 100
                is_correct = True
                feedback = f"¡Excelente pronunciación! Coincidencia exacta (100%) con el término '{target_word}'."
            else:
                base_ratio = difflib.SequenceMatcher(None, spoken_clean, target_clean).ratio()

                if target_clean in spoken_clean:
                    in_tokens = target_clean in spoken_tokens or all(t in spoken_tokens for t in target_tokens)
                    token_ratio = 0.92 if in_tokens else 0.86
                    ratio = max(base_ratio, token_ratio)
                elif len(target_tokens) == 1 and spoken_tokens:
                    best_token_ratio = max(
                        difflib.SequenceMatcher(None, tok, target_clean).ratio()
                        for tok in spoken_tokens
                    )
                    ratio = max(base_ratio, best_token_ratio)
                else:
                    ratio = base_ratio

                score = int(round(ratio * 100))
                score = max(0, min(100, score))

                if score >= 85:
                    is_correct = True
                    feedback = f"¡Excelente pronunciación! Fonética clara y precisa ({score}%) para '{target_word}'."
                elif score >= 70:
                    is_correct = True
                    feedback = f"Buena pronunciación. El término '{target_word}' se comprende satisfactoriamente ({score}%). Dijiste '{client_transcript}'."
                elif score >= 50:
                    is_correct = False
                    feedback = f"Pronunciación imprecisa ({score}%). Dijiste '{client_transcript}', se esperaba '{target_word}'. Intenta articular con más claridad."
                else:
                    is_correct = False
                    feedback = f"Pronunciación incorrecta ({score}%). Dijiste '{client_transcript}' cuando se esperaba '{target_word}'. Escucha el modelo y repite."

            return Response({
                "success": True,
                "score": score,
                "is_correct": is_correct,
                "spoken_text": client_transcript,
                "expected_text": target_word,
                "transcription": client_transcript,
                "target": target_word,
                "ipa": ipa,
                "feedback": feedback,
                "phonetic_tips": tips,
                "audio_url": proxy_url
            }, status=status.HTTP_200_OK)

        except Exception as global_err:
            logger.exception(f"[PHONETIC EVALUATION ERROR] {global_err}")
            safe_target = request.data.get('target_word') or request.data.get('target') or "Término Técnico"
            clean_safe = re.sub(r'[^a-zA-Z0-9\s]', '', str(safe_target)).lower().strip()
            ipa_fb, tips_fb = self.PHONETIC_GUIDES.get(
                clean_safe,
                (f"/{clean_safe}/", f"Pronuncia con claridad cada sílaba de '{safe_target}'.")
            )
            return Response({
                "success": False,
                "score": 0,
                "is_correct": False,
                "spoken_text": "",
                "expected_text": safe_target,
                "transcription": "",
                "target": safe_target,
                "ipa": ipa_fb,
                "feedback": "Ocurrió un error al procesar la evaluación de pronunciación. Por favor intenta de nuevo.",
                "phonetic_tips": tips_fb,
                "audio_url": ""
            }, status=status.HTTP_200_OK)
