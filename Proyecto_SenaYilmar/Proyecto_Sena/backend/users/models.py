"""
Re-export de modelos de SENA para compatibilidad estándar de Django y DRF.
Permite 'from users.models import DigitalDictionary, DictionaryWord, User, Ficha'.
"""
from .Models.modelsSENA import *

# Aliases de compatibilidad directa
DictionaryWord = DigitalDictionary
Ficha = FichaRequest
