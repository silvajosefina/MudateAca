from django.apps import AppConfig


class FavoritosConfig(AppConfig):
    name = 'favoritos'

    def ready(self):
        from . import senales  # noqa: F401
