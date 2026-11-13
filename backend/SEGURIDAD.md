# Pruebas generales de seguridad

Revisión de seguridad del backend de Mudate Acá antes de la entrega, realizada el 13/11/2026.

## Cómo repetirlas

```bash
python manage.py test config.tests_seguridad
python manage.py test
```

El primer comando ejecuta solo las pruebas de seguridad; el segundo, toda la suite (315 pruebas, todas aprobadas).

## Controles verificados

| Requisito | Control | Cómo se prueba |
|---|---|---|
| RNF-05 Autorización | Ninguna ruta de la API responde sin sesión, salvo registro, login, renovación de sesión, recuperación de cuenta y la consulta pública de publicaciones | `RutasProtegidasTests` recorre **todas** las rutas de la API: una ruta nueva sin permisos hace fallar la prueba |
| RNF-05 Autorización | Las rutas de administración rechazan a interesados, propietarios e inmobiliarias | `RutasProtegidasTests`, más las pruebas de cada módulo |
| RNF-05 Autorización | Nadie modifica, elimina ni lee recursos ajenos (publicaciones, búsquedas, favoritos, reclamos, conversaciones, notificaciones) | Pruebas de cada módulo, por ejemplo `test_no_permite_editar_publicaciones_ajenas` |
| RNF-05 Autorización | No se pueden modificar campos protegidos desde la API, como estado, propietario, rol o correo | `test_el_estado_no_se_edita_por_esta_via`, `test_el_perfil_no_permite_cambiar_rol_correo_ni_estado` |
| RNF-04 Contraseñas | Se guardan con hash PBKDF2; se rechazan contraseñas débiles | `test_la_contrasena_nunca_se_guarda_en_texto_plano`, `test_rechaza_contrasenas_debiles` |
| RNF-04 Sesión | Los tokens viajan en cookies `HttpOnly` y `SameSite=Lax`, nunca en el cuerpo; en producción, solo por HTTPS | `SesionYContrasenasTests` |
| RNF-04 Sesión | Se limitan los intentos de login y registro a 10 por minuto | `test_frena_los_intentos_repetidos_de_login` |
| RNF-04 Sesión | Un login fallido no revela si el correo existe | `test_un_error_de_login_no_revela_si_el_correo_existe` |
| RF-20 Suspensión | Una cuenta suspendida no inicia sesión, pierde la sesión abierta y no puede renovarla | `SuspensionTests` |
| RNF-06 Documentación | Los documentos de verificación quedan fuera de las carpetas públicas y solo los descargan el dueño o un administrador; con Cloudinary, mediante un enlace firmado que vence a los 10 minutos | `DocumentoDeVerificacionTests`, `AlmacenamientoCloudinaryTests` |
| RNF-08 Validación | Los archivos se validan por contenido, no solo por extensión, con un máximo de 10 MB | `ArchivosSubidosTests` |
| RNF-08 Validación | Los filtros no permiten inyección SQL | `test_los_filtros_no_permiten_inyeccion_sql` |
| RNF-07 Privacidad | Las vistas públicas no exponen correo, celular, documentación ni datos de quienes buscan | `test_no_expone_datos_privados_al_publico`, `test_agrega_la_demanda_sin_datos_personales` |
| RNF-10 Errores | Todos los errores responden en JSON y en español, sin detalles internos, incluso un error inesperado | `ErroresGeneralesDeLaApiTests`, `ErroresSinDetallesInternosTests` |
| CORS | Solo el frontend configurado puede llamar a la API con credenciales | `test_solo_el_frontend_configurado_puede_llamar_a_la_api` |
| RNF-11 Backups | Copia diaria verificada, guardada fuera del servidor y conservada 7 días | `respaldos/tests.py`, más una restauración real comprobada tabla por tabla |
| RNF-12 Auditoría | Suspensiones, eliminaciones lógicas, decisiones de moderación y cambios de estado de reclamos quedan registrados | Pruebas de cada módulo sobre `RegistroAuditoria` |

## Problemas encontrados y corregidos en esta revisión

| Gravedad | Problema | Corrección |
|---|---|---|
| Alta | Los documentos de verificación se podían descargar sin sesión conociendo su URL, porque el servidor de desarrollo publicaba toda la carpeta `media` | Se guardan en un almacenamiento privado y se descargan solo desde `GET /api/publicaciones/<id>/documento/` |
| Media | Se aceptaba cualquier archivo con extensión `.pdf`, `.jpg` o `.png`, aunque su contenido fuera otro, por ejemplo un ejecutable | Se valida el contenido real y se limita el tamaño a 10 MB |
| Media | Una cuenta suspendida podía renovar su sesión, aunque no pudiera usarla | La renovación se rechaza y se borran las cookies |
| Media | Con `DEBUG` apagado, un error inesperado devolvía la página HTML de Django en inglés | Responde un JSON en español sin detalles |
| Baja | Al superar los intentos de login, el mensaje decía "Solicitud fue regulada (throttled)" | "Hiciste demasiados intentos.", con el tiempo de espera |
| Alta (frontend) | Dependencias de producción con vulnerabilidades conocidas: `dompurify` (crítica), `follow-redirects` y `vite` | Actualizadas a versiones compatibles con `npm audit fix` |

En las revisiones anteriores también se corrigieron un error 500 al llamar rutas sin la barra final, los mensajes 404 en inglés y los mensajes técnicos, por ejemplo "clave primaria", en los errores de validación.

## Resultado de las herramientas

- **`python manage.py check --deploy`**, con la configuración de producción (`DJANGO_DEBUG=False` y correo SMTP): sin observaciones.
- **`pip-audit`** sobre las dependencias del backend: sin vulnerabilidades conocidas.
- **`npm audit --omit=dev`** sobre el frontend: sin vulnerabilidades, después de la actualización.
- **`npm audit`** con las herramientas de desarrollo: quedan 30 avisos moderados o bajos en Jest, ESLint y el plugin de PWA. No llegan al sitio publicado, y arreglarlos exige cambiar de versión mayor esas herramientas.

## Pendiente para el despliegue

- **Variables de producción:** `DJANGO_DEBUG=False` y una `DJANGO_SECRET_KEY` nueva y secreta. Con `DEBUG` apagado se activan solos la redirección a HTTPS, HSTS y las cookies seguras.
- **HTTPS:** un certificado en el servidor; si hay un proxy, debe enviar `X-Forwarded-Proto`.
- **Correo:** un servidor SMTP real, necesario para la recuperación de cuenta y los avisos de suspensión.
- **Cloudinary:** cargar las credenciales para que las fotos, la documentación y los backups salgan del servidor.
- **Backups:** programar `respaldar_base` una vez por día con cron.
- **Usuario de la base:** en producción debe ser dueño de la base, sin `SUPERUSER`. El permiso `SUPERUSER` solo hace falta en desarrollo, para que las pruebas creen PostGIS.
