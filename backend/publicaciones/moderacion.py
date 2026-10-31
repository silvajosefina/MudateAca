import re

from config.texto import normalizar_texto

from .models import EstadoPublicacion, EventoModeracion, Publicacion

LARGO_MINIMO_DESCRIPCION = 20

# Lista corta y editable, comparada sin mayúsculas ni acentos.
PALABRAS_PROHIBIDAS = {
    'boluda', 'boludo', 'cocaina', 'escort', 'marihuana', 'mierda',
    'pelotuda', 'pelotudo', 'prostitucion', 'puta', 'puto',
}

# Una publicación archivada o eliminada ya no compite con una nueva del mismo inmueble.
ESTADOS_SIN_DUPLICADOS = ('archivada', 'eliminada')

# Fechas y precios también son secuencias largas de dígitos: se descartan antes de buscar teléfonos.
PATRON_FECHA_O_PRECIO = re.compile(r'\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b|\$\s*[\d.,]+')
PATRON_TELEFONO = re.compile(r'(?<!\d)(?:\+?\d[\s().-]*){8,}')
PATRON_CORREO = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')
PATRON_ENLACE = re.compile(r'https?://|www\.|\b[a-z0-9-]+\.(?:com|net|org|ar|info)\b', re.IGNORECASE)


def tiene_datos_de_contacto(texto):
    sin_fechas_ni_precios = PATRON_FECHA_O_PRECIO.sub(' ', texto)
    return any(
        patron.search(sin_fechas_ni_precios)
        for patron in (PATRON_TELEFONO, PATRON_CORREO, PATRON_ENLACE)
    )


def tiene_palabras_prohibidas(texto):
    return not PALABRAS_PROHIBIDAS.isdisjoint(re.findall(r'[a-z0-9]+', normalizar_texto(texto)))


def es_duplicada(publicacion):
    return (
        Publicacion.objects
        .exclude(id=publicacion.id)
        .exclude(estado__codigo__in=ESTADOS_SIN_DUPLICADOS)
        .filter(
            descripcion__iexact=publicacion.descripcion.strip(),
            ubicacion__iexact=publicacion.ubicacion.strip(),
        )
        .exists()
    )


def detectar_problemas(publicacion):
    # RF-06: los datos inválidos ya los frena el serializer; acá queda lo que requiere una revisión.
    texto = ' '.join(filter(None, [publicacion.descripcion, publicacion.requisitos]))
    problemas = []

    if len(publicacion.descripcion.strip()) < LARGO_MINIMO_DESCRIPCION:
        problemas.append(f'La descripción debe tener al menos {LARGO_MINIMO_DESCRIPCION} caracteres.')
    if tiene_datos_de_contacto(texto):
        problemas.append('No se permiten teléfonos, correos ni enlaces: el contacto se realiza por el chat interno.')
    if tiene_palabras_prohibidas(texto):
        problemas.append('El texto contiene términos no permitidos.')
    if es_duplicada(publicacion):
        problemas.append('Ya existe una publicación con la misma descripción y ubicación.')

    return problemas


def moderar(publicacion, requiere_revision):
    problemas = detectar_problemas(publicacion)
    if problemas:
        publicacion.estado = EstadoPublicacion.por_codigo('observada')
        EventoModeracion.objects.create(
            publicacion=publicacion, tipo='moderacion_automatica', nota=' '.join(problemas),
        )
    elif requiere_revision:
        publicacion.estado = EstadoPublicacion.por_codigo('pendiente_moderacion')
    publicacion.save(update_fields=['estado', 'actualizado_en'])
