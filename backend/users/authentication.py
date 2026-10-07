from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from .Models.modelsSENA import User


class AuthenticatedUser:
    """Wrapper que añade los atributos que DRF espera"""

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

        return AuthenticatedUser(user)


class OptionalJWTAuthentication(CustomJWTAuthentication):
    """
    Autenticación JWT opcional:
    - Si el token es válido, autentica al usuario.
    - Si no hay token, o el token es inválido/expirado, retorna None sin fallar con 401.
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
        except Exception:
            return None

