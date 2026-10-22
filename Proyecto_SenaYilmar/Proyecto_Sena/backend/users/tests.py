# backend/users/tests.py
import unittest
from django.test import TestCase

# Importar helpers de evaluación justa y clasificación pedagógica
from .Views.api_views import _build_failure_breakdown, _normalize_competency, PASS_THRESHOLD


class FairScoringAndClassificationTests(unittest.TestCase):
    """
    Pruebas unitarias de calificación justa y reclasificación pedagógica (Reading vs Writing).
    Garantiza:
    1. Respuestas correctas -> puntaje alto (100%) y nivel aprobado.
    2. Un fallo aislado en una sola habilidad no reprueba al aprendiz.
    3. Ponderación por macro-habilidades (Reading, Writing, Listening, Speaking)
       y no por micro-categorías dispersas de 1 pregunta.
    """

    def test_all_correct_yields_high_score_and_pass(self):
        """Caso 1: Todas las respuestas correctas generan puntaje de 100% y aprobación."""
        process_data = {
            'userAnswers': [
                {'question': 'Def: Software Interface', 'competency': 'Reading', 'category': 'UI Design', 'isCorrect': True, 'scoreAwarded': 100},
                {'question': 'Def: Relational DB', 'competency': 'Reading', 'category': 'Databases', 'isCorrect': True, 'scoreAwarded': 100},
                {'question': 'Sentence Ordering', 'competency': 'Writing', 'category': 'ADSO - Writing (Sintaxis)', 'isCorrect': True, 'scoreAwarded': 100},
                {'question': 'Fill-in verb', 'competency': 'Writing', 'category': 'ADSO - Writing (Morfología)', 'isCorrect': True, 'scoreAwarded': 100},
                {'question': 'Listen and identify term', 'competency': 'Listening', 'category': 'Listening', 'isCorrect': True, 'scoreAwarded': 100},
                {'question': 'Pronounce terminology', 'competency': 'Speaking', 'category': 'Speaking', 'isCorrect': True, 'scoreAwarded': 100},
            ]
        }

        breakdown = _build_failure_breakdown(process_data)

        # Todas las 4 habilidades deben tener 100%
        for ability in ['Reading', 'Writing', 'Listening', 'Speaking']:
            self.assertEqual(breakdown['by_ability'][ability]['score'], 100)
            self.assertEqual(breakdown['by_ability'][ability]['failed'], 0)

        # Puntaje ponderado por habilidades
        active = [ab for ab, d in breakdown['by_ability'].items() if d['total'] > 0]
        weighted_score = round(sum(breakdown['by_ability'][ab]['score'] for ab in active) / len(active))
        self.assertEqual(weighted_score, 100)

        threshold = PASS_THRESHOLD.get('A1', 60)
        passed = weighted_score >= threshold
        self.assertTrue(passed)

    def test_isolated_failure_does_not_fail_candidate(self):
        """
        Caso 2: Un fallo aislado (ej. 1 error en Writing, pero 100% en Reading, Listening y Speaking)
        no debe hundir al aprendiz ni causarle reprobación injusta (puntaje >= 60% umbral).
        """
        process_data = {
            'userAnswers': [
                # Reading: 2 de 2 correctas (100%)
                {'question': 'Def: Interface', 'competency': 'Reading', 'category': 'UI Design', 'isCorrect': True},
                {'question': 'Def: Database Table', 'competency': 'Reading', 'category': 'Databases', 'isCorrect': True},
                # Writing: 1 correcta y 1 fallada (50%)
                {'question': 'Order the sentence', 'competency': 'Writing', 'category': 'Sintaxis', 'isCorrect': True},
                {'question': 'Choose preposition', 'competency': 'Writing', 'category': 'Morfología', 'isCorrect': False},
                # Listening: 1 de 1 correcta (100%)
                {'question': 'Audio prompt', 'competency': 'Listening', 'category': 'Listening', 'isCorrect': True},
                # Speaking: 1 de 1 correcta (100%)
                {'question': 'Speak technical term', 'competency': 'Speaking', 'category': 'Speaking', 'isCorrect': True},
            ]
        }

        breakdown = _build_failure_breakdown(process_data)

        self.assertEqual(breakdown['by_ability']['Reading']['score'], 100)
        self.assertEqual(breakdown['by_ability']['Writing']['score'], 50)
        self.assertEqual(breakdown['by_ability']['Listening']['score'], 100)
        self.assertEqual(breakdown['by_ability']['Speaking']['score'], 100)

        # Media ponderada de las 4 habilidades: (100 + 50 + 100 + 100) / 4 = 87.5 -> 88%
        active = [ab for ab, d in breakdown['by_ability'].items() if d['total'] > 0]
        weighted_score = round(sum(breakdown['by_ability'][ab]['score'] for ab in active) / len(active))

        self.assertGreaterEqual(weighted_score, 85)

        threshold_a1 = PASS_THRESHOLD.get('A1', 60)
        passed = weighted_score >= threshold_a1
        self.assertTrue(passed, "Un fallo aislado no debe reprobar al candidato.")

    def test_pedagogical_classification_reading_vs_writing(self):
        """
        Caso 3: Verificación de reclasificación pedagógica:
        - READING = Vocabulario técnico, definiciones conceptuales, comprensión.
        - WRITING = Gramática, sintaxis, orden de oraciones, morfología, sinónimos.
        """
        vocab_question = {'question': 'What technical term does this definition refer to?', 'category': 'ADSO - Databases'}
        self.assertEqual(_normalize_competency(vocab_question), 'Reading')

        syntax_question = {'question': 'Order the sentence components into a grammatically correct structure', 'category': 'ADSO - Writing (Sintaxis)'}
        self.assertEqual(_normalize_competency(syntax_question), 'Writing')

        morphology_question = {'question': 'Complete the sentence with the correct grammatical form', 'category': 'Gramática y Morfología'}
        self.assertEqual(_normalize_competency(morphology_question), 'Writing')

        synonym_question = {'question': 'Which technical synonym can replace the bold term?', 'category': 'Sinónimos Técnicos'}
        self.assertEqual(_normalize_competency(synonym_question), 'Writing')

        speaking_question = {'question': 'Pronounce the following term into the microphone', 'type': 'speaking'}
        self.assertEqual(_normalize_competency(speaking_question), 'Speaking')

        listening_question = {'question': 'Listen to the audio and select the term', 'type': 'listening'}
        self.assertEqual(_normalize_competency(listening_question), 'Listening')
