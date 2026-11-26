# Copiar y pegar en la posición del ratón

Petición del 22/10/2026: poder pegar directamente un token dentro de una zona
cerrada por muros. El pegado anterior usaba siempre el origen de la copia +40 px.

Ctrl/Cmd+C conserva la selección. Al mover el ratón sobre el mapa y pulsar
Ctrl/Cmd+V, el centro de la copia aparece en el punto señalado. Se aplican el
zoom, el paneo y las reglas de ajuste a rejilla actuales. Se observa el ratón
sin provocar renders y la conversión a coordenadas del mapa ocurre al pegar.

Varias fichas mantienen su distribución relativa, con el conjunto centrado en
el cursor. Los extremos de muros copiados se trasladan con sus límites. Cada
copia tiene una identidad nueva; el original y sus datos permanecen intactos.
Si el ratón no está sobre el mapa, se usa el centro de la vista.

El pegado crea una ficha en el destino: no recorre un camino ni consume
movimiento. Las comprobaciones del arrastre normal continúan vigentes.

## Verificación

- Canvas real con Firestore en memoria: selección, Ctrl+C y Ctrl+V dentro de
  cuatro muros cerrados. Posición comprobada con y sin zoom/paneo; se conservan
  Vida, inventario, estados, original y muros.
- Pruebas de agrupación, ajuste de fichas pequeñas a rejilla y extremos de muros.
- 18 pruebas dirigidas correctas. Suite completa: 231 suites, 1605 pruebas
  correctas y una omitida. Compilación de producción correcta.
- Chromium 1280×900: dos pegados con teclado y ratón reales en el recinto,
  después de cambiar zoom y panear. Centro de las copias coincide con el cursor;
  estado de combate y recursos existentes intactos, sin excepciones JavaScript.
- [Captura del recinto](closed-room.png) · [Publicación verificada](release.json).

## Comprobación posterior en Firefox

El usuario aclara que el copiado de zonas funciona en Edge y que la incidencia
se produce en su Firefox. Ensayo local con Firefox 156 en perfil limpio: zonas
rectangulares, circulares y peligrosas copiadas y pegadas con Ctrl+C/V justo
después de crearlas y de nuevo tras seleccionarlas con el ratón. Las seis
copias conservan su geometría y se guardan en la escena en memoria; no hay
excepciones JavaScript. No se reproduce la incidencia en este perfil de prueba.
Esta comprobación no identifica la causa del problema del perfil del usuario.
[Captura de Firefox](firefox-areas.png). Sin nuevos cambios de comportamiento.

## Bloqueo intermitente por foco oculto

El usuario confirma después que también ocurre en Edge y que recargar lo
restablece. Se reproduce un bloqueo concreto en Edge: el sidebar cerrado seguía
montado y sus inputs entraban en la navegación con Tab. Con un input oculto
enfocado, Ctrl+C/V quedaba correctamente excluido por la protección de campos de
edición y no llegaba al portapapeles del mapa. El ensayo inicial de Firefox no
había incluido esa secuencia de foco.

Corrección:

- Panel cerrado con `inert` y `aria-hidden`, fuera del foco y de la navegación
  asistida. Se libera el foco de sus controles al cerrarlo.
- El mapa recibe el foco al seleccionarlo, arrastrar o empezar a redimensionar;
  no lo roba a botones ni a campos de edición.
- El contenedor del espacio de juego recorta sin convertirse en una superficie
  desplazable: el foco en el inspector durante su transición no puede arrastrar
  horizontalmente el Canvas. Los paneles interiores mantienen su scroll propio.
- Portapapeles interno en una referencia disponible durante el propio atajo,
  para permitir copiar y pegar seguido sin esperar un render.
- Atajos insensibles a mayúsculas. Ctrl/Cmd+C se consume solo al copiar una
  selección; la escritura, selección y pegado de texto siguen en sus campos.

Verificación adicional: 20 pruebas dirigidas; 231 suites completas, 1607 pruebas
correctas y una omitida. Compilación correcta. En Edge y Firefox 1280×1000 se
recorren 35 pasos de Tab sin entrar al panel cerrado y se completan cuatro
ciclos de crear/editar/cerrar/copiar, con nueve pegados por navegador, atajos en
mayúsculas y sin recargar. Sin excepciones JavaScript. Datos en memoria.

[Edge](focus-edge.png) · [Firefox](focus-firefox.png) ·
[Publicación de la corrección](focus-release.json).
Logs: `output/playwright/clipboard-stall-focused.log`,
`output/playwright/clipboard-stall-tests.log`, `output/playwright/clipboard-stall-final-build.log`
y `output/playwright/clipboard-stall-final-deploy.log`.

Ensayo local: `preview.jsx`, basado en el Canvas real con Firebase en memoria.
URL de trabajo: `http://127.0.0.1:4173/output/playwright/cursor-paste-preview.html`.
Ningún encuentro real se modifica durante las pruebas.

Logs: `output/playwright/cursor-paste-focused.log`,
`output/playwright/cursor-paste-tests.log`, `output/playwright/cursor-paste-build.log`
y `output/playwright/cursor-paste-deploy.log`.
