# Parry libre de Campaña

Sala compartida para comparar zonas de ataque/parry mientras los dados, recursos y daño se resuelven en mesa. Independiente del Canvas y de su automatización de combate.

## Accesos y recorrido

- **Personajes de Campaña:** Parry sustituye a Velocidad en la fila de etiquetas. Si no existe esa etiqueta, se muestra un único acceso automático. Abre la sala con el nombre y retrato de la ficha.
- **PNJ de Campaña:** acceso junto a su perfil de combate.
- **Máster:** Parry libre en el menú de herramientas del máster.

Abrir Parry te incorpora a la sala. Los demás aparecen cuando abren el mismo acceso. Puedes cambiar el nombre del personaje que representas, también para jugar como PNJ. Pulsa **Atacar** junto a otra persona presente: la parada empieza directamente para ambos, sin invitaciones ni aceptación. Cualquier jugador puede atacar al máster o a otro jugador, y el máster a cualquier jugador.

Hay **una única parada activa en la sala**. Los dos participantes eligen con las lanzas y fijan su zona por separado. Los espectadores ven quién ataca, quién hace parry y quién ha confirmado; no pueden elegir ni confirmar por ellos. Cuando se verifican las dos elecciones, todos ven el ataque rojo, el parry azul y la coincidencia o diferencia entre zonas. No se calcula daño ni se gastan recursos.

### Una o varias zonas

**Una zona** conserva el toque anterior: elegir otra punta sustituye la selección. **Varias zonas** permite añadir o quitar cada zona con un toque; **Todas** marca las cinco o las desmarca si ya estaban marcadas. Funciona igual para ataque y parry, jugadores y máster. El modo y la cantidad elegida también permanecen privados. Las dos puntas inferiores siguen representando la única zona lógica «Abajo».

Las zonas de ataque aparecen en rojo y las de parry en azul. Al revelar, las coincidencias comparten los dos colores. Si solo coincide parte del ataque, el resultado indica «Coinciden algunas zonas» y enumera las coincidencias y las zonas de ataque sin coincidencia; no decide por la mesa el daño o el efecto del bloqueo. No se vincula el número de zonas a equipo ni recursos automáticos.

En PC se puede recorrer el grupo múltiple con flechas y marcar o desmarcar con Espacio/Intro; el modo de una zona mantiene las flechas de selección directa. Los controles de modo y Todas tienen al menos 44 px de altura.

Al revelarse puedes pulsar Atacar junto a otro participante, repetir con el mismo o intercambiar roles. El historial conserva solo las tres últimas paradas resueltas: cada nueva sustituye a la más antigua. Las salas anteriores se recortan al entrar o renovar presencia; la interfaz también limita la lista a tres mientras llega la actualización. Cualquiera puede consultar esos resultados sin alterar la jugada actual. Una nueva parada no puede sobrescribir otra pendiente, ni dos clics simultáneos avanzar dos rondas.

## Pertenencia, presencia y recuperación

- Cerrar el panel conserva la pertenencia y la ronda. Se vuelve a entrar desde los accesos habituales, sin notificación flotante para máster ni jugadores; recibir un ataque lleva directamente a su vista al tener el panel abierto.
- **Salir de la sala** elimina tu pertenencia. Si estabas en una parada pendiente, la cancela sin revelar tus elecciones. El máster también puede cancelar una parada bloqueada.
- Cada cliente presente renueva su señal de presencia cada 30 segundos. Tras dos minutos sin señal aparece ausente y no se le puede elegir como nuevo objetivo. Un navegador abierto conserva su pertenencia entre secciones y recargas hasta salir de la sala.
- Al desbloquear el móvil, volver a la pestaña o recuperar la red, la sala restablece la escucha y renueva la presencia de quien sigue dentro. «Sincronizando la sala…» indica que está esperando el estado actual para habilitar la confirmación. Si el rival ya confirmó, el navegador en el que fijaste las zonas completa la revelación automáticamente. También puedes retomar un borrador de la misma parada si la pestaña sigue abierta.
- Puedes dejar el Canvas abierto en el ordenador y jugar Parry en el móvil. La elección fijada se guarda en ese navegador y sobrevive a una recarga. Si el sistema cierra la pestaña por completo, vuelve a entrar con el mismo usuario y navegador. El botón de reintento sigue disponible ante un error de conexión.
- Eliminar o limpiar un jugador retira su pertenencia e intercambios, conservando a los demás miembros de la sala.

## Datos y elecciones secretas

`freeParryService.js` escucha el documento `parryFreeRooms/main`, compartido por esta mesa, sin índices compuestos nuevos. `freeParryRoom.js` valida pertenencia, presencia, destinatario y generación de la parada dentro de transacciones. El protocolo de elecciones sigue siendo `freeParryProtocol.js`:

- Cada confirmación produce una huella SHA-256 con zona, partida, ronda, puesto y nonce aleatorio de 256 bits. Firestore recibe primero la huella, sin zona ni nonce.
- Las elecciones múltiples comprometen el conjunto completo de zonas en orden canónico, con dominio de hash `parry-free-choice-v2`. Una sola zona conserva el protocolo v1, incluidas elecciones e historiales anteriores. Cambiar, añadir o quitar una zona después de confirmar invalida la huella. Reordenar el mismo conjunto no altera su significado.
- El secreto se guarda en el navegador por controlador, ronda, puesto y huella. Dos pestañas no pueden pisar el nonce de la confirmación ganadora.
- Solo tras observar las dos confirmaciones cada cliente publica su revelación. La interfaz, también para espectadores y máster, necesita las dos revelaciones válidas antes de mostrar zonas o resultado. El historial solo incorpora paradas ya verificadas.
- Confirmar, revelar, repetir y cancelar comprueba la ronda y sesión actuales. Un espectador no puede jugar ni avanzar la parada ajena. El máster puede cancelarla, pero no ver antes la zona rival.

Las antiguas partidas por invitación en `parryFreeGames` quedan fuera del nuevo recorrido y no se migran a la sala. Se conserva su limpieza al eliminar jugadores. Sus funciones de protocolo se mantienen como compatibilidad y referencia de pruebas, sin accesos de invitación en la interfaz.

Se mantienen las reglas permisivas de Firestore y el modelo de identificación actual, sin autenticación individual de Firebase. El compromiso evita enviar zonas antes de las dos confirmaciones en el flujo normal; las comprobaciones del cliente no protegen frente a alguien que modifique directamente los datos compartidos.

## Presentación y comprobaciones

«Tu personaje» integra el retrato en el fondo de su franja, con rostro a la derecha y fundido oscuro hacia el nombre editable y el borde inferior. Reutiliza la presentación ilustrada de objetos y combate; no conserva la miniatura cuadrada. Sin imagen, permanece la identidad tipográfica. [PC y móvil](../../../docs/design/prototypes/parry-free/identity-art-release.json), edición del nombre, fallback y ocho pruebas dirigidas verificados.

«Cambiar rival» aparece como acción delineada dorada del resultado junto a Otra ronda e Intercambiar roles; en móvil ocupa una fila completa. Abre Participantes y sitúa la lista a la vista con foco en su encabezado, también en PC. Durante una parada pendiente el enlace se llama «Ver participantes»; tras un resultado, los espectadores disponen de «Elegir rival». [Captura móvil](../../../docs/design/prototypes/parry-free/evidence/change-rival-mobile.png) · [Publicación y once pruebas dirigidas](../../../docs/design/prototypes/parry-free/change-rival-release.json).

`FreeParryProvider`, `FreeParryWindow` y `FreeParry.css` desarrollan el acabado existente de NOMA: azul noche, Cinzel/Alegreya/Lato, oro cálido y lanzas biseladas. Las filas funden los retratos reales con el fondo; la identidad propia incorpora su retrato y la espera reúne medallones de miembros de la sala. El defensor protagoniza la parada con un fondo fundido de su imagen y el retrato central. Dos arcos rojo/azul indican únicamente las confirmaciones públicas. El historial reutiliza `CombatRose` para representar resultados ya verificados.

PC mantiene participantes e historial junto a la parada. Móvil alterna Participantes/Parada y abre automáticamente la nueva parada, con controles táctiles y confirmación accesible al recorrer el panel; a 320 px se conserva el desplazamiento vertical. Se mantienen los textos solicitados, el secreto hasta ambas confirmaciones y el recorrido sin invitaciones. El HUD de armas y sus modificadores no cambian.

Las pruebas cubren tres clientes independientes, ataque directo máster/jugador y jugador/jugador, espectador sin elecciones, compromiso privado, revelación pública, cambio de objetivo, repetición concurrente, salida, recarga y reintento. Se comprueban ausencia, límite de historial y limpieza de un jugador sin borrar la sala.

La fixture `docs/design/prototypes/parry-free/integration-preview.jsx` monta la sala y el repositorio de producción con un transporte Firebase local en memoria. Se construye con `node docs/design/prototypes/parry-free/build-integration-preview.cjs`. Sus otros dos clientes eligen Arriba automáticamente solo en esta muestra. La verificación visual no crea partidas ni modifica datos reales.

Registros históricos de publicación: [integración inicial](../../../docs/design/prototypes/parry-free/release.json) y [sustitución de Velocidad](../../../docs/design/prototypes/parry-free/tag-release.json). El recorrido de invitaciones de esas versiones queda sustituido por la sala compartida solicitada después.

La entrega inicial de la sala pasó la compilación y las 224 suites completas: 1564 pruebas correctas y una omitida. Es una comprobación histórica, registrada en [room-release.json](../../../docs/design/prototypes/parry-free/room-release.json). Evidencia de esa entrega con el código de producción y transporte local: [PC](../../../docs/design/prototypes/parry-free/evidence/room-master-desktop.png), [resultado móvil](../../../docs/design/prototypes/parry-free/evidence/room-result-mobile.png) y [espectador a 320 px](../../../docs/design/prototypes/parry-free/evidence/room-observer-320.png).

**Ajuste del 21/10/2026:** la sala usa la denominación parada, elimina Disponible y el lema inicial, muestra Salir de la sala en rojo con respuesta al ratón/foco y utiliza los textos pedidos por el usuario. Se corrige la selección persistente del menú del máster para permitir cerrar y reabrir repetidamente desde el mismo acceso. Una regresión con el menú real reproduce el bloqueo anterior y comprueba tres reaperturas.

Publicado con compilación y 15 pruebas dirigidas correctas; se verifican manifiesto y hashes de JS/CSS en Hosting. [Registro](../../../docs/design/prototypes/parry-free/wording-release.json) · [PC](../../../docs/design/prototypes/parry-free/evidence/parada-texts-desktop.png) · [móvil](../../../docs/design/prototypes/parry-free/evidence/parada-texts-mobile.png).

**Refinamiento visual del 21/10/2026:** publicado en Hosting de `base-de-datos-noma`, con manifiesto remoto y hashes SHA-256 de JS/CSS coincidentes. Esta entrega pasa cuatro suites dirigidas y 21 pruebas (`FreeParryIntegration`, `freeParryProtocol`, `ParryFreePreview` y `ClassListCampaignSmoke`) y la compilación de producción. Se verificaron teclado/toque y siete capturas a 1280 × 720, 390 × 844 y 320 × 740 con los componentes y servicio reales sobre transporte local, sin escribir en la sala de producción. La [revisión independiente](../../../docs/design/prototypes/parry-free/visual-review.md) concluye `ship`, sin correcciones materiales; no sustituye la valoración visual del usuario. [Dirección y siete capturas](../../../docs/design/prototypes/parry-free/visual-direction.md) · [Registro de publicación](../../../docs/design/prototypes/parry-free/visual-release.json) · [Pruebas](../../../output/playwright/parry-visual-tests.log) · [Compilación](../../../output/playwright/parry-visual-build.log).

**Corrección de controles del 21/10/2026:** X aislada y centrada en su área táctil, foco del nombre limitado al subrayado dorado y «Otra ronda» con el oro sólido y la geometría del flujo de ataque, según la corrección del usuario. Verificados los tres ajustes en PC/móvil, compilación y dos suites con 11 pruebas correctas; la revisión independiente concluye `ship`, sin correcciones materiales. Publicación en Hosting comprobada con manifiesto y hashes de JS/CSS coincidentes. [Cuatro capturas y logs](../../../docs/design/prototypes/parry-free/visual-direction.md#corrección-de-controles--21102026) · [Registro](../../../docs/design/prototypes/parry-free/controls-release.json).
