# Mudate Acá

Plataforma web para buscar y publicar alquileres residenciales y temporarios en Trenque Lauquen. Funciona como aplicación web progresiva (PWA), así que también se puede instalar en el celular.

**Sitio en producción:** https://mudateaca.duckdns.org

Proyecto de la materia Desarrollo de Software, UTN Facultad Regional Trenque Lauquen, 2026. Autora: Josefina Silva.

## Qué permite hacer

| Usuario | Funcionalidades |
|---|---|
| Visitante | Explorar las publicaciones activas con filtros y ver el detalle de cada una. |
| Interesado | Guardar favoritos, crear búsquedas activas con aviso de coincidencias, contactar anunciantes por chat y enviar reclamos. |
| Propietario e inmobiliaria | Publicar inmuebles con verificación documental, administrar sus estados, responder consultas y consultar el panel de demanda. |
| Administrador | Moderar publicaciones, gestionar usuarios y resolver reclamos. |

## Tecnologías

| Parte | Tecnologías |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router, Leaflet y PWA |
| Backend | Python, Django 6 y Django REST Framework, con autenticación JWT en cookies |
| Base de datos | PostgreSQL con PostGIS |
| Servicios | Cloudinary (archivos y respaldos) y Gmail SMTP (correos) |
| Producción | Oracle Cloud (Ubuntu), Nginx, Gunicorn, Let's Encrypt y DuckDNS |

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| [`backend/`](backend/) | API REST, panel de administración de Django, tareas programadas y configuración de producción |
| [`frontend/`](frontend/) | Aplicación React (PWA) y script de publicación |

## Ejecución en local

1. **Backend.** Instalar PostgreSQL con PostGIS, crear la base y levantar la API en `http://localhost:8000`. Los pasos están en [backend/README.md](backend/README.md).
2. **Frontend.** Con el backend funcionando, desde la carpeta `frontend`:

   ```bash
   npm install
   npm run dev
   ```

   La aplicación queda en `http://localhost:5173`. Los detalles están en [frontend/README.md](frontend/README.md).

## Pruebas

```bash
# Backend, desde la carpeta backend
python manage.py test

# Frontend, desde la carpeta frontend
npm test
```

## Producción

El sitio corre en un servidor de Oracle Cloud: Nginx sirve el frontend y deriva `/api` y `/admin` a Gunicorn, que ejecuta Django. Los archivos de configuración están en [`backend/deploy/`](backend/deploy/) y [`backend/cron/`](backend/cron/). El procedimiento completo, desde la creación de las cuentas, está en el Manual de Despliegue.
