import random
import logging
from typing import List, Dict, Optional, Any
from django.db.models import Q
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
    """
    Motor de Evaluación Lingüística CEFR Adaptativo (A1-B2).
    Genera bancos de preguntas dinámicos y balanceados según el programa formativo
    (ADSO, Mecánica Industrial, Producción Multimedia).
    """

    @staticmethod
    def _strip_key(val: Any) -> str:
        """Limpia una clave de texto o referencia multimedia."""
        return val.strip() if isinstance(val, str) else (str(val) if val is not None else "")

    @classmethod
    def get_terms_by_level(cls, level: str, program: Optional[str] = None) -> List[Any]:
        """
        Obtiene los términos activos filtrados por nivel CEFR y programa de formación.
        Garantiza un solo retorno limpio y orden aleatorio.
        """
        qs = DigitalDictionary.objects.filter(level__iexact=level).select_related('subject')
        if program and program != 'all':
            qs = qs.filter(
                Q(program__icontains=program) |
                Q(subject__description__icontains=program) |
                Q(subject__subject_id__icontains=program)
            )
        return list(qs.order_by('?'))

    @classmethod
    def generate_questions_from_dictionary(
        cls,
        program: Optional[str] = None,
        level: Optional[str] = None,
        competence: Optional[str] = None,
        limit_per_level: int = 5,
        total_questions: int = 15
    ) -> List[Dict[str, Any]]:
        """
        Construye un banco balanceado de preguntas de opción múltiple a partir de los
        términos del diccionario asociados al programa formativo del aprendiz.
        """
        # Tolerancia a llamada posicional si se pasa el nivel como primer parámetro
        if program in CEFR_LEVELS and level is None:
            level = program
            program = None

        qs = DigitalDictionary.objects.select_related('subject')

        # Filtrar por programa de formación si se proporciona
        if program and program != 'all':
            qs = qs.filter(
                Q(program__icontains=program) |
                Q(subject__description__icontains=program) |
                Q(subject__subject_id__icontains=program)
            )

        if competence and competence != 'all':
            qs = qs.filter(competence__iexact=competence)

        # Si se especifica un único nivel
        if level and level != 'all':
            terms = list(qs.filter(level__iexact=level).order_by('?')[:total_questions])
        else:
            # Distribución balanceada a lo largo del marco CEFR
            terms = []
            for lvl in CEFR_LEVELS:
                lvl_pool = list(qs.filter(level__iexact=lvl).order_by('?')[:limit_per_level])
                terms.extend(lvl_pool)
            random.shuffle(terms)
            terms = terms[:total_questions]

        # Si el filtro fue demasiado restrictivo y no arrojó términos, recurrir al catálogo general
        if not terms:
            logger.warning(
                "No se encontraron términos para programa '%s', nivel '%s'. Usando catálogo general.",
                program,
                level
            )
            fallback_qs = DigitalDictionary.objects.select_related('subject')
            if level and level != 'all':
                terms = list(fallback_qs.filter(level__iexact=level).order_by('?')[:total_questions])
            else:
                for lvl in CEFR_LEVELS:
                    lvl_pool = list(fallback_qs.filter(level__iexact=lvl).order_by('?')[:limit_per_level])
                    terms.extend(lvl_pool)
                random.shuffle(terms)
                terms = terms[:total_questions]

        questions: List[Dict[str, Any]] = []
        for term in terms:
            spanish_meaning = (
                getattr(term, 'spanish_translation', None)
                or getattr(term, 'meaning', None)
                or getattr(term, 'word_id', '')
            )
            term_word = getattr(term, 'word_id', None) or getattr(term, 'word', '')
            term_def = getattr(term, 'definition', '') or ''
            term_lvl = getattr(term, 'level', 'A1') or 'A1'
            comp = getattr(term, 'competence', None) or getattr(term, 'skill', 'Reading')

            # Extraer 3 distractores del mismo programa o catálogo general
            distractor_qs = (
                DigitalDictionary.objects.exclude(id=term.id)
                .filter(Q(program=term.program) | Q(level=term.level))
            )
            distractor_texts = list(
                distractor_qs.exclude(spanish_translation__isnull=True)
                .exclude(spanish_translation='')
                .order_by('?')
                .values_list('spanish_translation', flat=True)[:6]
            )

            # Evitar distractores duplicados o idénticos a la respuesta correcta
            clean_meaning = str(spanish_meaning).strip().lower()
            distractors = [
                d.strip() for d in distractor_texts
                if d and d.strip().lower() != clean_meaning
            ][:3]

            # Si faltan distractores traducidos, completar con vocabulario en inglés
            if len(distractors) < 3:
                alt_words = list(
                    DigitalDictionary.objects.exclude(id=term.id)
                    .order_by('?')
                    .values_list('word_id', flat=True)[:6]
                )
                for w in alt_words:
                    if w and w not in distractors and w.strip().lower() != clean_meaning:
                        distractors.append(w)
                    if len(distractors) >= 3:
                        break

            # Si faltan distractores, completar con valores genéricos legibles
            while len(distractors) < 3:
                distractors.append(f"Opción alternativa {len(distractors) + 1}")

            options = distractors + [spanish_meaning]
            random.shuffle(options)
            correct_index = options.index(spanish_meaning)

            diff_val = 2 if term_lvl == 'A1' else (4 if term_lvl == 'A2' else (6 if term_lvl == 'B1' else 8))
            audio_url = f"/api/media/dictionary-audios/{term.audio}" if getattr(term, 'audio', None) else None
            image_url = f"/api/media/dictionary-images/{term.image}" if getattr(term, 'image', None) else None

            questions.append({
                'id': term.id,
                'word': term_word,
                'wordId': term_word,
                'definition': term_def,
                'level': term_lvl,
                'competence': comp,
                'competency': 'Reading' if comp == 'Grammar' else comp,
                'type': 'multiple',
                'question': f"¿Cuál es el significado o traducción correcta para '{term_word}'?\n\n\"{term_def}\"",
                'prompt': term_def,
                'options': options,
                'correctAnswer': correct_index,
                'correct_answer': spanish_meaning,
                'difficulty': diff_val,
                'difficultyTier': get_difficulty_tier(diff_val),
                'category': f"{getattr(term, 'program', 'Técnico') or 'Técnico'} {term_lvl}",
                'audio': audio_url,
                'image': image_url,
                'uniqueKey': f"DICT-{term_lvl}-{term.id}",
                'isDictionaryTerm': True,
            })

        return questions

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
