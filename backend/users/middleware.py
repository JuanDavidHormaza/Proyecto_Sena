"""
middleware.py - Middleware de reconexión y resiliencia para PostgreSQL en WorkLex SENA.

Garantiza:
1. Cero caídas por 'server closed the connection unexpectedly' o pérdida temporal de conexión.
2. Reintentos automáticos con backoff exponencial antes de fallar.
3. Cierre inmediato de conexiones muertas para liberar sockets.
4. Respuesta controlada HTTP 503 JSON en lugar de colapsos 500 no controlados.
"""

import time
import logging
from django.db import connection, connections, OperationalError, DatabaseError, InterfaceError
from django.http import JsonResponse

logger = logging.getLogger(__name__)


def close_broken_db_connections():
    """Cierra de forma segura todas las conexiones de base de datos activas o corruptas."""
    try:
        connection.close()
    except Exception:
        pass
    for conn in connections.all():
        try:
            conn.close()
        except Exception:
            pass


def execute_with_db_retry(func, max_retries=3, initial_delay=0.2, *args, **kwargs):
    """
    Ejecuta una función que interactúa con PostgreSQL con reintentos automáticos
    ante fallas temporales de red o desconexiones de socket.
    """
    delay = initial_delay
    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            return func(*args, **kwargs)
        except (OperationalError, InterfaceError, DatabaseError) as exc:
            last_error = exc
            logger.warning(
                f"[DB RETRY] Intento {attempt}/{max_retries} falló con error de base de datos: {exc}. "
                f"Cerrando conexiones y reintentando en {delay:.2f}s..."
            )
            close_broken_db_connections()
            if attempt < max_retries:
                time.sleep(delay)
                delay *= 2
            else:
                logger.error(f"[DB RETRY] Agotados {max_retries} reintentos contra PostgreSQL: {exc}")
                raise last_error


class DatabaseReconnectMiddleware:
    """
    Middleware global para interceptar desconexiones temporales de PostgreSQL
    y reintentar peticiones antes de devolver un error controlado.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        max_retries = 3
        delay = 0.2

        for attempt in range(1, max_retries + 1):
            try:
                response = self.get_response(request)
                return response
            except (OperationalError, InterfaceError, DatabaseError) as exc:
                logger.warning(
                    f"[DatabaseReconnectMiddleware] Error de base de datos en '{request.path}' "
                    f"(intento {attempt}/{max_retries}): {exc}"
                )
                close_broken_db_connections()

                # Si no es el último intento, esperar y reintentar
                if attempt < max_retries:
                    time.sleep(delay)
                    delay *= 2
                    continue

                # Si se agotaron los reintentos, responder con JSON 503 limpio en vez de crash 500
                logger.error(
                    f"[DatabaseReconnectMiddleware] Base de datos no disponible tras {max_retries} reintentos en '{request.path}'."
                )
                return JsonResponse(
                    {
                        "error": "El servicio no está disponible temporalmente. La base de datos se encuentra sincronizando o reconectando. Por favor reintente en unos momentos.",
                        "code": "DB_UNAVAILABLE",
                        "status": 503,
                    },
                    status=503,
                )
            except Exception:
                raise
