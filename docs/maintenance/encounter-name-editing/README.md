# Edición del nombre de tarjetas de encuentro

La normalización del perfil se ejecutaba en cada renderizado del editor: eliminaba el espacio al final de una palabra antes de poder escribir la siguiente y sustituía el campo vacío por «PNJ» o «Enemigo».

La tarjeta conserva ahora el nombre original del borrador durante la edición. El guardado sigue recortando solo los extremos y aplicando un nombre de reserva si continúa vacío. Editar otros campos y cerrar o reabrir el editor no elimina los espacios del borrador.

## Comprobaciones

- Tres suites, 14 pruebas correctas: aliados y enemigos de Campaña, Bestiario Roguelite, arte y edición de habilidades. La regresión escribe carácter a carácter, borra, modifica la descripción, guarda y vuelve a cargar la ficha.
- Edge con el editor real y datos en memoria: aliado y enemigo, escritorio de 1280 × 900 y móvil de 412 × 915; escritura con espacios, campo vacío, cierre/reapertura, guardado y salida/entrada al archivo.
- Compilación de producción correcta. [Publicación verificada](release.json).
- Capturas del editor: [escritorio](desktop.png), [móvil](mobile.png).

Registros en `output/playwright/encounter-name-editing-tests.log`, `encounter-name-editing-build.log` y `encounter-name-editing-deploy.log`.
