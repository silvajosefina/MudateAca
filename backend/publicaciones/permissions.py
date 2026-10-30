from rest_framework.permissions import BasePermission

ROLES_QUE_PUBLICAN = {'propietario', 'inmobiliaria'}


class EsPropietarioOInmobiliaria(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol.codigo in ROLES_QUE_PUBLICAN
        )


class EsDuenoDeLaPublicacion(BasePermission):
    # RNF-05: nadie modifica publicaciones ajenas manipulando la URL.
    def has_object_permission(self, request, view, publicacion):
        return publicacion.propietario_id == request.user.id
