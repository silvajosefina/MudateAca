# Pruebas unitarias del backend: autenticación

Entrega de la tarea N°6. Siguiendo la indicación de la cátedra, las pruebas se enfocan en la autenticación: login correcto, inválido y con límite de intentos, contraseñas cortas, y los endpoints relacionados.

Todas están en [`usuarios/tests_autenticacion.py`](usuarios/tests_autenticacion.py).

## Cómo ejecutarlas

```bash
python manage.py test usuarios.tests_autenticacion
```

Resultado: **45 pruebas, todas aprobadas**.

Para medir la cobertura se usa `coverage`, una herramienta solo de desarrollo:

```bash
pip install -r requirements-dev.txt
coverage run --source=usuarios --omit="usuarios/tests*.py,usuarios/migrations/*" manage.py test usuarios.tests_autenticacion
coverage report -m
```

## Cobertura

| Módulo | Qué contiene | Cobertura |
|---|---|---|
| `usuarios/authentication.py` | Lectura del token desde la cookie y bloqueo de cuentas suspendidas | 100% |
| `usuarios/validators.py` | Reglas de contraseña y celular | 100% |
| `usuarios/views.py` | Registro, login, logout, renovación, perfil y recuperación | 96% |
| `usuarios/serializers.py` | Validación de los datos de entrada | 94% |
| `usuarios/managers.py` | Creación de usuarios y búsqueda por correo | 91% |

Junto con el resto de las pruebas de la app `usuarios`, la cobertura de la app es del 98%.

## Tipos de prueba

- **Unitarias puras:** las de `ValidadoresTests` validan reglas sueltas sin base de datos ni API.
- **De endpoints:** el resto hace pedidos reales a la API sobre una base de datos de prueba que se crea y se borra en cada ejecución.

## Casos probados

| Tema | Casos | CP del SRS |
|---|---|---|
| **Validadores** | Contraseña válida. Contraseñas de menos de 8 caracteres, sin mayúscula, sin minúscula, sin número o vacías. Contraseñas comunes o solo numéricas. Celulares válidos e inválidos | CP-01, CP-02 |
| **Login correcto** | Devuelve el usuario sin la contraseña, abre la sesión y envía los tokens en cookies `HttpOnly` (y `Secure` en producción), nunca en el cuerpo. Acepta el correo en mayúsculas | CP-02 |
| **Login inválido** | Contraseña incorrecta, correo inexistente con la misma respuesta (no revela si el correo existe), campos vacíos o faltantes, y cuenta suspendida con su motivo | CP-02, CP-20 |
| **Login con límites** | Después de 10 intentos por minuto responde 429 con el tiempo de espera, incluso con la contraseña correcta | CP-02 |
| **Registro** | Registro correcto, correo en minúsculas, correo ya registrado (aunque cambien las mayúsculas), contraseña corta o débil, campos obligatorios, correo o celular inválidos, rol de administrador no permitido, contraseña guardada con hash y límite de intentos | CP-01 |
| **Recuperación de cuenta** | Envía el enlace, responde igual si el correo no existe, encuentra la cuenta con mayúsculas, cambia la contraseña, el enlace se usa una sola vez, vence a la hora, rechaza enlaces adulterados y contraseñas nuevas cortas | CP-03 |
| **Sesión** | El perfil exige sesión. El logout borra las cookies e invalida la renovación. La renovación descarta el token anterior. Rechaza tokens inválidos, adulterados o de cuentas suspendidas | CP-02, CP-20 |
| **Contraseñas guardadas** | `createsuperuser` guarda la contraseña elegida, nunca se guarda en texto plano y un superusuario con mayúsculas en el correo puede entrar | CP-02 |

## Error encontrado y corregido

Las pruebas detectaron que **el login fallaba si el correo se escribía con mayúsculas**, por ejemplo `Usuario@MudateAca.com`, aunque la contraseña fuera correcta. El registro guardaba el correo en minúsculas, pero el login lo buscaba tal cual llegaba.

Ahora el login y la recuperación de cuenta buscan el correo sin distinguir mayúsculas, y todos los usuarios nuevos se guardan en minúsculas, también los creados con `createsuperuser`. Se comprobó que, sin la corrección, las pruebas correspondientes fallan.
