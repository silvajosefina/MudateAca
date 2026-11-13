from rest_framework import serializers


class CodigoDeCatalogo(serializers.SlugRelatedField):
    # El mensaje por defecto de DRF es técnico ("Objeto con codigo=x no existe.").
    default_error_messages = {
        'does_not_exist': 'Elegí una opción válida.',
        'invalid': 'Elegí una opción válida.',
    }

    def __init__(self, **kwargs):
        kwargs.setdefault('slug_field', 'codigo')
        super().__init__(**kwargs)
