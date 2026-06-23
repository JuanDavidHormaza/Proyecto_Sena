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
