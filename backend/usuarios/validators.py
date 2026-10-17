from django.core.validators import RegexValidator

# Mismas reglas que el frontend (Registro.tsx) — el backend no confía en el cliente.
validador_celular = RegexValidator(
    regex=r'^[0-9+\s-]{8,20}$',
    message='Ingresá un número de celular válido.',
)

validador_contrasena = RegexValidator(
    regex=r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$',
    message='La contraseña debe tener al menos 8 caracteres, con una mayúscula, una minúscula y un número.',
)
