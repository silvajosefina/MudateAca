# Mudate Acá: frontend

Aplicación web en React y TypeScript, compilada con Vite como aplicación web progresiva (PWA). Consume la API del [backend](../backend/README.md).

## Requisitos

- Node.js 20 o superior, con npm.
- El backend funcionando en `http://localhost:8000` para trabajar en local.

## Instalación y desarrollo

```bash
npm install
npm run dev
```

La aplicación queda en `http://localhost:5173`. En desarrollo, Vite deriva `/api` y `/media` al backend local, así el frontend y la API comparten origen como en producción y las cookies de sesión funcionan igual.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el servidor de desarrollo |
| `npm run build` | Revisa los tipos y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve localmente la versión compilada |
| `npm run lint` | Revisa el código con ESLint |
| `npm test` | Ejecuta las pruebas con Jest |
| `npm run test:coverage` | Ejecuta las pruebas con el informe de cobertura |

## Estructura de `src/`

| Carpeta | Contenido |
|---|---|
| `pages/` | Pantallas de la aplicación, una por ruta |
| `components/` | Componentes reutilizables: formularios, tarjetas, mapa, diálogos, encabezado |
| `layouts/` | Estructuras de página: pública, de acceso y de panel |
| `servicios/` | Comunicación con la API, sesión y adaptadores de datos |
| `hooks/` | Hooks propios para consultas y contadores |
| `types/` | Tipos de TypeScript y etiquetas de estados |
| `utils/` | Funciones auxiliares: formato, filtros, rutas y moderación |

## Conexión con la API

- Todas las llamadas usan axios con la base `/api` (`src/servicios/api.ts`).
- La sesión se guarda en cookies httpOnly que maneja el backend. El navegador solo guarda los datos del perfil, nunca los tokens.
- Ante un 401, la aplicación renueva la sesión una vez. Si no puede, la cierra y lleva al inicio de sesión.

## PWA

La aplicación se puede instalar en el celular o en la computadora. El service worker guarda la interfaz para que abra sin conexión, pero no guarda datos: publicaciones, mensajes y notificaciones necesitan internet.

## Publicación en producción

El frontend se compila en la PC y se sube al servidor con [`desplegar.ps1`](desplegar.ps1):

```powershell
powershell -ExecutionPolicy Bypass -File desplegar.ps1
```

El script compila, sube `dist/` con scp y reemplaza la versión publicada de una sola vez, guardando la anterior en `dist.anterior`. Antes de usarlo en otro servidor hay que revisar `$servidor` (usuario e IP) y `$clave` (ruta de la clave SSH).
