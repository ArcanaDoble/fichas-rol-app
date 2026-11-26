# Movimiento del Canvas y desplazamiento del máster

Corrección solicitada el 22/10/2026. Sustituye la interfaz de colocación por clic
publicada inicialmente: el usuario rechazó su franja, tamaño y guías añadidas.
La aclaración posterior recupera el fantasma de los jugadores; su retirada
en la publicación anterior fue un error, no una nueva preferencia visual.

## Movimiento habitual

- Arrastrar la ficha conserva la previsualización sin gastar movimiento todavía.
- El primer **Fin de turno** confirma ese movimiento y deja abierta la activación.
- La siguiente pulsación finaliza el turno. En móvil se conserva la pulsación
  mantenida habitual del reloj de arena para cada uno de esos pasos.
- HUD y panel de iniciativa usan la misma comprobación. Pulsar otra vez durante
  el guardado o fallar una confirmación no cierra el turno.
- Los jugadores conservan la copia fantasma y línea anteriores al arrastrar y
  mientras el movimiento está pendiente, además de los círculos amarillos.
  Sin rotación guardada, el fantasma usa 0° para mantener su posición visible.
  Las marcas doradas de destino y contador «1 / 2» nuevos siguen retirados.
- La ficha propia puede verse al arrastrarla sobre la niebla; la visión sigue en
  el origen confirmado hasta confirmar. No se muestran entidades nuevas.

## Desplazamiento sin coste del máster

1. Seleccionar la ficha.
2. Activar el icono de movimiento que sustituye al botón **Rotar 45°**.
3. Arrastrarla y soltarla normalmente, con ratón o dedo.
4. El icono permanece marcado para repetir desplazamientos en esa ficha. Volver
   a pulsarlo lo desactiva; Escape también lo desactiva.

El máster no muestra fantasma. La ficha queda donde se suelta durante el guardado,
sin volver al origen. La suelta puede llegar al viewport y a su listener global:
el segundo aviso se ignora mientras se guarda el primero, y el arrastre termina
localmente al soltar, sin esperar a Firebase.

No hay texto en el botón, franja de instrucciones, guía ni selección de casilla
por clic. La barra recupera su tamaño anterior. Los jugadores conservan su
movimiento habitual y no tienen acceso al modo sin coste.

Funciona fuera de turno, con movilidad agotada y estando derribado. Cambia solo
la posición y la última marca `forcedMovement` de sincronización, sin escribir
el estado de combate ni gastar/recuperar movimiento, acciones, dados o estados.
Muros, troncos, límites y ocupación conservan las comprobaciones del Canvas.
Las rotaciones de objetos y del Tablero se mantienen.

Una previsualización de movimiento del jugador afectada por un desplazamiento
externo se recoloca en el nuevo origen; conserva acciones pendientes y todos los
recursos ya confirmados. No se reabre ni se completa una activación.

## Comprobaciones

- 229 suites: 1598 pruebas correctas y una omitida.
- Regresión reproducida antes de corregir: una suelta duplicada devolvía la ficha
  al origen mientras se guardaba. Comprobada con ratón y toque, con guardado
  pendiente; mantiene el destino y una sola escritura.
- Pruebas dirigidas finales: confirmación en dos pasos, bloqueo de doble pulsación,
  arrastre real del Canvas con ratón y eventos táctiles, fichas derribadas,
  autoridad, persistencia por campos, obstáculos, fallos y recursos intactos.
- Chromium 1280×900: activación/desactivación y arrastre sin coste; un clic de
  fondo no mueve la ficha. Comparación completa del estado de combate.
- Chromium 390×844, eventos CDP reales: activar icono y arrastrar con el dedo una
  ficha derribada sin movilidad, conservar modo y recursos. Tamaño de la barra
  anterior, sin texto ni franja.
- Dos arrastres sucesivos del máster en PC y móvil con latencia de 650 ms:
  muestreo de posición local y posición visual en cada frame, sin salto ni
  fantasma y con combate/recursos íntegros.
- Jugador PC: arrastre pendiente, primer clic confirma y no actúa; segundo clic
  actúa, sin cobrar dos veces. Jugador móvil: movimiento pendiente y dos
  pulsaciones mantenidas reales en el reloj con el mismo resultado. Fantasma
  visible antes de confirmar y retirado después.
- Cliente develop-web-game ejecutado y salida inspeccionada. Su captura escoge
  un canvas auxiliar del token; la superficie completa se revisa con Playwright
  CLI. La consola registra la advertencia pasiva ya existente al tocar un fondo
  del Canvas; no hay excepciones JS en los flujos comprobados.
- Firebase en memoria para las pruebas; ningún encuentro real modificado.

## Evidencia actual

- [Máster PC tras dos arrastres](evidence/ghost-master-desktop.png)
- [Máster móvil tras dos arrastres](evidence/ghost-master-mobile.png)
- [Jugador PC: fantasma y movimiento pendiente](evidence/ghost-player-desktop.png)
- [Jugador móvil: fantasma y movimiento pendiente](evidence/ghost-player-mobile.png)
- [Jugador móvil: primer Fin turno confirmado](evidence/player-confirmed-mobile.png)

Ensayo local: `http://127.0.0.1:4173/output/playwright/forced-movement-preview.html`.
Añadir `?view=player` para el flujo de jugador. Fuente `ForcedMovementPreview.jsx`.

[Publicación actual](ghost-release.json). `drag-release.json`, `release.json` y las capturas anteriores
conservan la evidencia de la primera propuesta sustituida.
