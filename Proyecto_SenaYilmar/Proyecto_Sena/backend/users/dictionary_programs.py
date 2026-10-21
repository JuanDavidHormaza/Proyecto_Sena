"""
Utilidades de segmentación del catálogo del Diccionario Digital por programa de formación.

Los 3 diccionarios técnicos del SENA:
  - ADSO  -> 'Análisis y Desarrollo de Software'
  - MECANICA -> 'Mecánica Industrial'
  - MULTIMEDIA -> 'Producción Multimedia'

El campo `User.program` guarda textos libres como 'Desarrollo de Software - Ficha 2670142',
'Mecánica - Ficha 3520681' o 'ADSO (Análisis y Desarrollo de Software)'. Este módulo normaliza
esos textos a una clave canónica y construye el filtro ORM correspondiente para
`DigitalDictionary.program`, de modo que cada programa quede aislado de los demás.
"""
import re
import unicodedata
from typing import Optional

from django.db.models import Q

PROGRAM_ADSO = 'ADSO'
PROGRAM_MECANICA = 'MECANICA'
PROGRAM_MULTIMEDIA = 'MULTIMEDIA'

# Nombre exacto con el que se almacena cada programa en DigitalDictionary.program
PROGRAM_NAMES = {
    PROGRAM_ADSO: 'Análisis y Desarrollo de Software',
    PROGRAM_MECANICA: 'Mecánica Industrial',
    PROGRAM_MULTIMEDIA: 'Producción Multimedia',
}

# Palabras clave (sin tildes, en minúscula) que identifican cada programa en textos libres
_KEYWORDS = {
    PROGRAM_ADSO: ('adso', 'software', 'analisis y desarrollo', 'analisis'),
    PROGRAM_MECANICA: ('mecanica', 'mecanic'),
    PROGRAM_MULTIMEDIA: ('multimedia', 'multi'),
}

# Variantes (con y sin tilde) buscadas con icontains sobre la columna `program` de la BD
_DB_TERMS = {
    PROGRAM_ADSO: ('ADSO', 'Software', 'Análisis y Desarrollo', 'Analisis y Desarrollo', 'Analisis'),
    PROGRAM_MECANICA: ('Mecánica', 'Mecanica'),
    PROGRAM_MULTIMEDIA: ('Multimedia', 'Producción Multimedia', 'Produccion Multimedia'),
}

_FICHA_RE = re.compile(r'\d{6,8}')


def _strip_accents(text: str) -> str:
    return ''.join(
        c for c in unicodedata.normalize('NFKD', str(text)) if not unicodedata.combining(c)
    )


def canonical_program_key(text: Optional[str]) -> Optional[str]:
    """Devuelve 'ADSO' | 'MECANICA' | 'MULTIMEDIA' o None si el texto no corresponde a ninguno."""
    if not text:
        return None
    norm = _strip_accents(str(text)).lower()
    for key in (PROGRAM_MULTIMEDIA, PROGRAM_MECANICA, PROGRAM_ADSO):
        if any(k in norm for k in _KEYWORDS[key]):
            return key
    return None


def program_q(key: str) -> Q:
    """Filtro ORM para los términos de un programa canónico (incluye filas heredadas sin programa en ADSO)."""
    q = Q()
    for term in _DB_TERMS.get(key, ()):
        q |= Q(program__icontains=term)
    if key == PROGRAM_ADSO:
        # Filas anteriores a la segmentación (columna vacía) pertenecían al diccionario ADSO
        q |= Q(program__isnull=True) | Q(program='') | Q(subject__subject_id='ADSO')
    elif key == PROGRAM_MECANICA:
        q |= Q(subject__subject_id='MECANICA')
    elif key == PROGRAM_MULTIMEDIA:
        q |= Q(subject__subject_id='MULTIMEDIA')
    return q


def extract_ficha_code(*texts: Optional[str]) -> Optional[str]:
    """Extrae el código de ficha (6 a 8 dígitos) de cualquiera de los textos dados."""
    for text in texts:
        if not text:
            continue
        m = _FICHA_RE.search(str(text))
        if m:
            return m.group(0)
    return None


def clean_program_name(text: str) -> str:
    """Quita el código de ficha y separadores de un texto de programa ('X - Ficha 123456' -> 'X')."""
    cleaned = re.sub(r'[-\s]*(?:ficha\s*:?\s*)?\d{6,8}[-\s]*', ' ', str(text), flags=re.IGNORECASE)
    cleaned = re.sub(r'\bficha\b', ' ', cleaned, flags=re.IGNORECASE)
    return re.sub(r'\s+', ' ', cleaned).strip(' -()')
