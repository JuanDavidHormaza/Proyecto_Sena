# backend/users/authentication.py
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
        self.person = user.person

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