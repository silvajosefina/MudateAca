from rest_framework.pagination import PageNumberPagination


class PaginacionExplorar(PageNumberPagination):
    page_query_param = 'pagina'
    page_size = 9


class PaginacionMisPublicaciones(PaginacionExplorar):
    page_size = 6


class PaginacionNotificaciones(PaginacionExplorar):
    page_size = 10
