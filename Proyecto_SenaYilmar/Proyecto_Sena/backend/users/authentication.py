from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from .Models.modelsSENA import User


def resolve_db_user(user_candidate):
    """
    Garantiza que siempre obtengamos una instancia válida del modelo User de Django ORM,
    evitando el error 'ValueError: Cannot assign AuthenticatedUser: must be a User instance'.
    """
    if user_candidate is None:
        return None
    if isinstance(user_candidate, User):
        return user_candidate
    underlying = getattr(user_candidate, '_user', None)
    if isinstance(underlying, User):
        return underlying
    user_id = getattr(user_candidate, 'user_id', None) or getattr(user_candidate, 'pk', None) or getattr(user_candidate, 'id', None)
    if user_id:
        try:
            return User.objects.select_related('person').get(pk=user_id)
        except (User.DoesNotExist, Exception):
            return None
    return None


class AuthenticatedUser:
    """Wrapper de compatibilidad que delega directamente en el modelo User real de Django"""

    def __init__(self, user):
        self._user = user
        self.is_authenticated = True
        self.is_active = True
        # Delegar atributos del modelo real
        self.user_id = user.user_id
        self.role_id = user.role_id
        self.status = user.status
        self.program = user.program
        self.person = user.person

    @property
    def pk(self):
        return self.user_id

    @property
    def id(self):
        return self.user_id

    def __getattr__(self, name):
        return getattr(self._user, name)


class CustomJWTAuthentication(JWTAuthentication):

    def get_user(self, validated_token):
        try:
            user_id = validated_token['user_id']
        except KeyError:
            raise InvalidToken('Token no contiene user_id')

        try:
            user = User.objects.select_related('person').get(pk=user_id)
        except User.DoesNotExist:
            raise InvalidToken('Usuario no encontrado')

        # Retornar directamente la instancia User de Django ORM para evitar errores de asignación ForeignKey
        return user


class OptionalJWTAuthentication(CustomJWTAuthentication):
    """
    Autenticación JWT opcional:
    - Si el token es válido, autentica al usuario.
    - Si no hay token, o el token es invalido, retorna None sin fallar con 401.
    - Si el token esta EXPIRADO, responde 401 (la sesion vencida exige autenticacion).
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except InvalidToken as exc:
            # Un token VENCIDO nunca debe degradarse a anonimo: se responde estrictamente 401.
            # Otros tokens invalidos mantienen el comportamiento opcional (anonimo).
            if 'expired' in str(getattr(exc, 'detail', '')).lower():
                raise
            return None
        except Exception:
            return None

