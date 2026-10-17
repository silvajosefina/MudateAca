from rest_framework.permissions import BasePermission

ROLES_QUE_PUBLICAN = {'propietario', 'inmobiliaria'}


class EsPropietarioOInmobiliaria(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol in ROLES_QUE_PUBLICAN
        )
