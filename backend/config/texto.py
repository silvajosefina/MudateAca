import unicodedata


def normalizar_texto(texto):
    sin_acentos = unicodedata.normalize('NFKD', texto).encode('ascii', 'ignore').decode('ascii')
    return sin_acentos.strip().lower()
