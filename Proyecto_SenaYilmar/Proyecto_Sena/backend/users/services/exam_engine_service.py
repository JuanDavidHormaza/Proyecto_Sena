# backend/users/services/exam_engine_service.py
import random
import logging
from typing import List, Dict, Optional, Any
from django.db.models import Q
from users.Models.modelsSENA import DigitalDictionary, Subject
from users.dictionary_programs import program_q, canonical_program_key, PROGRAM_NAMES, PROGRAM_ADSO, PROGRAM_MECANICA, PROGRAM_MULTIMEDIA

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


# ============================================================================
# BANCOS PEDAGÓGICOS OFICIALES DE WRITING / GRAMMAR POR PROGRAMA FORMATIVO
# 100% AISLADOS POR NÚCLEO TÉCNICO:
#   Tipo A: Sintaxis (Sentence Ordering)
#   Tipo B: Morfología y Uso en Contexto (Collocations & Fill-in-the-blank)
#   Tipo C: Reemplazo por Sinónimo en Contexto
# ============================================================================

PROGRAM_WRITING_EXERCISES: Dict[str, List[Dict[str, Any]]] = {
    'ADSO': [
        # Tipo A - Sintaxis (Sentence Ordering)
        {
            'type_category': 'Tipo A - Sintaxis',
            'level': 'A2',
            'question': "Order the sentence components into a grammatically correct structure:",
            'prompt': "the / validates / middleware / token / authentication / before / request / the",
            'options': [
                "The middleware validates the authentication token before the request.",
                "The authentication validates the request middleware before token the.",
                "Before validates the middleware request token the authentication.",
                "The token middleware before the request authentication validates."
            ],
            'correct_answer': "The middleware validates the authentication token before the request.",
            'difficulty': 4,
            'word': 'Middleware',
        },
        {
            'type_category': 'Tipo A - Sintaxis',
            'level': 'B1',
            'question': "Order the sentence components into a grammatically correct structure:",
            'prompt': "database / the / relational / stores / records / user / table / in / a",
            'options': [
                "The relational database stores user records in a table.",
                "In a table relational stores the database user records.",
                "Stores records database user in the relational a table.",
                "The user table database stores in a relational records."
            ],
            'correct_answer': "The relational database stores user records in a table.",
            'difficulty': 5,
            'word': 'Database',
        },
        {
            'type_category': 'Tipo A - Sintaxis',
            'level': 'B2',
            'question': "Order the sentence components into a grammatically correct structure:",
            'prompt': "engineers / deployed / microservices / the / to / cluster / Kubernetes / the",
            'options': [
                "The engineers deployed the microservices to the Kubernetes cluster.",
                "Deployed the engineers to Kubernetes cluster the microservices the.",
                "The microservices deployed cluster Kubernetes to the engineers.",
                "Kubernetes to the cluster deployed microservices the engineers."
            ],
            'correct_answer': "The engineers deployed the microservices to the Kubernetes cluster.",
            'difficulty': 8,
            'word': 'Microservices',
        },
        # Tipo B - Morfología y Uso en Contexto
        {
            'type_category': 'Tipo B - Morfología y Contexto',
            'level': 'A2',
            'question': "Complete the sentence with the correct grammatical form or collocation:",
            'prompt': "Before pushing code to production, software engineers must _____ unit tests to ensure stability.",
            'options': ["run", "make", "speak", "does"],
            'correct_answer': "run",
            'difficulty': 3,
            'word': 'Testing',
        },
        {
            'type_category': 'Tipo B - Morfología y Contexto',
            'level': 'B1',
            'question': "Complete the sentence with the correct grammatical form or collocation:",
            'prompt': "The API gateway _____ incoming HTTP requests to microservices efficiently.",
            'options': ["routes", "route", "routing", "routed"],
            'correct_answer': "routes",
            'difficulty': 5,
            'word': 'Routing',
        },
        {
            'type_category': 'Tipo B - Morfología y Contexto',
            'level': 'B2',
            'question': "Complete the sentence with the correct grammatical form or collocation:",
            'prompt': "You should never _____ changes directly to the production branch without a peer pull request.",
            'options': ["commit", "make", "tell", "say"],
            'correct_answer': "commit",
            'difficulty': 7,
            'word': 'Git Commit',
        },
        # Tipo C - Reemplazo por Sinónimo en Contexto
        {
            'type_category': 'Tipo C - Sinónimo en Contexto',
            'level': 'B1',
            'question': "Which technical synonym can replace the bold term without altering the meaning?",
            'prompt': "The development team decided to **refactor** the legacy module to improve maintainability.",
            'options': ["restructure", "delete", "compile", "ignore"],
            'correct_answer': "restructure",
            'difficulty': 6,
            'word': 'Refactoring',
        },
        {
            'type_category': 'Tipo C - Sinónimo en Contexto',
            'level': 'B2',
            'question': "Which technical synonym can replace the bold term without altering the meaning?",
            'prompt': "We need to **deploy** the latest software patch to all regional edge servers.",
            'options': ["release", "terminate", "rollback", "delete"],
            'correct_answer': "release",
            'difficulty': 8,
            'word': 'Deployment',
        },
    ],
    'MECANICA': [
        # Tipo A - Sintaxis (Sentence Ordering)
        {
            'type_category': 'Tipo A - Sintaxis',
            'level': 'A2',
            'question': "Order the sentence components into a grammatically correct structure:",
            'prompt': "caliper / precision / the / technician / measured / with / tolerance / the",
            'options': [
                "The technician measured the tolerance with the precision caliper.",
                "With tolerance precision measured the caliper technician the.",
                "The precision technician caliper measured with the tolerance.",
                "Measured tolerance the with technician the precision caliper."
            ],
            'correct_answer': "The technician measured the tolerance with the precision caliper.",
            'difficulty': 4,
            'word': 'Caliper',
        },
        {
            'type_category': 'Tipo A - Sintaxis',
            'level': 'B1',
            'question': "Order the sentence components into a grammatically correct structure:",
            'prompt': "lathe / workpiece / rotates / the / cutting / while / cylindrical / is / performed",
            'options': [
                "The lathe rotates the workpiece while cylindrical cutting is performed.",
                "Rotates the lathe while workpiece cylindrical is performed cutting.",
                "While cutting performed cylindrical is the workpiece lathe rotates.",
                "Cylindrical workpiece rotates while cutting performed the lathe is."
            ],
            'correct_answer': "The lathe rotates the workpiece while cylindrical cutting is performed.",
            'difficulty': 6,
            'word': 'Lathe',
        },
        {
            'type_category': 'Tipo A - Sintaxis',
            'level': 'B2',
            'question': "Order the sentence components into a grammatically correct structure:",
            'prompt': "hydraulic / pump / pressure / delivers / steady / actuator / cylinder / to / the",
            'options': [
                "The hydraulic pump delivers steady pressure to the actuator cylinder.",
                "Pressure delivers the hydraulic pump cylinder to steady actuator the.",
                "To actuator the cylinder hydraulic steady pressure pump delivers the.",
                "Delivers steady hydraulic pressure pump to cylinder actuator the the."
            ],
            'correct_answer': "The hydraulic pump delivers steady pressure to the actuator cylinder.",
            'difficulty': 7,
            'word': 'Hydraulic Pump',
        },
        # Tipo B - Morfología y Uso en Contexto
        {
            'type_category': 'Tipo B - Morfología y Contexto',
            'level': 'A2',
            'question': "Complete the sentence with the correct grammatical form or collocation:",
            'prompt': "The operator must _____ routine maintenance on the CNC milling machine every week.",
            'options': ["perform", "make", "tell", "say"],
            'correct_answer': "perform",
            'difficulty': 3,
            'word': 'Maintenance',
        },
        {
            'type_category': 'Tipo B - Morfología y Contexto',
            'level': 'B1',
            'question': "Complete the sentence with the correct grammatical form or collocation:",
            'prompt': "Bearings require constant lubrication to prevent them from _____ due to heavy mechanical friction.",
            'options': ["overheating", "overheat", "overheated", "overheats"],
            'correct_answer': "overheating",
            'difficulty': 5,
            'word': 'Lubrication',
        },
        {
            'type_category': 'Tipo B - Morfología y Contexto',
            'level': 'B2',
            'question': "Complete the sentence with the correct grammatical form or collocation:",
            'prompt': "The spindle speed was _____ adjusted to match the tensile strength of the alloy steel.",
            'options': ["carefully", "careful", "caring", "carefulness"],
            'correct_answer': "carefully",
            'difficulty': 7,
            'word': 'Spindle Speed',
        },
        # Tipo C - Reemplazo por Sinónimo en Contexto
        {
            'type_category': 'Tipo C - Sinónimo en Contexto',
            'level': 'B1',
            'question': "Which technical synonym can replace the bold term without altering the meaning?",
            'prompt': "The machinist must **inspect** the manufactured parts for surface imperfections.",
            'options': ["examine", "paint", "melt", "weld"],
            'correct_answer': "examine",
            'difficulty': 6,
            'word': 'Inspection',
        },
        {
            'type_category': 'Tipo C - Sinónimo en Contexto',
            'level': 'B2',
            'question': "Which technical synonym can replace the bold term without altering the meaning?",
            'prompt': "The mechanical engineers need to **calibrate** the CNC sensor for high-precision cutting.",
            'options': ["adjust", "replace", "discard", "disable"],
            'correct_answer': "adjust",
            'difficulty': 7,
            'word': 'Calibration',
        },
    ],
    'MULTIMEDIA': [
        # Tipo A - Sintaxis (Sentence Ordering)
        {
            'type_category': 'Tipo A - Sintaxis',
            'level': 'A2',
            'question': "Order the sentence components into a grammatically correct structure:",
            'prompt': "vector / graphics / exports / crisp / resolution / illustrations / high / in",
            'options': [
                "Vector graphics export crisp illustrations in high resolution.",
                "In resolution high export vector illustrations crisp graphics.",
                "Crisp illustrations graphics vector export in resolution high.",
                "Export graphics high vector resolution in illustrations crisp."
            ],
            'correct_answer': "Vector graphics export crisp illustrations in high resolution.",
            'difficulty': 4,
            'word': 'Vector',
        },
        {
            'type_category': 'Tipo A - Sintaxis',
            'level': 'B1',
            'question': "Order the sentence components into a grammatically correct structure:",
            'prompt': "animator / rendered / sequence / the / timeline / keyframes / on / thirty",
            'options': [
                "The animator rendered thirty keyframes on the animation timeline.",
                "Rendered keyframes thirty animator the timeline on animation.",
                "On the timeline animation keyframes thirty rendered the animator.",
                "The timeline animation rendered keyframes thirty on animator."
            ],
            'correct_answer': "The animator rendered thirty keyframes on the animation timeline.",
            'difficulty': 6,
            'word': 'Keyframes',
        },
        {
            'type_category': 'Tipo A - Sintaxis',
            'level': 'B2',
            'question': "Order the sentence components into a grammatically correct structure:",
            'prompt': "sound / designer / mixed / stereo / audio / channels / final / master / into / the",
            'options': [
                "The sound designer mixed audio channels into the final stereo master.",
                "Mixed audio channels into final stereo master the sound designer the.",
                "The stereo master sound designer mixed into final audio channels the.",
                "Into final audio channels the stereo master sound designer mixed the."
            ],
            'correct_answer': "The sound designer mixed audio channels into the final stereo master.",
            'difficulty': 7,
            'word': 'Sound Mixing',
        },
        # Tipo B - Morfología y Uso en Contexto
        {
            'type_category': 'Tipo B - Morfología y Contexto',
            'level': 'A2',
            'question': "Complete the sentence with the correct grammatical form or collocation:",
            'prompt': "The video editor needs to _____ the dialogue audio track with the video footage before export.",
            'options': ["synchronize", "make", "say", "synchronizing"],
            'correct_answer': "synchronize",
            'difficulty': 3,
            'word': 'Audio Sync',
        },
        {
            'type_category': 'Tipo B - Morfología y Contexto',
            'level': 'B1',
            'question': "Complete the sentence with the correct grammatical form or collocation:",
            'prompt': "Vectors ensure that complex graphic illustrations do not _____ resolution when enlarged.",
            'options': ["lose", "loose", "lost", "losing"],
            'correct_answer': "lose",
            'difficulty': 5,
            'word': 'Resolution',
        },
        {
            'type_category': 'Tipo B - Morfología y Contexto',
            'level': 'B2',
            'question': "Complete the sentence with the correct grammatical form or collocation:",
            'prompt': "The 3D artists _____ rigging character meshes for the animated short film all semester.",
            'options': ["have been", "is", "has", "was being"],
            'correct_answer': "have been",
            'difficulty': 7,
            'word': '3D Rigging',
        },
        # Tipo C - Reemplazo por Sinónimo en Contexto
        {
            'type_category': 'Tipo C - Sinónimo en Contexto',
            'level': 'B1',
            'question': "Which technical synonym can replace the bold term without altering the meaning?",
            'prompt': "We need to **render** the 3D animation sequence using GPU acceleration.",
            'options': ["process", "erase", "record", "handwrite"],
            'correct_answer': "process",
            'difficulty': 6,
            'word': 'Rendering',
        },
        {
            'type_category': 'Tipo C - Sinónimo en Contexto',
            'level': 'B2',
            'question': "Which technical synonym can replace the bold term without altering the meaning?",
            'prompt': "The graphic designer will **modify** the typography layout for mobile responsiveness.",
            'options': ["alter", "delete", "flatten", "print"],
            'correct_answer': "alter",
            'difficulty': 7,
            'word': 'Typography',
        },
    ]
}


class ExamEngineService:
    """
    Motor de Evaluación Lingüística CEFR Adaptativo (A1-B2).
    Garantiza aislamiento estricto por programa formativo:
      - ADSO: Solo términos y distractores de Análisis y Desarrollo de Software.
      - MECANICA: Solo términos y distractores de Mecánica Industrial.
      - MULTIMEDIA: Solo términos y distractores de Producción Multimedia.
    """

    @staticmethod
    def _strip_key(val: Any) -> str:
        """Limpia una clave de texto o referencia multimedia."""
        return val.strip() if isinstance(val, str) else (str(val) if val is not None else "")

    @classmethod
    def normalize_program_key(cls, program: Optional[str]) -> str:
        """
        Normaliza de manera canónica e inequívoca el código del programa formativo:
        'ADSO' | 'MECANICA' | 'MULTIMEDIA'
        """
        if not program:
            return PROGRAM_ADSO
        canon = canonical_program_key(program)
        if canon:
            return canon
        p_upper = str(program).upper()
        if 'MECAN' in p_upper:
            return PROGRAM_MECANICA
        if 'MULTI' in p_upper:
            return PROGRAM_MULTIMEDIA
        return PROGRAM_ADSO

    @classmethod
    def get_terms_by_level(cls, level: str, program: Optional[str] = None) -> List[Any]:
        """
        Obtiene los términos activos filtrados por nivel CEFR y programa de formación aislado.
        """
        norm_prog = cls.normalize_program_key(program)
        qs = DigitalDictionary.objects.filter(program_q(norm_prog), level__iexact=level).select_related('subject')
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
        Construye un banco de preguntas 100% AISLADO por programa formativo:
        - Términos de Reading extraídos ÚNICAMENTE del programa indicado.
        - Distractores extraídos ÚNICAMENTE del mismo programa (PROHIBIDO mezclar núcleos).
        - Banco de Writing/Grammar extraído ÚNICAMENTE del núcleo correspondiente.
        """
        if program in CEFR_LEVELS and level is None:
            level = program
            program = None

        norm_program = cls.normalize_program_key(program)
        official_prog_name = PROGRAM_NAMES.get(norm_program, 'Análisis y Desarrollo de Software')
        p_filter = program_q(norm_program)

        # ── 1. Queryset Base Estrictamente Filtrado por Programa ──
        qs = DigitalDictionary.objects.filter(p_filter).select_related('subject')

        if competence and competence != 'all':
            qs = qs.filter(competence__iexact=competence)

        if level and level != 'all':
            terms = list(qs.filter(level__iexact=level).order_by('?')[:total_questions])
        else:
            terms = []
            for lvl in CEFR_LEVELS:
                lvl_pool = list(qs.filter(level__iexact=lvl).order_by('?')[:limit_per_level])
                terms.extend(lvl_pool)
            random.shuffle(terms)
            terms = terms[:total_questions]

        # Respaldo de seguridad si el nivel específico tiene pocos términos dentro del MISMO programa
        if not terms:
            logger.warning(
                "Filtro restrictivo para programa '%s', nivel '%s'. Usando catálogo general del MISMO programa.",
                norm_program,
                level
            )
            fallback_qs = DigitalDictionary.objects.filter(p_filter).select_related('subject')
            for lvl in CEFR_LEVELS:
                lvl_pool = list(fallback_qs.filter(level__iexact=lvl).order_by('?')[:limit_per_level])
                terms.extend(lvl_pool)
            random.shuffle(terms)
            terms = terms[:total_questions]

        questions: List[Dict[str, Any]] = []

        # ── 2. MÓDULO READING: Vocabulario Técnico & Comprensión Lectora ──
        # Muestra definición o contexto operativo del programa y pregunta:
        # "What technical term does this definition refer to?"
        for term in terms:
            term_word = getattr(term, 'word_id', None) or getattr(term, 'word', '')
            term_def = getattr(term, 'definition', '') or ''
            term_lvl = getattr(term, 'level', 'A1') or 'A1'

            # DISTRACTORES ESTRICTOS: Extraídos ÚNICAMENTE del MISMO programa formativo
            distractor_qs = (
                DigitalDictionary.objects.filter(p_filter)
                .exclude(id=term.id)
            )
            distractor_words = list(
                distractor_qs.exclude(word_id__isnull=True)
                .exclude(word_id='')
                .order_by('?')
                .values_list('word_id', flat=True)[:12]
            )

            clean_term = str(term_word).strip().lower()
            distractors = [
                w.strip() for w in distractor_words
                if w and w.strip().lower() != clean_term
            ][:3]

            # Si faltan distractores dentro del mismo programa, complementar con opciones técnicas del programa
            prog_fallback_words = {
                'ADSO': ['Framework', 'Algorithm', 'Database', 'Middleware', 'Repository', 'Endpoint'],
                'MECANICA': ['Caliper', 'Lathe', 'Bearing', 'Spindle', 'Micrometer', 'Gearbox'],
                'MULTIMEDIA': ['Keyframe', 'Rendering', 'Vector', 'Storyboard', 'Timeline', 'Typography'],
            }
            fb_list = prog_fallback_words.get(norm_program, prog_fallback_words['ADSO'])
            for fb_w in fb_list:
                if len(distractors) >= 3:
                    break
                if fb_w.lower() != clean_term and fb_w not in distractors:
                    distractors.append(fb_w)

            while len(distractors) < 3:
                distractors.append(f"Option {len(distractors) + 1}")

            options = distractors + [term_word]
            random.shuffle(options)
            correct_index = options.index(term_word)

            diff_val = 2 if term_lvl == 'A1' else (4 if term_lvl == 'A2' else (6 if term_lvl == 'B1' else 8))
            audio_url = f"/api/media/dictionary-audios/{term.audio}" if getattr(term, 'audio', None) else None
            image_url = f"/api/media/dictionary-images/{term.image}" if getattr(term, 'image', None) else None

            questions.append({
                'id': term.id,
                'word': term_word,
                'wordId': term_word,
                'definition': term_def,
                'level': term_lvl,
                'competence': 'Reading',
                'competency': 'Reading',
                'type': 'multiple',
                'question': "What technical term does this definition refer to?",
                'prompt': f'"{term_def}"',
                'options': options,
                'correctAnswer': correct_index,
                'correct_answer': term_word,
                'correctAnswerText': term_word,
                'difficulty': diff_val,
                'difficultyTier': get_difficulty_tier(diff_val),
                'program': official_prog_name,
                'program_key': norm_program,
                'category': f"{official_prog_name} - Reading (Vocabulario)",
                'audio': audio_url,
                'image': image_url,
                'uniqueKey': f"READ-{norm_program}-{term_lvl}-{term.id}",
                'isDictionaryTerm': True,
            })

        # ── 3. MÓDULO WRITING / GRAMMAR: Sintaxis, Morfología en Contexto y Sinónimos ──
        # Extraído 100% del diccionario de ejercicios correspondiente a este programa
        prog_exercises = PROGRAM_WRITING_EXERCISES.get(norm_program, PROGRAM_WRITING_EXERCISES['ADSO'])
        random.shuffle(prog_exercises)
        writing_picks = prog_exercises[:6]

        for w_idx, ex in enumerate(writing_picks):
            options = list(ex['options'])
            correct_text = ex['correct_answer']
            if correct_text in options:
                random.shuffle(options)
                correct_idx = options.index(correct_text)
            else:
                options.append(correct_text)
                random.shuffle(options)
                correct_idx = options.index(correct_text)

            w_level = ex.get('level', 'A2')
            w_diff = ex.get('difficulty', 4)

            questions.append({
                'id': 7000 + w_idx,
                'word': ex.get('word', 'Writing Exercise'),
                'wordId': ex.get('word', 'Writing Exercise'),
                'definition': ex.get('prompt', ''),
                'level': w_level,
                'competence': 'Writing',
                'competency': 'Writing',
                'type': 'multiple',
                'question': ex['question'],
                'prompt': ex['prompt'],
                'options': options,
                'correctAnswer': correct_idx,
                'correct_answer': correct_text,
                'correctAnswerText': correct_text,
                'difficulty': w_diff,
                'difficultyTier': get_difficulty_tier(w_diff),
                'program': official_prog_name,
                'program_key': norm_program,
                'category': f"{official_prog_name} - Writing ({ex.get('type_category', 'Sintaxis')})",
                'audio': None,
                'image': None,
                'uniqueKey': f"WRIT-{norm_program}-{w_idx}",
                'isDictionaryTerm': False,
            })

        random.shuffle(questions)
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
