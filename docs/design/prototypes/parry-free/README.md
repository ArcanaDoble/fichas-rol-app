# Parry libre — previa interactiva

**Cambio posterior a sala compartida:** el usuario pide eliminar las invitaciones y permitir ataques directos entre todos los presentes, con espectadores y resultados comunes. La fixture de integración (`parry-free-integration-preview.html`) prueba ahora esa sala con tres clientes locales, usando los componentes, repositorio y transacciones reales. Parámetros: `?view=master`, `?view=player`, `?view=observer&stage=watch` (elecciones ocultas) y `?view=observer` (resultado). Los otros clientes de esta muestra eligen Arriba automáticamente. La previa original que se describe abajo se conserva como referencia histórica del acabado aprobado, no como descripción del recorrido actual.

Previa solicitada el 20/10/2026 para valorar el uso en mesa antes de integrar accesos en las fichas. No se despliega en Hosting ni utiliza datos reales.

**Diseño y recorrido aprobados:** el usuario confirma «Muy bien me gusta» el 20/10/2026. Conservar esta muestra como referencia para la futura integración.

**Integración solicitada y realizada:** tras esa aprobación el usuario pide incorporarlo a las fichas para jugadores y máster. La aplicación y esta muestra comparten ahora `FreeParryWindow` y `FreeParry.css`, conservando el acabado aprobado. La muestra original sigue simulando ambas vistas sin datos reales; la aplicación sí conecta las invitaciones y los compromisos de los dos participantes. Ver [funcionamiento integrado](../../../../src/features/parry-free/README.md).

## Probar

[Abrir Parry libre](http://127.0.0.1:4173/output/playwright/parry-free-preview.html).

1. Elige una zona en Jugador y pulsa **Fijar elección**.
2. Cambia a **Máster**, elige y fija su zona. Ambas se revelan automáticamente.
3. Prueba otra ronda, intercambiar roles o cerrar y reabrir. También puedes comenzar por el máster.
4. **PC / Móvil** cambia el ancho de la muestra; el panel se adapta también al ancho real del navegador.

La barra de cambio de vista y los controles PC/Móvil son exclusivos de la prueba. Simulan dos participantes en una sola sesión: no son permisos ni conexión multijugador. Recargar reinicia la ronda; cerrar la ventana no la descarta. En la versión de conversación solo se recuerdan las preferencias de vista y tamaño, sin enviar zonas secretas al anfitrión.

## Dirección y reutilización

- El mismo `CombatRose` y CSS de `CampaignCombatControls` / `CampaignCombatOverlay` que usa el Canvas. Sin reinterpretar las puntas aprobadas.
- Un único retrato del defensor, oro biselado, selección roja, sombra y resultado rojo/azul compartido.
- Panel azul noche, marfil/dorado, Cinzel/Alegreya/Lato y confirmación con esquina recortada.
- Selección por puntero, toque o flechas; 5 elige Centro. El centro tiene 44 × 44 px y no invade la base de las lanzas.
- El componente visible recibe su elección propia y la confirmación genérica del rival. El resultado con ambas zonas se crea solo cuando las dos están fijadas. Tampoco el máster puede consultar la zona rival mediante esta interfaz.
- No hay tiradas, gastos, Amenaza, alcance, daño ni dependencia del Canvas.
- No se modifican el HUD protegido, las fichas ni servicios de producción.

## Archivos y ejecución

`ParryFreePreview.jsx` contiene el controlador local. La presentación y estilos se importan de `src/features/parry-free/FreeParryWindow.jsx` y `FreeParry.css`. `entry.jsx`, `fragment.html` y `build-preview.cjs` generan la página y, opcionalmente, la misma muestra en conversación. El empaquetado excluye únicamente el módulo de dados/Firebase que la rosa no necesita; no sustituye la rosa ni sus estilos.

```powershell
node docs/design/prototypes/parry-free/build-preview.cjs
python output/playwright/serve-tree-preview.py
```

El servidor se limita a `127.0.0.1:4173`. El empaquetador usa esbuild ya instalado en la caché local y las dependencias del proyecto. Incluye los retratos locales en la muestra; las fuentes se cargan desde Google Fonts.

## Verificación

- Cinco pruebas en `src/features/canvas/components/__tests__/ParryFreePreview.test.jsx`: ambos órdenes de confirmación, secreto incluso ante el máster, bloqueo inmutable, acierto/fallo, colores del resultado, repetición, intercambio, teclado, cierre/reapertura y preferencias sin guardar zonas.
- Comprobación en navegador: PC de 1280 × 720; móvil de 390 × 844 y 320 × 740, sin desbordamiento horizontal. Centro de 44 × 44 px y confirmación de 54 px. Clic real en punta superior y base de flecha derecha, lejos del centro.
- Resultado fallado en escritorio y acertado en móvil; cierre con elección fijada y cambio de roles. Sin errores o avisos de consola en la muestra.
- Animación breve de coincidencia; se omite con movimiento reducido.

Evidencia: [selección móvil](evidence/choose-mobile.png), [fallo en PC](evidence/reveal-missed-desktop.png), [acierto móvil](evidence/reveal-matched-mobile.png).

Estas comprobaciones iniciales corresponden a la muestra aprobada. La posterior integración tiene pruebas independientes del protocolo y dos clientes, además de la fixture `parry-free-integration-preview.html` con el componente, controlador y repositorio de producción y un transporte local en memoria. El acabado aprobado se conserva; el estado de publicación y los límites del modelo de acceso se documentan en el registro de la integración.

## Integración publicada

La integración en fichas y herramientas del máster está publicada en [NOMA](https://base-de-datos-noma.web.app). La compilación y las 223 suites pasan (1558 pruebas correctas, una omitida). Manifiesto y archivos JavaScript/CSS publicados coinciden con los locales; no se modifican las reglas de Firestore ni los datos de partida durante la verificación. [Registro](release.json).

Evidencia del componente integrado con transporte local: [jugador en PC](evidence/integrated-player-desktop.png), [selección móvil](evidence/integrated-choose-mobile.png) y [máster esperando en 320 px](evidence/integrated-master-320.png). La comprobación de sincronización, confirmaciones simultáneas y reconexión se cubre además con dos clientes y almacenes privados separados en las pruebas del repositorio real.
