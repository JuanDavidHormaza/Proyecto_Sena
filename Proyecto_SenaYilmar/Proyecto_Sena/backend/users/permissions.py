from rest_framework.permissions import BasePermission

class IsSuperAdmin(BasePermission):
    message = 'Acceso restringido a SuperAdministradores.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        return getattr(user, 'role_id', None) == 'SUPERADMIN'

class IsAdminOrSuperAdmin(BasePermission):
    message = 'Acceso restringido a administradores.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        return getattr(user, 'role_id', None) in ('SUPERADMIN', 'ADMIN')

class IsDictionaryAdminOrReadOnly(BasePermission):
    """
    Permite lectura (GET, HEAD, OPTIONS) a cualquier usuario autenticado (incluyendo APRENDIZ e INSTRUCTOR).
    Permite escritura/modificación/eliminación (POST, PUT, PATCH, DELETE) ÚNICAMENTE a ADMIN y SUPERADMIN.
    """
    message = 'Acceso restringido: Solo ADMIN y SUPERADMIN pueden crear, modificar o eliminar términos del diccionario.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not getattr(user, 'is_authenticated', False):
            return False

        from rest_framework.permissions import SAFE_METHODS
        if request.method in SAFE_METHODS:
            return True

        role = str(getattr(user, 'role_id', '') or getattr(user, 'role', '')).upper()
        return role in ('SUPERADMIN', 'ADMIN')
