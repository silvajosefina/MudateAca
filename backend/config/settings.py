import os
import sys
from datetime import timedelta
from pathlib import Path

import cloudinary
import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env')

# GeoDjango en Windows: GDAL y GEOS vienen de OSGeo4W, fuera del PATH del sistema.
OSGEO4W_ROOT = env('OSGEO4W_ROOT', default='')
if OSGEO4W_ROOT:
    _osgeo4w = Path(OSGEO4W_ROOT)
    os.environ['PATH'] = f'{_osgeo4w / "bin"}{os.pathsep}{os.environ["PATH"]}'
    os.environ['GDAL_DATA'] = str(_osgeo4w / 'apps' / 'gdal' / 'share' / 'gdal')
    os.environ['PROJ_DATA'] = str(_osgeo4w / 'share' / 'proj')

# Alternativa a OSGeo4W: rutas directas, por ejemplo a las bibliotecas que instala PostGIS junto a PostgreSQL.
GDAL_LIBRARY_PATH = env('GDAL_LIBRARY_PATH', default='') or None
GEOS_LIBRARY_PATH = env('GEOS_LIBRARY_PATH', default='') or None

SECRET_KEY = env('DJANGO_SECRET_KEY')
DEBUG = env.bool('DJANGO_DEBUG', default=False)
ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS', default=[])


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',
    'django.contrib.postgres',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'usuarios',
    'publicaciones',
    'busquedas',
    'favoritos',
    'mensajeria',
    'notificaciones',
    'reclamos',
    'auditoria',
    'respaldos',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Base de datos (PostgreSQL local, restricción del SRS; PostGIS para las coordenadas del DER)
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': env('DB_NAME'),
        'USER': env('DB_USER'),
        'PASSWORD': env('DB_PASSWORD'),
        'HOST': env('DB_HOST'),
        'PORT': env('DB_PORT'),
    }
}

AUTH_USER_MODEL = 'usuarios.Usuario'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'es-ar'
TIME_ZONE = 'America/Argentina/Buenos_Aires'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Cloudinary guarda fotos, documentación y backups (restricción del SRS). Sin credenciales se usan
# carpetas locales; las pruebas nunca suben archivos al servicio real.
CLOUDINARY_CLOUD_NAME = env('CLOUDINARY_CLOUD_NAME', default='')
CLOUDINARY_API_KEY = env('CLOUDINARY_API_KEY', default='')
CLOUDINARY_API_SECRET = env('CLOUDINARY_API_SECRET', default='')
EJECUTANDO_PRUEBAS = sys.argv[1:2] == ['test']
USAR_CLOUDINARY = all((CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)) and not EJECUTANDO_PRUEBAS

if USAR_CLOUDINARY:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME, api_key=CLOUDINARY_API_KEY, api_secret=CLOUDINARY_API_SECRET, secure=True,
    )
    STORAGES = {
        'default': {'BACKEND': 'config.almacenamiento.AlmacenamientoCloudinary'},
        'privado': {
            'BACKEND': 'config.almacenamiento.AlmacenamientoCloudinary',
            'OPTIONS': {'privado': True, 'tipo_recurso': 'raw'},
        },
    }
else:
    STORAGES = {
        'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
        'privado': {'BACKEND': 'config.almacenamiento.AlmacenamientoPrivadoLocal'},
    }
PRIVADO_ROOT = BASE_DIR / 'privado'
STORAGES['staticfiles'] = {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'usuarios.authentication.CookieJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.ScopedRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'auth_sensible': '10/min',
    },
    'EXCEPTION_HANDLER': 'config.excepciones.manejar_excepcion',
}

# Tokens en cookies httpOnly, no en localStorage, para mitigar robo vía XSS.
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

JWT_ACCESS_COOKIE = 'access_token'
JWT_REFRESH_COOKIE = 'refresh_token'
JWT_COOKIE_SECURE = env.bool('JWT_COOKIE_SECURE', default=not DEBUG)
JWT_COOKIE_SAMESITE = 'Lax'

# En producción todo viaja por HTTPS (requisito transversal de la arquitectura).
if not DEBUG:
    SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
    SECURE_HSTS_SECONDS = env.int('SECURE_HSTS_SECONDS', default=60 * 60 * 24 * 365)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # Detrás de un proxy (por ejemplo el del hosting), indica que la conexión original era HTTPS.
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])
CORS_ALLOW_CREDENTIALS = True

FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:5173')

# Correo: recuperación de cuenta (RF-03) y notificaciones administrativas.
_EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
MAILERS = {
    'default': {
        'BACKEND': _EMAIL_BACKEND,
        'OPTIONS': {
            'host': env('EMAIL_HOST', default=''),
            'port': env.int('EMAIL_PORT', default=587),
            'username': env('EMAIL_HOST_USER', default=''),
            'password': env('EMAIL_HOST_PASSWORD', default=''),
            'use_tls': env.bool('EMAIL_USE_TLS', default=True),
        } if _EMAIL_BACKEND.endswith('smtp.EmailBackend') else {},
    },
}
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='no-responder@mudateaca.com')

# Backups diarios (RNF-11): carpeta local, días que se conservan y carpeta de pg_dump/pg_restore
# (vacía si ya están en el PATH, como en Linux).
RESPALDOS_DIR = env('RESPALDOS_DIR', default='') or str(BASE_DIR / 'copias_de_seguridad')
RETENCION_RESPALDOS_DIAS = 7
PG_BIN_DIR = env('PG_BIN_DIR', default='')

# Tiempo de vigencia del enlace de recuperación de cuenta (RF-03): 1 hora.
PASSWORD_RESET_TIMEOUT = 60 * 60
