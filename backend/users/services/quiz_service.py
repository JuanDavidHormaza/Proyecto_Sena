import os
import random
import re
import unicodedata
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from ..Models.modelsSENA import TestResult, DigitalDictionary


ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"


def _normalize(value):
    if value is None:
        return ""
    value = str(value).strip()
    if value.lower() in {"none", "null", "nan"}:
        return ""
    return value


def _remove_accents(text: str) -> str:
    text = _normalize(text)
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    return "".join(
        character
        for character in text
        if not unicodedata.combining(character)
    )


def _normalize_key(value: str) -> str:
    value = _normalize(value)
    if not value:
        return ""
    value = _remove_accents(value)
    value = value.lower()
    value = re.sub(r"[\s_-]+", "", value)
    value = re.sub(r"[^a-z0-9]", "", value)
    return value


def _list_dictionary_words(program: str = ""):
    """
    Lee las palabras del diccionario multimedia directamente de la base de
    datos (tabla DigitalDictionary). Cada palabra ya trae sus URLs de
    imagen/audio/video apuntando a MinIO, y su dificultad real (2-9) según
    el diccionario ADSO importado desde Excel.

    Si se pasa `program`, el quiz se adapta a ESE programa: solo usa las
    palabras del diccionario que pertenecen a él (o a "Todos los
    programas", que es contenido genérico compartido). Así, sin importar
    qué programa tenga el estudiante, el quiz siempre usa su propio
    diccionario y nunca el de otro programa.
    """
    queryset = DigitalDictionary.objects.select_related('subject').all()
    if program:
        from django.db.models import Q
        queryset = queryset.filter(
            Q(program__iexact=program) | Q(program__iexact="Todos los programas") | Q(program="")
        )

    words = []
    for doc in queryset:
        words.append({
            "wordId": doc.word_id,
            "definition": doc.definition,
            "synonyms": doc.synonyms,
            "imageUrl": doc.image,
            "audioUrl": doc.audio,
            "videoUrl": doc.video,
            "subjectName": doc.subject.description if doc.subject else "Vocabulary",
            "difficulty": doc.difficulty if doc.difficulty else 2,
        })
    return words


def _get_difficulty_label(difficulty: int) -> str:
    if difficulty <= 4:
        return "Easy"
    if difficulty <= 7:
        return "Medium"
    return "Hard"


# ─── Configuración por nivel (solo A1 → B2, sin C1/C2) ────────────────────────
# La dificultad ("difficulty") viene REAL del diccionario ADSO (columna
# "Difficulty" del Excel, escala 2-9), no aleatoria. Cada nivel MCER cubre
# un tramo de esa escala:
#
#   A1 (2-3): quiz básico -> escritura y opción múltiple con imagen. Sin
#             audio todavía (es el nivel de entrada).
#   A2 (4-5): a partir de aquí se evalúa el modelo MCER COMPLETO: las 4
#             destrezas -> escritura, habla (speaking), escucha (listening)
#             y gramática (grammar) en cada intento.
#   B1 (6-7): mismas 4 destrezas, con palabras más difíciles.
#   B2 (8-9): mismas 4 destrezas, con las palabras más avanzadas del
#             diccionario.
LEVEL_CONFIG = {
    "A1": {"types": ["writing", "multiple"], "difficulty_range": (2, 3), "mcer_full": False},
    "A2": {"types": ["writing", "listening", "grammar", "speaking"], "difficulty_range": (4, 5), "mcer_full": True},
    "B1": {"types": ["writing", "listening", "grammar", "speaking"], "difficulty_range": (6, 7), "mcer_full": True},
    "B2": {"types": ["writing", "listening", "grammar", "speaking"], "difficulty_range": (8, 9), "mcer_full": True},
}

# Orden oficial de niveles admitidos (la escala termina en B2).
LEVEL_ORDER = ["A1", "A2", "B1", "B2"]


# Etiqueta legible de la destreza MCER evaluada por cada tipo de pregunta.
# Esto es lo que se muestra al estudiante (NO la asignatura/Subject, que es
# solo una categoría de contenido y no debe confundirse con la destreza).
SKILL_LABELS = {
    "multiple": "Vocabulario",
    "writing": "Escritura",
    "listening": "Escucha",
    "speaking": "Habla",
    "grammar": "Gramática",
}


def _select_words_for_level(usable_words: list, diff_min: int, diff_max: int, count: int) -> list:
    """
    Selecciona palabras cuya dificultad REAL (del diccionario) cae dentro
    del tramo del nivel. Si no hay suficientes, se completa con las
    palabras más cercanas a ese tramo en vez de fallar.
    """
    in_range = [w for w in usable_words if diff_min <= int(w.get("difficulty", 2)) <= diff_max]
    random.shuffle(in_range)

    if len(in_range) >= count:
        return in_range[:count]

    # Completar con las palabras más cercanas al tramo de dificultad.
    remaining = [w for w in usable_words if w not in in_range]
    remaining.sort(key=lambda w: min(
        abs(int(w.get("difficulty", 2)) - diff_min),
        abs(int(w.get("difficulty", 2)) - diff_max),
    ))
    selected = in_range + remaining
    return selected[:count]


def build_random_quiz_from_dictionary(level: str, count: int = 5, program: str = ""):
    """
    Genera un quiz a partir del diccionario multimedia (base de datos +
    MinIO), usando la dificultad REAL de cada palabra (2-9, según el Excel
    ADSO) para decidir qué palabras entran en cada nivel MCER (A1-B2).

    - A1: quiz básico -> escritura + opción múltiple (sin audio).
    - A2, B1, B2: se evalúan las 4 destrezas del MCER en cada intento:
      escritura (writing), habla (speaking), escucha (listening) y
      gramática (grammar).

    `program` adapta el quiz al programa del estudiante: solo usa palabras
    de SU diccionario (o contenido genérico "Todos los programas"), nunca
    el de otro programa.
    """
    level = level if level in LEVEL_CONFIG else "A1"
    config = LEVEL_CONFIG[level]
    allowed_types = config["types"]
    diff_min, diff_max = config["difficulty_range"]
    mcer_full = config["mcer_full"]

    words = _list_dictionary_words(program=program)
    if not words:
        # Si el programa no tiene diccionario propio, no inventamos
        # contenido de otro programa: se devuelve vacío para que el
        # frontend avise que aún no hay diccionario para ese programa.
        return []

    # Solo palabras con identificador utilizable.
    usable_words = [word for word in words if word.get("wordId")]
    if not usable_words:
        return []

    selected = _select_words_for_level(usable_words, diff_min, diff_max, count)
    if not selected:
        return []

    # Reparte los tipos: en A2/B1/B2 se garantiza que aparezcan las 4
    # destrezas del MCER (escritura, escucha, gramática, habla) siempre
    # que haya al menos 4 preguntas; en A1 solo escritura/opción múltiple.
    if mcer_full:
        type_pool = []
        while len(type_pool) < len(selected):
            type_pool.extend(allowed_types)
        type_pool = type_pool[:len(selected)]
        random.shuffle(type_pool)

        # Garantizar ESCUCHA real: si hay palabras con audio disponible,
        # reasignamos "listening" a una de ellas en vez de dejar que caiga
        # por azar en una palabra sin audio y se pierda la destreza.
        words_with_audio = [i for i, w in enumerate(selected) if w.get("audioUrl")]
        if "listening" in type_pool and words_with_audio:
            listening_slots = [i for i, t in enumerate(type_pool) if t == "listening"]
            for slot in listening_slots:
                if selected[slot].get("audioUrl"):
                    continue
                # Busca un slot con audio para intercambiar el tipo.
                swap_candidates = [i for i in words_with_audio if type_pool[i] != "listening"]
                if swap_candidates:
                    swap_idx = swap_candidates[0]
                    type_pool[slot], type_pool[swap_idx] = type_pool[swap_idx], type_pool[slot]
    else:
        type_pool = [allowed_types[i % len(allowed_types)] for i in range(len(selected))]
        random.shuffle(type_pool)

    questions = []
    for idx, word in enumerate(selected):
        qtype = type_pool[idx]
        word_id = word.get("wordId", "")
        definition = word.get("definition", "")
        image_url = word.get("imageUrl", "")
        audio_url = word.get("audioUrl", "")
        real_difficulty = int(word.get("difficulty", 2))

        # Si el tipo necesita audio pero la palabra no lo tiene, degradamos:
        # listening -> multiple, speaking -> writing (siempre se puede
        # escribir, no siempre se puede escuchar/grabar sin audio de apoyo).
        if qtype == "listening" and not audio_url:
            qtype = "multiple"
        if qtype == "speaking" and not (image_url or definition):
            qtype = "writing"

        question_payload = {
            "id": idx + 1,
            "type": qtype,
            "wordId": word_id,
            "wordText": word_id,
            "difficulty": real_difficulty,
            "level": level,
            # La "categoría" que ve el estudiante es la DESTREZA del MCER
            # que se está evaluando (Escritura/Escucha/Habla/Gramática/
            # Vocabulario), no la asignatura interna de la palabra.
            "category": SKILL_LABELS.get(qtype, "Vocabulario"),
            "imageUrl": image_url,
            # A1 nunca usa audio (nivel de entrada, solo lectura/escritura).
            # En los demás niveles, el audio se envía siempre que la
            # palabra lo tenga, sin importar el tipo de pregunta, para que
            # el estudiante también pueda escucharla como refuerzo.
            "audioUrl": audio_url if level != "A1" else "",
        }

        if qtype == "multiple":
            if image_url:
                question_payload["question"] = "Look at the image and select the correct word"
                question_payload["prompt"] = "Which word matches the image?"
            elif definition:
                question_payload["question"] = f"Which word means: {definition}?"
                question_payload["prompt"] = "Choose the correct word for this definition"
            else:
                question_payload["question"] = f"Select the correct meaning of '{word_id}'"
                question_payload["prompt"] = "Choose the correct answer"
            options, correct_index = _generate_options(word_id, usable_words)
            question_payload["options"] = options
            question_payload["correctAnswer"] = correct_index

        elif qtype == "listening":
            question_payload["question"] = "Listen to the audio and select the correct word"
            question_payload["prompt"] = "Press play, listen carefully, then choose the word you heard"
            options, correct_index = _generate_options(word_id, usable_words)
            question_payload["options"] = options
            question_payload["correctAnswer"] = correct_index

        elif qtype == "grammar":
            # Evalúa gramática en contexto: completar la oración con la
            # forma/palabra correcta dentro de una frase técnica (MCER).
            question_payload["question"] = (
                f"Complete the sentence with the correct word: "
                f"\"In software development, a ____ refers to: {definition}\""
                if definition else
                f"Complete the sentence with the correct technical term related to '{word_id}'."
            )
            question_payload["prompt"] = "Choose the word that grammatically and semantically completes the sentence"
            options, correct_index = _generate_options(word_id, usable_words)
            question_payload["options"] = options
            question_payload["correctAnswer"] = correct_index

        elif qtype == "writing":
            # Se apoya en imagen o definición para dar contexto, y la
            # ortografía debe ser exacta.
            if image_url:
                question_payload["question"] = "Look at the image and write the word in English"
                question_payload["prompt"] = "Type the exact word that matches the image"
            elif definition:
                question_payload["question"] = f"Write the English word that means: {definition}"
                question_payload["prompt"] = "Read the definition and type the correct word"
            else:
                question_payload["question"] = "Write the correct word in English"
                question_payload["prompt"] = "Type the word with correct spelling"

        elif qtype == "speaking":
            if image_url:
                question_payload["question"] = "Look at the image and pronounce the word"
                question_payload["prompt"] = "Say the name of what you see clearly into the microphone"
            else:
                question_payload["question"] = f"Pronounce the word: {word_id}"
                question_payload["prompt"] = f"Say '{word_id}' clearly, pronouncing each syllable"

        print(f"[quiz_service] {level} question [{qtype}] real_diff={real_difficulty}: {word_id}")
        questions.append(question_payload)

    print(f"[quiz_service] generated {len(questions)} questions for level {level} (MCER full: {mcer_full})")
    return questions


def _generate_options(correct_word: str, all_words: list) -> tuple[list, int]:
    options = [correct_word]
    distractors = [
        w.get("wordId", "") for w in all_words
        if w.get("wordId") and w.get("wordId") != correct_word
    ]
    random.shuffle(distractors)
    for distractor in distractors[:3]:
        if distractor and distractor not in options:
            options.append(distractor)
    while len(options) < 4:
        options.append("Unknown")
    random.shuffle(options)
    correct_index = options.index(correct_word)
    return options[:4], correct_index


def evaluate_pronunciation_with_elevenlabs(audio_file_path: str, expected_text: str) -> dict:
    if not ELEVENLABS_API_KEY:
        return {"error": "ElevenLabs API key not configured"}

    try:
        import httpx

        url = f"{ELEVENLABS_BASE_URL}/pronunciation-assessment"
        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
        }

        with open(audio_file_path, "rb") as audio_file:
            files = {
                "audio": (Path(audio_file_path).name, audio_file, "audio/webm"),
            }
            data = {
                "text": expected_text,
                "language": "en",
            }

            response = httpx.post(url, headers=headers, files=files, data=data, timeout=30)
            response.raise_for_status()
            result = response.json()

        return {
            "accuracy": result.get("accuracy", 0),
            "fluency": result.get("fluency", 0),
            "pronunciation_score": result.get("pronunciation_score", 0),
            "transcript": result.get("transcript", ""),
            "words": result.get("words", []),
        }
    except Exception as exc:
        return {"error": str(exc)}


def save_audio_to_supabase(audio_bytes: bytes, filename: str, storage_path: str = "") -> str:
    """
    Guarda una grabación de pronunciación (speaking) en MinIO, bucket
    "student-speaking", organizada por {nivel}/user_{id}/{archivo}.
    (El nombre de la función se conserva por compatibilidad con las vistas
    que ya la invocan; internamente ya no usa Supabase, usa MinIO.)
    """
    try:
        from ..services import media_storage
        return media_storage.upload_speaking_audio(audio_bytes, filename, storage_path)
    except Exception as exc:
        print(f"[pronunciation] Error saving audio: {exc}")
        return ""


def list_student_audios_by_level(user_id: str, level: str = "") -> dict:
    """
    Lista los audios de un estudiante desde MinIO (bucket student-speaking).
    Si se especifica level, filtra por nivel (A1, A2, B1, B2).
    Retorna dict con estructura: { "A1": [...], "A2": [...], "B1": [...], "B2": [...] }
    """
    try:
        from ..services import media_storage

        levels = ["A1", "A2", "B1", "B2"] if not level else [level]
        result = {}

        for lvl in levels:
            prefix = f"{lvl}/user_{user_id}/"
            objects = media_storage.list_objects(media_storage.BUCKET_SPEAKING, prefix=prefix)
            audios = [
                {
                    "filename": obj["object_key"].rsplit("/", 1)[-1],
                    "url": obj["url"],
                    "created_at": obj["last_modified"] or "",
                    "level": lvl,
                }
                for obj in objects
            ]
            result[lvl] = audios

        return result
    except Exception as exc:
        print(f"[list_student_audios] Error: {exc}")
        return {}


@transaction.atomic
def save_test_result_with_answers(user_id: int, payload: dict) -> dict:
    level = payload.get("level", "A1")
    score = payload.get("score", 0)
    correct_answers = payload.get("correct_answers", 0)
    total_questions = payload.get("total_questions", 0)
    answers = payload.get("answers", [])
    duration = payload.get("duration", "00:00")
    level_reached = payload.get("level", "A1")
    completed_levels = payload.get("completed_levels", [level])

    passed_threshold = 80
    # score from frontend is already a percentage (0-100), no need to divide by total_questions
    passed = score >= passed_threshold if total_questions > 0 else False

    result = TestResult.objects.create(
        user_id=user_id,
        level=level,
        score=score,
        total_questions=total_questions,
        correct_answers=correct_answers,
        duration=duration,
        passed=passed,
        threshold=passed_threshold,
        process={
            "userAnswers": answers,
            "completed_levels": completed_levels,
        },
    )

    return {
        "id": result.id,
        "passed": passed,
        "threshold": passed_threshold,
        "score": score,
        "total_questions": total_questions,
        "level_reached": level_reached,
        "completed_levels": completed_levels,
    }


def get_quiz_feedback(score: int, total: int) -> dict:
    if total == 0:
        return {
            "percentage": 0,
            "passed": False,
            "message": "No hay preguntas disponibles.",
            "failed_questions": [],
        }

    percentage = round((score / total) * 100, 1)
    passed = percentage >= 80

    if passed:
        message = f"¡Felicidades! Aprobaste con {percentage}% de aciertos."
    else:
        message = f"No aprobaste. Obtuviste {percentage}% de aciertos. Necesitas al menos 80% para avanzar."

    return {
        "percentage": percentage,
        "passed": passed,
        "message": message,
        "failed_questions": [],
    }