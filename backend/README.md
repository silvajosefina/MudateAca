# Mudate Acá: backend

API REST en Django REST Framework con PostgreSQL y PostGIS. El frontend todavía trabaja con datos simulados, por lo que el backend se prueba mediante la API o las pruebas automáticas.

## Requisitos

- Python 3.14
- PostgreSQL 18 con PostGIS
- GDAL y GEOS

### Windows

1. Instalar PostgreSQL desde el instalador de EnterpriseDB.
2. Abrir **Application Stack Builder** e instalar PostGIS desde **Spatial Extensions**.
3. Instalar [OSGeo4W](https://trac.osgeo.org/osgeo4w/) con la opción **Express Install** y el paquete **GDAL**.

### Linux (Debian o Ubuntu)

```bash
sudo apt install postgresql postgis gdal-bin
```

## Base de datos

Como usuario `postgres`, crear el usuario y la base con los valores que se usen en `.env`:

```sql
CREATE ROLE mudateaca_app LOGIN PASSWORD 'elegir-una-contraseña' SUPERUSER;
CREATE DATABASE mudateaca OWNER mudateaca_app;
\c mudateaca
CREATE EXTENSION postgis;
```

El permiso `SUPERUSER` es solo para desarrollo: las pruebas lo necesitan para crear PostGIS en su base temporal. No debe usarse en producción.

## Instalación

Desde la carpeta `backend`, en Windows:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

En Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Completar `.env` con `DJANGO_SECRET_KEY` y los datos de la base. En Windows, `OSGEO4W_ROOT` debe apuntar a la carpeta de OSGeo4W, por ejemplo `C:\OSGeo4W`. En Linux se deja vacío.

Después, crear las tablas y un administrador, y levantar el servidor:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Pruebas

```bash
python manage.py test
```

## Publicaciones

Todas las rutas empiezan con `/api/publicaciones/`.

| Método | Ruta | Acceso | Acción |
|---|---|---|---|
| `GET` | `/` | Público | Lista las publicaciones activas con filtros, de a 9 por página |
| `POST` | `/` | Propietario o inmobiliaria | Crea una publicación |
| `GET` | `/mias/` | Propietario o inmobiliaria | Muestra el panel de publicaciones propias, de a 6 por página, con filtro `estado`, totales y acciones permitidas |
| `GET` | `/<id>/` | Público | Muestra una publicación activa, reservada o alquilada. El dueño y el administrador ven cualquier estado y los datos internos |
| `PATCH` | `/<id>/` | Dueño | Edita la publicación |
| `DELETE` | `/<id>/` | Dueño | Realiza la eliminación lógica |
| `POST` | `/<id>/estado/` | Dueño | Cambia el estado: pausar, reservar, alquilar o reactivar |
| `GET` | `/pendientes/` | Administrador | Lista las publicaciones pendientes y observadas |
| `POST` | `/<id>/aprobar/` | Administrador | Aprueba la publicación |
| `POST` | `/<id>/rechazar/` | Administrador | Rechaza la publicación con una nota |
| `POST` | `/<id>/solicitar-modificaciones/` | Administrador | Pide cambios con una nota |

El listado público acepta estos filtros, que se pueden combinar: `modalidad`, `tipo_inmueble`, `ubicacion`, `precio_min`, `precio_max`, `ambientes_min`, `dormitorios_min`, `amueblado`, `servicios_incluidos`, `acepta_mascotas`, `apto_estudiantes`, `fecha_ingreso`, `fecha_salida`, `duracion_estadia` y `pagina`.

Las fechas y la duración solo afectan a los alquileres temporarios: la publicación debe cubrir toda la estadía y esta debe alcanzar su duración mínima.

## Búsquedas activas

Todas las rutas empiezan con `/api/busquedas/`, son solo para usuarios interesados y cada usuario accede únicamente a las suyas.

| Método | Ruta | Acción |
|---|---|---|
| `GET` | `/` | Lista las búsquedas propias |
| `POST` | `/` | Crea una búsqueda |
| `GET` | `/<id>/` | Muestra una búsqueda |
| `PATCH` | `/<id>/` | Edita una búsqueda |
| `DELETE` | `/<id>/` | Elimina una búsqueda |
| `POST` | `/<id>/estado/` | Pausa o reactiva una búsqueda |
| `GET` | `/<id>/coincidencias/` | Lista las publicaciones compatibles, de mayor a menor compatibilidad |

La modalidad y el tipo de inmueble son excluyentes. El resto de los criterios define el porcentaje de compatibilidad, y una publicación coincide desde el 50%.

## Chat interno

Todas las rutas empiezan con `/api/conversaciones/`. Solo los dos participantes acceden a una conversación.

| Método | Ruta | Acceso | Acción |
|---|---|---|---|
| `GET` | `/` | Participante | Lista las conversaciones propias |
| `POST` | `/` | Interesado | Inicia o retoma una conversación sobre una publicación |
| `GET` | `/<id>/` | Participante | Muestra una conversación |
| `GET` | `/<id>/mensajes/` | Participante | Lista los mensajes |
| `POST` | `/<id>/mensajes/` | Participante | Envía un mensaje |

## Archivado automático

El comando `archivar_publicaciones` archiva las publicaciones alquiladas hace 7 días o más. En producción se programa con el cron del servidor, por ejemplo todos los días a las 3:00:

```bash
0 3 * * * cd /ruta/al/backend && .venv/bin/python manage.py archivar_publicaciones
```

Para ejecutarlo a mano:

```bash
python manage.py archivar_publicaciones
```
