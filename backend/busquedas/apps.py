from django.apps import AppConfig


class BusquedasConfig(AppConfig):
    name = 'busquedas'

    def ready(self):
        from . import senales  # noqa: F401
