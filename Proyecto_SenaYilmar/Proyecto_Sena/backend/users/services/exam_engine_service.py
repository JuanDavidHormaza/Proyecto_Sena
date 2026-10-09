"""
ExamEngineService - Motor adaptativo unificado CEFR (A1-B2) alimentado por el Diccionario ADSO.

Principios:
1. El Diccionario Digital es la fuente viva de vocabulario, audios e imágenes para el examen.
2. Generación dinámica de preguntas para las 5 competencias:
   - Listening (audios de pronunciación MinIO / ElevenLabs)
   - Reading (contextos técnicos ADSO y deducción de definiciones)
   - Grammar (sintaxis y uso de conceptos de software)
   - Writing (evaluación abierta con rúbrica semántica de palabras clave)
   - Speaking (grabación oral evaluada con MediaRecorder -> MinIO exam-submissions)
3. Progresión continua adaptativa: A1 -> A2 -> B1 -> B2 sin particiones ni recargas.
4. Identificación de términos ADSO dominados y términos recomendados para reforzar.
"""

import random
import logging
from typing import Dict, List, Optional, Any
from users.Models.modelsSENA import DigitalDictionary, Subject

logger = logging.getLogger(__name__)

CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2']
COMPETENCIES = ['Reading', 'Listening', 'Writing', 'Speaking']

LEVEL_PASS_THRESHOLDS = {
    'A1': 60,
    'A2': 60,
    'B1': 65,
    'B2': 70,
}


def get_difficulty_tier(difficulty: int) -> str:
    if difficulty <= 3:
        return 'Easy'
    if difficulty <= 6:
        return 'Medium'
    return 'Hard'


class ExamEngineService:

    @classmethod
    def get_terms_by_level(cls, level: str) -> List[DigitalDictionary]:
        """Obtiene los términos de DigitalDictionary para el nivel dado."""
        return list(DigitalDictionary.objects.filter(level=level).select_related('subject'))

    @classmethod
    def generate_questions_from_dictionary(
        cls,
        level: Optional[str] = None,
        competence: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Construye preguntas dinámicas a partir de los términos activos del Diccionario Digital.
        """
        queryset = DigitalDictionary.objects.select_related('subject').all()
        if level and level != 'all':
            queryset = queryset.filter(level=level)
        if competence and competence != 'all':
            queryset = queryset.filter(competence=competence)

        terms = list(queryset)
        if not terms:
            logger.warning(f"No hay términos en el diccionario para nivel '{level}' / competencia '{competence}'")
            return []

        all_terms_by_level: Dict[str, List[DigitalDictionary]] = {}
        for lvl in CEFR_LEVELS:
            all_terms_by_level[lvl] = list(DigitalDictionary.objects.filter(level=lvl))

        questions: List[Dict[str, Any]] = []

        for term in terms:
            term_lvl = getattr(term, 'level', 'A1') or 'A1'
            comp = getattr(term, 'competence', 'Reading') or 'Reading'
            if comp == 'Grammar':
                comp = 'Reading'
            level_pool = [t for t in all_terms_by_level.get(term_lvl, []) if t.id != term.id]

            # Distractores del mismo nivel si es posible
            distractor_names = [t.word_id for t in level_pool[:3]]
            while len(distractor_names) < 3:
                distractor_names.append(f"Concept_{len(distractor_names) + 1}")

            # Dificultad base según nivel
            base_diff = 2 if term_lvl == 'A1' else (4 if term_lvl == 'A2' else (6 if term_lvl == 'B1' else 8))

            # Pregunta según la competencia asignada
            q_obj = cls._build_question_for_competence(
                term=term,
                competence=comp,
                distractors=distractor_names,
                difficulty=base_diff
            )
            if q_obj:
                questions.append(q_obj)

        return questions

    @classmethod
    def _build_question_for_competence(
        cls,
        term: DigitalDictionary,
        competence: str,
        distractors: List[str],
        difficulty: int
    ) -> Optional[Dict[str, Any]]:
        term_lvl = getattr(term, 'level', 'A1') or 'A1'
        image_url = f"/api/media/dictionary-images/{term.image}" if term.image else None
        audio_url = f"/api/media/dictionary-audios/{term.audio}" if term.audio else None

        if competence == 'Listening':
            options = [term.word_id] + distractors[:3]
            random.shuffle(options)
            return {
                'id': term.id,
                'uniqueKey': f"DICT-LST-{term.id}",
                'level': term_lvl,
                'competency': 'Listening',
                'type': 'listening',
                'question': "¿Qué término técnico acabas de escuchar?",
                'prompt': None,
                'audio': audio_url,
                'options': options,
                'correctAnswer': options.index(term.word_id),
                'difficulty': difficulty,
                'difficultyTier': get_difficulty_tier(difficulty),
                'category': f"ADSO Listening",
                'wordId': term.word_id,
                'definition': term.definition,
                'image': None,
            }

        if competence == 'Reading':
            options = [term.word_id] + distractors[:3]
            random.shuffle(options)
            return {
                'id': term.id,
                'uniqueKey': f"DICT-READ-{term.id}",
                'level': term_lvl,
                'competency': 'Reading',
                'type': 'multiple',
                'question': f"Lee el siguiente contexto técnico de ADSO e identifica el concepto correspondiente:\n\n\"{term.definition}\"",
                'prompt': None,
                'options': options,
                'correctAnswer': options.index(term.word_id),
                'difficulty': difficulty,
                'difficultyTier': get_difficulty_tier(difficulty),
                'category': f"ADSO Reading",
                'wordId': term.word_id,
                'definition': term.definition,
                'image': None,
            }

        elif competence == 'Grammar':
            options = [term.word_id] + distractors[:3]
            random.shuffle(options)
            return {
                'id': term.id,
                'uniqueKey': f"DICT-READ-{term.id}",
                'level': term_lvl,
                'competency': 'Reading',
                'type': 'multiple',
                'question': f"Completa la regla técnica con el término adecuado según el estándar ADSO:\n\n'En desarrollo de software, la entidad que representa \"{term.definition}\" se denomina _____.'",
                'prompt': None,
                'options': options,
                'correctAnswer': options.index(term.word_id),
                'difficulty': difficulty,
                'difficultyTier': get_difficulty_tier(difficulty),
                'category': f"ADSO Reading",
                'wordId': term.word_id,
                'definition': term.definition,
                'image': None,
            }

        elif competence == 'Writing':
            keywords = [term.word_id.lower()]
            if term.synonyms:
                keywords.extend([s.strip().lower() for s in term.synonyms.split(',') if s.strip()])

            return {
                'id': term.id,
                'uniqueKey': f"DICT-WRIT-{term.id}",
                'level': term_lvl,
                'competency': 'Writing',
                'type': 'writing',
                'question': "Escribe en inglés el término técnico correspondiente a la siguiente definición:",
                'prompt': f"\"{term.definition}\"",
                'difficulty': difficulty,
                'difficultyTier': get_difficulty_tier(difficulty),
                'category': f"ADSO Writing",
                'wordId': term.word_id,
                'definition': term.definition,
                'rubric': {
                    'minWords': 1,
                    'keywords': keywords,
                },
                'image': None,
            }

        elif competence == 'Speaking':
            return {
                'id': term.id,
                'uniqueKey': f"DICT-SPK-{term.id}",
                'level': term_lvl,
                'competency': 'Speaking',
                'type': 'speaking',
                'question': f"Pronuncia claramente en inglés el término técnico objetivo:",
                'prompt': f"\"{term.word_id}\" — {term.definition}",
                'audio': audio_url,
                'difficulty': difficulty,
                'difficultyTier': get_difficulty_tier(difficulty),
                'category': f"ADSO Speaking",
                'wordId': term.word_id,
                'definition': term.definition,
                'image': image_url,
            }

        return None

    @classmethod
    def evaluate_adaptive_step(
        cls,
        current_level: str,
        recent_answers: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Evalúa si el estudiante consolida la competencia en el nivel actual para
        desbloquear el siguiente nivel CEFR de manera fluida.
        """
        if current_level not in CEFR_LEVELS:
            current_level = 'A1'

        level_answers = [a for a in recent_answers if a.get('level') == current_level]
        total_in_level = len(level_answers)
        correct_in_level = sum(1 for a in level_answers if a.get('is_correct'))
        percentage = round((correct_in_level / total_in_level) * 100) if total_in_level > 0 else 0

        threshold = LEVEL_PASS_THRESHOLDS.get(current_level, 60)
        curr_idx = CEFR_LEVELS.index(current_level)

        # Regla: mínimo 4 preguntas respondidas en el nivel para evaluar avance
        if total_in_level >= 4 and percentage >= threshold:
            if curr_idx < len(CEFR_LEVELS) - 1:
                next_level = CEFR_LEVELS[curr_idx + 1]
                return {
                    'action': 'level_up',
                    'next_level': next_level,
                    'message': f"¡Felicitaciones! Has demostrado dominio en {current_level} ({percentage}%). Desbloqueando nivel {next_level}.",
                    'percentage': percentage,
                    'passed': True
                }
            else:
                return {
                    'action': 'exam_completed',
                    'next_level': current_level,
                    'message': f"¡Examen completado exitosamente en el nivel más alto ({current_level})!",
                    'percentage': percentage,
                    'passed': True
                }

        return {
            'action': 'next_question',
            'next_level': current_level,
            'message': f"Continuando evaluación en nivel {current_level} ({percentage}%).",
            'percentage': percentage,
            'passed': False
        }
