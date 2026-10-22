# backend/users/services/ExamEngineService.py
# Casing mirror of exam_engine_service.py for absolute import compatibility
from .exam_engine_service import (
    ExamEngineService,
    CEFR_LEVELS,
    COMPETENCIES,
    LEVEL_PASS_THRESHOLDS,
    get_difficulty_tier,
    PROGRAM_WRITING_EXERCISES
)

__all__ = [
    'ExamEngineService',
    'CEFR_LEVELS',
    'COMPETENCIES',
    'LEVEL_PASS_THRESHOLDS',
    'get_difficulty_tier',
    'PROGRAM_WRITING_EXERCISES'
]
