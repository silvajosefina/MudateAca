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

Si Windows tiene activado **Smart App Control**, puede bloquear las bibliotecas de OSGeo4W, y el backend no arranca (`WinError 4551`). En ese caso no hace falta OSGeo4W: alcanza con usar las bibliotecas que instala PostGIS. En `.env`, dejá vacío `OSGEO4W_ROOT` y completá:

```bash
GDAL_LIBRARY_PATH=C:\Program Files\PostgreSQL\18\bin\libgdal-35.dll
GEOS_LIBRARY_PATH=C:\Program Files\PostgreSQL\18\bin\libgeos_c.dll
```

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

## Errores

Todos los errores de la API se devuelven en JSON y en español, sin detalles internos del servidor (RNF-10):

- **Datos inválidos (400):** un mensaje por campo, por ejemplo `{"publicacion": ["La publicación no existe."]}`.
- **Recurso o ruta inexistente (404):** `{"detail": "No se encontró el recurso solicitado."}`. Si a la ruta solo le falta la barra final, el mensaje lo indica.
- **Cuerpo mal formado (400):** `{"detail": "El cuerpo de la solicitud no tiene un formato válido."}`.

## Borrado lógico

La API nunca borra registros de la base. Las publicaciones pasan al estado `eliminada`. Las búsquedas, favoritos, notificaciones, fotos y coincidencias guardan la fecha en `eliminado_en` y dejan de aparecer en las consultas.

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
| `GET` | `/` | Participante | Lista las conversaciones propias, con la cantidad de mensajes no leídos de cada una |
| `POST` | `/` | Interesado | Inicia o retoma una conversación sobre una publicación |
| `GET` | `/no-leidos/` | Participante | Devuelve el total de mensajes no leídos |
| `GET` | `/<id>/` | Participante | Muestra una conversación |
| `GET` | `/<id>/mensajes/` | Participante | Lista los mensajes; con `despues_de=<id>` devuelve solo los nuevos |
| `POST` | `/<id>/mensajes/` | Participante | Envía un mensaje |
| `POST` | `/<id>/leer/` | Participante | Marca como leídos los mensajes recibidos |

El frontend consulta periódicamente `/no-leidos/` y `/<id>/mensajes/?despues_de=<último id>` para mostrar los mensajes nuevos sin recargar la página.

## Favoritos

Todas las rutas empiezan con `/api/favoritos/` y son solo para usuarios interesados.

| Método | Ruta | Acción |
|---|---|---|
| `GET` | `/` | Lista los favoritos propios, de a 9 por página |
| `POST` | `/` | Guarda una publicación; si ya estaba guardada devuelve el favorito existente |
| `DELETE` | `/<id de la publicación>/` | Quita una publicación de favoritos |

Si una publicación guardada deja de ser pública, el listado solo informa su estado.

## Notificaciones

Todas las rutas empiezan con `/api/notificaciones/` y cada usuario accede solo a las suyas.

| Método | Ruta | Acción |
|---|---|---|
| `GET` | `/` | Lista las notificaciones, de a 10 por página |
| `DELETE` | `/` | Elimina todas las notificaciones |
| `GET` | `/no-leidas/` | Devuelve la cantidad de notificaciones no leídas |
| `POST` | `/marcar-leidas/` | Marca todas como leídas |
| `DELETE` | `/<id>/` | Elimina una notificación |

Se generan notificaciones cuando:

- una publicación guardada en favoritos cambia de estado,
- aparece una publicación compatible con una búsqueda activa,
- un administrador aprueba, rechaza o pide cambios en una publicación,
- un reclamo se resuelve o se descarta.

## Reclamos

Todas las rutas empiezan con `/api/reclamos/`.

| Método | Ruta | Acceso | Acción |
|---|---|---|---|
| `POST` | `/` | Usuario registrado, salvo administradores | Reclama sobre una publicación o un usuario |
| `GET` | `/mios/` | Usuario registrado | Lista los reclamos propios |
| `GET` | `/` | Administrador | Lista todos los reclamos, con filtro `estado` |
| `POST` | `/<id>/estado/` | Administrador | Cambia el estado y agrega una nota opcional |

Los estados son pendiente, en revisión, resuelto y descartado. Cada cambio queda registrado en la auditoría.

## Panel de demanda

`GET /api/demanda/`, solo para propietarios e inmobiliarias. Devuelve datos agregados de las búsquedas activas, sin datos personales: cantidad de búsquedas y de usuarios, tipos, rangos de precio, zonas, características, tendencia de las últimas 4 semanas y usuarios compatibles con cada publicación propia. Acepta los filtros `desde`, `hasta`, `zona` y `tipo_inmueble`.

## Archivado automático

El comando `archivar_publicaciones` archiva las publicaciones alquiladas hace 7 días o más. En producción se programa con el cron del servidor, por ejemplo todos los días a las 3:00:

```bash
0 3 * * * cd /ruta/al/backend && .venv/bin/python manage.py archivar_publicaciones
```

Para ejecutarlo a mano:

```bash
python manage.py archivar_publicaciones
```
