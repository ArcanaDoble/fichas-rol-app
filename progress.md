Original prompt: Perfecto. Ahora necesito que vayas implementando cada cambio que ya hicimos antes, pero lo haremos poco a poco.

## Descontar Vida temporal desde el inspector (2026-09-28)

- Los segmentos dorados eran spans de solo lectura. Ahora cada bloque disponible permite descontar 1 Vida temporal con ratón, toque o teclado mediante `setCurrentStat` / `updateItem`, preservando máximo, origen y Vida normal. Los gastados quedan deshabilitados; no se pueden curar. También se muestran si el máximo normal es cero. Guarda por Confirmar cambios, como los demás recursos.
- Regresión cubierta para jugador y enemigo: 2→1→0, no regeneración al pulsar gastados, conservación de metadatos y Vida normal.

## Indicadores de estado legibles (2026-09-28)

- Petición: ampliar los estados minúsculos y adaptarlos a coronas, retratos circulares y siluetas. `TokenStatusBadges` sustituye los iconos de 7px dentro del marco seleccionado por medallones de 26–40px en pantalla, arco lateral/columna, contrarrotación, colores semánticos y contador de excedentes. No cambia reglas ni permisos de visibilidad; conserva `isPresentedPoisoned` y aparece sin selección.
- Playwright: seis escenarios (PC, móvil, varios estados, 0.25, 2x2, rotación), sin errores JS; dimensiones verificadas y capturas inspeccionadas. Cliente develop-web-game ejecutado. Demo local en 4219, artefactos `output/silhouette-review/status-*`.
- Pruebas existentes: 6 pasan; persiste el fallo previo de `boardTokenCrowns` que espera offset 58px y recibe 66px (geometría de coronas no modificada aquí).

## Gasto de Maná de nivel 1 (2026-09-28)

- Mismo alcance acordado para recursos: generación manual; implementada la potenciación de Descarga arcana, no el catálogo de conjuros ni recargas por ronda. `canvasMana.js` valida clase/reserva/Catalizador único, coste 0 o 1 y dado base homogéneo. Un punto añade un solo dado base; no concede Crítico, pero hereda el rasgo activo y sus cadenas.
- Preparar ataque tiene toggle accesible y táctil, reserva y remanente. Maná a cero permite Descarga normal; si la reserva cambia mientras está seleccionado, bloquea confirmar hasta desactivar. Consumo transaccional comparte la ruta de Furia y actualiza aventura vinculada. Resultado/registro separan Maná con paleta violeta arcana.
- 112 pruebas / 9 suites relevantes pasan; compilación de producción correcta. Playwright PC y móvil sin errores JS, reserva 1→0, un dado adicional, capturas inspeccionadas. Cliente develop-web-game ejecutado e inspeccionado. Demo temporal en 4222 `?mode=mana&start=confirm`.

- 2026-09-28: usuario solicita explicar el flujo base del Pícaro y distinguir dados por color. Implementada apariencia común `combatDieAppearance`: Furia rojo, Crítico ámbar, modificadores azul en preparación/resultados y registro Canvas. Oro base y rojo Amenaza preservados. Golpe sucio revisado contra documento: 1 Astucia, repetir un dado de arma tras verlo y elegir resultado; no automatizado en este cambio de color.

## Furia ofensiva de nivel 1 (2026-09-28)

- Petición autorizada: integrar únicamente el gasto de Furia en el ataque automático; generación manual, sin progresión nueva. `canvasFury.js` valida reserva y armas cuerpo a cuerpo/Arrojadizas. Cada punto añade un dado de perfil; Crítico respeta supresión y protecciones existentes. Perfiles mixtos bloqueados con explicación hasta cerrar su referencia reglamentaria.
- Preparar ataque incorpora contador táctil −/+ con reserva, dados añadidos y remanente; confirmación definitiva paga. La transacción revalida Furia/equipo/permisos/dados y escribe combate, ficha y aventura vinculada; cancelar no consume. Tirada separa Furia de arma/modificadores; registro identifica dados y coste. Probado también en práctica.
- 78 pruebas pasan en 7 suites relacionadas. Build de producción correcto. Revisión Playwright escritorio/móvil: 2 Furia gastada, 2 dados adicionales, reserva restante 1, sin errores JS. Preview temporal `output/fury-review`, servidor 4222 con recursos públicos; capturas inspeccionadas.
- La ejecución global detectó un fallo ajeno en `boardTokenCrowns.test.jsx`: esperaba 58px, el ribbon actual da 66px. No se modifica geometría de coronas en esta tarea. Dos expectativas antiguas de argumentos de confirmación se preservaron evitando enviar `furySpend: 0`.

- 2026-09-27: Veneno de siluetas deja de usar la atenuación radial de retratos circulares. Campo compartido de nubes y onda móvil sobre toda la imagen, recortado por su alfa; los retratos conservan el campo anterior. Solo calcula el campo adicional si hay siluetas suscritas. Verificación de navegador durante 8 s: alfa superior/central/inferior cambia entre [155,85,41], [112,133,76], [42,53,121], [52,55,41]; todas las zonas participan. Capturas temporales y cliente develop-web-game inspeccionados en output/silhouette-review/poison-drift-*.png. Sin errores JS.

## Siluetas transparentes y recursos (2026-09-27)

- Petición: recortar todos los efectos al token no circular y adaptar las coronas. Máscara alfa CSS compartida (`tokenSilhouette.js`, contain/center/no-repeat y prefijos WebKit) para Veneno, Brea, impacto, Oculto, curación, Antídoto, Presteza/Vitalidad y highlights/correr. Los efectos en capas flotantes reciben imagen, forma y rotación desde TacticalViewport. La animación se mantiene dentro de una máscara fija; indicadores externos quedan legibles.
- Tokens estándar no circulares usan TokenResourceCrown como los de Canvas/Tablero: cinta inferior de Vida, superior de Postura/Hambre, una sola etiqueta de nombre. Segmentos dimensionados según tamaño/zoom; colores temporales/veneno y feedback preservados. Se corrigen separación del marco, avisos de recogida y captions de pociones.
- 88 pruebas dirigidas en 11 suites y build correctos. Preview aislado puerto4219 con silueta SVG asimétrica y huecos, proporción 100x160 dentro de caja cuadrada; comparación con retrato circular. Capturas revisadas para escritorio/móvil emulado, rotación35 grados, Veneno/Brea/Oculto/daño/pociones. Antídoto comprobado específicamente con remove-poison; sin errores JS. Cliente develop-web-game ejecutado y captura inspeccionada. Evidencia output/silhouette-review.
- Pendiente valoración estética del usuario. Sin commit ni despliegue.

- 2026-09-27: aviso de recogida unificado con las etiquetas de nombre, a petición del usuario: misma clase de texto (Alegreya 14), superficie CSS compartida, borde tenue y fondo azul oscuro. Eliminado separador vertical; «Soltar» en cursiva dorada. Revisión visual en navegador y separación de 8.2 px conservada en zoom 0.3–4.

- 2026-09-27: corregido solapamiento de «Soltar · Nombre» con la etiqueta de Vida. El aviso usa el desplazamiento real de la corona, reserva 26 px para la etiqueta y 8 px de separación en pantalla; sustituye el margen fijo en coordenadas del mapa. Verificación visual y medición en navegador a zoom 0.3/0.5/1/2/4: separación de 8.2 px en todos. Captura output/pickup-cursor-review/spacing.png. Sin cambios en la recogida ni sus permisos.

## Recogida con cursor en duelo y formación (2026-09-27)

- Petición: evitar entregas accidentales al token vecino al arrastrar objetos. La previsualización y la entrega usan el mismo worldPoint del ratón/toque y las posiciones visuales de combate. Selección por retrato y proximidad al centro, sin priorizar el solapamiento del objeto arrastrado; margen pequeño de borde y controles de propiedad preservados.
- La ficha resaltada muestra «Soltar» y su nombre en Alegreya. No se alteran reglas de inventario, equipamiento ni recogida por movimiento.
- 40 pruebas dirigidas correctas en 4 suites; build correcto. Navegador: 8 arrastres verificados (ambos destinatarios en duelo y formación, ratón y toque emulado), con agarre descentrado y entrega junto al límite entre retratos; previsualización e inventario coinciden, sin errores JS. Capturas desktop/móvil y cliente develop-web-game inspeccionados en output/pickup-cursor-review.
- Sin commit ni despliegue. Vista aislada en http://127.0.0.1:4218/.

## Corrección urgente del playtest: sincronización de ronda

- La captura señala `canvasCombat.participants.<token>.defensiveReposition` con valor `undefined`. Movimiento y deshacer generaban esa propiedad sin reposicionamiento activo.
- Se utiliza `null` en ambos casos y se sanea el estado al persistir combate y práctica. Prueba de regresión para movimiento ordinario, deshacer y preservación del segundo jugador.
- El ajuste visual de rasgos permanece en el árbol de trabajo; el bloqueo de sincronización tiene prioridad.
- Build correcto y despliegue de Hosting completado en `base-de-datos-noma`. Suite completa: 97 correctas y un timeout de la ficha maestra bajo carga; repetición focal de esa suite y las dos de combate: 29 pruebas correctas. Se requiere recargar los clientes abiertos para cargar el arreglo.

## 2026-09-08 — Selección defensiva y contraataque

- Selector de armas compartido con retrato, nombre, perfil/alcance, rasgos y marca de selección independiente. El contraataque abre una lista ilustrada y conserva el arma elegida visible con miniatura.
- Acciones de excedente con jerarquía para casillas y Presión, apiladas a 320 px y desplazamiento acotado cuando se abre la lista.
- Verificados 10 tests del modal y selección/defensa/contraataque/reposicionamiento a 1280, 390 y 320 px en el harness local. Capturas inspeccionadas y cliente de la skill ejecutado; no verifica sincronización Firebase real.

- Tarjetas de previsualización e información de objetos en el suelo (`CanvasLootVisual`, `RogueliteInventoryCard`):
  1. Detección completa de rareza y acento cromático (`resolveRarityAccent`): las tarjetas en el suelo ahora respetan la paleta de rarezas del juego (`rarityColorMap`, sin importar mayúsculas, minúsculas, tildes o género gramatical) aplicando el tono exacto en bordes, sombras, brillos, título y líneas decorativas.
  2. Integración con el Glosario de Rasgos (`glossary`): los rasgos de las armas y objetos (como "AGUDEZA", "DESTREZA", "SIN GUARDIA") heredan sus colores definidos en el glosario junto a sus respectivos símbolos `◆`.
  3. Limpieza de guiones y rasgos vacíos: se eliminó el renderizado residual de viñetas huérfanas (`♦ -`) filtrando descripciones o rasgos con valor `-` o vacíos.
  4. Ilustraciones personalizadas: integración con `useCustomEquipmentImages` para que la tarjeta del mapa muestre la misma ilustración asignada en el catálogo o inventario del token.
- Sincronización instantánea de equipamiento entre Ficha de Clase y Token en Canvas (`rogueliteTokenSheetSync`, `equipmentPool`, `ClassList`):
  1. Actualización reactiva al equipar (`ClassList`): al equipar o desequipar cualquier objeto o habilidad en los slots de la ficha, se emite inmediatamente la notificación en tiempo real (`{ notify: true }`).
  2. Mapeo de estado en tiempo real en el Token (`rogueliteTokenSheetSync`): se recalcula `isEquipped`, `isPrepared` y `equippedSlots` para cada objeto del inventario del token (incluyendo botín y objetos recogidos del suelo), actualizando de inmediato `equippedItems` y `equipmentLoadout` del token sin resetear la vida ni los recursos consumidos en combate.
  3. Soporte transparente en `equipItemInSlot` (`equipmentPool`): compatibilidad completa con ranuras directas y `weaponSets` de combate.
- Depuración y ajuste estético de la elevación de token (`createSceneItemRenderer`):
  1. Se eliminó la sombra ovalada externa adicional que quedaba desalineada y poco armónica con la forma de la ficha.
  2. La sombra de elevación ahora se ciñe con precisión matemática al contorno nativo de la ficha (`rounded-full` para circulares o `rounded-sm` para cuadradas) junto a un sutil anillo dorado (`ring-2 ring-[#c8aa6e]/80 shadow-[0_12px_24px_rgba(0,0,0,0.85)]`), logrando un efecto limpio, profesional y perfectamente integrado con la estética del juego.
- Elevación en capa superior y semitransparencia de objetos arrastrados (`createSceneItemRenderer`, `TacticalViewport`):
  1. Capa superior garantizada (`zIndex: 1000`): durante el arrastre de cualquier objeto (o botín del suelo), el elemento se promueve al nivel superior por encima de todos los tokens del canvas, evitando que quede oculto por debajo de las fichas al pasar sobre ellas.
  2. Semitransparencia táctil (`opacity: 0.72` y `scale: 1.15`): el objeto arrastrado adopta una suave transparencia que permite ver con nitidez la ficha que se encuentra debajo, reforzando la sensación de sujetar el objeto en la mano antes de soltarlo.
- Feedback físico y elegante de selección de token objetivo (`createSceneItemRenderer`):
  1. Se eliminó todo elemento gráfico superpuesto (sin retículas, etiquetas de texto ni badges flotantes que saturen la pantalla).
  2. Sensación física de tablero/videojuego: al aproximar un objeto a una ficha para entregárselo, el token objetivo **se alza físicamente** (`y: -12px, scale: 1.08`) con una transición elástica natural (`spring`), proyectando una sombra de contacto suave en el suelo. Al mover el cursor hacia la otra ficha en el duelo/formación, la primera desciende suavemente y la otra se alza.
- Corrección de precisión en selección múltiple y navegación del inspector en PC (`CanvasLootVisual`, `createTacticalTokenController`, `useTacticalInteractionController`, `TacticalSectionCore`):
  1. Event Propagation en el Inspector Portal (`CanvasLootVisual`): se aislaron todos los eventos de puntero, mouse y touch (`stopPropagation`) en la tarjeta y panel de navegación multiselección, y se estabilizó la `key` del portal. Ahora hacer clic en las flechas `< >` o en las pastillas de los objetos no deselecciona los elementos ni detecta un clic fuera.
  2. Modificador Ctrl / Shift / Cmd en Tokens y Objetos (`createTacticalTokenController`, `TacticalSectionCore`): se unificó la lógica de selección con modificadores tanto para fichas como para objetos en el suelo (`isScenePickup`). Ahora hacer Ctrl+clic o Shift+clic añade o quita objetos/fichas de la selección de forma precisa sin resetear a un único objeto.
  3. Selección por Recuadro Fina y Precisa (`useTacticalInteractionController`): la prueba de colisión AABB del recuadro de selección ahora evalúa las coordenadas de pantalla exactas de cada slot visual renderizado (`getScenePickupRenderPlacement` y `getCombatRenderPlacement`), permitiendo seleccionar con precisión quirúrgica elementos individuales o múltiples agrupados en una casilla.
- Resolución y feedback visual de entrega a fichas en duelo o formación (`canvasInventoryTransfer`, `createSceneItemRenderer`, `useCanvasFeatureController`):
  1. Detección espacial exacta para tokens compartiendo casilla en duelo o formación: ahora `resolveCanvasLootRecipient` utiliza la posición y slot visual renderizado (`getCombatRenderPlacement`) y la distancia relativa al centro de cada ficha en lugar de las coordenadas base idénticas de la casilla.
  2. Si arrastras un objeto (desde el inventario o desde el suelo del canvas) sobre la ficha izquierda o la ficha derecha, se selecciona de forma precisa y diferenciada la ficha sobre la que estás situado.
  3. Indicador visual inmediato de destino de entrega: la ficha receptora objetivo se ilumina en verde esmeralda con un anillo pulsante y un distintivo flotante (`📥 Entregar a [Nombre]`), eliminando cualquier ambigüedad.
  4. Entrega directa desde el modal de inventario: al soltar un objeto directamente encima de una ficha controlada, se añade de inmediato a su inventario con notificación de confirmación.
- Inspector unificado y limpio para selección múltiple de objetos en el suelo (`CanvasLootVisual`, `createSceneItemRenderer`):
  1. Al seleccionar varios objetos a la vez (por ejemplo mediante recuadro de selección o selección por turnos), se elimina el apilamiento y solapamiento de tarjetas individuales.
  2. Se muestra un único panel inspector de selección múltiple con cabecera de conteo (`📦 N Objetos Seleccionados`), botones de navegación rápida (`‹ 1 / N ›`), una fila de chips/pestañas con código de color por rareza para alternar al instante entre los objetos seleccionados, y la ficha completa del objeto activo.
- Ajustado el tamaño de objetos a 0.32 y sistema de formaciones/slots para múltiples objetos en la misma casilla (`canvasInventoryTransfer`, `canvasModeDefinition`, `createSceneItemRenderer`):
  1. Tamaño de los objetos en el suelo configurado en proporción `0.32` del tamaño de celda (`CANVAS_LOOT_SIZE_RATIO = 0.32`).
  2. Implementada distribución ordenada y dinámica de slots multi-objeto en la misma casilla (1 centrado, 2 laterales, 3 en triángulo, 4 en cuadrícula 2x2, 5 en patrón de dado y N en cuadrícula) con espacio y separación visual óptima entre ellos para que nunca se superpongan.
  3. Los objetos de la casilla se pueden seleccionar, inspeccionar por hover o arrastrar de manera 100% independiente.
- Perfeccionado el hover continuo e indicador visual de selección de objetos en el suelo (`CanvasLootVisual`, `createSceneItemRenderer`):
  1. La tarjeta aparece al situar el ratón encima y se mantiene visible de forma continua todo el tiempo que el cursor permanezca sobre el objeto, ocultándose al instante tan pronto como el ratón sale del objeto (sin parpadeos, timeouts fantasma ni cortes).
  2. Al hacer clic para seleccionar el objeto, se muestra un indicador visual dorado con esquinas iluminadas y realce resplandeciente (`ring-2 ring-[#c8aa6e]`, marco con esquinas blancas/doradas y sombra `shadow-[0_0_14px_rgba(200,170,110,0.65)]`), manteniendo la tarjeta abierta de forma persistente.
  3. Se corrigió un overlay que capturaba eventos en el contenedor padre asegurando que todos los eventos del cursor lleguen sin interrupciones a la ficha del suelo.
- Estabilizado el hover y previsualización de objetos en el suelo (`CanvasLootVisual`): implementado puente de eventos de puntero entre el icono en el tablero y la tarjeta flotante.
- Optimizado el hover de objetos en el suelo (`CanvasLootVisual`): ampliada el área de captura con holgura (`-inset-3.5`) y eliminada la restricción estricta de `matchMedia` que bloqueaba el hover en entornos de PC/Windows con soporte táctil secundario o digitalizadores. La tarjeta de información ahora responde de manera inmediata y fluida al pasar el ratón por encima sin requerir puntería milimétrica.
- Apertura directa del inspector de token con doble clic en PC (`createSceneItemRenderer`): al hacer doble clic sobre un token controlado (o sobre cualquier token siendo Master), se selecciona automáticamente la ficha, se fija la pestaña en `INSPECTOR` y se abre el panel lateral de ajustes (`setShowSettings(true)`).
- Recogida automática de objetos en el suelo al mover tokens (`canvasInventoryTransfer`, `useCanvasFeatureController`, `createTacticalTokenController`, `TacticalSectionCore`):
  1. Si un token controlado por el jugador (o cualquier token si es Master) finaliza su movimiento —bien sea por arrastre en PC/móvil o mediante el desplazamiento táctil por cuadrícula— en la misma casilla que un objeto del suelo (`scenePickup`), el token recoge automáticamente el objeto y lo almacena en su inventario.
  2. El objeto se retira del escenario, el inventario se actualiza y persiste de inmediato y se notifica con un toast (`Objeto recogido`).
- Corregida la selección y el doble tap de tokens en móvil (`useTacticalInteractionController`, `createTacticalTokenController`, `createSceneItemRenderer`):
  1. `handleTouchEnd` ahora solo limpia la selección cuando el toque se originó en el fondo vacío del canvas (`isBackgroundPanTouchRef.current`), impidiendo que un toque simple sobre un token deseleccione la ficha inmediatamente al levantar el dedo.
  2. Unificadas las comprobaciones de permisos de token (`hasPermission` / `isOwner`) para soportar arrays, strings (`controlledBy`) y `ownerName`, permitiendo que tanto jugadores como Master seleccionen y abran el inspector con doble tap táctil.
- Corregida la apertura del inspector por doble toque en móvil (`createSceneItemRenderer` y `TacticalWorkspaceShell`): implementada detección de doble tap táctil directo (`lastTokenTapTimesRef` < 350ms) y protegida la capa de fondo (`backdrop`) contra clics fantasma producidos al soltar el segundo toque (`lastSidebarOpenTimeRef` < 400ms), evitando que el inspector se cierre inmediatamente después de abrirse.
- Ajustada la interacción táctil en móvil para objetos en el suelo (`CanvasLootVisual` y `useCanvasInteractionController`): la detección por hover queda restringida exclusivamente a dispositivos de puntero fino (`hover: hover and pointer: fine`), impidiendo que eventos sintéticos táctiles abran o dejen anclada la tarjeta al pulsar fuera. Al pulsar en el fondo del canvas en pantalla táctil, la selección se limpia de inmediato (`setSelectedTokenIds([])`), de modo que la tarjeta solo se abre al tocar directamente el objeto.
- Mejorada la interacción y previsualización de objetos en el suelo (`CanvasLootVisual`): ampliada el área de detección de puntero (`hit area`) con `pointer-events-none` en capas decorativas superiores, activada la visualización persistente de la tarjeta tanto por hover fluido como por selección (`isSelected`), y adaptada la previsualización en móviles como tarjeta inferior flotante (bottom-sheet con botón de cierre) que se oculta automáticamente durante el arrastre hacia una ficha.
- Corregida la alineación del arrastre de objetos del inventario al canvas (`canvasInventoryTransfer`): el cálculo de celda, ocupación y previsualización dorada ahora contempla el origen y offset de cuadrícula (`getGridWorldRect`), evitando que el objeto y su recuadro queden desfasados en el punto medio (2x2) de las casillas.

- Creado un bestiario Roguelite aislado del bestiario tradicional mediante un selector de modo en `Fichas de enemigos`.
- Las tarjetas nuevas reutilizan la composición visual de Talentos: cabecera con arte/rareza, estadísticas compactas, ranuras abiertas de equipo y habilidades, y acción final de encuentro.
- Añadidas colecciones propias `rogueliteEnemies` y `rogueliteEnemyAbilities`, editor de retrato/iconos con recorte WebP, catálogo unificado de equipo y biblioteca reutilizable de habilidades.
- `Añadir al encuentro` resuelve exclusivamente `canvasVisibility` y añade un token `rogueliteEnemy` al documento activo de `canvas_scenarios`; Board no participa en ese recorrido.
- El inspector Canvas admite Vida, CD, Movimiento, Iniciativa y Base ofensiva del enemigo, además de su inventario y habilidades, sin tratarlo como ficha de clase personal.
- Validación del primer corte: la suite completa dejó 77 suites y 298 tests pasando; después se añadieron y validaron de forma focalizada dos coberturas más para borrado de equipo enemigo y saneamiento de Firebase. `npm run build` compila. Las advertencias de `act(...)` y de persistencia IndexedDB ya existían y no hacen fallar la suite.
- Pendiente de validación visual por el usuario: ajuste fino de densidad/tamaños con datos reales e imágenes definitivas.
- Refinado el acceso al bestiario Roguelite: el selector reutiliza la composición de la Biblioteca de encuentros y el registro adopta una cabecera compacta coherente con el bestiario tradicional.
- Las tarjetas de enemigo muestran nombre y descripción en lectura limpia hasta activar su edición; guardar o clicar fuera restaura la presentación final.
- Las estadísticas del bestiario representan ahora cada punto como un bloque y las cinco comparten edición actual/base; los inputs permiten borrar, reemplazar y normalizar ceros iniciales sin producir valores como `02`.
- Las habilidades enemigas incorporan daño, alcance y rasgos reutilizables. El equipo muestra rasgos y sustituye el coste textual por uno, dos o tres iconos de dado.
- El inspector usa el rótulo `Inventario` para todos los perfiles Roguelite y evita `Preparada` en las habilidades de enemigos; Iniciativa y Base ofensiva actuales se reflejan en los campos de ejecución del token.
- Corregida la duplicación temporal al guardar por primera vez una tarjeta de enemigo: la reconciliación excluye el borrador local cuando Firebase ya devuelve el mismo identificador y conserva únicamente otros borradores pendientes.
- Añadido encuadre asistido al arte de enemigos Roguelite: `smartcrop` analiza la saliencia enteramente en el navegador, la composición desplaza el foco hacia la zona visible de la cabecera y el máster puede marcar manualmente rostro o silueta con un toque. Se generan y persisten por separado el retrato cuadrado del token y la cabecera 2:1, junto con recorte y foco responsive; las tarjetas antiguas conservan su presentación previa hasta editar el arte.
- Validación del encuadre: 80 suites correctas, 316 tests superados y 1 omitido; incluidos composición de sujetos laterales, retrato seguro, saneamiento Firebase y fallback visual legacy. El build de producción compila; la ruta autenticada no pudo revisarse en el navegador integrado sin iniciar sesión de máster, por lo que la comprobación visual definitiva queda para la sesión del usuario.

- Peticion actual: revisar y mejorar a fondo la experiencia, fisica y fiabilidad de los dados 3D del tablero de cartas, conservando su estetica.
- Auditoria inicial de dados 3D: detectadas escalas inconsistentes con zoom/tamano, mezcla del salto en el desplazamiento persistido, RAF 3D permanente en reposo, ausencia de timeout/cancelacion robusta y falta de colision con dados posados.
- Iniciado un modulo puro `boardDicePhysics` con gesto de lanzamiento, escalado fisico, conversion de limites y criterios de reposo verificables por tests.
- Playtest completado en el tablero real: el tirachinas entra y sale del estado de tirada, recorre el tablero y reposa correctamente; el disparo desde inspector tambien se estabiliza al 110% de zoom. El dado temporal de Firebase se elimino al terminar.
- Validacion final: 43 suites y 133 tests pasan (1 omitido), `npm run build` compila correctamente y el navegador no registra errores durante el flujo probado.
- Ajuste solicitado: eliminado el salto a una orientacion aleatoria al iniciar la tirada y sustituido el giro angular extremo en tres ejes por un rodamiento controlado, principalmente perpendicular a la trayectoria.
- Ajuste de giro validado visualmente fotograma a fotograma en el tablero: transiciones legibles, reposo correcto y cero errores de navegador. El dado temporal se elimino; 43 suites y 135 tests pasan (1 omitido) y el build compila.
- Segundo ajuste solicitado: velocidad angular llevada a un punto medio de aproximadamente 5,4-9,5 rad/s segun potencia y tipo de dado, conservando el eje de giro controlado y la continuidad del primer fotograma.
- Punto medio validado con el mismo gesto del playtest anterior: giro visiblemente mas vivo sin recuperar la rotacion multieje frenetica, reposo correcto, sin errores de navegador y dado temporal eliminado. 43 suites/135 tests y build pasan.
- Colisiones multi-dado implementadas en una simulacion compartida: dados en reposo pasan a cuerpos dinamicos dormidos, reciben impulso/giro, pueden encadenar impactos y se guardan juntos. La primera prueba detecto un arco demasiado alto, reducido para favorecer golpes laterales realistas sobre la mesa.
- Validacion final de colisiones: pruebas reales con dos y tres dados confirman transferencia de impulso, giro, desplazamiento y propagacion en cadena; todos reposan y se persisten juntos sin errores. Dados temporales eliminados. 43 suites/138 tests y build pasan.
- Recalibrada la respuesta al choque entre dados: friccion de mesa y restitucion entre cuerpos diferenciadas, umbral de 0,9 m/s para no amplificar roces y refuerzo de impulso conservativo, limitado y dependiente de ambas masas.
- Playtest de la nueva respuesta completado con impacto medio, fuerte y cadena de tres dados: el receptor se desplaza y rueda de forma proporcional, la energia se atenúa al propagarse y no aparecen errores de navegador. Todos los dados temporales se eliminaron al finalizar.
- Validacion final de la recalibracion: 43 suites y 141 tests pasan (1 omitido), `npm run build` compila y `git diff --check` no detecta errores.
- Redisenado `card-back-default.svg` a peticion del usuario: eliminado el marmol, las filigranas, el ojo, los rombos laterales y los cuatro acentos de color; el reverso queda reducido a fondo carbon, marco dorado fino y sello geometrico central neutral.
- Previsualizacion del nuevo reverso comprobada en navegador a resolucion completa: proporciones equilibradas, contraste legible y SVG sin fallos de renderizado.
- El cliente Playwright de la skill sigue bloqueado porque el entorno no resuelve el paquete `playwright`; se uso la previsualizacion del navegador integrado. XML valido, 3/3 tests de `cardImages` pasan y el build de produccion compila.
- Implementado proyecto editable versionado para el constructor de cartas: el PNG exportado recibe un bloque `iTXt` con toda la configuracion y se anade importacion desde el propio PNG o desde un respaldo `.carta.json`.
- La restauracion cubre nombre, tipos, orden y claves de contenedores, textos y estilos, rasgos, dano/consumo por bloque, fondos y colores, imagen/encuadre de cabecera, dados, alcance, recursos, minion, accion y atributo.
- Validado un PNG real descargado desde la interfaz: el metadato recupera `PROYECTO EDITABLE`, su descripcion Unicode, alcance lejano, rasgo `RECUPERABLE` y los seis contenedores. Los nuevos controles se revisaron visualmente y el navegador no registro errores.
- Validacion final del proyecto editable: 44 suites y 145 tests pasan (1 omitido), el build de produccion compila y el archivo temporal de prueba fue eliminado de Descargas.
- Reorganizada la cabecera responsive del constructor de cartas: en movil, Volver/Subir ocupan la primera fila y las cuatro utilidades se reparten por igual en la segunda; desde `sm` las utilidades se mantienen como un grupo indivisible y la cabecera solo vuelve a enfrentar titulo y acciones desde `xl`.
- Validacion responsive real en navegador a 390, 1024 y 1440 px: sin desbordamiento horizontal, solapamientos ni saltos aislados; las filas y anchos de los controles coinciden con la distribucion prevista.
- Validacion final del ajuste responsive: 44 suites y 145 tests pasan (1 omitido), y el build de produccion compila correctamente.
- Implementadas pilas visuales para cartas de atributo en el constructor de barajas: Cuerpo, Mente y Hambre muestran imagen representativa, color propio y contador, manteniendo cada copia como una carta real independiente.
- Anadidos modos `Agrupadas / Todas`, apertura exclusiva de una pila, regreso al resumen, gestion individual dentro de la pila y reasignacion ciclica del subtipo de cartas antiguas o mal clasificadas.
- Corregida la copia desde colecciones base para preservar `attributeType`; las copias antiguas intentan recuperar el subtipo mediante plantilla, URL de imagen o nombre, con una pila `Sin clasificar` como salida segura.
- Playtest con la baraja real de 32 cartas: las 21 de atributo se recuperan como Cuerpo x7, Mente x6 y Hambre x8; apertura, regreso, vista completa, filtro de atributo y layout movil a 390 px funcionan sin desbordamiento ni escrituras de prueba en Firebase.
- Validacion final de pilas de atributo: 45 suites y 148 tests pasan (1 omitido), los 3 tests nuevos de agrupacion cubren normalizacion, recuperacion legacy y orden, y el build de produccion compila correctamente.

- Rehecho el bloque del HUD de combate sobre `d5520d5`.
- Quitado `Ayudar` del HUD y la vista `Acciones` queda con `Atacar`, `Correr` y `Esquivar`.
- Los tres botones de `Acciones` ahora se reparten a todo el ancho disponible tanto en movil como en PC.
- Quitados los iconos dentro de las vistas `Clase` y `Objetos` para que el texto quede centrado.
- Eliminado el tooltip hover de las acciones.
- Intento de validacion visual bloqueado: `web_game_playwright_client.js` no resuelve el paquete `playwright` en este repo/entorno.
- Corregido detalle pendiente del HUD: eliminados tambien los iconos de estado vacio en Clase y Objetos.
- Rehecho el bloque del inspector de equipamiento en `CanvasSection.jsx`.
- Las armas equipadas se muestran siempre primero, por encima de armaduras, habilidades, accesorios y objetos.
- Las cards de armadura ya no muestran `Coste`.
- El borrado sigue apuntando al item correcto porque el listado se ordena visualmente conservando el indice original.
- Reimplementado el sistema de armaduras.
- `savePlayer` sincroniza bloques de armadura automaticamente al equipar, desequipar o cambiar de armadura sin volver a pisar cambios manuales mientras la armadura activa no cambie.
- `syncTokenWithSheet` ahora mapea armaduras/armas/poderes de la ficha al token, resetea armadura cuando cambia la fuente y conserva el estado actual del token al enriquecerlo para combate.
- El flujo de combate del canvas filtra rasgos anulados por la armadura antes de tirar, guarda `negatedTraits` y muestra el aviso en `CombatReactionModal`.
- `AttackModal` desactiva visualmente los rasgos anulados por la armadura del objetivo y `DefenseModal` muestra el aviso de proteccion activa.
- La CD de armadura ya no queda fija a `Vigor`: si la armadura equipada lleva rasgo `Destreza`, `Intelecto` o `Voluntad`, el umbral de sus bloques y el `Dx` mostrado en el inspector pasan a usar ese atributo.
- `MapCanvas` ahora mantiene una cola local de animaciones de daño pendientes para no perder el primer popup tras recargar si el token o el stage todavia no estan listos.
- `MapCanvas` ahora interpola los movimientos remotos de tokens para que otros clientes vean el desplazamiento hasta la nueva posicion en vez de un teletransporte instantaneo, sin afectar al arrastre o movimiento local.
- Corregido el canvas correcto para el tablero SVG: `CanvasSection` ahora renderiza los tokens con `motion.div` y anima los desplazamientos remotos A->B, mientras que las fichas manipuladas localmente siguen moviendose sin retardo.
- `CombatReactionModal` ahora aplica a `Parar` la misma restriccion de velocidad que a `Evadir` (`V.Diff <= 1`), tanto al mostrar la opcion como al confirmar la reaccion.
- Añadido el rasgo `Derribo` al flujo de combate del `CanvasSection`: si un ataque o contraataque hace perder al menos 1 bloque de `Postura`, fuerza 1 bloque adicional de `Postura`; el rasgo tambien se puede inyectar desde el panel compartido de modificadores de ataque y parada.
- Ajustado el panel de modificadores para que `Derribo` se vea en verde y use icono de martillo.
- Ajustado el panel de modificadores para que `Crítico` use acento rojo.
- Añadido el rasgo `Hendir` al flujo de combate del `CanvasSection`: si un golpe hace perder al menos 1 bloque de `Armadura`, fuerza 1 bloque adicional de `Armadura`; tambien se puede activar desde el panel compartido de modificadores de ataque y parada.
- El resultado de combate y el registro lateral del canvas SVG ahora guardan y muestran los rasgos efectivos usados en el ataque y en la parada, con pills discretas integradas en la misma estetica del log.
- Ajustada la presentacion de rasgos en el sidebar del registro de combate: deja de usar pills y pasa a mostrarse como una linea compacta de texto, mas acorde al tono visual del historial.
- Las perdidas de bloques del sidebar ahora separan la perdida base y la perdida extra por rasgo, mostrando un bloque independiente para `Derribo` o `Hendir` cuando ese extra realmente entra.
- El rasgo ofensivo de postura se muestra ya como `Derribo` en UI de combate y modificadores, aunque la logica sigue aceptando tambien `derribado` y `derribar` para no romper datos antiguos.
- Corregida una perdida intermitente de animaciones en el canvas SVG cuando se tardaba en confirmar un resultado: al escribir `combat_log` se refresca el `clientTimestamp`, evitando que el filtro de recencia descarte el impacto por una marca vieja.
- Rehecha la seccion de rasgos del `CombatModifiersPanel`: ahora muestra solo dos accesos rapidos en el panel principal y mueve el catalogo completo a un overlay con grid grande, mejor para movil y para escalar a muchos rasgos.
- Corregido el selector completo de rasgos para que no quede recortado dentro del modal de arma: ahora se monta en un portal sobre `document.body` y en movil se comporta como una hoja inferior amplia.
- Ajustados los microindicadores de atributo del selector de ataque para que no se entrecorten por `line-height` o redondeo de subpixeles en ciertos navegadores, manteniendo el mismo diseño.
- Ajustada la regla de alcance al contraataque del canvas SVG: la parada ya no compara el arma defensiva contra la del atacante, sino el alcance del arma defensiva contra la distancia real entre tokens capturada al lanzar el ataque; si no llega, anula el daño pero no devuelve golpe y el modal lo explica con esa distancia.
- La animacion del canvas SVG distingue ya ese caso con el texto `Parada sin contraataque`, en vez de reutilizar `Bloqueo Perfecto`.
- Ajustada la secuencia de `FloatingCombatEffects`: si hay `Contraataque` o `Resiste`, ese texto sale primero y el popup de daño/bloques junto con el flash del token esperan `1.5s` antes de arrancar.
- Corregida la medición de distancia para limitar el contraataque por alcance en el canvas SVG: `getTokenDistanceInCells` ahora usa la misma fórmula en celdas que el HUD de selección de arma, así que un arma de `Toque` ya no podrá contraatacar erróneamente a 2 casillas.
- Añadido el flujo completo de `Derribado` al canvas SVG: quedarse sin `Postura` o recibir daño a `Armadura`/`Vida` sin `Postura` aplica el estado; mientras dura, el token no puede moverse en combate ni usar otra acción que `Levantarse`, y los ataques solo muestran `Recibir golpe`.
- El HUD sustituye `Correr` por `Levantarse` con icono ascendente, habilitado solo para fichas derribadas; al finalizar turno tras esa acción, el token pierde el estado `derribado` y recupera la `Postura` al máximo.
- El `combat_log` del canvas SVG ahora guarda qué estado se acaba de aplicar en la resolución (`Derribado`), y `FloatingCombatEffects` lo muestra al final de la secuencia de `Resiste`/daño con el color real del estado.
- La duración de las animaciones de combate del canvas SVG deja de ir fija a `5.5s`: ahora se calcula según la secuencia real para no cortar antes ni los bloques escalonados ni el nuevo popup de estado final.
- Corregida la inferencia de `Derribado` por `Postura = 0` manual: HUD, reaction modal y restricciones del canvas SVG ya solo consideran derribado a un token si el estado está presente de verdad.
- Ajustado el timing del popup final de `Derribado`: deja de esperar al final visual completo del último flyoff y pasa a salir ~`1.5s` después del último bloque perdido lanzado.
- Añadido el rasgo `Conmocionante` al combate del canvas SVG y a los modificadores: si el ataque derriba, aplica `Conmocionado` como estado alternativo de caída, lo oculta del selector manual de estados y hace que `Levantarse` cueste `2` de velocidad mientras ese estado siga activo.
- Corregido el inspector de estados: cuando el token tiene `Conmocionado`, `EstadoSelector` reutiliza la casilla de `Derribado` para mostrarla activa con nombre e info de `Conmocionado`, y al limpiarse vuelve al estado base.
- Ajustado el icono del modificador `Conmocionante` para que use la flecha hacia abajo, igual que la iconografía de caída.
- Añadido `Fluida` al flujo real del canvas SVG: ya existe en modificadores, el coste del ataque/parada puede bajar `-1` contra el mismo objetivo y con la misma arma, se persiste `fluidaState` por token para encadenar el efecto entre resoluciones y el descuento se rompe al cambiar de objetivo, cambiar de arma, usar otra acción o quedar completamente parado.
- Ajustado `Fluida` para separar la versión manual de la versión nativa: el modificador manual solo reduce el coste actual si el arma vale más de `1`, mientras que la `Fluida` propia del arma mantiene la cadena automática entre ataques y paradas.
- Blindada la resolución de `combat_events` del canvas SVG: si una parada falla durante `resolveCombatEvent`, el evento vuelve a su estado pendiente y deja de quedarse colgado en `procesando`.
- Corregido el envío de reacciones de combate: `handleReaction` serializa `reaction.data` antes de `updateDoc` y ya no traga silenciosamente el error, para evitar que `Parar` se quede en `Procesando...` con ciertas armas como las de `Fluida`.
- Añadido un modo `Mantener tamaño total` en la configuración del canvas SVG para mapas finitos, de modo que columnas, filas y tamaño de celda puedan reajustarse automáticamente sin hacer proporciones manuales.
- Al cambiar el tamaño de celda en el canvas SVG, los items con `snapToGrid` ahora se reescalan y recolocan siguiendo la nueva rejilla para que no se descuadren respecto a las casillas.
- En mapas finitos del canvas SVG, las casillas quedan cuadradas por regla interna y el `snap` se calcula respecto al origen real del mapa finito, evitando que tokens nuevos o movidos nazcan medio descuadrados entre celdas.
- En mapas finitos, `rows` y `columns` ya no quedan en decimales durante los reajustes automáticos, evitando celdas cortadas en los bordes del grid.
- Extendida la misma lógica a mapas con fondo en el canvas SVG: el frame de la imagen se mantiene intacto, la rejilla se calibra encima sin generar medias celdas y el ajuste usa siempre casillas cuadradas completas.
- Al recalibrar mapas con fondo en el canvas SVG ya no se autoajustan los items existentes, evitando mover muros y luces mientras se corrige la grid sobre la imagen.
- Ajustada la calibración de mapas con fondo para que columnas, filas y tamaño de celda salten siempre al preset exacto más cercano que cubre toda la imagen con casillas cuadradas completas, evitando que la grid se desprenda del fondo.
- Añadida una barra de densidad para mapas con fondo en el canvas SVG: recorre los presets exactos compatibles del fondo y facilita aumentar o reducir la cantidad de casillas sin pelearse con columnas, filas o escala.
- Compactada la barra de `Velocidad` del inspector: conserva la lectura por casillas, pero limita la vista a 10 segmentos y resume el resto en un acumulado `+N` para que valores altos no se salgan del panel.
- Añadido un estado de carga visual para imágenes de equipamiento en el canvas SVG: mientras llegan desde Firebase, las cards del inspector muestran un loader elegante en lugar de dejar ver texto o saltos feos del navegador.
- Añadido el rasgo `Sangrado` al flujo real del canvas SVG y al panel de modificadores: cuando un ataque o contraataque hace perder vida, aplica el estado `Sangrado` y reutiliza la animación final de estados con el color propio del efecto.
- Ajustada la secuencia de estados finales en `FloatingCombatEffects`: si una misma resolución aplica `Derribado`/`Conmocionado` y otro estado como `Sangrado`, ahora se ordenan y se muestran separados por `1.5s` en vez de solaparse.
- `Sangrado` ya no se queda solo como estado pasivo en combate: al gastar velocidad real en final de turno, reacciones o movimiento directo del máster, descuenta automáticamente la misma cantidad de bloques de `Vida` y lanza la animación flotante correspondiente.
- Corregido el render visual del drenaje por `Sangrado`: `FloatingCombatEffects` ya no exige `finalDamage > 0` para pintar pérdidas de bloques, por lo que el gasto de velocidad sangrante muestra su `-X Vida` correctamente.
- En reacciones tipo `Parar`, el drenaje por `Sangrado` se incrusta ahora dentro de la secuencia principal del resultado: sale después del daño/resiste/contraataque y antes de los estados, manteniendo visible el `-X Vida`.
- Corregido el etiquetado del tramo integrado de `Sangrado` en paradas: el helper de flyoffs ya usa los bloques propios de ese tramo y deja de pintarlo como `Postura` cuando en realidad era `Vida`.
- Ajustado `FloatingCombatEffects` para que cualquier intro de reacción del objetivo (`Resiste`, `Bloqueo Perfecto`, `Parada sin contraataque`, `Evasión Perfecta/Parcial`) se muestre primero y el daño/bloques espere siempre `1.5s`; además, el drenaje integrado por `Sangrado` en reacciones usa ahora el mismo look de daño con etiqueta `Sangrado`, y se amplió el margen de vida del efecto para que las secuencias largas no corten la última animación.
- Corregido un bug visual del contraataque: los bloques perdidos y estados del atacante ya no se reutilizan por error para pintar también daño sobre el defensor cuando una parada devuelve golpe.
- El HUD principal del combate del canvas SVG cambia `Esquivar` por `Controlar`, y la nueva acción básica `Controlar Sangrado` añade mitigación `1:1`: cada punto invertido ahí reduce en `1` la vida que el estado `Sangrado` drena automáticamente al cerrar el turno.
- Restaurada la visibilidad compartida del drenaje por `Sangrado` que viaja por `combat_log`: todos los clientes activos del canvas vuelven a ver ese popup sobre la ficha afectada.
- Corregido el arranque del drag en combate para jugadores: si la ficha ya tenía posición pendiente, el nuevo arrastre usa esa posición visual como baseline real y la línea/ghost del movimiento durante el drag deja de tomar referencias desincronizadas.
- Ajustado el remanente del drag en combate para jugadores: se separa la base real del arrastre de su ancla visual, de modo que el token sigue arrastrando desde la posicion pendiente actual pero el ghost/linea permanecen fijos en la casilla inicial del turno.
- Corregida la interrupcion del movimiento previsto por el master en vista jugador: al romperse el turno pendiente, el snapshot remoto ya no conserva la posicion local en ese mismo ciclo y la ficha se recoloca inmediatamente donde la movio el master.
- El ghost del drag en combate deja de montar un `<img>` nuevo al aparecer y pasa a reutilizar la imagen del token como `background-image`, reduciendo el retardo visual al empezar el arrastre.
- Corregido un bug intermitente al arrastrar una ficha de vuelta a su casilla inicial en combate: el cierre del drag usa ya la posicion real de soltado, evitando que se recupere la posicion pendiente anterior y que la linea del remanente salga disparada hacia una referencia desfasada.
- Blindado `pendingTurnState` en el canvas SVG: si llega con `x/y/startX/startY` no numericos, se limpia y deja de usarse en el render, el merge remoto y la proyeccion local del token para evitar lineas del remanente apuntando a la esquina superior izquierda.
- El drenaje de vida por `Sangrado` al gastar velocidad en combate deja de usar una cola puramente local y pasa a publicarse en `combat_effects`, para que todos los clientes activos del canvas SVG vean la misma animacion del tick automatico.
- Añadida la habilidad base `Barrido` al HUD de `Clase` del canvas SVG: filtra armas cuerpo a cuerpo de coste `2+`, cobra el arma `+1🟡` y abre una plantilla de 3 casillas laterales alrededor del token para elegir el frente del golpe.
- `Barrido` ya resuelve con una sola tirada de ataque compartida entre hasta 3 objetivos del frente elegido, dispara un `combat_event` por objetivo usando el mismo total y anula los rasgos especiales del arma durante esa resolución.
- Los `combat_log` y `CombatReactionModal` del canvas SVG ya distinguen visualmente los ataques que vienen de `Barrido`, indicando la habilidad y el arma origen sin mezclarlos con un ataque básico normal.
- La pestaña `Clase` del HUD de combate del canvas SVG reserva ahora 3 huecos fijos de habilidad: `Barrido` queda centrado y los laterales se muestran como placeholders desactivados para conservar una composición estable.
- La plantilla de `Barrido` consume ahora los eventos `mouse/pointer/touch` dentro del frente elegido y en la `X`, evitando que el clic se filtre al token de debajo o cancele la habilidad al pulsar sobre su propia área.
- El selector de `Barrido` reemplaza el popup textual de cancelación por una `X` flotante con el mismo lenguaje visual que los controles de rotar/eliminar token.
- La `X` de cancelación de `Barrido` se centra sobre el token atacante y, junto con la plantilla de área, baja a la misma capa visual del contenido del canvas para integrarse con luces, niebla y controles flotantes existentes.
- `CombatHUD` deja de renderizar texto/alt feo mientras cargan miniaturas remotas de arma: `ItemImage` espera a `onLoad`, muestra un spinner dorado durante la carga y solo revela la imagen cuando está lista.
- `Barrido` deja de usar un resolvedor parcial de imagen y pasa a reutilizar exactamente el mismo que el selector de ataque normal, manteniendo tanto las artes locales del proyecto como el loader de carga en ambos flujos.
- Corregido `Controlar Sangrado` al cerrar turno: el coste de la propia acción deja de contar como velocidad que drena vida y cada uso sigue mitigando además `1` tick extra del resto de velocidad gastada en ese turno.
- `rollAttack` deja de convertir armas con daño base `0` o `1d0` en un `1d20` por defecto: ahora esas armas tiran solo los dados extra o de atributo que procedan, manteniendo el fallback `1d20` únicamente cuando el arma no define daño en absoluto.
- Añadido `Sin guardia` como rasgo negativo del combate SVG: ya se puede aplicar desde modificadores, se normaliza en logs/resultados y cualquier arma que lo tenga queda bloqueada para `Parar`, con aviso visual en el modal de reacción.
- La grid del canvas SVG adopta una metrica base estable de `12x8` con casilla objetivo `256x256`: los escenarios nuevos nacen ya en finito, los mapas con fondo se recalibran al preset cuadrado mas cercano a ese objetivo y los ajustes manuales de columnas/filas conservan mucho mejor la sensacion visual entre mapas.
- Los campos numericos de la configuracion de grid pasan a editarse con borrador de texto: ya no convierten el valor en cada pulsacion y solo aplican el cambio al confirmar con `blur` o `Enter`, haciendo mucho mas comodo ajustar columnas, filas y escala a mano.
- El canvas SVG introduce alianzas tacticas por `controlledBy` compartido con excepciones por `teamId`: si un token tiene `teamId`, ese valor manda sobre `controlledBy` y el campo queda visible solo para el master en el inspector.
- Los tokens nuevos del combate SVG pasan a crearse con tamano compacto de `0.5x0.5` casillas; solo esas fichas compactas pueden compartir casilla y generar `Duelo` o `Formacion`, mientras que una ficha de `1x1` bloquea por completo la casilla.
- El drag de combate del canvas SVG ya valida ocupacion maxima por casilla en tiempo real y al soltar, evitando meter mas de 2 ocupantes en una misma celda o entrar en una casilla ocupada por una ficha grande.
- El render de combate SVG separa visualmente los 2 ocupantes de una misma casilla para que no se solapen, y el `CombatReactionModal` bloquea `Evadir` cuando el defensor esta en `Duelo`, mostrando un aviso especifico.
- El reparto visual de `Duelo` y `Formacion` dentro de una misma casilla se invierte para que la posicion base visible quede a la derecha en vez de a la izquierda.
- El HUD de combate SVG ajusta sus alcances tacticos a la nueva lectura: `Toque` solo misma casilla, `Cercano` misma o adyacente, `Intermedio` hasta 2 casillas, `Lejano` hasta 3 y `Extremo` sin limite practico.
- La validacion de alcance en el canvas SVG permite ahora usar `Toque` contra cualquier ficha grande que no quepa en `Duelo` desde una casilla adyacente, y esa misma excepcion se aplica tambien a los contraataques de `Parar`.
- El `snap` del canvas SVG deja de centrar automaticamente cualquier item pequeno: solo las fichas de combate compactas se recolocan al centro de la casilla, mientras muros, luces y elementos especiales recuperan su alineacion previa sobre la rejilla.
- Las fichas pequenas del canvas SVG, definidas como menores de `0.5x0.5` casillas, ya no quedan bloqueadas por la regla general de `Duelo`: pueden seguir usando `Evadir`, mientras las fichas normales en duelo siguen limitadas a `Parar` o `Recibir`.
- El `reaction` del canvas SVG ya muestra tambien el banner de `Duelo` para fichas pequenas, aclarando que la excepcion de tamano les permite `Evadir`.
- El render tactico del canvas SVG deja de centrar fichas grandes multicasilla como si fueran compactas: un `2x2` o `3x3` se ancla ahora correctamente a su esquina de celda y ocupa visualmente todo su bloque de casillas.
- La ocupacion tactica del canvas SVG pasa a evaluar todas las casillas cubiertas por un token, no solo su celda principal, bloqueando correctamente cualquier intento de entrar en cualquiera de las celdas que ocupe una ficha grande.
- El modal de reaccion del canvas SVG pasa a trabajar con presupuesto de reaccion igual al coste real del ataque recibido: `Evadir` ya no puede seleccionar mas dados de los permitidos y `Parar` puede encadenar varias armas/usos mientras no se pase del mismo limite.
- Las paradas acumuladas del canvas SVG se muestran y resuelven por pasos, y el contraataque global ya no mezcla rasgos de forma indiscriminada: cada arma mantiene sus rasgos de tirada propios, mientras que solo los rasgos globales compatibles de las armas que alcanzan al atacante suben al computo final.
- Las armas que superan la reaccion disponible ya no muestran un aviso separado al intentar anadirse: ahora quedan bloqueadas en el propio selector de armas con el mismo patron visual que `Sin guardia` y con un mensaje rojo explicando el motivo.
- La antigua condicion fija de `V.Diff <= 1` queda sustituida por una ventana de reaccion dinamica: `reactionBudget = velocidad final del atacante - velocidad actual del defensor`, y si ese valor es `0` o menor solo queda `Recibir golpe`.
- Los ataques normales repetidos del mismo atacante contra el mismo objetivo ya se fusionan en un unico `combat_event`, evitando que el defensor vea varias ventanas de reaccion para una misma ventana ofensiva; el modal marca esos casos como ataques acumulados.
- Las ventanas simultaneas de distintos atacantes ya comparten una lectura efectiva de velocidad del defensor: si una reaccion pendiente/resuelta ya gasto velocidad, las demas ventanas la descuentan aunque el resultado aun no se haya cerrado, y los indicadores superiores permiten saltar entre ataques pendientes.
- La regla de bloqueo de evasion por `Duelo` deja de mirar solo si el defensor esta en una casilla de duelo y ahora compara contra el atacante de la ventana activa: un ataque externo a ese duelo no hereda el bloqueo de evasion.
- El indicador superior de ventanas multiples ya pinta la ventana activa como resuelta con tick verde cuando el evento pasa a `resuelto`, aunque aun no se haya pulsado `Continuar`.
- El modal de reaccion compacta el aviso de `Duelo`, el presupuesto de reaccion y las paradas anadidas para que encajen mejor con la estetica del reaction y ocupen menos altura en movil.
- Los avisos de `Armadura activa` y de estados defensivos como `Derribado` o `Conmocionado` se alinean ahora con el mismo estilo compacto y neutro del aviso de `Duelo`.
- El drag en modo combate del canvas SVG ya comunica los destinos tacticos bloqueados: pinta la casilla en rojo con una `X`, cambia la linea del movimiento a rojo y muestra un motivo compacto cuando no cabe por ocupacion, duelo o ficha grande.
- Ajustado el feedback bloqueado del drag: la silueta roja se centra sobre la casilla invalida y la ficha arrastrada vuelve a ocultarse durante el drag rechazado, aunque se conserva internamente la posicion invalida para poder volver animada al origen al soltar.
- Ajustado de nuevo el feedback bloqueado del drag: al pasar de una casilla valida a una bloqueada, ya no queda pillada la previsualizacion valida anterior y el render de `Duelo`/`Formacion` ignora la posicion invalida temporal para que los ocupantes no se superpongan; si se suelta en la casilla ocupada, el token vuelve con el mismo flujo visual que el choque con muros y se restaura el coste pendiente del movimiento rechazado.
- Subido el apilado visual del aviso de destino bloqueado para que en vista master tambien quede por encima de tokens grandes y no se oculte bajo la ficha.
- Subido tambien el SVG del feedback de destino bloqueado para que la `X` y el contorno rojo de la casilla ocupada no queden tapados por fichas grandes en vista master.
- Corregido el parpadeo del nombre/coste del HUD durante el drag: el estado pendiente provisional ahora conserva `x/y`, no se crea para coste 0 y se ignora mientras el destino tactico esta bloqueado.
- La plantilla de area de `Barrido` se alinea con esa estetica: celdas rojas con borde discontinuo, `X` interior y brillo suave al hacer hover.
- No se ha lanzado `npm test -- --watchAll=false` por peticion explicita del usuario.
- Sustituidas las pilas automáticas exclusivas de atributos por agrupaciones manuales persistentes: aceptan cualquier carta, se crean con nombre propio y una carta solo puede pertenecer a una agrupación a la vez.
- Las agrupaciones muestran la carta frontal completa y dejan asomar detrás hasta dos cartas reales del grupo, sin capas ficticias cuando solo contienen un ejemplar.
- Añadidos los flujos para arrastrar cartas dentro, abrir la agrupación, sacar cartas individualmente, eliminar la carpeta sin borrar sus cartas y alternar entre las vistas `Agrupadas` y `Todas`.
- Conservado `Agrupar atributos` como atajo opcional para crear o completar carpetas de `Cuerpo`, `Mente` y `Hambre`, sin desplazar cartas que el usuario ya haya organizado manualmente.
- Verificado el flujo real en navegador con creación, drag, apertura, extracción y eliminación, incluida la composición responsive a 390 px; las agrupaciones temporales se eliminaron al terminar.
- Refinado el diseño de las agrupaciones: las cartas posteriores forman una corona escalonada más visible, ligeramente reducida y con rotación contenida para no solaparse con las agrupaciones vecinas.
- Eliminados los colores propios y el campo `accent` de las agrupaciones; tanto la pila como la cabecera abierta usan ahora un tratamiento neutro coherente.
- Añadida reordenación persistente entre agrupaciones mediante un asa dedicada, evitando confundir ese gesto con arrastrar una carta dentro de la carpeta.
- Retirado el icono anatómico del selector `Cuerpo / Mente / Hambre`, que conserva únicamente el texto y el indicador de cambio.
- Comprobado el nuevo aspecto en navegador con tres columnas y a 1024 px con dos columnas, sin solapamientos; el intercambio Cuerpo/Mente funcionó y se restauró el orden original al terminar la prueba.
- Sustituida el asa dedicada de ordenación por arrastre directo de toda la agrupación: un umbral de 6 px separa el clic que abre del gesto que intercambia posiciones, sin cambiar la semántica de soltar una carta dentro.
- Añadido feedback completo al arrastrar agrupaciones: una copia flotante de toda la pila acompaña al cursor, el origen se atenúa y el destino muestra `Intercambiar posición`.
- Las agrupaciones usan animación de layout con muelle al cambiar de hueco, manteniendo sus nodos e imágenes montados durante el intercambio.
- Protegida la actualización optimista de `cardGroups` frente al snapshot remoto anterior: la interfaz conserva el orden recién soltado hasta recibir la misma versión confirmada, evitando el parpadeo de ida/vuelta y la aparente recarga de imágenes.
- Unificado el feedback de arrastre de cartas con el de agrupaciones: la carta flotante pasa a ser semitransparente, identifica si va a intercambiarse o entrar en una carpeta y el destino de carta muestra una capa explícita de `Intercambiar posición`.
- Las cartas normales usan ahora animación de layout con muelle y protegen su orden optimista frente al snapshot remoto anterior, evitando el rebote visual tras intercambiarlas.
- Rediseñado el filtro de tipos como un índice de baraja de placas oscuras con esquinas recortadas, tipografía Cinzel, latón y marcas cromáticas mínimas; se eliminan las píldoras multicolor genéricas conservando iconos, contadores, estados vacíos y filtrado.
- La primera captura del índice detectó nombres truncados en la fila de nueve; cada placa pasó a una composición de dos niveles con símbolo/contador arriba y nombre completo debajo.
- Playtest real completado en `Iné`: se capturó el drag de carta sobre carta y sobre `Cuerpo`, con el fantasma al 78 %, el destino inferior legible y el rótulo flotante indicando el nombre exacto. El orden original y la pertenencia de la carta se restauraron al terminar; no hubo errores de consola.
- El orden restaurado se mantuvo idéntico al soltar y tras 40, 100, 250 y 600 ms, confirmando que el snapshot remoto anterior ya no provoca rebote visual.
- Validación final del arrastre e índice: 45 suites y 151 tests pasan (1 omitido), `npm run build` compila, `git diff --check` no detecta errores y el navegador no registró errores durante los flujos probados.
- Retirados los marcos exteriores que aparecían al señalar un destino durante el drag, tanto el halo de cartas normales como el contorno y ring de agrupaciones; se mantienen las capas internas con `Intercambiar posición` y `Soltar dentro`.
- Reforzado el color del índice de tipos mediante degradados suaves que tiñen toda cada placa según su categoría, con una iluminación adicional al pasar el cursor y una versión mucho más tenue para filtros vacíos.
- Validación visual en `Iné`: las capturas intermedias de carta sobre carta y agrupación sobre agrupación conservan los rótulos internos sin mostrar ningún marco exterior; los degradados permiten distinguir mejor General, Acción y Atributo. Se restauraron los órdenes originales y el navegador no registró errores.
- Validación final del ajuste: 45 suites y 151 tests pasan (1 omitido), el build de producción compila y `git diff --check` no detecta errores.
- Sustituido el degradado CSS de los filtros por una superficie SVG real por categoría: tinte plano, grano fractal, trama diagonal y remates vectoriales inspirados en el marco de una carta.
- Recompuesta la vista de agrupación como una única pila animada: frontal y cartas posteriores se elevan juntas, y al recibir una carta o intercambiar posición todas las cartas visibles se oscurecen y desaturan con la misma intensidad.
- Validado en navegador el flujo real de `impulsiva(1)` hacia `Cuerpo`: la copia flotante deja leer el aviso, la agrupación acepta la carta como conjunto y pasa de 7 a 8 elementos; después se extrajo la carta y se confirmó la restauración a 7. La consola permaneció sin errores.
- Compactada la cabecera responsive del detalle de baraja: en móvil, volver, título y propietario forman una sola ficha horizontal; el borde exterior redundante desaparece y el índice conserva su propio cierre visual.
- Reorganizada la franja de colección como una única barra: contador a la izquierda y `Agrupadas / Todas` más acciones cuadradas a la derecha, recuperando las etiquetas completas desde `sm`.
- Validado a 390 y 320 px sin desbordamiento horizontal: cabecera y controles permanecen en una fila, la primera agrupación aparece antes y el formulario de nueva agrupación sigue siendo usable. A 1280 px el título y el índice vuelven a enfrentarse; cero errores de navegador y build correcto.
- Eliminado el salto visual al desplegar `Nueva agrupación`: el hueco permanece montado y anima su pista de `0fr` a `1fr`, mientras el formulario acompaña con un desplazamiento corto; la cuadrícula avanza de forma continua y el foco se asigna en el siguiente frame.
- Añadida inspección ampliada a todas las cartas de la colección mediante un botón de lupa aislado del drag. El visor ofrece ajuste completo, zoom de lectura con scroll, cierre por botón/fondo/Escape y bloqueo del scroll de fondo.
- Validado el desplazamiento del primer grupo en navegador: 374.8 → 405.3 → 450.7 → 459.4 px sin retrocesos durante la apertura. El visor se probó a 390 y 1280 px, incluido zoom, scroll y cierre, sin iniciar arrastres ni alterar cartas.
- Sustituido el visor enmarcado de cartas por una inspección limpia: solo aparece la carta suelta con sombra sobre un fondo difuminado, sin cabecera, pie, botones ni contenedor de aplicación.
- La rueda del ratón ajusta la carta de forma progresiva entre el 72 % y el 235 %; en móvil, una pulsación de 480 ms sobre la carta abre una vista temporal que se cierra al soltar, mientras desplazar más de 12 px cancela la inspección y conserva el arrastre.
- El antiguo botón circular de lupa se convierte en una placa recortada con icono de ojo enfocado y la etiqueta `Inspeccionar` al señalarla, separando con claridad la acción de lectura del zoom interno del visor.
- Corregido el bajo contraste de `Inspeccionar` sobre cuerpos de carta claros: la placa usa ahora petróleo opaco `#07141b`, texto latón claro `#f5d98d`, borde dorado y una silueta negra exterior que la separa también de imágenes oscuras.
- La combinación alcanza contraste 13.51:1 para icono/texto y 9.01:1 para el borde; el estado hover conserva 13.54:1. El cliente visual continúa bloqueado por la dependencia `playwright` ausente.
- Añadido un estado móvil explícito para `Inspeccionar`: placa táctil permanente de 40x40 px, ojo de 19 px con trazo reforzado, subrayado dorado y feedback al pulsar; la palabra queda fuera del DOM visual móvil y el despliegue solo se activa cuando `pointerType` es realmente `mouse`, evitando el hover pegado en pantallas táctiles grandes.
- Validación final del control táctil: 45 suites y 151 tests pasan (1 omitido), y el build de producción compila correctamente.
- Unificada la botonera interna de las cartas con el lenguaje de `Inspeccionar`: tipo, visibilidad y eliminar abandonan los círculos translúcidos por placas recortadas, opacas y con doble contorno; los iconos móviles pasan a 18 px dentro de objetivos táctiles de 40 px.
- El tipo revela su categoría y eliminar su intención solo con `pointerType: mouse`; en táctil permanecen compactos y ofrecen feedback `active`. Visibilidad conserva forma compacta y diferencia claramente publicada/oculta mediante verde o pizarra.
- Rediseñados `Cuerpo / Mente / Hambre` y `Sacar de…` como fichas de archivo de ancho completo, con etiqueta contextual, acento lateral, alto táctil de 40 px y animaciones discretas de refresco/salida.
- Validación final de la botonera unificada: 45 suites y 151 tests pasan (1 omitido), el build de producción compila y `git diff --check` no detecta errores.
- Simplificados de nuevo los controles superiores según feedback: solo `Inspeccionar` conserva despliegue; tipo y eliminar vuelven a ser iconos fijos y sus recortes se espejan para seguir los chaflanes superiores del marco real de la carta.
- Retirada la raya cromática vertical del selector de tipo. El botón mantiene el color de categoría únicamente en borde, icono y el pequeño indicador móvil.
- Compactados los controles de agrupación: atributo y `Sacar de…` pasan de dos fichas verticales de 40 px y ancho completo a una sola fila flexible de botones de 28 px, sin las líneas laterales ni los subtítulos `Atributo / Agrupación`.
- Validación final de la simplificación: 45 suites y 151 tests pasan (1 omitido), el build de producción compila y `git diff --check` no detecta errores.
- Corregida la geometría de los controles superiores de carta: tipo recorta solo la esquina inferior derecha y eliminar solo la inferior izquierda, manteniendo rectas las otras tres esquinas.
- Eliminados los segundos marcos interiores de los controles compactos de atributo y salida de agrupación, responsables de las líneas claras que cruzaban visualmente los botones.
- Validación de este ajuste: las 45 suites pasan (151 tests, 1 omitido), el build de producción compila correctamente y el cliente visual del skill continúa bloqueado únicamente por la ausencia de `playwright` en su propio entorno.
- Ajustados los controles a la geometría real de cada frontal: el selector de tipo se desplaza 4 px a la izquierda en cartas normales, mientras las cartas de atributo reciben insets específicos para alinear tipo, eliminar e inspeccionar con su marco interior.
- Dentro de una agrupación, las cartas de atributo ocultan el selector `Cuerpo / Mente / Hambre` y centran `Sacar de…`; la reclasificación continúa disponible para atributos sin agrupar.
- Validación del ajuste de controles: 45 suites y 151 tests pasan (1 omitido), el build de producción compila y `git diff --check` queda limpio. El cliente Playwright del skill sigue sin su dependencia y el navegador integrado alcanzó la pantalla de acceso, pero no se introdujeron ni buscaron credenciales de máster.
- Recalibrados los controles contra las líneas doradas medidas en las capturas: el tipo de atributo entra 6 px y baja 1 px, eliminar conserva su alineación correcta, inspeccionar sube 5 px y el selector de tipo de las cartas normales vuelve 4 px a la derecha.
- Validación de la alineación medida: las clases arbitrarias de 7/9 px compilan en producción, pasan las 45 suites (151 tests, 1 omitido) y `git diff --check` no detecta errores.
- Afinado el selector de tipo de cartas convencionales al punto medio solicitado: pasa de 10 px a 8 px de inset izquierdo, un desplazamiento sutil de 2 px sin modificar ningún control de atributo.
- Validación del ajuste intermedio: build de producción correcto, 45 suites y 151 tests pasan (1 omitido), y `git diff --check` queda limpio; el cliente visual sigue bloqueado por su dependencia `playwright` ausente.
- Subido 2 px el selector de tipo de las cartas convencionales, pasando su inset superior de 10 px a 8 px; la posición horizontal intermedia y todos los offsets de atributo permanecen intactos.
- Corregido el último ajuste a petición del usuario: el selector convencional baja 1 px y queda definitivamente en 9 px de inset superior, conservando los 8 px horizontales.
- Validación del ajuste final de 1 px: build correcto, 45 suites y 151 tests pasan (1 omitido); el cliente visual continúa bloqueado por la dependencia `playwright` ausente.
- Desplazado el selector de tipo de las cartas convencionales 1 px hacia abajo y 1 px hacia la derecha: queda en 9 px de inset horizontal y 10 px vertical, sin alterar los offsets de atributo.
- Validación del desplazamiento 1+1 px: build de producción correcto y 45 suites con 151 tests superados (1 omitido). La inspección automatizada sigue bloqueada porque el cliente oficial no encuentra su dependencia `playwright`.
- Ajustados únicamente los controles de las cartas de atributo 1 px hacia la izquierda: tipo pasa a 6 px desde el borde izquierdo; eliminar e inspeccionar pasan a 5 px desde el borde derecho. Las cartas convencionales no cambian.
- Validación de los tres offsets de atributo: build de producción correcto y 45 suites con 151 tests superados (1 omitido). El cliente visual oficial continúa bloqueado por la dependencia `playwright` ausente.
- Reajustados solo los controles de atributo: tipo y eliminar bajan 1 px y se desplazan 1 px a la izquierda; inspeccionar se desplaza 1 px a la izquierda sin variar su altura. Los controles convencionales permanecen intactos.
- Validación del reajuste selectivo: build correcto y 45 suites con 151 tests superados (1 omitido). El cliente visual oficial continúa sin arrancar por la dependencia `playwright` ausente.
- Añadidos recortes superiores solo a los controles de atributo: superior izquierda en el selector y superior derecha en eliminar, conservando sus cortes inferiores opuestos y adaptando también los filetes interiores. Las cartas normales no cambian.
- Validación de los nuevos chaflanes: build correcto y 45 suites con 151 tests superados (1 omitido). El cliente visual oficial continúa bloqueado por la dependencia `playwright` ausente.
- Movidos únicamente tipo y eliminar de las cartas de atributo 1 px hacia arriba y 1 px hacia la izquierda, preservando los chaflanes y dejando inspeccionar y las cartas normales sin cambios.
- Validación del último desplazamiento: build correcto y 45 suites con 151 tests superados (1 omitido). El cliente visual oficial continúa bloqueado por la dependencia `playwright` ausente.
- Movido únicamente el botón eliminar de las cartas de atributo 1 px a la derecha, pasando su inset derecho de 7 a 6 px; altura, chaflanes y demás controles no cambian.
- Validación del ajuste derecho de eliminar: build correcto y 45 suites con 151 tests superados (1 omitido). El cliente visual oficial continúa bloqueado por la dependencia `playwright` ausente.
- Afinado únicamente eliminar en atributos 0,5 px hacia abajo y 0,5 px hacia la izquierda; queda a 6,5 px del borde derecho y 8,5 px desde arriba, sin variar forma ni otros controles.
- Validación del ajuste fraccionario: build correcto y 45 suites con 151 tests superados (1 omitido); Tailwind genera los offsets de medio píxel. El cliente visual oficial continúa bloqueado por la dependencia `playwright` ausente.
- Bajado únicamente eliminar en atributos otros 0,5 px: conserva 6,5 px desde la derecha y queda a 9 px desde arriba; forma y demás controles permanecen intactos.
- Validación del descenso adicional: build correcto y 45 suites con 151 tests superados (1 omitido). El cliente visual oficial continúa bloqueado por la dependencia `playwright` ausente.
- Eliminado el rótulo `Moviendo …` del fantasma de arrastre de cartas individuales. La copia semitransparente permanece limpia durante el movimiento libre y los avisos solo aparecen al señalar una carta para intercambio o una agrupación como destino; el feedback de arrastre de carpetas no cambia.
- Validación de la limpieza del arrastre individual: build correcto y 45 suites con 151 tests superados (1 omitido); `Moviendo …` solo permanece en el feedback propio de agrupaciones. El cliente visual oficial continúa bloqueado por la dependencia `playwright` ausente.
- Eliminados también los rótulos `Soltar …` del fantasma de arrastre de cartas individuales. La copia flotante no muestra ningún texto en ningún estado; el destino sigue comunicando por sí mismo el intercambio o la entrada en una agrupación y el feedback de carpetas permanece intacto.
- Validación del fantasma individual sin rótulos: build correcto y 45 suites con 151 tests superados (1 omitido); el preview de carta contiene únicamente la carta inclinada. El cliente visual oficial continúa bloqueado por la dependencia `playwright` ausente.
- Rediseñado `Sacar de agrupación` como pie de carta inspirado en las carpetas: nombre y estado `Carta agrupada` a la izquierda, más una acción circular con icono `FolderOutput` a la derecha. Se elimina la placa rectangular centrada sin cambiar la función ni la accesibilidad.
- Corregido el primer concepto del pie por redundante: ahora toda la franja es el botón y comunica directamente `Sacar carta / de <agrupación>`, conservando el icono circular a la derecha y eliminando el estado sin utilidad `Carta agrupada`.
- Validación del pie de salida revisado: build correcto y 45 suites con 151 tests superados (1 omitido). La comprobación visual automatizada quedó limitada por el acceso de máster y el cliente oficial continúa bloqueado por la dependencia `playwright` ausente.
- Rediseñado el bloque `Cartas disponibles` como archivo coherente con la colección: panel y entradas con chaflanes, textura SVG, jerarquía Cinzel, miniaturas enmarcadas y acento cromático según el tipo de carta. El buscador muestra recuento, estado vacío útil y permite limpiar con botón o Escape.
- Extraída la búsqueda a `cardTemplateSearch`: ignora tildes, mayúsculas, signos y espacios repetidos; acepta palabras en cualquier orden y busca sobre nombre, tipo y colección. Añadidas 5 pruebas unitarias específicas, todas correctas.
- Validación final del archivo lateral: build correcto y 46 suites con 156 tests superados (1 omitido). La aplicación carga sin errores de compilación; la inspección de la vista concreta quedó detenida en el acceso de máster, sin introducir credenciales. El cliente visual oficial continúa bloqueado por su dependencia `playwright` ausente.
- Sustituida la barra nativa blanca del archivo `Cartas disponibles` por `archive-scrollbar`: carril carbón con filete lateral, pulgar estrecho de latón envejecido, hover más luminoso, sin flechas nativas y con reglas equivalentes para Firefox.
- Validación de la barra temática: build correcto y 46 suites con 156 tests superados (1 omitido). El cliente visual oficial continúa bloqueado por su dependencia `playwright` ausente.
- Corregido el flickering al filtrar cartas: `DeckCardItem` usa una dependencia de layout basada solo en el orden y la pertenencia a agrupaciones, por lo que cambiar de filtro compacta directamente la cuadrícula sin lanzar desplazamientos de muelle. La transición CSS raíz deja de incluir `all` para no competir con el `transform` calculado por Framer Motion; conserva únicamente opacidad y escala para el feedback de arrastre.
- Validación del filtrado estable: build correcto y 46 suites con 156 tests superados (1 omitido). El cliente visual oficial continúa bloqueado por su dependencia `playwright` ausente; la ruta concreta permanece detrás del acceso de máster.
- Implementada una entrada cohesionada a las colecciones: hover, foco y primer toque precalientan y decodifican las imágenes críticas de la baraja, vistas de agrupación y primeras cartas del archivo lateral. Al abrir se inicializan cartas y grupos en el mismo batch que `activeDeck`, eliminando el primer render vacío; el resto de imágenes continúa en segundo plano y existe un timeout de 1,4 s para recursos lentos o rotos.
- Validación de la apertura cohesionada: build correcto y 46 suites con 156 tests superados (1 omitido). El cliente visual oficial continúa bloqueado por su dependencia `playwright` ausente y la colección real permanece tras el acceso de máster.
- Petición actual: permitir reordenar libremente las cartas de la mano en PC y móvil, con previsualización continua, sin tearing y sin romper el gesto existente de jugar una carta hacia el tablero.
- Diseño acordado: el arrastre horizontal dentro de la mano calcula un índice de inserción y anima el abanico localmente; soltar dentro persiste `handOrder`, mientras que soltar fuera conserva la salida a mesa. El orden se limita a la mano/seat activos y debe mantenerse estable frente a snapshots remotos.
- Implementado el primer bloque: `cardBoard` incorpora reordenación pura por índice y persistencia limitada a los IDs visibles de la mano; el HUD muestra una ranura de inserción que se desplaza con muelles mientras la carta original queda sustituida por el hueco.
- El fantasma de arrastre se mueve de forma imperativa con `requestAnimationFrame`, evitando rerenderizar el `CanvasSection` completo por cada píxel. La geometría de inserción se captura al iniciar el gesto para que las propias animaciones no cambien los umbrales ni provoquen oscilación/tearing.
- Ajuste visual solicitado: retirados los rótulos `Colocar aquí`, `Ordenar mano` y `Jugar carta`, junto con halos y cambios cromáticos del fantasma. La posición de destino se comunica únicamente mediante el hueco plano que deja la carta.
- Durante cualquier arrastre de mano, todas las cartas del abanico desactivan `pointer-events`, elevación, brillo y sombra de hover; cruzar el puntero sobre ellas ya no puede disparar animaciones competidoras ni flicker.
- Validación final del orden de mano: en escritorio se verificaron desplazamiento de principio a fin, asentamiento sin rebote, cancelación con Escape y restauración del orden original; en viewport táctil real de 390 × 844 se comprobó la inserción entre cartas solapadas, cero estados `hover`, fantasma sin texto, ausencia de errores de consola y persistencia estable. La suite completa supera 47 suites y 169 tests (1 omitido), y el build de producción compila correctamente.
- Petición actual: eliminar la breve pausa visual al arrastrar una carta desde la mesa hasta la mano.
- Diagnóstico reproducido en `mansion 2`: la carta podía conservar temporalmente su versión de mesa porque el listener remoto aún veía `draggedTokenIdRef` activo durante el mismo gesto y priorizaba la posición arrastrada frente al cambio optimista de `zone`. El doble cierre del evento (`onMouseLeave`/`mouseup` global) también podía preparar dos persistencias iguales.
- Implementado el corte síncrono de las referencias de arrastre antes de convertir la carta, un guard por interacción contra cierres duplicados y la actualización inmediata de `activeScenarioRef`. La transformación mesa → mano se extrajo a `moveBoardCardPileToHand`, que mueve también la pila, limpia el contenedor y devuelve todos los IDs realmente modificados.
- Primera validación de escritorio: al cruzar la mano, el nodo de mesa desaparece y el de mano nace en la misma transición; durante el segundo posterior no reaparece ninguna copia de mesa, no hay errores de consola y el orden original se restauró al terminar. El motor de cartas supera sus 14 tests específicos.
- Corregida también la ruta táctil: los eventos que nacen sobre una carta ya no alcanzan el manejador de paneo del fondo; `touch-action: none` evita el gesto nativo y un bloqueo de 500 ms descarta el ratón emulado sin llamar a `preventDefault` desde listeners pasivos.
- Validación táctil final a 390 × 844: en el mismo retorno de `touchend` la carta ya no existe en mesa y sí en la mano; permanece estable durante el segundo posterior, la consola queda sin errores y la mano real se restauró al orden exacto previo a las pruebas.
- Validación final de la recogida inmediata: 47 suites y 170 tests superados (1 omitido), build de producción correcto, cliente visual oficial ejecutado y capturas reales de escritorio/móvil inspeccionadas. No quedan cartas ni órdenes de prueba persistidos.
- Revisión adicional solicitada por parpadeo intermitente con ratón: la traza por fotograma confirmó que la transferencia puede cerrarse al cruzar el borde de la mano, antes del `mouseup`; la carta recién insertada quedaba bajo el cursor todavía pulsado y activaba el `hover` normal del abanico, generando un fogonazo visual aunque `zone` ya fuese correcto.
- Añadida una guarda visual de entrega: mientras el ratón sigue pulsado y hasta que vuelve a moverse tras soltar, toda la mano mantiene su estado neutral sin elevación, brillo ni `pointer-events`. La referencia de transferencia también impide renderizar de nuevo la copia de mesa ante cualquier snapshot intermedio; se libera al iniciar una nueva interacción con esa carta.
- Validación ratón/móvil del guard: la secuencia observada es únicamente `mesa → mano`, con cero cartas en `hover` durante la entrega y sin reaparición durante el segundo posterior. En táctil, el cambio sigue siendo inmediato en `touchend`, sin errores de consola. El orden real de la mano se restauró tras ambas pruebas.
- Validación final del parpadeo de entrega: 47 suites y 170 tests superados (1 omitido), build de producción correcto y capturas reales inspeccionadas mediante el cliente visual oficial.
- Petición actual: mejorar el realismo de la iluminación de tokens y focos del tablero sin degradar el rendimiento cuando existen muchas luces simultáneas.
- Diagnóstico de iluminación: el resplandor actual mantiene una intensidad casi plana hasta el borde, extiende el color al 150% del alcance y anima cada círculo mediante escala; además, todos los focos usan exactamente el mismo ciclo, por lo que las antorchas parecen pulsar sincronizadas.
- Implementado un perfil compartido para focos y tokens luminosos: núcleo estable, transición gradual a penumbra y borde tenue, resplandor coloreado reducido al 112% del alcance e intensidad normalizada. Cada gradiente visual se define una sola vez por luz y se reutiliza entre perspectivas.
- El parpadeo deja fija el área realmente revelada y anima únicamente la intensidad cromática con fases y duraciones deterministas distintas. Se eliminó el escalado SVG, se respeta `prefers-reduced-motion` y solo diez focos pueden animarse a la vez; las luces restantes siguen iluminando de forma estática.
- Primera validación en `mansion 2`: los tres focos reales comparten la nueva caída de cinco tramos, no existen definiciones visuales duplicadas ni círculos animados dentro de las máscaras de niebla/oscuridad, y la consola permanece sin errores.
- Validación final de iluminación: 48 suites y 174 tests superados (1 omitido), build de producción correcto y capturas del tablero real inspeccionadas. No se añadieron filtros de desenfoque ni capas extra por luz; el aumento del bundle queda limitado a 496 B gzip de JavaScript y 63 B de CSS respecto al build anterior.
- Petición actual: perfilar el último parpadeo de milisegundos al recoger una carta desde la mesa y mejorar la sensación de entrada en la mano.
- Diagnóstico en una partida real de `mansion 2`: mesa y mano ya cambiaban de zona en el mismo commit, pero la representación saltaba en un fotograma desde 184 × 258 px hasta su hueco de 122 × 176 px mientras el abanico recolocaba las cartas existentes. Además, el callback inicial de Framer podía resolverse después de localizar el destino y revelar prematuramente la carta real.
- Implementado un relevo visual por fases aisladas: una copia neutra parte de la geometría exacta de la carta de mesa, viaja durante 180 ms hasta el hueco final reduciendo tamaño y adoptando su inclinación, y se funde durante 80 ms con la carta real. Las fases `locating`, `moving` y `blending` montan nodos independientes, por lo que ningún callback atrasado puede adelantar la siguiente fase.
- Validación visual en escritorio: los fotogramas muestran continuidad desde mesa hasta el cuarto hueco de la mano, sin palabras, halos, duplicados ni reaparición en tablero; el orden original de cuatro cartas y la carta externa usada durante el perfilado quedaron restaurados al terminar, sin errores de consola.
- Validación final del relevo: 48 suites y 174 tests superados (1 omitido), build de producción correcto y cliente visual oficial ejecutado. El incremento queda limitado a 1,01 kB gzip de JavaScript y 21 B de CSS respecto al build anterior.
- Reversión solicitada: el relevo visual de 180/80 ms aumentaba el flickering percibido, así que se eliminó por completo junto con el ocultamiento temporal de la carta en el HUD. Se conserva el comportamiento anterior basado en transferencia optimista, bloqueo de snapshots intermedios y supresión de `hover`.
- Validación de la reversión: el bundle pierde exactamente los 1,01 kB gzip de JavaScript y 21 B de CSS introducidos por el relevo, las 48 suites siguen pasando con 174 tests correctos (1 omitido), el build de producción compila y el cliente visual oficial carga sin errores.
- Aclaración del fallo persistente: el parpadeo descrito es un rebote real `mesa → mano → mesa → mano`, no una transición visual. La traza del DOM confirma que el gesto normal cambia una sola vez, por lo que el caso intermitente procede de una escritura retrasada posterior a la primera confirmación remota.
- Añadido un bloqueo temporal específico por carta: mientras la transferencia siga protegida, cualquier snapshot que intente devolverla a `zone: board` conserva exclusivamente los campos locales de pertenencia a mano. Los snapshots ya confirmados en mano pasan intactos y jugar la carta de nuevo elimina inmediatamente el bloqueo.
- Añadidas dos pruebas de regresión para cubrir la escritura retrasada, la confirmación correcta y la expiración del bloqueo. El test específico de `cardBoard` supera 16 casos.
- Validación real inicial en `mansion 2`: la secuencia observada durante 3,5 s es únicamente `mesa → mano`, sin reaparición del nodo de tablero ni errores de consola; la mano original de cuatro cartas y la posición de la carta de prueba quedaron restauradas al finalizar.
- Validación final del bloqueo de snapshot: 48 suites y 176 tests superados (1 omitido), build de producción correcto, cliente visual oficial ejecutado y captura real del tablero inspeccionada. La protección añade 194 B gzip de JavaScript y ningún CSS.
- Corrección tras feedback: conservar solo los campos de pertenencia evitaba el regreso a mesa, pero dejaba entrar desde el snapshot antiguo otros campos visuales y reconstruía el objeto de la carta, trasladando el flicker a la mano.
- El bloqueo devuelve ahora la misma instancia local completa mientras el remoto siga diciendo `board`; no cambian imagen, cara, giro, tamaño, clase ni identidad DOM. La traza real registra un único montaje en mano con `opacity-100`, imagen ya cargada y cero reemplazos durante 3,8 s.
- Estado de prueba restaurado: la carta externa vuelve a mesa en 373 × 291 px y las tres manos comprobadas conservan respectivamente sus órdenes originales de 4, 3 y 3 cartas; la consola queda sin errores.
- Validación final de la identidad local: 48 suites y 176 tests superados (1 omitido), build de producción correcto y cliente visual oficial ejecutado. El bundle principal queda en 1,08 MB gzip y no se añade CSS.
- Auditoría posterior al refactor de `CanvasSection`: corregidos el icono `LayoutGrid` no importado, la caché compartida de imágenes perdida durante la extracción y el catálogo de estados no importado por el controlador de escenarios.
- La prueba de humo de canvas/tablero ahora abre una entrada realista desde la biblioteca y monta el editor con token, Sangrado, geometría y carta; el análisis `no-undef` pasa sobre todo `src` y la correspondencia de dependencias entre los siete controladores/componentes extraídos queda completa.
- Validación final de la auditoría del refactor: abiertos en navegador real `MANSION 1` del canvas y `mansion 2` del tablero con cero errores de consola; capturas inspeccionadas, 51 suites/184 tests correctos (1 omitido), build de producción correcto y `git diff --check` limpio.
- Petición actual: separar canvas y tablero como sistemas raíz independientes para permitir futuros cambios sustanciales de combate, iniciativa e interfaz sin arrastrar el otro modo.
- Creados `CanvasSection` y `BoardSection` como entradas distintas; `App` deja de pasar `mode="board"`. Cada entrada inyecta una definición propia con colecciones, visibilidad, shell, controlador de funciones específicas, adaptador de combate e iniciativa.
- La iniciativa ya está físicamente separada: `canvasInitiative` usa velocidad y control, mientras `boardInitiative` cuenta cartas de mano por token/asiento. El canvas no importa ni inicializa `useBoardController`.
- El antiguo orquestador se convierte en `tactical-shared/TacticalSectionCore`, reservado para sesión, cámara y persistencia comunes; el baseline actual de combate también queda detrás de adaptadores independientes de canvas y tablero.
- Validación final de la separación: 52 suites correctas, 187 tests superados (1 omitido), build de producción compilado y comprobación visual automatizada inspeccionada. En navegador real se abrieron `MANSION 1` del canvas y `mansion 2` del tablero: ambos cargan con sus iniciativas distintas y cero errores de consola.
- Siguiente pauta arquitectónica: los cambios exclusivos de combate, iniciativa o interfaz deben empezar en `features/canvas` o `features/board`; solo se promueve código a `tactical-shared` cuando sea realmente neutral para ambos productos.
- Petición actual en `codex/roguelite`: primera vertical del nuevo modo sin tocar combate ni BoardSection. Se añade acceso roguelite por usuario, IDs de clases desbloqueadas, sección condicional en `Mis personajes` y una ficha de clase básica propia.
- Implementado el modelo compatible `gameAccess.roguelite` con acceso desactivado por defecto y colección independiente `rogueliteClasses`. `UsersView` permite activar el modo y conceder clases; los personajes tradicionales continúan leyendo únicamente `characters`.
- La biblioteca de personajes acepta una sección adicional sin mezclar sus documentos: solo los usuarios habilitados ven `Clases de aventura`; una clase desbloqueada abre `RogueliteClassSheet` con imagen, nivel, dados, Vida, CD, Movimiento, iniciativa y recurso normalizados. Preparación y entrada al Canvas quedan explícitamente reservadas para la siguiente fase.
- Validación de la primera vertical roguelite: 54 suites correctas, 193 tests superados (1 omitido), build de producción compilado, cliente visual oficial ejecutado y gestión real de usuarios inspeccionada sin escrituras. El nuevo control aparece correctamente y la consola no registra errores.
- Feedback de la primera vertical: el encabezado roguelite no coincidía exactamente con `PERSONAJES DISPONIBLES` y las clases antiguas no aparecían porque solo se consultaba `rogueliteClasses`.
- El catálogo roguelite combina ahora `classes` y `rogueliteClasses`, ordena por nombre y elimina duplicados por identificador. Una definición específica puede ampliar una clase antigua sin perder su imagen; si una de las dos fuentes falla, la otra sigue siendo utilizable.
- `Clases de aventura`, `Modo Roguelite`, los estados y los controles de desbloqueo usan Cinzel; el separador copia la intensidad `/30` y el degradado transparente de `PERSONAJES DISPONIBLES`.
- Pruebas específicas: 3 suites y 9 tests roguelite superados. Por petición expresa del usuario, esta iteración no abre ni controla el navegador; la revisión visual queda a su cargo.
- Validación final de la compatibilidad con clases antiguas: 55 suites correctas, 196 tests superados (1 omitido), build de producción compilado y `git diff --check` limpio. No se abrió el navegador.
- Feedback posterior: eliminar el texto redundante `Clase desbloqueada`, igualar por completo el hover de las tarjetas de personajes sin mostrar sus acciones, representar diez niveles mediante estrellas y sustituir la ficha roguelite provisional por la ficha real de `Mis personajes`.
- Extraída `LibraryCharacterCard` para que personajes y clases compartan literalmente marco, zoom, elevación, sombra y esquinas de hover. Las clases roguelite no reciben callbacks de retrato/eliminación, muestran diez estrellas según nivel y conservan la etiqueta `Nivel N`.
- Eliminada `RogueliteClassSheet`: `ClassList` admite ahora que una sección adicional abra su misma ficha completa. La persistencia de esa ficha puede apuntar a una colección externa sin contaminar `characters`, incluida la edición de retrato.
- Añadido el modelo `profileClass`: ignora nivel y configuración personal de la definición global, inicia cada desbloqueo en nivel 1 con atributos, estadísticas, equipo, Talentos y progresión limpios, y restaura únicamente la configuración de `players/{perfil}/rogueliteClasses/{clase}`. Los niveles personales se limitan al rango 1–10.
- Validación intermedia: 4 suites y 13 tests roguelite superados; build de producción correcto. Se mantiene la petición del usuario de no abrir el navegador.
- Validación final de tarjetas, ficha compartida y configuración personal: 56 suites correctas, 200 tests superados (1 omitido), build de producción compilado y sin comprobación en navegador por petición del usuario.
- Error posterior comunicado: React recibía un tipo `undefined` al renderizar `ClassList` después de extraer la tarjeta compartida. El bundle servido sí contenía tanto el componente como su `default export`, y una reproducción aislada de la sección no bastaba para cubrir la integración con la ficha.
- `LibraryCharacterCard` usa ahora una única exportación nombrada en ambos consumidores, evitando que Fast Refresh conserve una identidad ambigua del `default export` tras añadir el archivo durante una sesión activa.
- Añadida una prueba de humo permanente que monta `CharacterListView`, carga acceso y clase roguelite, renderiza la tarjeta y la abre en la ficha real de `ClassList`. Validación final: 57 suites correctas, 201 tests superados (1 omitido), build compilado y bundle de desarrollo actualizado; no se abrió el navegador.
- Petición actual: ajustar exclusivamente `Resumen` de la ficha de clase del jugador sin sustituir la ficha ni modificar Colección, Mazo inicial, Reliquias o Cartas.
- `ClassList` distingue explícitamente una clase abierta desde la biblioteca roguelite mediante `detailPersistence.mode === 'roguelite'`. En ese modo conserva el layout y el hover del retrato, pero nombre, subtítulo y leyenda dejan de ser editables, desaparece `Editar retrato` y los cuatro atributos se sustituyen por exactamente tres dados de acción de solo lectura.
- Las estadísticas del resumen roguelite muestran barras con iconos para Vida, CD, Movimiento, Iniciativa y el recurso propio de la clase. Todos sus valores proceden de la definición normalizada del máster, incluido el valor inicial del recurso.
- `createRogueliteProfileClass` vuelve a imponer los campos autorales y de combate de la definición global sobre cualquier copia almacenada en el perfil; el nivel y la configuración personal siguen siendo independientes por jugador.
- Validación intermedia: 3 suites específicas y 9 tests pasan; el build de producción compila. La revisión visual en navegador queda a cargo del usuario por petición expresa.
- Ajuste visual posterior: en el resumen roguelite del jugador se elimina únicamente el `mt-auto` de la zona de acciones. `Jugar aventura` queda inmediatamente bajo los tres dados de acción y desaparece el espacio heredado de la cuadrícula antigua de cuatro atributos; las demás fichas conservan su distribución original.
- Petición actual: dejar pendiente el espacio del resumen y sustituir únicamente `Colección · Baraja` por `Progresión · Nivel` para las clases Roguelite, mostrando la progresión documental del Bárbaro y permitiendo al máster administrarla.
- Extraídos estructuralmente del documento maestro los diez niveles provisionales del Bárbaro: Vida, Movimiento, Furia máxima y beneficio de nivel 1 a 10. El render del DOCX no fue posible porque LibreOffice no está disponible en el entorno; la tabla se leyó directamente de la estructura del documento mediante `python-docx`.
- Añadido un modelo autoritativo de progresión: el Bárbaro recibe la tabla documental como base hasta que el máster realiza su primera modificación. Después, `rogueliteProgressionConfigured` preserva altas, bajas y ediciones deliberadas sin volver a inyectar los valores iniciales.
- La ficha del jugador vuelve a imponer siempre `classLevels` desde la definición global, por lo que una copia antigua del perfil no puede ocultar cambios del máster. El nivel alcanzado continúa siendo individual por jugador.
- Rediseñada `ProgressionView` con la estética azul-negra y dorada existente: barra horizontal, nivel actual, obtenidos y pendientes, lista completa de beneficios y métricas; la variante del máster añade edición en línea y controles discretos de alta y eliminación.
- Los personajes tradicionales conservan `Colección · Baraja` y `DeckBuilderView`; solo las clases Roguelite usan `Progresión · Nivel`. No se modificó el espacio pendiente del Resumen ni ninguna otra pestaña.
- Validación final de la progresión: 59 suites correctas, 208 tests superados (1 omitido), build de producción compilado y `git diff --check` limpio. Por petición del usuario no se abrió el navegador; la comprobación visual queda a su cargo.
- Feedback visual posterior: el Resumen de la biblioteca del máster seguía mostrando los cuatro atributos y las estadísticas antiguas; los `input type="number"` de Progresión exponían spinners nativos pequeños y la composición móvil desplazaba Eliminar y rompía la alineación de métricas.
- El Resumen del máster comparte ahora el esquema Roguelite del jugador, manteniendo su capacidad de editar retrato, nombre, subtítulo, leyenda, tres dados de acción, Vida, CD, Movimiento, Iniciativa y nombre/inicio/máximo del recurso. Cada cambio de combate se refleja simultáneamente en campos normalizados y en `roguelite`, de modo que el catálogo del jugador recibe lo guardado.
- Creado `NumberStepper`: control numérico sin flechas nativas, con entrada manual y botones −/+ de 40 px preparados para interacción táctil. Se reutiliza en las estadísticas del máster y en Vida, Movimiento y recurso máximo de la progresión.
- Reorganizada la progresión móvil: métricas en una columna con separadores y alineación estable, tres columnas desde `sm`, título con reserva lateral y botón Eliminar absoluto de 40 px en la esquina superior derecha.
- Validación final de esta iteración: 60 suites correctas, 209 tests superados (1 omitido), build de producción compilado y `git diff --check` limpio. Por petición del usuario no se abrió el navegador.
- Feedback responsive: con ciertos anchos efectivos o escalado de pantalla, las tres métricas editables de Progresión entraban en columnas demasiado pronto y sus etiquetas quedaban bajo el `NumberStepper`; además, las tres categorías resultaban visualmente demasiado similares.
- Vida, Movimiento y recurso reciben superficies degradadas muy tenues en carmesí, azul verdoso y violeta. La cuadrícula solo pasa a tres columnas desde `lg` y en ese estado cada métrica apila etiqueta y controles, eliminando la competencia horizontal independientemente de la longitud del nombre del recurso.
- Validación del ajuste cromático y responsive: 60 suites correctas, 209 tests superados (1 omitido), build de producción compilado y clases Tailwind generadas. No se abrió el navegador conforme a la preferencia del usuario; la revisión visual queda a su cargo.
- Feedback del Resumen del máster: el `mt-auto` mantenía Jugar aventura y Editar retrato demasiado lejos de los dados; los `NumberStepper` resultaban desproporcionados y Vida, CD, Movimiento e Iniciativa solo exponían un valor frente a máximos implícitos o fijos.
- Las acciones del Resumen Roguelite ya no se anclan al fondo. Cada estadística usa ahora el editor compacto inspirado en los controles anteriores, con Inicio y Máx. independientes; Furia comparte exactamente el mismo patrón. Las barras representan la proporción real y los máximos nuevos se guardan en la definición global y se sincronizan con los perfiles.
- Compatibilidad de datos: las clases antiguas usan su valor existente como inicio y máximo. Los nuevos campos autoritativos son `lifeInitial`, `maxDefenseClass`, `maxMovement` y `maxInitiative`, duplicados también dentro de `roguelite` al guardar.
- Validación final del Resumen compacto: 60 suites correctas, 210 tests superados (1 omitido), build de producción compilado y sin comprobación visual en navegador por petición del usuario.
- Feedback visual inmediato en Progresión: la cuadrícula seguía estirando Vida, Movimiento y recurso hasta ocupar tercios completos del nivel, generando paneles demasiado altos y anchos pese a contener solo icono, etiqueta y cifra.
- Sustituida la cuadrícula por una fila flexible compacta: los indicadores de jugador quedan limitados a 152 px y los editables a 176 px, con altura basada en contenido, separación de 10 px y salto automático de línea sin solapamientos.
- Validación final del tamaño de métricas: 60 suites correctas, 210 tests superados (1 omitido), build de producción compilado y `git diff --check` limpio. No se abrió el navegador.
- Petición visual: integrar los tres dados de acción con el lenguaje del Resumen, eliminando su apariencia de tarjetas genéricas y el resplandor blanco de los recursos actuales.
- Los dados Roguelite se agrupan ahora en una sola bandeja de 88 px de alto, con bordes horizontales, separadores verticales, acabado champán sin halo y rótulos compactos. El jugador no recibe estados interactivos; el máster conserva selector contextual con el mismo tratamiento angular.
- Validación final de la bandeja de dados: 60 suites correctas, 210 tests superados (1 omitido), selector del máster y vista estática del jugador cubiertos, build de producción compilado. No se abrió el navegador por petición del usuario.
- Revertido íntegramente, a petición del usuario, el experimento visual de dados: tanto las tres tarjetas de dados de acción Roguelite como el selector compartido y la cuadrícula de atributos vuelven a su presentación anterior. No se han modificado otros bloques de las fichas.
- Validación de la reversión: 60 suites correctas, 210 tests superados (1 omitido) y build de producción compilado. No se abrió el navegador por petición expresa del usuario.
- Rediseñada la pestaña `Progresión` tomando como referencia los hitos verticales proporcionados: marco oscuro biselado, medallón circular de nivel, marca verde para niveles obtenidos y estado visible para el actual o pendiente. Se eliminó la guía horizontal redundante y las métricas de Vida, Movimiento y recurso pasan a ser lecturas lineales y compactas con color semántico; el máster conserva edición directa de texto, métricas, altas y bajas.
- Validación final del rediseño de Progresión: 60 suites correctas, 210 tests superados (1 omitido), build de producción compilado y `git diff --check` limpio. No se abrió el navegador por petición expresa del usuario.
- Afinado el emblema de nivel de Progresión para igualar la referencia: sustituido el borde CSS por un arco SVG abierto en el cuadrante derecho y una marca verde vectorial unida al arco, sin recuadro ni icono de fondo. Validado con la prueba específica de Progresión y build de producción; no se abrió el navegador por petición expresa del usuario.
- Corregida la regresión visual del emblema de nivel: el SVG no respetaba la escala del diseño previo, por lo que se retiró íntegramente y se restauró la composición original de círculo y marca verde. Validado con la prueba específica de Progresión y build; no se abrió el navegador por petición expresa del usuario.
- Iniciada la progresión flexible: cada nivel admite ahora una lista de efectos con objetivo (`Vida`, `CD`, `Movimiento`, `Iniciativa`, recurso de clase o personalizado), operación (`sumar`/`fijar`) y valor. Las progresiones antiguas con valores absolutos se convierten en diferencias entre niveles sin modificar el documento original.
- Añadido el cálculo de estadísticas efectivas por nivel personal. La definición global permanece autoritativa y el perfil obtiene sus máximos acumulando únicamente los efectos alcanzados; se conserva el rango heredado de diez niveles para no rebajar copias antiguas incompletas.
- Sustituidas las tres métricas rígidas del editor de Progresión por filas de mejora dinámicas. El máster puede añadir, quitar y cambiar objetivo, operación y valor; el jugador solo ve las mejoras existentes. El recurso usa siempre el nombre configurado por la clase y se añadieron CD e Iniciativa como objetivos reales.
- Añadida gestión individual en Usuarios: cada clase desbloqueada muestra su nivel personal, controles táctiles de bajar/subir, próximo hito y una confirmación integrada con las mejoras que se obtienen o retiran. La escritura afecta exclusivamente a `players/{jugador}/rogueliteClasses/{clase}`.
- Corregida la normalización del recurso para que una definición dedicada con reglas vacías no oculte el nombre y valores guardados en el nivel superior de la clase.
- Validación final de la progresión flexible y los niveles individuales: 61 suites correctas, 215 tests superados (1 omitido), build de producción compilado y `git diff --check` limpio. No se abrió el navegador por petición expresa del usuario.
- Ajustado el editor de efectos de Progresión tras feedback visual: se elimina el `flex-wrap` que enviaba Eliminar a una línea inferior y cada fila usa una cuadrícula responsive con cabecera estable, campos compactos y controles táctiles de 40 px. En móvil, nombre y controles aprovechan todo el ancho inferior sin competir con icono o borrado.
- El recurso de clase usa ahora su color configurado también en Progresión y puede cambiarse desde cualquier efecto de recurso; la escritura reutiliza la definición global del Resumen. Las mejoras personalizadas guardan además un color hexadecimal propio y lo muestran en borde, icono, etiqueta y valor.
- Validación final del editor responsive y los colores: 61 suites correctas, 217 tests superados (1 omitido), build de producción compilado, nuevas cuadrículas presentes en el CSS generado y `git diff --check` limpio. No se abrió el navegador por petición expresa del usuario.
- Unificado el editor de etiquetas de Bestiario y `ClassList`: ambas vistas usan ahora `EditableTag`, con texto realmente editable, paleta persistente que no se desmonta por `blur`, seis colores predefinidos, selector multicolor y campo HEX validado. Se conserva el formato `nombre|#rrggbb` para los datos existentes.
- Las fichas de jugador muestran etiquetas autorales en solo lectura y ya no ofrecen `Añadir etiqueta`; el gestor de estados sigue siendo personal. La ficha del máster recibe el mismo gestor de estados y conserva el bloqueo de clase como una acción independiente.
- Validación final de etiquetas y estados: 63 suites correctas, 220 tests superados (1 omitido), build de producción compilado, copias antiguas de la paleta retiradas y `git diff --check` limpio. No se abrió el navegador por petición expresa del usuario.
- Separadas las etiquetas autorales Roguelite de los estados personales: las primeras se heredan siempre desde la definición actual del máster (`classTags`) y los segundos se guardan por perfil (`personalStatusTags`). Se incluye migración de documentos anteriores sin conservar copias obsoletas de etiquetas globales.
- Las etiquetas vacías se eliminan al confirmar con Enter o al perder el foco en el editor compartido de clases y Bestiario, sin botones adicionales. Se añadieron coberturas para herencia, renombrado/eliminación global, persistencia personal de Sangrado y ambos mecanismos de borrado.
- Validación de la separación de etiquetas: 63 suites correctas, 223 tests superados (1 omitido), build de producción compilado y `git diff --check` limpio. No se abrió el navegador por petición expresa del usuario.
- Implementada la primera vertical de Talentos Roguelite dentro de `Mazo inicial`: recurso autoral con nombre, descripción e imagen; catálogo global editable por el máster; tres ranuras personales para el jugador y selector responsive sin duplicados.
- Añadido editor de encuadre 1:1 para recurso y talentos con rejilla, arrastre, zoom, sustitución de archivo y subida separada de fuente/recorte. Las herramientas solo aparecen en la ficha del máster.
- El modelo nuevo guarda `talentCatalog` en la definición de clase y únicamente `equippedTalentIds` en el perfil. Migra reacciones antiguas y slots con objetos, mantiene las selecciones al renombrar talentos y descarta referencias eliminadas. Las competencias pasan a heredarse desde la definición sin cambios visuales; Reliquias no se modifica.
- Validación final de Talentos: 5 suites afectadas correctas, 23 tests superados, build de producción compilado y `git diff --check` limpio. La suite global del repositorio quedó bloqueada sin resumen incluso con cinco minutos de margen; no se abrió el navegador por petición expresa del usuario.
- Corregido el primer feedback de Talentos: las tres ranuras personales aceptan ahora repeticiones del mismo talento tanto en el selector como en la migración/persistencia; la presentación del jugador recupera filas abiertas y discretas sin paneles visibles permanentes.
- Los editores de talento, selección e imagen se montan mediante portal directamente en `document.body`. El recortador utiliza el nivel de apilado máximo y un contexto aislado, por lo que inventario, textos, inputs y controles de la ficha ya no pueden aparecer sobre la imagen.
- Validación de la corrección: 6 suites afectadas correctas, 24 tests superados —incluidas repetición real y ubicación del recortador fuera del contexto de la ficha—, build de producción compilado. No se abrió el navegador conforme a la indicación del usuario.
- Ajustada la columna de Talentos por rol: el jugador deja de tener `max-height` y `overflow` internos que capturaban la rueda con scrollbar oculto; el máster conserva el scroll para su catálogo y herramientas de edición.
- El editor de imagen mantiene el portal global pero reduce el oscurecimiento a una capa translúcida con desenfoque mínimo y añade entrada breve de fondo/panel, respetando `prefers-reduced-motion`.
- El pipeline común de subida usa ahora un preset explícito para `roguelite-class-assets` y aplica el preset correspondiente también a `uploadDataUrl`; fuente y recorte se guardan con extensión y contenido WebP optimizado.
- Las fichas de clase del jugador sustituyen Resistencia máxima y Carga del equipamiento por las competencias activas configuradas por el máster. La presentación es de solo lectura; el editor del máster mantiene todos sus controles.
- Validación de esta iteración: 5 suites afectadas correctas, 16 tests superados, build de producción compilado, clases responsive y animaciones presentes en el CSS generado y `git diff --check` limpio. No se abrió el navegador por indicación del usuario.
- Feedback de Competencias: se retira el estilo alternativo introducido para jugadores. Máster y jugador comparten ahora la misma función visual; el primero conserva botones y el segundo recibe lecturas no interactivas.
- Las seis competencias permanecen siempre visibles: dorado para las concedidas y gris para las no concedidas. Armas y Armaduras usan cuadrículas idénticas de tres columnas para mantener títulos y etiquetas sobre el mismo eje, y el bloque sube 16 px respecto al separador sin alterar ningún otro componente de Equipamiento.
- Validación del ajuste visual de Competencias: las dos pruebas integradas de ficha máster/jugador pasan, el build de producción compila y la revisión no incluye cambios en Talentos, recurso, inventario ni otras zonas de la ficha. No se abrió el navegador.
- Inventario roguelite en curso: la definición maestra pasa a ser la fuente de la pool inicial; las copias antiguas guardadas en perfiles dejan de imponerse sobre ella, mientras los `equippedItems` personales permanecen intactos.
- Añadida identidad estable de catálogo y metadato `handsRequired` con migración automática del rasgo legado `Dos manos`. La vista de Equipables no se ha modificado.
- La ficha del jugador reutiliza el buscador y las categorías como filtros locales, sin consultar los catálogos de objetos ni mostrar acciones de agregar/eliminar. Las tarjetas de Inventario muestran imagen más reconocible, coste mediante dado de acción y empuñadura.
- Validación final de la pool inicial: 67 suites correctas, 236 tests superados y 1 omitido; el build de producción compila y `git diff --check` queda limpio. No se abrió el navegador por petición expresa del usuario.
- Adaptada la gestión maestra del catálogo al Roguelite: armas con coste explícito en dados, competencia y empuñadura; armaduras con CD y competencia; accesorios sin cargas heredadas; habilidades sin Cuerpo/Mente y con coste de 0 a 3 dados.
- Añadida migración no destructiva de registros antiguos. Al guardar se retiran carga física, carga mental, tecnología y tipo de daño, manteniendo `consumo` y `defensa` como alias temporales para los consumidores existentes.
- El catálogo de accesorios ya forma parte del repositorio seleccionable para la pool inicial de clase. `Equipables` no se ha modificado.
- Validación final del catálogo: 68 suites correctas, 240 tests superados y 1 omitido; build de producción compilado y `git diff --check` limpio. No se abrió el navegador por petición expresa del usuario.
- Implementada la ocupación real de armas a dos manos en `Equipables`: al equiparlas se limpia la mano contraria y la ranura secundaria queda bloqueada, sin duplicar el objeto persistido.
- Añadida representación visual enlazada: imagen atenuada del arma, estado `ARMA A DOS MANOS`, nombre del objeto ocupante, indicador `OCUPADA` y conector entre ambas ranuras. La ranura bloqueada no abre el selector ni acepta interacción.
- Las configuraciones antiguas que guardaban otra arma junto a un arma de dos manos se normalizan al cargar tanto definiciones del máster como perfiles personales. Las ranuras de armadura, accesorios y cinturón permanecen intactas.
- Validación final de ocupación a dos manos: 68 suites correctas, 245 tests superados y 1 omitido; build de producción compilado y `git diff --check` limpio. No se abrió el navegador por petición expresa del usuario.
- Corregido el fallo al equipar con la mano opuesta vacía: `resolveEquipmentHandsRequired` acepta ahora explícitamente `null`, evitando acceder a `handsRequired` sobre una ranura sin objeto. Añadida regresión directa para equipar una Daga con ambas manos vacías.
- Iteración visual aislada para el Inventario Roguelite: las tarjetas pasan a una composición tipo tooltip de RPG con imagen integrada en cabecera, identidad y rareza coloreadas, reglas en franjas, descripción separada y remate cromático. El render vive en `RogueliteInventoryCard`, por lo que puede retirarse sin tocar Equipables ni el modelo de datos.
- Validación de la iteración de tarjetas: prueba específica con imagen y rareza personalizada correcta, 68 suites globales y 247 tests superados (1 omitido), build de producción compilado. No se abrió el navegador conforme a la preferencia indicada por el usuario; la valoración visual queda a su cargo.
- Afinado solicitado de las ilustraciones del Inventario: cada imagen cuadrada recibe una máscara horizontal progresiva en su borde izquierdo para fundirse con la cabecera, eliminando el corte vertical visible sin cambiar encuadre, tamaño ni contenido de las tarjetas.
- Validación del difuminado: las 4 pruebas específicas del Inventario pasan, el build de producción compila y `git diff --check` queda limpio. No se modificó `Equipables` ni se abrió el navegador.
- Corregidos los costes residuales de armadura: catálogo, pool de clase y tarjeta eliminan `actionCost`, `consumo`, `consumption`, `cost` y `coste` para armaduras, mientras armas y habilidades conservan sus dados de acción.
- `Equipables` aplica competencias en Roguelite: armas y armaduras incompatibles siguen visibles, muestran advertencia y estado `No equipable`, quedan deshabilitadas y el manejador rechaza también cualquier intento indirecto. El modo de personajes tradicional no cambia.
- Validación final de costes y competencias: 68 suites correctas, 248 tests superados (1 omitido), build de producción compilado y `git diff --check` limpio. No se abrió el navegador conforme a la preferencia del usuario.
- Ajuste final de la columna de Talentos: el jugador comparte la composición visual y el espaciado del máster, conservando sus diferencias funcionales y sin recuperar scroll interno. Se retiró el rótulo redundante `Dominio de clase` y también la segunda línea ornamental que se superponía al separador de Competencias.
- Corregida la identificación del separador de Competencias: se restaura el remate dorado corto y se elimina el borde horizontal completo que atravesaba el título del bloque.
- Identificada finalmente la línea exclusiva del Bárbaro maestro: era el borde inferior del marco interior del panel, fijado sobre el contenido al superar el alto desplazable. Se conserva el adorno de Competencias y se retira únicamente ese borde inferior en paneles maestros.
- Implementados dos conjuntos de armas Roguelite sin duplicar ranuras: Equipables mantiene Mano Hábil y Mano Torpe y añade selector compacto I/II con conjunto visible y activo separados. Armadura, accesorios y cinturón siguen compartidos.
- El modelo persiste `weaponSets` y `activeWeaponSet`, migra las manos antiguas al conjunto I y conserva `mainHand/offHand` como alias del conjunto activo para compatibilidad con Canvas e inspector. Dos manos y competencias se evalúan dentro de cada conjunto.
- Validación de conjuntos de armas: 68 suites correctas, 254 tests superados y 1 omitido; build de producción compilado y `git diff --check` limpio. No se abrió el navegador conforme a la preferencia expresa del usuario.
- Iniciada la separación estricta entre Canvas y Board: eliminadas todas las importaciones directas entre ambos modos y también las dependencias del host compartido hacia implementaciones concretas de cualquiera de ellos.
- La infraestructura táctica existente se ha congelado bajo `features/tactical-shared`; `legacyCombatRules` conserva el comportamiento previo del Board y el Canvas mantiene reexports compatibles mientras recibe su motor Roguelite por etapas.
- Añadida una prueba de arquitectura que inspecciona imports de producción y falla ante cualquier cruce Canvas/Board o ante dependencias de modo introducidas en `tactical-shared`. Prueba específica correcta y build de producción compilado; no se abrió el navegador por petición del usuario.
- Siguiente paso recomendado: crear el modelo de estado temporal de run y el adaptador de entrada `Jugar aventura` dentro de `features/canvas`, sin modificar el host legado del Board.
- Validación final de la frontera: 68 suites correctas, 255 tests superados y 1 omitido; `npm run build` compila, `git diff --check` queda limpio y las pruebas de humo montan tanto Canvas como Board con sus contratos separados. No se abrió el navegador.
- Implementada la primera conexión ficha de clase → Canvas: `Jugar aventura` entrega el perfil Roguelite completo y, si existe un encuentro activo autorizado, crea automáticamente un único token vinculado mediante `linkedClassId`.
- El adaptador propio del Canvas hereda retrato, nivel, dados de acción, estados y las cinco estadísticas nuevas. Vida, CD, Movimiento, Iniciativa y recurso de clase admiten edición independiente de valor actual y máximo dentro del inspector, conservando el estado de la room al volver a sincronizar.
- El token recibe solo el equipamiento activo: conjunto de armas seleccionado, armadura, accesorios y cinturón. El inspector usa una variante compacta de `RogueliteInventoryCard`; no copia la pool completa ni permite editarla en esta primera vertical.
- La reserva de creación se realiza antes de la lectura asíncrona para impedir tokens duplicados bajo la doble ejecución de efectos de React en desarrollo.
- Cobertura añadida para payload de `Jugar aventura`, conversión de estadísticas, selección del set activo, persistencia real del token en un encuentro simulado, edición de máximos y frontera Canvas/Board. Validación final: 70 suites correctas, 261 tests superados y 1 omitido; build de producción compilado y `git diff --check` limpio. No se abrió el navegador por petición expresa del usuario.
- Ajustado el inspector Roguelite tras revisión visual: se retiran los dos steppers por estadística, el máximo conserva un contador compacto y el valor actual vuelve a editarse tocando bloques coloreados, como en el inspector previo y con mejor interacción móvil.
- Corregida la apertura desde retrato: los tokens con `linkedClassId` envían un destino tipado al overlay y `RogueliteClassSection` abre directamente la clase desbloqueada correspondiente. Los vínculos tradicionales continúan abriendo personajes por nombre.
- Validación del ajuste: 70 suites correctas, 262 tests superados y 1 omitido; build de producción compilado y `git diff --check` limpio. No se abrió el navegador.
- Implementada la persistencia de `activeRun` por clase personal: estadísticas, estados, inventario completo, equipamiento, conjunto activo, dinero, escenario y revisión se guardan bajo `players/{jugador}/rogueliteClasses/{clase}` sin escribir en la definición maestra.
- El Canvas vuelve a cargar la clase personal desde Firebase antes de crear el token y repite el auto-spawn al cambiar de encuentro. Cada sala nueva nace desde la última run; las anteriores conservan snapshots y quedan bloqueadas por escenario/revisión para no pisar el progreso vigente.
- El inspector Roguelite muestra ahora el inventario completo con las tarjetas compactas actuales, diferencia los objetos equipados y permite retirar un objeto actualizando también su loadout y la run persistida.
- La ficha personal proyecta los valores de la run activa y conserva `runReference` con los máximos base calculados desde la definición del máster. Guardar la ficha incrementa la revisión y sincroniza de forma explícita el token actual.
- Pruebas específicas iniciales: 5 suites y 26 tests correctos, incluida persistencia real en el smoke test, inventario completo y rechazo de snapshots pertenecientes a encuentros antiguos. Pendiente ejecutar suite global, build y diff-check; no se abrirá navegador por petición del usuario.
- Validación final del estado de run: 73 suites correctas, 270 tests superados y 1 omitido; `npm run build` compila y `git diff --check` queda limpio. Se añadió cobertura del inventario del inspector y del borrado coordinado con las ranuras equipadas. No se abrió el navegador por petición expresa del usuario.
- Corregida la regresión de sincronización ficha personal → token: guardar la ficha actualiza ahora también `activeRun.stats`, y la carga del Canvas conserva los valores ya resueltos desde la definición maestra en lugar de sustituirlos por campos personales antiguos.
- Separada la pool maestra del inventario runtime mediante `classEquipmentPool`, snapshot de ids base y registro de retiradas. Las runs legacy con inventario vacío se reparan desde la pool vigente; las nuevas conservan botín adquirido sin reintroducir objetos base descartados. Regresiones específicas e integradas: 9 suites y 43 tests correctos.
- Validación final de la corrección: 73 suites correctas, 276 tests superados y 1 omitido; build de producción compilado y `git diff --check` limpio. Se añadió una regresión end-to-end del adaptador que demuestra que la sincronización explícita reemplaza en el token sus estadísticas antiguas por las guardadas en la ficha personal.
- Primera iteración del ciclo plantilla → ficha personal → token, posteriormente simplificada: las definiciones maestras reciben revisión y `Finalizar aventura` restablece solo ese perfil conservando nivel y talentos.
- La confirmación del Canvas conserva en una sola acción el encuentro y, cuando corresponde, estadísticas, estados, inventario, equipo y dinero del token Roguelite. El Board conserva su comportamiento independiente.
- Añadidos estados visuales compactos `Preparada`, `Aventura activa` y `Hay cambios pendientes`, junto con cobertura de rebase, conservación de daño/botín y finalización individual por el máster.
- Validación final del ciclo de sincronización: 73 suites correctas, 279 tests superados y 1 omitido; build de producción compilado. No se abrió el navegador por petición expresa del usuario.
- Simplificado el ciclo tras la primera revisión: restaurado `Confirmar cambios` como única acción. Si el token Roguelite tiene cambios de partida, el mismo guardado persiste el encuentro y actualiza su ficha personal; el aviso queda integrado debajo de `Vinculación de ficha` y desaparece el bloque independiente de progreso.
- Restaurado el estado de carga compacto `Guardando...`, en una sola línea y con el icono de giro protegido frente a deformaciones.
- Las modificaciones de una clase maestra se propagan ahora automáticamente a las runs personales existentes de esa clase, conservando daño, estados y botín. En Usuarios solo permanece `Finalizar aventura` como restablecimiento total de una clase concreta.
- Validación final del flujo simplificado: 74 suites correctas, 280 tests superados y 1 omitido; build de producción compilado y `git diff --check` limpio. No se abrió el navegador por petición expresa del usuario.
- Corregida la actualización de fichas Roguelite abiertas: la suscripción de catálogo y perfil permanece montada durante la vista de detalle y entrega cada nueva proyección a `ClassList`, por lo que estadísticas, recurso, estados e inventario cambian sin recargar tras confirmar Canvas, guardar la clase maestra o finalizar la aventura.
- Las actualizaciones remotas no pisan un borrador local: se posponen mientras el jugador está editando y se aplican al confirmar o descartar sus cambios. Añadida una regresión que mantiene abierta la ficha mientras una run remota cambia Vida de 8/8 a 5/8 y Furia de 0/3 a 1/3.
- Validación final de la actualización en vivo: 74 suites correctas, 281 tests superados y 1 omitido; build de producción compilado y `git diff --check` limpio. No se abrió el navegador conforme a la preferencia del usuario.
- Las habilidades disponibles y equipadas del sidebar resuelven ahora el mismo arte que sus tarjetas de inventario, incluida la colección `equipment_images` y los campos legacy `imagen`/`imageUrl`; el rayo solo aparece si no existe imagen. Regresión focal: 2 suites y 8 tests correctos.
- Retirado el modo experimental de encuadre amplio tras la prueba visual con ilustraciones cuadradas: los límites rectangulares seguían percibiéndose y reducían la calidad de la cabecera. Se conserva exclusivamente el encuadre clásico con autoanálisis, foco manual y guía de la zona reservada, sin tocar el degradado, rareza, hover ni retrato del token. Validación: 80 suites correctas, 316 tests superados y 1 omitido; build de producción compilado.
- Ajuste del bestiario Roguelite: todas las estadísticas quedan limitadas a 20 bloques tanto en edición como al normalizar datos antiguos. Las tarjetas admiten orden persistente, arrastre en escritorio y flechas accesibles para móvil/teclado. El coste del equipo pasa al icono compacto `Dices` en color neutro y los rasgos dejan de repetir el rótulo `Rasgos`.
- Validación de este ajuste: 80 suites correctas, 321 tests superados y 1 omitido; build de producción compilado. El cliente Playwright solo alcanza el selector de rol sin una sesión de máster, por lo que la comprobación visual autenticada de las flechas y el arrastre queda para el usuario.
- Implementada la primera mecánica de intercambio físico del inventario en Canvas: las tarjetas del inspector se reordenan con arrastre y pueden soltarse sobre el mapa mediante un gesto de puntero compatible con ratón y pantalla táctil.
- Soltar un objeto desmonta de forma coordinada armas, armaduras o habilidades preparadas, crea una entidad `scenePickup` pequeña en la casilla libre más cercana y persiste el cambio tanto en `canvas_scenarios` como en la `activeRun` personal. Las piezas del suelo quedan excluidas de iniciativa, colisiones y HUD de combate.
- Al pulsar el objeto se abre un inspector propio con arte, rareza, procedencia y botón `Recoger`; la recogida elige la ficha de clase controlada más cercana, añade el objeto sin equiparlo y elimina la pieza para todos los participantes.
- La integración se inyecta mediante el contrato del modo Canvas (`isScenePickupItem`, visual e inspector). Board no registra esas extensiones y la prueba de frontera lo verifica explícitamente.
- Validación final: 81 suites correctas, 326 tests superados y 1 omitido; build de producción compilado y `git diff --check` limpio. La comprobación visual autenticada del gesto queda para el usuario si el cliente local continúa detenido en el selector de rol.
- Revisada la transferencia física de inventario del Canvas: tanto clases como enemigos pueden dejar objetos, la celda de destino se ilumina en dorado y la pieza nace a media casilla sin la etiqueta ni el marco duplicados del primer prototipo.
- Eliminado el inspector propio del botín. Las piezas se arrastran como elementos del mapa y se recogen únicamente al soltarlas sobre la ficha destinataria; el permiso se valida contra esa ficha concreta y un intento sobre una ficha ajena revierte el movimiento.
- El hover del botín reutiliza la tarjeta Roguelite completa en un portal animado sobre el Canvas. Soltarlo sin destinatario lo recentra en su celda y soltarlo sobre una clase personal persiste también la run; los enemigos pueden dejar y recibir equipo sin depender de una ficha de clase vinculada.
- Validación final de la revisión: 81 suites correctas, 329 tests superados y 1 omitido; `npm run build` compila y `git diff --check` queda limpio. El cliente visual oficial abre correctamente la aplicación, pero la sesión automatizada queda en el selector de rol sin credenciales; la captura generada para comprobarlo fue inspeccionada y eliminada.
- Corregida la reconstrucción del inventario tras intercambios en Canvas: una run persistida desde un token pasa a ser la fuente autoritativa y ya no se vuelve a mezclar con la selección personal anterior ni con la pool maestra. Soltar un objeto equipado permanece reflejado como retirada y recoger un objeto se conserva incluso si su plantilla también pertenece a la pool inicial de la clase.
- El modelo `activeRun` sube a versión 2. Las runs v1 que ya incluyen `lastTokenId` se reconocen como instantáneas reales para recuperar los intercambios efectuados antes de esta corrección; las runs legacy sin instantánea siguen usando la reparación anterior.
- Regresiones añadidas para el recorrido real Canvas → `activeRun` → ficha personal: objeto base arrojado, botín recogido con identidad de la pool y configuración personal obsoleta que no debe imponerse. Validación focal: 4 suites y 49 tests correctos.
- Validación final de la corrección: 81 suites correctas, 338 tests superados y 1 omitido; `npm run build` compila y `git diff --check` queda limpio. El cliente Playwright oficial se ejecutó y la captura fue inspeccionada, pero la sesión automatizada sigue detenida en el selector de rol sin credenciales, por lo que el gesto autenticado queda para la prueba del usuario.
- Corregida la invariante inventario–equipables del intercambio físico: al retirar un objeto se limpian las ranuras por identidad de instancia o plantilla aunque falte `isEquipped`; la persistencia de `activeRun` vuelve a podar cualquier referencia obsoleta antes de proyectar la ficha personal.
- Los objetos transferidos se normalizan al soltarlos, entregarlos y recogerlos. Nombre/`nombre`, rareza, descripción, datos anidados e imagen pasan a una forma canónica; el arte usado por la pieza del suelo queda almacenado también en el objeto recogible y las fichas ya guardadas recuperan sus alias legacy al cargarse.
- Las fichas antiguas que solo conservaron un loadout materializan ese equipo en el inventario al iniciar una nueva aventura, pero esta compatibilidad no se utiliza para revivir objetos retirados durante una run existente.
- Validación final: 81 suites correctas, 342 tests superados y 1 omitido; `npm run build` compila y `git diff --check` queda limpio. El cliente Playwright oficial se ejecutó sin errores visibles; la captura inspeccionada confirma que la sesión automatizada continúa en el selector de rol, por lo que el intercambio autenticado queda para la prueba del usuario.
- Eliminado el asset local `public/armas/la_sanguinaria.webp` y purgados los fallbacks estáticos de 'sanguinaria' en todo el código (`TacticalAssetImage`, `CombatHUD`, `CombatReactionModal`, `LoadoutView`, `EquipmentImageManager`).
- Corregida la resolución de imágenes personalizadas en `CanvasLootVisual` (resolución canónica por clave/nombre contra `useCustomEquipmentImages`).
- `EquipmentImageManager` y `useCustomEquipmentImages` garantizan ahora prioridad absoluta a las imágenes subidas por el usuario, registrando metadatos de reemplazo para no depender más de assets estáticos locales.
- Rediseñado el agarre de arrastre del inventario en el inspector de tokens: eliminado el tirador rectangular exterior que sobresalía por el lateral izquierdo. Se integró un botón de agarre sutil (`⠿`) en la cabecera superior derecha junto a la acción de eliminar, con soporte de arrastre directo desde toda la cabecera de la tarjeta y navegación accesible por teclado.
- Alineado el efecto de feedback visual de reordenación de inventario con el estándar del Bestiario Roguelite: la tarjeta en movimiento aplica `.is-dragging` (`opacity: 0.48, scale: 0.992`) y la tarjeta destino activa `.is-drop-target` (`border-color` e `inset shadow` sutil de acento), sin etiquetas de posición ni líneas adicionales.
- Validación final: 81 suites correctas, 345 tests pasando (1 omitido).

## 2026-08-14 — Dados de acción e iniciativa Roguelite del Canvas

- Añadido un modelo de combate exclusivo de `features/canvas/combat` con fases de preparación, tiradas, turnos, fin de ronda y final de combate.
- Las fichas de clase aportan directamente `actionDice`; la tirada inicial calcula `iniciativa base + resultado mayor` y se conserva como pool de acciones de la ronda 1.
- Añadidas tiradas digitales y entrada de resultados físicos, con validación individual por dado (`d4`, `d6`, `d8`, etc.).
- La iniciativa agrupa aliados consecutivos en bloques flexibles, prioriza enemigos en empates (`enemies` antes que `players`) y agrupa enemigos del mismo perfil.
- Creado el panel lateral Canvas `Ronda`, con estado visible de dados (disponible, reservado y gastado) tanto para jugadores como para el máster, activaciones, siguiente ronda, deshacer y finalizar combate.
- Creada una línea de iniciativa Canvas propia y compacta; BoardCards conserva su adaptador y su interfaz sin importar módulos del Canvas.
- El estado se persiste en `canvas_scenarios.canvasCombat` y se fusiona por el listener en tiempo real. Las mutaciones de ronda usan transacciones para evitar que dos tiradas simultáneas se sobrescriban.
- Rediseñado el formato de los dados de acción en el panel Ronda: disposición vertical elegante que aprovecha el ancho completo para evitar que las etiquetas se corten en escritorio (`DISPONIBLE`, `RESERVADO`, `GASTADO`).
- Incorporados los retratos de los personajes en la fase de ronda activa (`RoundParticipant`) con indicador visual al actuar.
- Añadido soporte interactivo de acciones para enemigos (`Movimiento` y `Ataque`) para que el máster pueda desmarcar, reservar o agotar acciones antes de terminar el turno.
- Optimizado el flujo de sincronización en tiempo real del combate (`useCanvasCombatRuntime` y `TacticalSectionCore`): estado optimista síncrono local (`localCombatRef`), cola de escritura secuencial (`writeQueueRef`) y protección contra sobrescritura por snapshots remotos desfasados (`updatedAt`). Los clics rápidos sobre dados de jugadores y acciones de enemigos transicionan de inmediato sin retraso ni reversiones involuntarias.
- Implementado saneamiento automático de participantes eliminados (`pruneCombatState`) y persistencia directa con `updateDoc` en lugar de `merge: true` en mapas de Firestore, asegurando que cuando se borran tokens del canvas se purguen inmediatamente del estado de combate y no queden fichas fantasma en encuentros posteriores.
- Especializada la «Mesa de Dados (Tirada Libre)» en el Canvas adaptando la identidad visual de `BoardCards`: soporte de dados críticos/explosivos independientes por tipo de dado (D4..D20) con rebotes automáticos ante valores máximos, estilización con brillos dorados/rojos, modificador fijo graduable (con botones `−5 / −1 / +1 / +5` e input directo) que se suma al cómputo final sin aplicar crítico, texto limpio en el botón de lanzamiento («Lanzar reserva») y posibilidad interactiva de anular/reactivar dados individuales desde el historial de tiradas recalculando el total efectivo en tiempo real.
- Integrado el nuevo sistema de iniciativa por bloques (`canvasCombat`) en las restricciones de turno de fichas y en la activación del HUD de combate: corregida la resolución de participantes del bloque activo en `canCombatTokenActNow` usando `memberIds` y `actedIds`, permitiendo a los jugadores seleccionar e interactuar fluidamente con su personaje cuando les corresponde según el orden de iniciativa de la barra superior sin bloqueos ni falsos avisos de turnos por velocidad.
- Preservadas las formaciones y duelos de fichas compartiendo casilla de forma permanente aunque se desactive el modo combate en configuración: los tokens mantienen su colocación lado a lado en la casilla sin encimarse ni juntarse en un único punto.
- Validación final: 86 suites correctas, 381 tests superados y 1 omitido; `npm run build` compila y `git diff --check` queda limpio.

## 2026-08-15 — Movimiento directo y confirmación integrada en Canvas

- Eliminado el selector `Mover` y la tarjeta flotante de desplazamiento, que ocupaban demasiado espacio sobre el tablero.
- Recuperado el gesto directo: arrastrar el token en escritorio o tocar una casilla alcanzable en móvil.
- El desplazamiento del jugador se mantiene provisional sin mostrar una interfaz adicional y se confirma automáticamente al pulsar `Fin Turno`.
- En móvil se conserva únicamente un pequeño control circular para cancelar y volver al origen; el escritorio permite cancelar arrastrando de vuelta a la casilla inicial.
- Los modificadores manuales de Movimiento continúan disponibles en `Ronda`, por lo que bonificaciones, penalizaciones y juego híbrido siguen sin exigir automatizar cada regla.
- La lógica se activa únicamente en el combate `canvasCombat`; BoardCards mantiene intacto su flujo de movimiento y turno.
- Validación: 88 suites correctas, 386 tests superados y 1 omitido; `npm run build` compila correctamente. La comprobación visual automatizada alcanza el selector de rol, pero el Canvas autenticado queda para la prueba manual del usuario.

## 2026-08-15 — Ataques y defensa activa Roguelite en Canvas

- Adaptado el HUD existente al Canvas sin alterar la variante de BoardCards: detecta exclusivamente armas equipadas y explica cuándo su coste no puede pagarse con los dados de acción disponibles.
- Añadido un resolutor propio de reglas del Canvas para perfiles completos de arma, costes Pesados, críticos, Perforante, Arrojadiza, alcance, Duelo y ataques de Toque a una casilla.
- Sustituido el panel táctico paralelo por un modal central coherente con el flujo de reacción existente: arma y objetivo llegan ya seleccionados, el atacante solo compromete sus dados de acción y confirma.
- El perfil completo del arma y cualquier dado de crítico se tiran automáticamente al confirmar el ataque; se eliminan los controles manuales de tirada del arma.
- Añadida defensa sincronizada usando cualquier dado no gastado, cálculo por múltiplos completos de CD, pérdida de bloques de Vida y aviso de excedente defensivo pendiente de movimiento o contraataque.
- El defensor recibe el ataque en ese mismo lenguaje de modal, puede comprometer dados o recibirlo directamente; el dado de Amenaza enemigo queda reservado salvo que el máster decida gastarlo de forma explícita.
- Los dados ofensivos y defensivos quedan gastados en la ronda, los enemigos consumen su acción de Ataque y el daño se persiste también en la run vinculada de una ficha de clase.
- Los resultados se publican en `combat_log` para reutilizar el historial y las animaciones ya existentes.
- Cobertura añadida para costes, perfiles, alcance, Duelo, críticos, CD, excedente y transición sincronizada ataque-defensa.
- Validación final: 87 suites correctas, 385 tests superados y 1 omitido; `npm run build` compila y `git diff --check` queda limpio.

## 2026-09-04 — Lenguaje visual y rarezas de la Forja Roguelite

- Retirada la chispa decorativa de `Vista en inventario` y eliminados los pictogramas de Armas, Armaduras, Habilidades, Objetos y Accesorios en la navegación principal.
- Sustituidas las cajas doradas de categoría por pestañas tipográficas con separador activo. Tras la revisión visual, volver, crear, cargar y guardar recuperan el dorado característico mediante texto, líneas, bordes finos y fondos oscuros, evitando el anterior aspecto de bloque amarillo; cancelar permanece neutro y eliminar conserva su rojo semántico.
- Trasladada la gestión de rarezas a la propia Forja mediante un panel lateral en escritorio y una hoja inferior táctil en móvil, con creación, edición, color y borrado directo.
- El gestor de rarezas comparte el dorado contenido de la Forja en bordes, foco, edición y confirmación, mientras cada muestra conserva su color semántico propio.
- Trasladado el gestor del glosario a la Forja con buscador, alta, edición y borrado en una hoja inferior móvil o panel lateral de escritorio; el antiguo formulario duplicado de ajustes generales queda retirado.
- Añadida una inicialización persistente de una sola ejecución para Común, Poco común, Rara, Épica, Legendaria y Mítica. El marcador de inicialización evita que una rareza eliminada voluntariamente vuelva a aparecer.
- Añadida cobertura focal para la navegación sin pictogramas y la creación de rarezas desde la Forja.
- Validación final: 95 suites correctas, 444 tests superados y 1 omitido; la cobertura específica de Forja añade 3 pruebas correctas, `npm run build` compila y `git diff --check` queda limpio. El cliente visual arranca sin errores, aunque la ruta autenticada de la Forja permanece detrás de la selección de rol para la sesión automatizada.
## 2026-09-05 — Catálogo visual de la Forja

- Entradas ilustradas compactas con reglas y rasgos visibles, menú de acciones de 48 px y eliminación de la marca Arcana Vault de las cabeceras.
- Editor móvil con alternancia entre campos y previsualización; escritorio mantiene ambas regiones.
- Pruebas específicas de Forja: 4 correctas.
- Revisión del catálogo tras feedback: sustituida la miniatura cuadrada por cabecera ilustrada 4:3 a todo el ancho, con identidad sobre degradado inferior. Requiere revisión visual en sesión autenticada.
- Ajuste posterior: cabecera compacta de 116 px con la distribución lateral del arte de la previsualización. El botón de entrada usa flex con alineación superior para evitar centrado vertical y huecos sobre el arte entre entradas de distinta altura.

## 2026-09-05 — Defensa activa de enemigos en Canvas

- La ventana de ataque inminente ya no permite descartar el ataque; «Recibir ataque» ocupa la acción principal cuando no se defiende.
- Un enemigo puede defenderse fuera de su turno si conserva Ataque y empuña un arma o equipo con perfil defensivo válido. Defender gasta Ataque inmediatamente.
- La defensa tira el perfil completo del equipo sin sumar Base ofensiva y admite una sola Amenaza: la disponible de la ronda o un dado personalizado d4–d20 para esa resolución.
- Empate anula el ataque; una defensa superior exige dedicar todo el Excedente a reposicionarse o contraatacar. El reposicionamiento usa una reserva separada y no gasta Movimiento.
- Rediseñada la ventana para móvil y escritorio: la Presión entrante desglosa visualmente dados de acción, arma, críticos, Amenaza y Base; el equipo defensivo usa tarjetas con imagen, perfil y rasgos; la Amenaza emplea opciones táctiles y dados d4–d20, sin mostrar valores `null`.
- Sustituida la tabla plana de resultados por tres indicadores temáticos y responsive: Defensa en azul acero, Presión restante en rojo y Excedente en dorado, con iconos ambientales, acento superior y números de mayor jerarquía.
- Rediseñada la tarjeta de arma de «Preparar ataque»: usa el arte real del catálogo o su recurso clásico, integra nombre, coste, perfil, alcance y rasgos sobre degradados legibles, y sustituye «contra» por un separador `VS`.

## 2026-09-05 — Revisión completa del interior de los modales de combate

- Se conserva el marco exterior y los botones principales aprobados por el usuario. El interior sustituye insignias, iconos decorativos y paneles azules/morados por tipografía contenida, separadores y dorado de selección.
- `CanvasCombatDetails.jsx` y su CSS comparten el desglose de presión, dados seleccionables, cartas de equipo, Amenaza y resultado entre preparación y las dos defensas. El arma atacante aparece ilustrada detrás de sus dados; las armas defensivas usan el mismo tratamiento panorámico de la carta aprobada.
- La Amenaza distingue sin amenaza, reserva y dado puntual; sus tamaños solo aparecen al elegir la opción personalizada. La preparación enemiga reutiliza el selector de reserva, sin introducir Amenaza personalizada ofensiva.
- La presión restante ocupa la primera jerarquía del resultado, con Defensa total y Excedente en una línea secundaria. Se mantienen las acciones y cálculos existentes. El desglose compartido incluye críticos legacy, Amenaza y penalización Arrojadiza; la forma del dado de Amenaza utiliza el perfil del atacante cuando está disponible.
- Corregida la superposición del título sobre el botón X y ampliada su zona táctil. Las acciones de Excedente se apilan por debajo de 380 px para evitar textos superpuestos.
- Validación: 36 pruebas de modal/reglas/estado superadas y compilación de producción correcta. Revisión de 21 escenarios de los componentes reales en 1440×1000, 390×844 y 320×640, con selección de dados, reserva/puntual, recepción, defensa, excedente y cancelación; sin errores de navegador ni desbordamiento horizontal del contenido.
- Capturas abiertas e inspeccionadas, incluida la resolución completa a 1280×720 con el cliente de la skill. Harness y evidencias en `output/combat-ui-review`; usa datos locales y sustituye únicamente el hook de imágenes de Firebase. Esta comprobación visual no verifica sincronización multicliente ni escrituras reales de combate.

## 2026-09-05 — Opciones de arma del selector de ataque

- Sustituidos los tres microcomponentes anteriores de cada opción: el coste usa ahora `Dices`, igual que la tarjeta del inventario; el daño adopta un rojo hierro más contenido; la antigua inicial del atributo desaparece y se muestra la lista real de rasgos.
- Los rasgos comparten una sola línea y se recortan con elipsis cuando el ancho se agota. Así siempre queda visible al menos el primero sin crear scroll horizontal ni desplazar el control de selección.
- Las opciones usan un borde más sobrio, imagen de 58 px, franja lateral en selección y una jerarquía tipográfica compacta. El selector móvil pasa de 200 px a un ancho máximo de 360 px limitado al 92 % del viewport.
- Añadida cobertura de render para coste, daño y rasgos. El harness de `output/attack-selector-review` verificó las tres opciones a 1280×720, 390×844 y 320×640, incluida selección, expansión y cancelación, sin errores de navegador ni desbordamiento horizontal.

## 2026-09-05 — Amenaza personalizada en ataques enemigos

- La preparación de un ataque enemigo reutiliza el selector completo de Amenaza: sin Amenaza, reserva actual cuando existe, o dado puntual d4, d6, d8, d10, d12 o d20 aunque la criatura no tenga una reserva configurada.
- `rollCanvasThreatDie` centraliza la elección para ataque y defensa. La reserva aporta su valor ya obtenido y queda consumida; la opción personalizada tira el dado elegido para esa resolución y conserva intacta cualquier reserva.
- El ataque pendiente guarda el dado y su número de caras para que la ventana defensiva explique correctamente de dónde proviene la Presión.
- Añadidas pruebas del cálculo de Amenaza vacía, almacenada y personalizada, además del flujo del modal sin reserva. Resultado focal: 38 pruebas superadas.
- La revisión visual cubre reserva y dado puntual a 1440×1000, 390×844 y 320×640. El harness confirma selección, d20 personalizado, confirmación y cancelación en 27 escenarios, sin errores de navegador ni desbordamientos.

## 2026-09-05 — Nueva geometría del d20

- Sustituida la antigua silueta hexagonal por las diez facetas triangulares separadas de la referencia, conservando el número centrado y las paletas de estado del combate.
- La misma construcción se aplica al dado ornamentado de acciones y al componente genérico para evitar representaciones distintas del d20 dentro de la aplicación.
- Validación: 16 pruebas focales correctas, incluidas geometría y modal de combate; 27 escenarios responsive sin errores ni desbordamiento y revisión visual del selector de Amenaza en móvil y escritorio.

## 2026-09-05 — Jerarquía visual de la defensa del jugador

- La antigua mención secundaria `CD N` se sustituye por una tarjeta de protección con el arte y nombre de la armadura equipada, un sello de CD dominante y una explicación breve de su efecto sobre la Vida.
- Cuando `Perforante` altera el valor, la tarjeta diferencia la CD base de la CD efectiva. El resultado mantiene visible `CD N` junto a la Presión restante, incluso al desplazarse por el contenido en móvil.
- Los dados de defensa se centran y pasan a controles con borde completo, acento superior, iluminación contenida y estados textuales `Disponible`/`En defensa`. El mismo componente usa `Seleccionado` cuando aparece en la preparación ofensiva.
- Validación focal: 16 pruebas correctas. El harness recorrió 27 combinaciones en 1440×1000, 390×844 y 320×640 sin errores de navegador ni desbordamiento horizontal; las capturas finales se inspeccionaron con y sin selección.

## 2026-09-05 — Serialización de ataques sin Amenaza

- Corregido el rechazo de Firestore provocado por `pendingAttack.threatDieSides: undefined`: el campo solo se crea cuando el ataque utiliza realmente un dado de Amenaza.
- La cola de ataques elimina además cualquier propiedad superior indefinida antes de incorporar el ataque al estado persistente.
- Añadida una regresión que encola un ataque normal con el campo indefinido y comprueba que no llegue a `pendingAttack`. Validación focal: 38 pruebas correctas.

## 2026-09-05 — Arte y proporción de la armadura defensiva

- El resolvedor compartido incorpora las armaduras locales del catálogo por nombre, por lo que `Armadura acolchada` y el resto de piezas clásicas muestran su arte aunque no guarden una URL explícita.
- La tarjeta de defensa reduce su altura y adopta la estructura horizontal de Presión entrante: datos y regla a la izquierda, imagen panorámica de fondo y CD en una columna derecha con divisor vertical.
- Validación: 16 pruebas focales correctas, incluida la resolución automática del arte. Revisión de 27 escenarios en 1440×1000, 390×844 y 320×640 sin errores de navegador ni desbordamiento horizontal.

## 2026-09-08 — Reglas y lore en las tarjetas del inventario

- La Forja separa ahora `Reglas y efecto` de `Lore` para armas, armaduras, habilidades, objetos y accesorios. Los registros antiguos conservan íntegra su descripción como texto mecánico y pueden incorporar lore sin migración destructiva.
- La tarjeta real del inventario presenta el efecto con tipografía directa y el lore como un fragmento editorial en serif cursiva, separado por una línea y un acento vertical de la rareza. El contenedor mantiene el scroll interno de las tarjetas fijas en PC.
- La búsqueda de la Forja y de la mochila incluye ambos textos. La serialización conserva las claves compatibles en español e inglés.
- La incorporación de equipo a una clase conserva el lore en la copia de inventario. Las copias anteriores que aún no lo contienen lo recuperan del catálogo actual por identificador o nombre, también en la vista del jugador.
- Los campos de la Forja y los textos finales de la tarjeta comparten Alegreya: peso medio para las reglas y cursiva para el lore. Sustituye el aspecto genérico de Lato sin sacrificar legibilidad en móvil.
- Validación: 10 pruebas focales correctas y compilación de producción satisfactoria. El harness `output/inventory-copy-review` verificó el componente real a 820×720, 390×844 y 320×640 sin errores de navegador ni desbordamiento horizontal.

## 2026-09-08 — Presentación y recogida del botín

- Petición: pulir los objetos del suelo y su recogida por tokens con una presentación propia de juego.
- Marcador compacto con arte de catálogo, apoyo sobre el tablero, rareza y nombre contextual; eliminados brillo difuso y marco facetado.
- Destinatario estable, anillo semántico verde y mensaje antes de soltar; confirmación temporal de entradas al inventario sin mutar datos del juego.
- Vista previa alcanzable con cursor, apertura/cierre por teclado, imagen alternativa y controles móviles dentro del panel.
- Validación: 95 suites / 465 pruebas existentes correctas; 23 pruebas focales posteriores, incluidas dos regresiones de la confirmación. Compilación de producción correcta. Harness de componentes reales en output/loot-review: hover, teclado, móvil, destino y caducidad de confirmación; no sustituye una sesión multijugador con Firebase.

## 2026-09-08 — Corrección visual del botín según capturas

- Objetos rectos y eliminado el verde de destino y confirmación.
- Aviso único de recogida con la geometría compacta, negro y oro del HUD. El nombre del objeto arrastrado se oculta sobre el token; el mismo aviso cambia de Soltar a confirmación sin + ni segunda línea.
- Regresión añadida para que un destino nuevo sustituya una confirmación previa, sin dos mensajes simultáneos.

## 2026-09-08 — Ataque inminente y selección defensiva

- Panel ofensivo alineado con la defensa: nombre del arma, composición compartida y sello numérico de la misma escala. Base fija alineada con las caras de los dados y operadores centrados.
- Eliminados los contenedores de tarjeta de los dados seleccionables; selección sobre el dado con desplazamiento corto, indicador y estado textual.
- Resultado con columna numérica común y explicación de defensa total y excedente.
- Sin capturas ni revisión visual por petición explícita del usuario. Validación mediante pruebas del modal y compilación.

## 2026-09-08 — Excedente defensivo funcional

- Restaurada la altura de defensa a 126 px; Presión entrante en rojo.
- Elección obligatoria de excedente para jugadores y enemigos: reposicionamiento o contraataque con arma equipada de alcance legal. El contraataque no tira dados ni crea otro ataque pendiente; se persiste la Vida del atacante y su pérdida en el registro compartido.
- Reserva de reposicionamiento acumulable, consumible sin gastar movimiento ordinario y visible en el contador del token, también en combates de prueba. La salida de Duelo no genera reacción de oportunidad en el motor actual.
- Animaciones compartidas desde combat_log: Contraataque y daño o Resiste, Bloqueo Perfecto con empate y ráfaga de Reposicionamiento.
- Añadidas regresiones del runtime, selector y animaciones. Sin capturas según petición del usuario.

## 2026-09-08 — Equipo defensivo y CD enemiga visible

- Dados de preparación centrados. Arma defensiva con composición de armadura: ilustración, identidad, separación de rasgos y columna de tirada.
- La CD ya intervenía en resolveCanvasAttackDamage; faltaba en la interfaz enemiga. Ahora muestra CD base/efectiva y daño previsto, recalculados con el mismo resolvedor del runtime.
- Regresión: 13 de Presión menos 2 de defensa deja 11; contra CD 5 muestra 2 bloques de Vida. Sin capturas por petición del usuario.

## 2026-09-08 — Botón contextual de defensa activa

- Eliminado el par ambiguo «Recibir ataque» + «Defender».
- El mismo botón pasa a «Confirmar defensa» cuando el enemigo tiene equipo defensivo seleccionado y ejecuta equipo/Amenaza; sin defensa elegible conserva «Recibir ataque».
- Actualizada la regresión del modal.

## 2026-09-08 — Selección reversible del equipo defensivo

- Restaurado el color rojo del botón de acción.
- La primera arma se muestra seleccionada por defecto, pero se puede desmarcar pulsándola de nuevo o sustituir por otra; el botón cambia a «Recibir ataque» cuando no queda ninguna seleccionada.
- Añadida regresión de marcado, cambio y desmarcado del arma defensiva.

## 2026-09-08 — Señal visual de equipo defensivo seleccionado

- Simplificada la tarjeta seleccionada: una única marca ✓ circular en la esquina, sin barra lateral ni marco interior.
- Las tarjetas siguen siendo botones accesibles y conservan el foco visible; no cambia la lógica de selección ni el tamaño de la tarjeta.

## 2026-09-15 — Copias físicas e indicador sutil de manos

- El equipamiento Roguelite distingue plantilla y copia física; una misma instancia no puede ocupar dos manos ni dos conjuntos, mientras dos copias iguales sí permiten combatir con doble arma.
- Tras la revisión visual, las ranuras recuperan los rótulos discretos `HÁBIL` y `TORPE`. Izquierda/derecha deja de mostrarse como texto visible.
- El selector representa la ocupación con dos manos inclinadas en V: cada mano se ilumina de forma independiente y las armas a dos manos encienden ambas.
- Las tarjetas del inventario eliminan las etiquetas textuales de copia/ubicación y solo muestran el indicador de manos cuando esa copia está equipada.
- Pruebas focales: 25 correctas para selector, tarjetas, armas a dos manos, copias repetidas y conjuntos independientes.
- Revisión visual completada con el componente real a 1366 y 390 px: selector y mochila sin errores de navegador ni desbordamiento horizontal; el cliente automatizado de juego confirmó el estado esperado.
- Validación final: 98 suites correctas, 494 pruebas superadas y 1 omitida; `npm run build` compila correctamente.

### Revisión del indicador de copias

- Eliminada definitivamente la fila textual `Copia N de N · Libre` del cuerpo de la tarjeta.
- Las repeticiones se comunican con `Layers2` y el total, junto al indicador independiente de manos; una copia libre no añade ningún texto de estado.
- Reubicados los indicadores de copias y manos en un único grupo gráfico, sin fondo ni rótulos, en la esquina inferior derecha del cuerpo de la tarjeta. La cabecera queda reservada para arrastrar o eliminar.
- Revisión visual repetida a 1366 y 390 px con dos dagas físicas: composición estable, sin desbordamiento ni errores de navegador.

### Integración visual de manos y controles

- `TORPE`, `HÁBIL` y `OCUPADA` abandonan la placa rectangular y se integran en la esquina de la ilustración mediante un fundido oscuro, una línea fina semántica y texto con sombra contenida.
- La acción de desequipar deja de ser un botón rojo flotante: ocupa el remate opuesto de la imagen, permanece discretamente visible y refuerza su estado al pasar el cursor o recibir foco.
- El indicador de manos ya no acumula opacidad en sus contenedores. La mano inactiva conserva lectura tenue y la activa gana trazo, luz y contraste para seguir distinguiéndose en pantallas oscuras o poco contrastadas.
- Revisión visual del componente real a 1366 y 390 px: los remates se funden con arte claro y fondo oscuro, la X permanece localizable y la mano activa mantiene una lectura inequívoca. El harness y el cliente automatizado no registraron errores ni desbordamiento horizontal.
- Validación final: 98 suites correctas, 494 pruebas superadas y 1 omitida; la compilación de producción termina correctamente.
- Refinada la acción de desequipar tras la revisión: desaparece el guion lateral, la `X` pierde dureza y el oscurecimiento pasa de una cuña marcada a un halo radial más amplio y transparente, integrado con el arte.
- Ajuste comprobado a 1366 y 390 px sin errores ni desbordamiento; las 11 pruebas focales pasan y el build de producción compila correctamente.
- `HÁBIL`, `TORPE` y `OCUPADA` adoptan el mismo halo radial suave de la acción de desequipar: desaparece también su guion y el texto queda integrado directamente en la esquina del arte.
- Corregido el conector de armas a dos manos: la ranura bloqueada dirige ahora la línea hacia la ranura propietaria, tanto desde la izquierda hacia la derecha como en el caso inverso.
- Verificación final en los conjuntos I y II a 1366 y 390 px: el conector cruza el hueco interior en la dirección correcta, los rótulos se funden con el arte y no hay errores ni desbordamiento. Las 12 pruebas focales pasan y el build compila.

### Defensa pasiva de armaduras

- El documento maestro establece que la armadura aporta principalmente la CD, que cada múltiplo completo de CD en la Presión restante cuesta un bloque de Vida y que ciertas piezas neutralizan un rasgo ofensivo de forma permanente mientras estén equipadas.
- La armadura equipada sustituye `Defensa: N` por una lectura compuesta: escudo `CD N`, regla `1 bloque cada N de Presión` y protección explícita `Neutraliza ...`; `Conmocionante` se interpreta defensivamente como `Neutraliza Conmoción`.
- La `X` de armaduras reutiliza exactamente el fundido radial discreto de las armas y el selector pasa de `Defensa` a `CD`.
- Revisión visual completada con el componente real a 1366 y 390 px, incluida la apertura del selector: composición estable, sin errores del navegador ni desbordamiento horizontal.
- Validación final: 98 suites correctas, 496 pruebas superadas y 1 omitida; la compilación de producción termina correctamente.
- Refinada la lectura de armadura: `CD` y su valor quedan contenidos dentro de la silueta del escudo, sin invadir su corona. Se elimina el escudo redundante de la fila inferior.
- La armadura muestra como máximo tres rasgos usando exactamente las etiquetas, colores y tooltips del glosario compartido por las armas; el cuarto rasgo se oculta para conservar la densidad de la tarjeta.
- Revisión visual repetida a 1366 y 390 px, con tooltip real activado por hover, sin errores de navegador ni desbordamiento horizontal.
- Validación posterior al refinamiento: 98 suites correctas, 496 pruebas superadas y 1 omitida; el build de producción compila correctamente.
- Microajuste del emblema defensivo: `CD` y el valor suben dentro del escudo, aumentando a la vez el aire vertical entre ambos.

### Sincronización en vivo de clases en preparación

- El catálogo maestro ya llegaba mediante listeners de Firebase, pero la ficha abierta ignoraba sus cambios en cuanto el jugador tenía un borrador local de preparación.
- Las clases sin aventura activa fusionan ahora cada actualización de plantilla con el borrador personal: la pool, reglas y presentación se refrescan sin cerrar la ficha, mientras manos, talentos, habilidades y demás selección personal se conservan.
- Antes de reconciliar el equipo se liberan las identidades efímeras de preparación; así una copia sigue equipada si la plantilla conserva ese objeto, aunque la nueva pool haya rematerializado sus instancias.
- Las runs activas no entran en esta fusión de preparación y mantienen el documento personal de la aventura como fuente de verdad.
- Prueba de integración añadida: con una espada ya equipada, el máster añade un arco; el arco aparece en la ficha abierta y la espada continúa equipada.
- Validación final: 98 suites correctas, 497 pruebas superadas y 1 omitida; el build de producción compila correctamente. La regresión visual del mazo no registra errores de navegador.

## 2026-09-17 — Banda de nombre del puntero compartido

- Petición: probar un nombre que nazca detrás del rombo del puntero, inspirado en una banda enrollada, conservando el color individual y omitiendo la pieza inferior de la referencia.
- Primer corte: rombo ligeramente reforzado por delante de una banda negra compacta con la tipografía existente y un remate plegado en el extremo derecho.
- La primera captura mostró que el rombo perdía jerarquía frente a la banda; se aumentó a 18 px para recuperar la proporción dominante de la referencia sin agrandar el nombre.
- Revisión visual final con Máster, un nombre corto y uno largo sobre la cuadrícula: banda legible, rombo por delante, pliegue derecho estable y sin pieza inferior. El cliente de playtest no registró errores; prueba focal y build correctos.
- Corregida una excepción al mover con `Ctrl` antes del primer ping: el estado local `null` ahora se trata como una colección vacía. Añadida regresión específica.
- Retirado el pliegue del extremo derecho: el nombre queda en una banda rectangular limpia.
- Separada la presencia del cursor de la vida de sus pings. Soltar `Ctrl`, salir del Canvas, perder foco u ocultar la pestaña marca el cursor como oculto y conserva en Firestore las ondas activas hasta su caducidad individual; después se elimina el documento efímero.
- Tras detectar una regresión de sincronización entre clientes, el cursor recupera su documento efímero original y cada ping pasa a un documento temporal independiente en `sharedPings`. El cursor vuelve a actualizarse y borrarse en tiempo real sin poder cancelar las ondas ya iniciadas.

## 2026-09-17 — Edición de imagen desde la biblioteca de clases

- El botón de imagen de la tarjeta abre ahora la ficha directamente en modo de encuadre, reutilizando el editor de portada/avatar, zoom, desplazamiento, guías y sustitución de archivo.
- Las clases sin imagen muestran una acción explícita para seleccionar el archivo, evitando un editor vacío sin controles.
- La regresión de biblioteca confirma que el botón abre el editor con modos Portada/Avatar y una acción de guardado habilitada. El cliente visual alcanzó la pantalla inicial; la navegación automatizada de máster quedó detenida esperando la carga de fuentes, por lo que la vista autenticada se cubre con el componente real bajo prueba.

## 2026-09-17 — Estado Oculto y visión por Team ID

- Sustituido `Ensordecido` por `Oculto` en los estados por defecto, selector, sincronización de ficha y tracker heredado. La lectura de `status_effects_config` descarta el ID antiguo y añade el nuevo aunque Firebase conserve una configuración previa.
- Centralizada la regla del Canvas: un jugador accede a la visión de sus tokens controlados y de los tokens con el mismo `Team ID`, pero el equipo no concede control.
- Los tokens ocultos quedan fuera del render, máscaras de visión, selección, objetivos, efectos flotantes y cronología para espectadores sin acceso. El máster conserva sus tokens sin controlador, pero no ve los controlados exclusivamente por jugadores.
- Regresiones focales: 10 pruebas correctas para estado, equipo, control separado, visibilidad de jugador/máster y actualización de visión; `npm run build` compila.
- Revisión visual mediante harness local sin fuentes externas: aliado ve el token oculto, rival y máster no; ningún estado registra control por Team ID. El cliente de juego no emitió errores. La app completa continúa bloqueando la captura automática mientras espera fuentes remotas.
- La primera batería completa detectó una importación prohibida desde el núcleo compartido hacia Canvas; la regla pura se trasladó a `tactical-shared` y permanece activada únicamente fuera de Board mediante `isBoardMode`.
- Validación final: 105 suites correctas, 519 pruebas superadas y 1 omitida; `npm run build` compila correctamente.

### Detección, colisiones y representación mágica de Oculto

- Los tokens visibles para propietario o aliados muestran ahora una distorsión translúcida con dos ondas desfasadas y un barrido refractado; se conserva el indicador lateral de estado existente.
- Añadido al Canvas el toggle local del máster `Mostrar ocultos`. Permite inspeccionar todos los ocultos como siluetas no interactivas y no altera estado, permisos ni detección.
- La detección de `Oculto` recorre el trayecto casilla por casilla y compara las celdas ocupadas completas, incluyendo criaturas Grandes. Funciona al mover cualquiera de los dos bandos y detiene la ruta en el primer contacto hostil.
- La previsualización de ocupación excluye enemigos ocultos. Tras el contacto se revela primero y se recalcula después: una Formación completa bloquea la entrada, conserva la última posición válida y gasta el paso; una casilla que admite Duelo acepta la entrada.
- La revelación de estado se persiste de inmediato sin confirmar por accidente una posición pendiente. La confirmación de movimiento acepta la instantánea ya revelada para evitar que el runtime restaure un estado antiguo.
- Un enemigo oculto no puede seleccionarse como objetivo directo; los aliados sí conservan acceso. El atacante pierde `Oculto` únicamente después de resolver el ataque. Queda disponible la regla pura `actionRevealsHidden` para acciones futuras con `revelaOculto`; mover normalmente no revela salvo contacto.
- Revisión visual con el cliente de juego: toggle apagado sin pistas; toggle encendido con token translúcido, tres frentes de onda legibles e indicador lateral. El estado textual confirmó que la inspección no muta `Oculto` y no aparecieron errores de navegador.
- Validación final: 106 suites correctas, 527 pruebas superadas y 1 omitida; las pruebas focales de ocultación/movimiento/ataque pasan y `npm run build` compila correctamente.
- TODO futuro: cuando se incorporen acciones de Canvas distintas de ataque, hacer que su resolvedor consulte `actionRevealsHidden(action)` después de resolverlas.

### Revisión visual de Oculto: efecto Fog

- Sustituidas las ondas violetas por una interpretación CSS del efecto `16-Fog.gif` de TokenMagic: tres bancos de bruma con recorridos, escalas y velocidades independientes más un velo irregular muy tenue.
- El retrato oculto queda parcialmente desaturado y translúcido. Se retiró el primer halo uniforme porque parecía una burbuja; el acabado final concentra la niebla dentro de la silueta sin introducir recursos remotos ni modificar el icono lateral.
- Revisión visual sobre una ilustración real y comparación de estados con el toggle del máster. El token normal conserva contraste y el oculto se reconoce por la bruma gris móvil.
- Validación final: 106 suites correctas, 527 pruebas superadas y 1 omitida; el cliente de juego conserva `hiddenStateMutated: false` y el build de producción compila correctamente.

### Recorte continuo del Fog y coste real del descubrimiento

- El Fog queda recortado dentro del retrato (`2px` en tokens circulares), por debajo del aro exterior de selección. Se retiraron `backdrop-filter` y los modos de mezcla que hacían variar el brillo al seleccionar.
- Las tres capas recorren órbitas lineales cuyos fotogramas inicial y final son equivalentes, con duraciones y retrasos negativos distintos. No existe salto de reinicio ni pausa de `ease-in-out` al completar el ciclo.
- Descubrir un enemigo antes de entrar ya no cobra la casilla fallida: `spentCost` cuenta únicamente los pasos anteriores realmente recorridos. Si la casilla admite entrada, sí se cobra y se forma Duelo; en ambos casos la ruta se detiene al descubrir.
- La composición de Formación usa ahora la lista visible para cada espectador. Un enemigo no ve desplazarse al miembro visible por culpa de su compañero oculto; al revelarse, ambos recuperan inmediatamente la distribución normal.
- Añadidas regresiones para choque en el primer paso (coste 0), choque tras dos casillas válidas (coste 2), criatura Grande y ocultación del desplazamiento de Formación.
- Validación final: 106 suites correctas, 529 pruebas superadas y 1 omitida; el build de producción compila correctamente y la revisión visual confirma que el Fog permanece dentro del retrato incluso con el token seleccionado.

## 2026-09-18 — Rebote del puntero al soltar Ctrl

- El salto no procedía del ping: al limpiar `localPointer`, el snapshot propio de `sharedPointers` dejaba de excluirse durante los milisegundos que Firebase tardaba en confirmar `deleteDoc`, por lo que reaparecía en su última coordenada publicada.
- El actor local se excluye ahora siempre del canal remoto. Mientras Ctrl está pulsado se representa con el estado local inmediato; al soltarlo desaparece sin esperar a la red y las ondas independientes continúan.
- Añadida una regresión que conserva deliberadamente el documento remoto propio durante el borrado pendiente y confirma que no se vuelve a renderizar el cursor.
- Revisión visual con el cliente de juego: con `ownRemoteEchoCount: 1` y borrado aún pendiente se mantienen `visibleCursorCount: 0` y el ping activo, sin errores de navegador.
- Validación final: 106 suites correctas, 530 pruebas superadas y 1 omitida; `npm run build` compila correctamente.

## 2026-09-19 — Uso genérico de objetos y colocación de áreas

- Añadidos los núcleos puros `ItemUseSystem` y `AreaPlacementSystem`. El primero encadena fases declarativas y el segundo resuelve huella, snap, alcance Chebyshev, límites y validadores personalizados sin depender de ningún objeto.
- `Bomba de humo` queda descrita como una receta: seleccionar dado, colocar área, confirmar, consumir recursos y resolver efectos. Su plantilla es rectangular 2×2 y permite alcance 0 sobre la propia casilla.
- Primeras regresiones focales: 7 pruebas correctas para encadenado configurable, validación de fases, detección de objeto, snap 2×2, cuerpo a cuerpo, fuera de alcance/límites y creación de áreas persistentes.
- Pendiente en este bloque: conectar el orquestador React al HUD/viewport, commit atómico, visual de Humo, reglas derivadas de Oculto y selector del máster.
- Integrado el flujo completo en el HUD: selector de dado con la estética y dimensiones de Correr, plantilla 2×2 con alcance visible, recolocación/cancelación, confirmación explícita y soporte de `Escape`. Jugadores gastan dados de acción y enemigos gastan Amenaza.
- El commit final valida control y disponibilidad, consume dado y objeto, limpia cinturón/equipables, persiste la run y crea la zona en el mismo cambio optimista. El arrastre `Soltar objeto en mapa` no se ha reutilizado ni alterado.
- `Humo` es ahora un tipo de área del máster y una fuente ambiental de `Oculto` mientras un token la solape. Conserva una representación de bruma animada alineada 2×2 y las zonas creadas por jugadores declaran borrado exclusivo del master.
- Revisión visual del flujo real mediante harness: selector → plantilla válida 4/6 → confirmar/recolocar/cancelar → zona persistente. El estado textual verificó inventario 1→0, dado disponible→gastado, efecto `oculto` y `deletableBy: master`; la pasada final no registró errores de navegador.
- Validación final: 110 suites correctas, 549 pruebas superadas y 1 omitida. El build de producción compila correctamente; los avisos de `act(...)`, Firebase y `window.alert` proceden de pruebas heredadas que ya terminan en PASS.

### Corrección: Humo reutiliza exactamente el Fog de Oculto

- Eliminadas las animaciones y capas propias `canvas-smoke-zone__bank` que diferenciaban visualmente la zona del estado `Oculto`.
- Primer intento ya sustituido: `HiddenFogEffect` compartía las mismas capas CSS entre token y área, pero seguía siendo una aproximación visual y no el preset procedural solicitado.
- Se conserva únicamente el borde, división 2×2 y rótulo funcional de la zona; no existe un segundo efecto de bruma.
- Añadida regresión que compara ambas salidas y prohíbe que vuelva a aparecer `canvas-smoke-zone__bank`.
- Primer ajuste descartado: dividir la zona en cuatro gradientes evitaba el estiramiento, pero seguía sin reproducir el preset real de TokenMagic.
- Corrección definitiva a partir de los archivos enlazados del preset `fog`: retirada la aproximación de gradientes y órbitas CSS. `HiddenFogEffect` aloja ahora un canvas WebGL común para token y zona, configurado con color negro, densidad `0.65`, dimensiones `1×1` y tiempo a velocidad `2.2`.
- Tras la autorización expresa para adoptar GPL v3, el fragment shader `innerFog` de TokenMagic se incorpora literalmente desde la revisión `0999bb9f2f4d4b5e41135913a67bc73a4fc2cc1d`. Se añadió la licencia GPL v3 completa, atribución y procedencia; el adaptador WebGL suministra `uSampler` y el tiempo en milisegundos como hace la animación `move` original.
- Revisión visual en dos fotogramas separados: token y zona usan el mismo campo procedural normalizado y el patrón cambia con el tiempo; el navegador no registró errores WebGL.
- Validación final: 110 suites correctas, 551 pruebas superadas y 1 omitida; el build de producción compila correctamente.
- Revisión posterior con el shader GPL literal: el Fog muestra ahora las nubes suaves y contrastadas del preset original en el token y en la zona continua 2×2. Ambos canvas obtienen contexto WebGL sin fallback ni errores.
- Verificación de procedencia: el GLSL local es idéntico al archivo de TokenMagic fijado y comparte SHA-256 `6979adfb0bc6ca25f7aa51afe167f5271a1355548b6ad1e68603eafe617565aa`.
- Validación GPL final: 110 suites correctas, 552 pruebas superadas y 1 omitida; `npm run build` compila correctamente.


## 2026-09-19 — Rendimiento del Fog y visión aislada del humo

- Petición: aligerar varias zonas y entrada/salida de tokens, ralentizar la nube y aplicar visión aislada con excepciones de control/equipo, perspectiva seleccionada y niebla de guerra.
- Sustituidos los contextos y compilaciones por instancia por un renderer WebGL compartido, con snapshots por preset, precalentamiento ocioso, resolución 128×128 y límite de 24 actualizaciones/s. No se cargan ni suben retratos a GPU al entrar. Se detiene el bucle sin suscriptores, fuera de pantalla o con pestaña oculta.
- Velocidad 0.75; GLSL vendorizado intacto. Las copias 2D se componen sobre el retrato existente.
- Caché por snapshot de escenario para zonas, pertenencia, equipos y perspectivas. La selección fuerza visión local; la vista general combina controlados/equipo y las piezas propias del máster. El toggle de inspección conserva su excepción.
- Máscara inmediata de humo tanto en la niebla como sobre los resplandores; las fuentes internas se recortan a la zona. Sin niebla se conserva el entorno. Rayos/indicadores de objetivos respetan visibilidad.
- Separado el humo ambiental de la detección por contacto y de la prohibición de atacar a un Oculto explícito: permite ataques dentro y bloquea ataques a través de la frontera.
- Añadidas nueve regresiones de visión/niebla/movimiento. Primera validación completa: 111 suites, 561 pruebas correctas y 1 omitida; build compilado.
- Harness local con el viewport real en output/smoke-performance-review: 25 zonas/30 canvas visibles conservan 1 contexto y 2 compilaciones (vértice/fragmento), alrededor de 40 llamadas al shader/s entre los dos presets. Cruce, retirada y reposición de humo no recompilan. Capturas verificadas con/sin niebla y viewport móvil con CPU 4×; sin errores de navegador. No se ha medido en un teléfono físico.
- Validación final tras snapshots por preset y caché de equipos: 111 suites, 561 pruebas superadas y 1 omitida; producción compilada correctamente. Repetida la revisión visual y la prueba de 25 zonas sin errores, con pausa/reanudación verificadas al ocultar/mostrar los canvas. Sin tareas pendientes dentro del alcance solicitado.


## 2026-09-19 — Correcciones de humo tras capturas del usuario

- Las capturas muestran dos problemas reales que el fixture anterior no detectaba: la máscara extra ocultaba la nube como un bloque negro desde fuera y encerraba la vista dentro de un rectángulo; el renderer trataba todos los ocultos como siluetas pasivas al activar el toggle del máster.
- Eliminado el negro rectangular y el recorte de fuentes a la zona: el entorno usa el radio/degradado y las sombras normales; el aislamiento sigue aplicado a los tokens y al targeting. La nube se reconoce desde fuera dentro de visión normal.
- La visión exclusiva dentro del humo aplica bruma al 20 % sobre retratos a contraste normal. `Oculto` explícito conserva su efecto. Retirada la transición de opacidad de 500 ms en tokens Canvas y sustituido useEffect por useLayoutEffect para copiar la textura antes de pintar; las fichas circulares no vuelven a cargar una máscara de imagen.
- Precarga acotada de retratos de residentes (cuatro solicitudes simultáneas, sin duplicados ni reintentos en cada movimiento). Su visibilidad lógica no cambia.
- Corregidos el bloqueo del toggle y la pérdida de selección al mover una ficha de jugador como máster: la limpieza y los observadores consultan la perspectiva seleccionada.
- Nuevas regresiones para máscara, intensidad y movimiento mediante handlers reales de ratón/táctil; tests de precarga. Fixture output/smoke-followup-review usa CanvasViewport y createSceneItemRenderer reales. Comprobados arrastres consecutivos de fichas propias y de jugador, vista externa/interna y móvil con CPU 4×. Un contexto WebGL, dos compilaciones, sin errores. Capturas revisadas: nube legible desde fuera, campo radial más amplio desde dentro y retratos claros.
- Validación final de la corrección: 113 suites correctas, 572 pruebas superadas y 1 omitida; build de producción compilado. Cliente de juego ejecutado y capturas completas verificadas con el renderer real; sin errores de navegador. Prueba móvil simulada, no realizada en teléfono físico.

## 2026-09-19 — Velo exterior del humo al 30 %

- Añadida una cobertura del 30 % en la máscara existente de niebla cuando todos los observadores están dentro del humo. Se compone con el degradado radial sin revelar nuevas zonas; los interiores compartidos se recortan después y mantienen su claridad. No añade efectos WebGL ni modifica la visibilidad de tokens.
- Actualizada la regresión de la máscara para comprobar la intensidad parcial solicitada.
- Verificación: 12 regresiones de visión correctas y revisión visual con el viewport/renderizador reales; exterior atenuado, interior claro, tokens exteriores ocultos y arrastre operativo. Cliente de juego y prueba de navegador sin errores.

## 2026-09-19 — Velo del 50 % con entrada y salida progresivas

- Aumentado el velo exterior a 50 %. El rectángulo SVG permanece montado y transiciona fill-opacity durante 450 ms, tanto al entrar como al salir, al eliminar la última nube y al activar la excepción del máster. La animación revierte desde su valor actual sin añadir bucles JavaScript. Movimiento reducido desactiva la transición.
- Se conserva la visibilidad inmediata de tokens y el recorte limpio del interior.
- Verificado: 12 pruebas de visión correctas. Navegador real: entrada y salida con valores intermedios, intensidad final 0.5/0, inversión rápida estable y movimiento reducido inmediato; tokens ocultos desde el primer cambio. Cliente de juego ejecutado, captura revisada y sin errores de navegador.

## 2026-09-19 — Pestaña de combate del máster

- Sustituido el pulsador redondeado con flecha por MasterCombatHUDLauncher: placa SVG con biseles recortados, doble grabado tenue, dorado NOMA, símbolo de combate y etiqueta compacta Cinzel. Sin desenfoque, resplandor ni gradientes. Se conserva la misma acción de apertura y ubicación central inferior.
- Área táctil 176×50 en móvil y 196×56 en escritorio, margen seguro inferior, foco de teclado, estados de presión/hover y movimiento reducido.
- Verificado con el componente real y CombatHUD: tamaños 1440×900, 390×844, 320×568 y 844×390; apertura con Enter y toque, cierre/reapertura y sin errores de navegador. Cliente de juego ejecutado; capturas de escritorio y móvil revisadas en output/master-hud-launcher-review. Build de producción compilado correctamente.

## 2026-09-19 — Apertura compacta y plegado discreto del HUD

- Reducidas las espadas a 15 px y la apertura a 176×50 px en escritorio / 160×48 en móvil.
- Añadido MasterCombatHUDCollapse: muesca de 34×25 px con área táctil real 44×44, una flecha pequeña y sin texto. Se integra al lado de las categorías mediante el slot opcional collapseControl, sin acoplar CombatHUD a un modo concreto; eliminado el antiguo botón fijo inferior. El estado vacío usa el mismo cierre.
- Pruebas de navegador a 1440, 390, 320 y 844 px: apertura, plegado, reapertura, Enter y toque correctos. Cliente de juego y revisión de capturas realizados, sin errores de navegador. 13 pruebas focales de CombatHUD y límites entre modos correctas.

## 2026-09-19 — Bordes continuos y controles alineados del HUD

- Simplificada la apertura a una única flecha hacia arriba, sin espadas, etiqueta ni marcos SVG recortados. Tamaño 56×48 px y borde continuo con el fondo y dorado del HUD.
- Integrado el cierre dentro de la barra de categorías: comparte el borde exterior, fondo y altura de Acciones, Clase y Objetos; área táctil mínima 44×44 px. Se conservan foco visible, teclado, toque y área segura inferior.
- Verificación con componentes reales a 1440, 390, 320 y 844 px: alineación exacta con las categorías, apertura/cierre/reapertura y teclado/toque correctos, sin errores de navegador. Capturas revisadas y cliente de juego ejecutado. 13 pruebas focales correctas y build de producción compilado correctamente.

## 2026-09-19 — Altura del desplegador

- Elevado el botón de apertura 22 px: margen inferior de 32 px, igual al de las instrucciones rápidas del canvas, conservando el centrado y el área segura móvil.
- Verificado en navegador a 1440, 390, 320 y 844 px, con apertura/cierre, teclado y toque correctos; sin errores. Cliente de juego ejecutado y captura móvil revisada.

## 2026-09-19 — Cinturón automático al recoger

- addCanvasLootToInventory asigna objetos compatibles al primer hueco habilitado y vacío; respeta capacidad explícita, capacidad heredada, copias e inventario completo. No sustituye equipo ni amplía el cinturón. Los enemigos mantienen su sistema de equipo sin cinturón.
- Compartido resolveBeltSlotCount con LoadoutView y reutilizada la clasificación de la aventura. Se actualizan loadout, lista equipada y marcas de la copia adquirida en una sola actualización, usando la persistencia existente.
- Verificación: 5 suites, 81 pruebas correctas, incluidas capacidad, categorías incompatibles, persistencia de copias y cambio/desequipado manual. Build compilado correctamente. Recogida real y aparición en CombatHUD verificadas en navegador a 1440 y 390 px; cliente de juego ejecutado y captura móvil revisada, sin errores de JavaScript.

## 2026-09-19 — Dados de prueba para objetos fuera de combate

- Añadida preparación explícita de recursos al iniciar ItemUseSystem: tiradas temporales del perfil del token, 3d6 como fallback o amenaza del enemigo. Permanecen estables durante el selector y se renuevan al comenzar otro intento. Se indica Dados de prueba en el HUD.
- Confirmar fuera de combate valida el dado temporal, consume la copia disponible y persiste los cambios de inventario y el área con safePersistItems. No escribe canvasCombat ni canvasPracticeCombat. Rechaza recursos caducados, fichas ajenas y objetos desaparecidos. Preparación de combate y combate activo mantienen recursos reales.
- Pruebas: 6 suites / 55 tests correctos (flujo completo real de los hooks, alcance, consumo único, cancelación, renovación, transición de escena/combate, permisos y regresiones de combate). Build compilado correctamente. Dos lanzamientos consecutivos con hooks, HUD, plantilla y renderizador reales a 1440 y 390 px (toque), sin errores de navegador. Capturas revisadas tras esperar la apertura del selector; cliente de juego ejecutado. Persistencia de backend simulada en el fixture.

## 2026-09-19 — Trayectoria y colocación táctil de humo

- Añadida curva cuadrática entre borde del token renderizado y centro de plantilla, con distancia/alcance sobre el arco e indicador central conservado. Trazo SVG sin escalado y etiquetas con zoom compensado; colores dorado/rojo según validez y sin animación continua.
- Separados controles de la capa de mundo: barra de pantalla fija, botones de 48 px con texto y cancelación disponible desde el inicio. El HUD se aparta durante colocación/confirmación y vuelve después.
- Captura de eventos en CanvasViewport para colocar incluso encima de fichas: arrastre de un dedo actualiza la vista previa y fija al soltar, dos dedos delegan zoom sin colocar al terminar. Se suprime el clic sintético posterior. El ratón conserva paneo central/Alt y Escape cancela. Se evitan actualizaciones de plantilla dentro de la misma casilla sin cambios.
- Validación: 4 suites / 23 tests correctos, build de producción compilado. Navegador con CanvasViewport, hooks, HUD y controles reales a 1440×900 (zoom .3 y 1), 390×844 (.5), 320×568 (1) y 844×390 (2). Comprobados tamaño constante de etiqueta, controles dentro de pantalla, arrastre táctil, pinch, recolocar, cancelar, repetir y lanzar; sin errores. Cliente de juego ejecutado y capturas revisadas. Backend y manejador de zoom del fixture simulados; delegación de gestos verificada.

## 2026-09-19 — Confirmación coherente con CombatHUD

- Ajustado el panel de confirmación al ancho del bloque central de CombatHUD: hasta 672 px en escritorio y viewport menos 32 px en móvil. Mismos botones de 96/64 px, iconos de 32/18 px, separaciones, fondo, borde dorado y radios. Cabecera integrada superior con estado e indicación de uso.
- Verificado visualmente en escritorio y móvil; el navegador compara ancho y alto de ambos paneles en cinco combinaciones de viewport/zoom. Repetido el flujo de colocar, recolocar, pinch, cancelar y confirmar sin errores. Cliente de juego ejecutado. Cambio exclusivamente de presentación.

## 2026-09-19 — Objetos centrados en móvil

- La fila de Objetos usa márgenes automáticos en sus extremos para centrar 1–3 objetos tanto en móvil como en escritorio, sin recortar el inicio cuando hay desbordamiento. Se mantienen los tamaños de ranura y el desplazamiento horizontal.
- Verificado en navegador con 1, 2, 3 y 6 objetos a 320, 390 y 1440 px: centrado exacto y ambos extremos alcanzables. Cliente de juego ejecutado y captura móvil revisada.

## 2026-09-20 — Reglas de habilidades y equipo sin metadatos repetidos

- Eliminada la concatenación de Alcance/Rasgos en buildAbilityEntry. getItemRulesPresentation separa el pie legado, mantiene los metadatos accesibles y deja intacto el cuerpo de reglas. Se aplica a tarjetas, selector y descripción de habilidades equipadas.
- ItemRulesText ofrece extractos delimitados por frases cuando es posible y texto íntegro bajo Ver reglas completas, con estado accesible y área táctil. En el selector, lectura y equipamiento son botones independientes; la metadata se muestra en la cabecera.
- Validación final: 5 suites / 25 pruebas correctas. Build de producción compilado y fixture final compilado. Navegador con tarjetas y RogueliteTalentsPanel reales a 1200 y 390 px: limpieza del pie, reglas íntegras al desplegar, no equipar al leer, selección operativa; sin errores. Cliente de juego ejecutado y capturas revisadas.
## 2026-09-20 — Descripciones completas con scroll en tarjetas

- Restaurado el texto íntegro de armas y conjuros en RogueliteInventoryCard, usando el área de desplazamiento existente y eliminando el botón «Ver reglas completas» de estas tarjetas. Se conserva la limpieza de alcance/rasgos duplicados y el selector mantiene su presentación compacta.
- Validación: 15 pruebas correctas en 2 suites de inventario y resumen de clase. Fixture de navegador compilado y comprobado a 1200 y 390 px: texto completo, sin desplegable en tarjetas, scroll funcional en escritorio y selector operativo. Cliente de juego ejecutado y captura revisada.

## 2026-09-20 — Jerarquía de Daño, Alcance y Coste

- Petición: afinar los tres campos de las armas equipadas conservando el diseño apreciado por el usuario. Sustituida la línea apretada por una lista descriptiva: etiquetas Cinzel discretas, valores Alegreya, colores semánticos y separadores dorados tenues. Sin cambiar ilustraciones, bordes exteriores ni controles.
- Contenedor adaptable: tres columnas en cartas amplias y tres filas cuando el espacio interior baja de 190 px, evitando palabras partidas en móvil.
- Validación: fixture del LoadoutView real a 1366, 390 y 320 px, campos visibles sin desbordamiento y selector funcional; capturas revisadas y cliente de juego ejecutado sin errores. 13 pruebas de LoadoutView correctas.

## 2026-09-20 — Carta compartida para armas a dos manos

- Petición: mejorar la representación de un arma que ocupa ambas manos manteniendo la estética del equipamiento. Sustituidas la tarjeta bloqueada y la conexión entre dos paneles por una sola carta ilustrada que abarca ambas columnas. Línea inferior de agarre Torpe / A dos manos / Hábil con el indicador compartido de manos, sin resplandor.
- Se conserva el slot de origen para seleccionar o desequipar, así como la ocupación real y la independencia de conjuntos. Retirar el arma recupera las dos ranuras. Estado accesible con nombre de arma y ambas manos.
- Validación: 13 pruebas correctas; actualizadas las regresiones de dos manos y comprobada la retirada desde mano torpe. Navegador en 1366, 390 y 320 px para ambos slots de origen: selector, cambio de conjuntos, retirada y recuperación de ranuras; sin errores ni desbordamiento. Capturas revisadas y cliente de juego ejecutado.

## 2026-09-20 — Dos ranuras siempre visibles

- Corrección del usuario: no quiere fusionar las ranuras; quiere ver siempre la otra mano ocupada. Restauradas ambas tarjetas independientes y retirado el diseño panorámico. La mano de apoyo muestra la imagen atenuada, el nombre del arma, el indicador de dos manos y la marca Ocupada. Conexión fina con rombo centrado entre ambas cartas.
- Se conserva el bloqueo de la mano de apoyo y la retirada desde el slot original. Verificadas 13 pruebas y navegador a 1366/390/320 px con ambas orientaciones, cambio de conjunto, selector, bloqueo y retirada. Cliente de juego ejecutado y capturas revisadas.

## 2026-09-20 — Ataque vacío con coste 0

- La captura muestra un arma sin nombre, daño ni rasgos. Causa reproducida: el adaptador heredado recorría weaponSets y activeWeaponSet como si fueran objetos equipados, generando armas falsas. Ahora excluye metadatos y normaliza las manos del conjunto activo. También rechaza entradas sin nombre, arrays y primitivas no válidas durante la conversión.
- CombatHUD descarta ataques sin nombre en snapshots ya guardados. Se conserva el coste real del equipo válido.
- Regresiones: 3 pruebas nuevas fallaron antes del arreglo; después pasan las 21 pruebas de sincronización y HUD. Navegador a 1366/390 px comprueba que el equipo válido se muestra y confirma, que el ataque falso desaparece y que una lista solo contaminada queda vacía. Cliente de juego ejecutado y captura revisada.

## 2026-09-20 — Rediseño de ventanas de ataque y defensa

- Dirección: jerarquía de juego densa, fondo oscuro y oro existente, título contenido, ataque y CD en una cabecera de dos columnas en escritorio; pila compacta móvil. Se eliminan el aviso gigante, resplandores y cartas de selección sobredimensionadas.
- Resultado fijo junto a las acciones: bloques de Vida que se perderían, ataque, defensa, presión restante, CD y excedente. Se usa lifeLost del motor (incluido límite por Vida actual); diferencia entre presión anulada y presión insuficiente para causar daño. En defensa enemiga sin tirar se presenta como escenario si se recibe el ataque.
- Selección de armas en filas con ilustración, perfil y marca; Recibir ataque disponible directamente aunque haya equipo defensivo seleccionado. Excedente compacto, arma elegida visible y selector superpuesto para no desplazar los botones. Preparar ataque adopta la misma presentación del arma.
- Accesibilidad: diálogo modal, foco inicial/restauración, ciclo Tab contenido y recuperación del foco tras resolver una tirada. Selecciones aria-pressed y resultado anunciado al cambiar.
- Validación: 23 pruebas correctas de ventana y reglas; añadidas comprobaciones de cambio de daño previsto/excedente. 36 escenarios de navegador en 1440/390/320 px y horizontal 844x390; defensa, amenazas, selección, recibir, confirmar, contraataque y reposición. Sin errores ni desbordamiento; verificación de foco y capturas finales revisadas. Cliente de juego ejecutado.
- Build de producción final: compilado correctamente. Capturas y comprobaciones en output/combat-clarity-review.

## 2026-09-20 — Acabado de combate coherente con el equipamiento

- El usuario sigue percibiendo las ventanas como CSS genérico. Comparados los estilos con RogueliteInventoryCard y los selectores de RogueliteTalentsPanel: tipografía Cinzel/Lato/Alegreya, fondo #080c17, bordes discretos y selección contenida.
- Ajuste exclusivamente visual de CanvasCombatDetails.css: marco casi recto, títulos Cinzel espaciados, texto y números Alegreya, ataque/armadura como una franja ilustrada, filas de equipo menos encajonadas, controles oscuros sin grandes bloques de oro/rojo. El color distingue selección y peligro. Cálculo alineado en móvil incluso con etiquetas de dos líneas.
- Verificación con las fuentes cargadas desde los mismos enlaces de public/index.html: 12 vistas en 1280/390/320 px, sin desbordamiento y con pie accesible. Repetidos selección defensiva, cambio de arma, contraataque y reposición en los tres anchos. Cliente de juego ejecutado y capturas revisadas en output/combat-clarity-review/aesthetic-*.png. No cambia la lógica de combate.


## 2026-09-20 — Ajuste visual y recuperación del registro de combate

- Petición: recuperar títulos centrados rojos y confirmación roja, armas atractivas centradas, imagen del enemigo, quitar recepción directa mientras hay equipo seleccionado y rescatar el log detallado anterior sin revelar CD enemiga.
- Historial local: `03e9ede^:src/components/CanvasSection.jsx` contenía el esquema completo (attackerDice/defenderDice/defenderSteps, evadedDiceIds, efectos); el panel extraído por 03e9ede/b06ddf9 conserva DiceSvg y evasión/Elusión. El runtime Canvas escribía otro esquema reducido: corregida la causa, conservada la estética histórica.
- buildCanvasCombatLog guarda tiradas reales y procedencia, resultados y gasto, arma defensiva y de contraataque, bloques perdidos y diferencias de estados. CD/snapshots privados no se incluyen en nuevas entradas. attackThreatUsed conserva la Amenaza ofensiva aunque el defensor tire la suya.
- El listener estaba limitado a 3 entradas globales: ahora filtra scenarioId y ordena el historial de la escena sin necesitar índice compuesto. No reconstruye dados nunca almacenados. Las fechas pendientes del servidor usan clientTimestamp.
- Validación: 25 pruebas pasadas (modal, builder, panel, runtime de excedente), 36 escenarios responsive a 1440/390/320 px y apaisado 844×390, foco de teclado y selección/confirmación. Inspección visual con fuentes reales y cliente develop-web-game para el registro. Compilación de producción correcta. No commit ni despliegue.


## 2026-09-20 — Ataque dual y armas de inventario enemigas

- Petición: enemigos usan armas del inventario sin equipar y pueden combinar varias por una acción; jugadores combinan dos armas físicas de una mano del conjunto activo por exactamente dos dados visibles, según el texto adjunto.
- Reutilizados CombatHUD/modificadores, CanvasCombatActionModal, alcance/Duelo, dados/Crítico, presión/defensa/CD/excedente y registro existentes. canvasAttackSelection resuelve cada copia antes de unir rasgos ofensivos; no transfiere Duelista, no acumula Perforación y no combina conjuros.
- Confirmación mediante transacción Firestore: revalida control, armas, objetivo, perfiles y recursos; doble clic bloqueado, consumo y resultado compartidos en una operación. Cancelación gratuita solo durante preparación.
- Ajuste cambia un dado comprometido antes de defensa, devuelve el original y conserva ambas tiradas de arma. Registros con identidades de cada copia y dado, críticos vinculados y modificadores separados; no añaden CD pública.
- Validación inicial: 78 tests/9 suites, 12 flujos completos en navegador con runtime real y Firestore simulado (1280, 390, 320 y 844x390), capturas inspeccionadas, compilación de producción correcta. Últimas comprobaciones amplían cobertura a identidad de clase y procedencia de modificadores.
- Pendiente por respuesta explícita del usuario («Luego te respondo»): qué arma determina «un dado de arma» de Furia con perfiles distintos. No elegir el mayor ni duplicar perfiles; tampoco introducir dual + Barrido o nuevas reglas de oportunidad. No commit ni despliegue.

- Verificación final: 81 tests/9 suites correctos, 12 flujos completos de selección → preparación → confirmación → defensa → log (Firestore simulado) sin errores de navegador; revisadas capturas móvil/PC y cliente develop-web-game. Build de producción correcto; aviso preexistente de tamaño de bundle.
- Archivos de esta entrega: `src/features/canvas/combat/canvasAttackRules.js`, `canvasAttackSelection.js`, `canvasAttackAdjustment.js`, `canvasCombatState.js`, `useCanvasCombatRuntime.js`, `canvasCombatLog.js`; `src/features/canvas/components/CanvasCombatActionModal.jsx`, `CanvasCombatDetails.jsx`, `CanvasCombatDetails.css`; `src/features/canvas/rogueliteTokenSheetSync.js`; `src/components/CombatHUD.jsx`; `src/features/tactical-shared/components/TacticalWorkspaceShell.jsx`, `sidebar/CombatLogDetails.jsx`; pruebas `canvasDualAttack.test.js`, `dualAttackRuntime.test.jsx`, `canvasCombatLog.test.js`, `rogueliteTokenSheetSync.test.js`; README y este seguimiento. Harness/capturas locales en `output/dual-combat-review/`.


## 2026-09-20 — Reglas básicas v0.2.40 y oclusión del humo

- Petición activa: priorizar humo visible que bloquee como muro, Pesada, armadura sin durabilidad, Derribado/Cegado y doble Varita; aplazar automatizaciones de clase.
- SmokeOcclusion comparte la proyección de sombras de muros pero excluye la superficie de la nube de su propia sombra. Las sombras físicas siguen aplicándose. tokenVisibilityAccess comprueba intersección de segmento y agrupa zonas continuas en la caché de escena; overview/foco/revelado del máster conservados. Interior conserva el velo de orientación 50 % y retratos 20 %.
- canvasAttackSelection calcula coste antes de suprimir rasgos y rechaza combinar catalizadores para jugadores/enemigos. canvasArmorRules sustituye la protección legacy; elección mutable explícita, transaccional, una vez hasta preparar nuevo combate, desde Ronda. Las armaduras no se activan por estar en inventario ni requieren bloques.
- Cegado aplicado en legalidad de ataques/contraataques y revalidación al confirmar. Derribado deja atacar/defender, bloquea Sprint/movimiento/reposición; selector Levantarse reutiliza el panel de dados y permite Movimiento básico completo o un dado. Board conserva sus reglas. Conmocionado deja de ser alias de Derribado en estos controles Canvas.
- Contraataque usa las mismas neutralizaciones; opción de renunciar al excedente evita bloquear la resolución si no puede moverse ni alcanzar con un arma.
- Validación: compilación de producción correcta (aviso de tamaño de bundle existente); suite completa 122 suites/647 pruebas correctas, 1 omitida. Se actualizó la expectativa accesible antigua de Barrera arcana (su botón ya no incorpora la descripción) tras repetir el fallo aislado.
- Navegador: 12 flujos anteriores dual/múltiple/ajuste conservados; humo PC/móvil, entrada/salida gradual y movimiento reducido, sin niebla, retirada/reaplicación y 24 nubes con un único contexto WebGL. Capturas inspeccionadas y cliente de develop-web-game ejecutado. Harness usa Firebase simulado: no comprueba concurrencia en servidor real ni rendimiento en hardware móvil real.
- Artefactos: output/core-smoke-review y output/core-combat-review; logs output/core-all-tests.log y output/core-rules-build.log. Sin commit ni despliegue. Pendientes de próximas iteraciones: automatizaciones de clase expresamente aplazadas; Barrido con reparto, lanzamiento/recuperación física de armas y automatizaciones de estados más amplias no forman parte de esta pasada. La aclaración de Furia/At. furtivo dual está registrada en la conversación para cuando se aborden clases.

## 2026-09-20 — Nueva composición de las ventanas de combate

- Petición: rehacer la estética general de ataques/defensa por falta de composición y coherencia con NOMA; priorizar intuición, arte existente, PC y móvil, sin cambiar reglas.
- Dirección: ventana de equipo y decisiones en dos zonas. Una ilustración de referencia conserva protagonismo, opciones de arma en filas compactas con miniatura y selección clara, dados de acción con estados legibles. Cabecera centrada roja con identidad de ambos participantes. Ajuste comparte esta composición.
- Defensa: resultado (Vida perdida o ataque anulado) destacado junto al cálculo y la confirmación. Excedente y arma del contraataque agrupados en el pie. En móvil los controles de defensa preceden al detalle de la tirada; cuerpo desplazable y acciones accesibles. Selector inicial, modificadores y selector de rasgos reciben bordes/fondos coherentes solo en Canvas, sin afectar Board.
- Archivos: CanvasCombatActionModal.jsx, CanvasCombatDetails.jsx/css, CombatHUD.jsx, CombatModifiersPanel.jsx, expectativa de copy en CanvasCombatActionModal.test.jsx y README. Se conserva lógica de recursos, alcance, dados, daño, neutralizaciones y registro.
- Validación: suite completa 122 suites, 647 pruebas correctas y 1 omitida; tras ajustes finales de copy y accesibilidad, 29 pruebas/3 suites afectadas correctas. Compilación de producción correcta (aviso preexistente de tamaño de bundle). 36 escenarios responsive (1440x1000, 390x844, 320x640 y 844x390), 12 flujos completos dual/múltiple/ajuste con runtime real y Firebase simulado, cambio de arma defensiva/contraataque/reposición, teclado y selector/modificadores/rasgos sin errores de navegador. Cliente develop-web-game ejecutado y capturas inspeccionadas.
- Artefactos: output/combat-folio-review (capturas, checks, dual-checks, build.log y focused-tests.log). Verificación móvil por viewport de Chromium; no prueba física en teléfono ni sesión Firebase compartida. Sin commit ni despliegue.

## 2026-09-20 — Rechazo de la propuesta visual y restauración del selector

- El usuario rechaza el rediseño y pide detener implementaciones para acordar una dirección visual. No seguir iterando interfaces sin acordarla.
- Restaurados exclusivamente el selector de armas del HUD Combat y sus modificadores a su estado previo a la última propuesta: retiradas clases/overrides Canvas y variante añadida a CombatModifiersPanel. Se preservan los cambios funcionales anteriores de ataque dual/inventario enemigo.
- El selector del HUD Combat queda explícitamente excluido de futuros cambios estéticos salvo nueva petición del usuario.
- Las ventanas principales conservan por ahora la propuesta rechazada; pendientes de conversación, sin nuevos cambios estéticos. Validación dirigida de selector y modificadores correcta.

## 2026-09-20 — Dirección artística persistente y skills

- El usuario autoriza preparar herramientas y preferencias entre conversaciones de Codex. Prioriza sensaciones de juego RPG/JRPG medieval, personalidad, diversión, elegancia, efectos de interacción y comodidad móvil; no estética futurista.
- Instaladas en el perfil personal de Codex: impeccable 4.3.1 desde pbakaus/impeccable, commit f2c7051853848826aac2f4646581d62a732155ad, mediante Skill Installer; creada noma-art-direction con selección implícita permitida y alcance exclusivo NOMA. Ambas estructuras validadas. En Windows el validador de Impeccable requiere python -X utf8.
- Nuevo DESIGN.md como referencia visual canónica, PRODUCT.md con contexto y AGENTS.md enlazándolos para futuras tareas. Corregida ambigüedad de las reglas genéricas sobre glow y móvil. Copiadas las cinco capturas originales a docs/design/references para no depender de Temp. README actualizado.
- Elementos protegidos: selector de armas HUD Combat/modificadores restaurados. La propuesta de dos columnas sigue marcada como rechazada; lo siguiente es discutir una maqueta, no aplicar otro rediseño. Las referencias de juego no determinan reglas mecánicas ni autorizan automatizaciones.
- Impeccable se instala como apoyo; no se añadieron hooks ni dependencias al proyecto. Figma y Frontend Design no se instalan por no ser necesarios en esta fase. No se modificaron archivos de interfaz ni reglas durante esta configuración.

## 2026-09-20 — Prueba implementada solo en Preparar ataque

- El usuario autoriza probar una única ventana, corrige la maqueta generada y pide volver a los colores de Ataque inminente, evitar cajas, dados originales con elevación y luz inferior, rostros laterales fundidos y confirmación vinculada al dorado del HUD.
- Nueva presentación CanvasAttackPreparation.jsx/css, aislada mediante attack-preparation-frame. Reutiliza ActionDieSvg, imágenes reales de equipo y retratos normalizados del token. No modifica el selector del HUD, sus modificadores, defensa, ajuste o resolución.
- La extracción conserva estado/selección de dados, elegibilidad, selección múltiple enemiga, Amenaza, callback de confirmación y cancelación. No se añaden reglas ni automatizaciones. Footer accesible y cuerpo desplazable, hover solo en dispositivos adecuados y movimiento reducido.
- Verificación: 32 pruebas dirigidas correctas (modal, reglas y runtime dual); producción compila correctamente con aviso preexistente de tamaño del bundle. 28 escenarios de navegador con Firebase simulado: PC, móvil390 y320, horizontal844, teclado, selección/deselección, cancelación, busy, amenaza y armas múltiples. Cliente develop-web-game ejecutado por harness.
- Artefactos y revisión: output/prepare-attack-review, servidor local127.0.0.1:4213. La opinión estética del usuario sigue pendiente; no extender aún a otras ventanas. DESIGN.md recoge las nuevas preferencias explícitas. Sin commit ni despliegue.
- Cierre visual: cabecera y arma se compactan solo en escritorio con poca altura; 1280x720 verificado con dados y etiquetas visibles sin scroll inicial. Retratos del harness encuadrados desde capturas del usuario; producción sigue usando los del token. Revisión de alcance sin fugas de CSS a otras ventanas; conservada también la distancia actual en casillas. Capturas finales prepare-desktop-detail.png, prepare-mobile-detail.png y portátil.png; preview interactiva abierta en Codex.

## 2026-09-20 — Afinado de la preparación aprobada

- El usuario aprueba la mejora, animación de dados, retratos y especialmente el botón dorado. Pide acercar el arma a Equipables, disolver la separación de retratos/arma, simplificar el texto de selección y dar a la nota final tratamiento cursivo.
- Reutilizadas las clases noma-loadout-weapon-stats y noma-loadout-traits. Nombre en Cinzel700 y valores Alegreya; dados del perfil compactados solo visualmente (2d8), coste con puntos desde draft.actionCost y colores de rasgos desde el glosario ya cargado (sin nuevas consultas). Se conserva la suma efectiva y la distancia en casillas.
- Fundidos solapados en cabecera/cuerpo, con scroll-padding para el foco. Sustituido párrafo de ayuda por Elige N dados / Dados preparados y contador discreto. Botón y animación de selección intactos.
- Validación: 10 pruebas del modal correctas y 28 escenarios de navegador correctos; capturas PC, móvil y portátil inspeccionadas, hover y movimiento reducido comprobados, cliente develop-web-game ejecutado. Harness recompilado y capturas actualizadas en output/prepare-attack-review. Sin cambios en reglas, defensa, resolución o selector HUD. Sin commit ni despliegue.

## 2026-09-20 — Coste en dados y continuidad de la ilustración

- Petición: sustituir bolitas de coste, recuperar colores del glosario en rasgos y eliminar cortes amplios entre retratos, arma y pie de la ilustración.
- Preparar ataque usa un solo fondo de arma bajo cabecera y estadísticas, con retratos disueltos lateralmente. Se eliminan los fundidos horizontales enfrentados y el sombreado propio de la antigua sección de arma. La pequeña franja de rasgos permanece, tal como pidió el usuario.
- Coste: Dices del inventario + cantidad real; enemigos siguen indicando una acción principal. Glosario: prioridad a entrada exacta, luego etiqueta antes de dos puntos y base sin multiplicador final; color/hex. La preview recibe colores verificados del glosario real. Rasgos a 11px con iluminación para facilitar lectura en el fondo oscuro.
- Cabecera y escena se desplazan en el mismo cuerpo; cierre y confirmación permanecen accesibles. No se modifica el selector HUD, defensa, resolución ni reglas.
- Verificación: 10 pruebas existentes del modal pasan; 28 escenarios del harness pasan sin errores de consola. Comprobados coste, color heredado, cierre y confirmación tras scroll, PC, móvil, horizontal y portátil; hover y reduced motion. Ajuste final de contraste con capturas PC/móvil actualizadas. Sin commit ni despliegue.

## 2026-09-20 — Prueba de Preparar ataque sin retratos

- El usuario pide probar la composición sin caras: solo se retiran los dos retratos decorativos y su CSS, conservando arma, nombres, medidas, fundidos, controles y reglas.
- README y DESIGN recogen esta prueba vigente, que sustituye los retratos laterales previamente aprobados. La presentación de doble empuñadura queda para una iteración posterior.
- Preview recompilada y recargada en 127.0.0.1:4213. Capturas PC y móvil inspeccionadas: solo arte del arma, nombres conservados y dados/botón intactos; final-review y cliente develop-web-game ejecutados. Sin commit ni despliegue.

## 2026-09-20 — Preparación del Ataque dual

- El usuario aprueba la preparación de un arma sin retratos y autoriza implementar y mostrar la variante dual. Se conserva la elección en el HUD: objetivo, arma individual o Ataque dual, preparación de dados y confirmación definitiva. El primer botón del HUD dice «Preparar ataque» solo en Canvas; no cambia su estilo ni sus modificadores.
- La presentación dual integra las dos ilustraciones con sus nombres, mano, perfil y rasgos efectivos en una misma escena. Coste común de dos dados, selección y confirmación únicas. La suma diferencia cada arma y los dados adicionales de modificadores. Se reutilizan tipografías, colores del glosario, dados y botón aprobados. Sin cambios en reglas ni automatizaciones de clase, selección de arsenal enemigo, defensa o resolución.
- La preview aislada añade Espada corta + Estoque, dos copias distintas de Daga a Toque, nombres largos, ausencia de una ilustración y dados de modificadores. Cerrar o confirmar vuelve a un menú de pruebas; no guarda cambios en una partida. Se mantienen ambas armas visibles a la vez en móvil.
- Corregidos dos casos responsive detectados en navegador: el fondo de los rasgos se salía 2px del cuerpo; los nombres largos repetidos en la suma ocupaban demasiado pie. El fondo queda dentro del panel y solo los nombres duplicados del pie se eliden, conservando los completos en la cabecera, el título y el árbol accesible. El cuerpo permite scroll y el cierre y la confirmación siguen accesibles.
- Validación: 46 pruebas dirigidas de HUD, modal, reglas duales y runtime correctas; tras el último ajuste de marcado, las 12 pruebas del modal vuelven a pasar. Compilación de producción correcta, con aviso previo de tamaño del bundle. Matriz de 20 escenarios de navegador sin errores (1440×1000, 390×844, 320×640 y 844×390): identidad de copias, coste, selección/deselección, teclado, bloqueo del tercer dado, cancelación/confirmación, suma de perfiles y modificadores, scroll y navegación de retorno. Capturas PC, móvil, nombres largos, dos dagas y falta de arte inspeccionadas.
- Artefactos: output/prepare-attack-review/dual-checks.json y capturas dual-*.png. Preview interactiva abierta en 127.0.0.1:4213/?mode=dual, pendiente de valoración estética del usuario. Pruebas móviles por viewport de Chromium, sin dispositivo físico ni partida Firebase compartida. Sin commit ni despliegue.
- Cierre: final-review.cjs verifica también la variante de un arma, hover y movimiento reducido. Cliente develop-web-game ejecutado sobre el bundle final y captura skill-client-dual-final/shot-0.png inspeccionada. Se comprobó además la preview visible en Codex: un dado mantiene la confirmación deshabilitada, dos la habilitan y bloquean el tercero.

## 2026-09-20 — Avisos integrados en Preparar ataque

- El usuario aprueba la estética dual y pide acortar e integrar los mensajes, especialmente el de Duelo. Duelo y Toque ahora se muestran como notas breves bajo las estadísticas del arma, con contexto Cinzel discreto y explicación Alegreya en cursiva, sin cajas. La nota global bajo los dados desaparece; en dual cada arma presenta solo su propia nota y evita duplicarla con «Sin rasgos activos».
- Ayudas de preparación y Amenaza comparten tipografía y tonos cálidos. La falta de recursos indica directamente «Falta 1 dado de acción» o su cantidad plural. Se mantiene el texto original de cualquier nota desconocida. El motor y las reglas no cambian.
- Validación: 12 pruebas existentes del modal correctas; 9 escenarios de navegador aprobados, sin errores ni desbordamiento horizontal. Comprobados Duelo individual y dual en PC, móvil390 y320; Toque a1casilla, dados insuficientes, Amenaza y nota por arma en ataque enemigo combinado. Capturas inspeccionadas y cliente develop-web-game ejecutado. La preview visible queda en ?mode=single-duel.
- Artefactos: output/prepare-attack-review/notes-checks.json, notes-*.png y skill-client-notes-final. README y DESIGN actualizados. Sin commit ni despliegue.

## 2026-09-20 — Prueba de defensa básica: Ataque inminente

- El usuario autoriza continuar con la defensa básica tras aprobar Preparar ataque. Nuevo CanvasAttackDefense.jsx/css: ilustración del arma, Presión y dados reales del atacante, protección, selección defensiva y pérdida prevista de Vida junto a la confirmación. Comparte tipografías, dados con luz inferior y botón dorado de la preparación aprobada. Recibir ataque queda como acción sin defensa seleccionada, con tono rojo discreto.
- Extraído IncomingAttackDice desde el resumen existente para reutilizar sus dados, críticos y modificadores. El estado, elegibilidad, resolución y callbacks permanecen en CanvasCombatActionModal. Los jugadores seleccionan sus dados comprometidos; los enemigos eligen equipo y Amenaza según las reglas existentes. Antes de tirar la defensa enemiga se muestra una previsión explícita sin defensa, no un resultado definitivo.
- La CD del enemigo se oculta también cuando un jugador controla ese token; el máster conserva el dato. Excedente, contraataque, reposicionamiento, ajuste y registro mantienen su funcionamiento previo y quedan fuera de este rediseño.
- Verificación: 35 pruebas correctas en cuatro suites (modal, excedente, reglas básicas y registro). Compilación de producción correcta con aviso preexistente de tamaño. Matriz final de navegador: 22/22 escenarios sin errores de consola ni desbordamiento horizontal, incluyendo PC, móvil390 y320, horizontal844, teclado, movimiento reducido, privacidad, selección, equipo, Amenaza y confirmación. Regresión corta de Preparar ataque y cliente develop-web-game correctos.
- Capturas finales PC y móvil inspeccionadas. Corregidos el recorte heredado de la imagen de armadura, su fundido, la fila de tres dados a320 y la especificidad de movimiento reducido. Preview visible en 127.0.0.1:4213/?mode=defense-player, con d6 seleccionado: Presión17 menos Defensa6 deja11 y prevé perder1 bloque de Vida. Artefactos defense-checks.json y defense-*-detail-*.png en output/prepare-attack-review.
- README y DESIGN actualizados. Revisión móvil mediante viewports de Chromium, sin dispositivo físico ni escrituras en Firebase. La estética de defensa queda pendiente de valoración del usuario. Sin commit ni despliegue.

## 2026-09-20 — Afinado de equipo y Amenaza defensiva

- El usuario valora el planteamiento de defensa y pide selección directa de dados de Amenaza, mejor encuadre del equipo, rasgos como Preparar ataque y tipografía de estadísticas para Presión entrante.
- EnemyDefenseThreatDice sustituye las pestañas solo en defensa enemiga: reserva con su valor real y dados puntuales d4/d6/d8/d10/d12/d20 sin resultado hasta tirar. Pulsar el mismo dado deselecciona; elegir otro sustituye la selección. Máximo uno, sin selección no se añade Amenaza, sin equipo los dados quedan deshabilitados. Runtime y costes conservados. ActionDieButton acepta etiquetas opcionales sin cambiar sus valores por defecto.
- Ilustraciones defensivas cuadradas con contain y texto fundido, evitando el recorte apaisado del arma. CombatWeaponTraits comparte la presentación y búsqueda de colores del glosario de Preparar ataque; se mantiene intacta su apariencia allí. Presión entrante usa el mismo patrón tipográfico de las estadísticas del arma. README y DESIGN actualizados.
- Validación: 52 tests correctos en cinco suites, incluyendo reserva vacía/cero, sustitución, deselección, callbacks, privacidad y dual. Compilación de producción correcta. Matriz enfocada de navegador con 15 casos y cero errores; selección, consumo real, encuadre, glosario, teclado, movimiento reducido y viewports PC1440, móvil390/320 y horizontal844. Regresión de preparación y cliente develop-web-game ejecutados.
- Inspeccionadas capturas PC y móvil de la primera ronda, sin necesidad de otra iteración visual. Artefactos refinements-checks.json y refined-defense-enemy-*.png en output/prepare-attack-review. Preview de defensa enemiga recargada en Codex con un d6 puntual seleccionado. Pruebas aisladas, sin escrituras en Firebase, sin dispositivo físico, commit ni despliegue.

## 2026-09-20 — Numerales de Amenaza y presión horizontal

- Corrección solicitada: Presión entrante recupera la fila con cifra a la izquierda y texto a la derecha, manteniendo las tipografías Alegreya/Cinzel. Perfil del arma defensiva en rojo #e6aaa2.
- Dados puntuales de Amenaza con su número de caras dentro del SVG y sin repetir dN debajo. Conservan «Por tirar» y el nombre accesible; el número identifica el tipo y no simula un resultado. La reserva sigue mostrando su valor real y tipo.
- D20 de Amenaza con contorno cerrado y facetas unidas mediante variante connectedFaces de ActionDieSvg; no modifica el d20 legado de otros lugares ni los demás dados. La variante también se aplica si la reserva es d20.
- Verificación: 19 tests del modal y 13 del SVG correctos; 4 casos de navegador aprobados sin errores, PC1440, móvil390/320 y defensa del jugador. Se comprobó que seleccionar el numeral20 genera una tirada real (11 en la fixture determinista) y conserva la reserva5. Regresión de preparación correcta; capturas PC/móvil inspeccionadas sin otra iteración visual. Artefactos defense-numerals-*.png y numerals-check.cjs en output/prepare-attack-review.
- README y DESIGN actualizados; preview recargada con d20 seleccionado. Sin cambios de reglas, Firebase, commit ni despliegue.

## 2026-09-21 — Amenaza compartida en preparación enemiga

- Petición: aplicar en Preparar ataque enemigo el diseño de Amenaza ya afinado en defensa. EnemyThreatDice y su CSS compartido sustituyen las pestañas de preparación: número dentro de cada dado puntual, d20 conectado, luz inferior, reserva diferenciada y selección exclusiva. En ataque se usa «En ataque»; pulsar otra vez desmarca y ningún dado significa sin Amenaza.
- Se conservan los valores reales de reserva, los dados por tirar y todos los callbacks de confirmación. Sin cambios en reglas, HUD, arte del arma, defensa ni excedente. README y DESIGN actualizados.
- Validación: 36 tests del modal y ActionDieSvg correctos; 7 casos de navegador correctos, sin errores, con PC1440 y móvil390/320, reserva/cero/sin reserva, selección y deselección, teclado, movimiento reducido, cancelación y regresión defensiva. Capturas PC y móvil inspeccionadas sin otra iteración visual; cliente develop-web-game completado.
- Preview abierta en 127.0.0.1:4213/?mode=enemy-threat con d20 seleccionado. Artefactos threat-attack-checks.json y attack-threat-*.png en output/prepare-attack-review. Pruebas aisladas, sin escrituras en Firebase, dispositivo físico, commit ni despliegue.

## 2026-09-21 — Presión roja y equipo defensivo único

- Petición: igualar el color de «Presión entrante» al de su número y corregir la composición de defensa enemiga con una sola arma disponible.
- Ambos elementos de Presión heredan #e6aaa2. La opción defensiva única ocupa las dos columnas y se centra con un máximo de280px y proporción cuadrada; con varias opciones se conserva la distribución existente. Solo CSS de defensa, sin cambios en reglas o controles.
- README y DESIGN actualizados. Fixture aislada con equipment=single para revisar Daga sin reserva. Compilación de preview correcta;4casos de navegador sin errores: PC1440, móvil390/320 y regresión con dos armas. Centrado, color, selección/deselección de equipo, Amenaza y confirmación comprobados. Capturas PC/móvil inspeccionadas en una ronda.
- Preview abierta en 127.0.0.1:4213/?mode=defense-enemy&equipment=single&reserve=none. Artefactos single-defense-checks.json y single-defense-*.png en output/prepare-attack-review. Sin escrituras en Firebase, commit ni despliegue.

## 2026-09-21 — Dados del resultado defensivo

- Petición: centrar y ampliar los dados ya tirados de la defensa. Estilos limitados a combat-defense-roll dentro de la ventana de defensa: grupos centrados, SVG74px en PC y70px en móvil como los seleccionables de Preparar ataque; tipo y procedencia en Alegreya con tamaño legible. Operador entre Equipo y Amenaza alineado con los dados.
- Sin cambios en tiradas, valores, interacciones ni dados entrantes. README y DESIGN actualizados.
- Verificación: preview recompilada;6casos de navegador correctos con/sin Amenaza en1440/390/320, sin errores ni desbordamiento. Valores y Aplicar ataque conservados; resultados sin botones seleccionables. Capturas PC/móvil inspeccionadas en una ronda y cliente develop-web-game completado.
- Preview visible en el resultado de Daga sin Amenaza, dado3 centrado. Capturas defense-result-*.png en output/prepare-attack-review. Sin escrituras en Firebase, commit ni despliegue.

## 2026-09-21 — Arma defensiva sin seleccionar más oscura

- Petición: reforzar visualmente la diferencia entre equipo defensivo seleccionado y disponible. Solo CSS de defensa: ilustración al30% sin seleccionar frente al90% seleccionado; nombre discreto y texto/rasgos menos saturados. Hover/foco indican disponibilidad con42%, sin recuperar el brillo de selección. Selección aprobada intacta; transiciones respetan movimiento reducido.
- README y DESIGN actualizados. Preview recompilada,2casos PC1440/móvil390 correctos, sin errores. Verificados contraste entre estados, teclado, movimiento reducido, reselección, Recibir/Confirmar ataque y bloqueo de Amenaza sin equipo. Capturas seleccionada/deseleccionada inspeccionadas en una ronda; cliente develop-web-game completado.
- Preview visible con Daga desmarcada. Artefactos defense-card-selected/unselected-*.png en output/prepare-attack-review. Sin cambios de reglas, escrituras en Firebase, commit ni despliegue.

## 2026-09-21 — Precarga del arte de protección

- Petición: evitar la aparición brusca de la imagen junto a CD al pasar de Preparar ataque a Ataque inminente.
- LoadingImage expone preloadImage y comparte su registro de fuentes decodificadas con el render. Deduplica peticiones simultáneas, espera decode y libera las entradas pendientes al terminar; un fallo permite reintentar. Se reutiliza el componente existente sin skeleton ni recuadro de error para protección, con key por URL y movimiento reducido.
- El modal siempre montado prepara arte de los participantes y objetivos draft/pending antes de abrir la defensa, incluido el cliente defensor sin draft. Precarga y render usan el mismo resolver de armadura/imagen enemiga y actualizan URLs personalizadas tardías. La imagen pendiente entra con fundido; datos, geometría y acciones no esperan a la red. README y DESIGN actualizados.
- Validación:32tests correctos en3suites (LoadingImage, precarga del modal, modal).3casos de navegador con petición retenida: solicitud anterior a confirmar, entrada inmediata con recurso preparado, fundido tras carga tardía en móvil y fallo invisible sin bloquear controles ni mover la composición. Capturas PC/móvil inspeccionadas; cliente develop-web-game completado.
- Preview abierta en 127.0.0.1:4213/?mode=enemy-threat&transition=defense-player para probar Confirmar ataque→Ataque inminente. Artefactos armor-*.png y comprobación de precarga en output/prepare-attack-review. Sin escrituras en Firebase, commit ni despliegue.

## 2026-09-21 — Prueba del texto centrado en arma defensiva única

- Petición: probar nombre, Defensa y rasgos en el centro de la imagen. CSS limitado a la opción defensiva única: contenido centrado verticalmente, sombra radial local sin marco y línea dorada junto al grupo de texto. Ilustración, dimensiones y estados claros/atenuados conservados; varias opciones mantienen la composición anterior.
- README y DESIGN registran la prueba pendiente de valoración. Preview recompilada;3comprobaciones de navegador correctas, sin errores: centrado exacto y selección en PC1440/móvil390, más regresión de dos armas. Capturas comparativas inspeccionadas en una ronda.
- Preview abierta en defense-enemy&equipment=single&reserve=none con Daga seleccionada. Artefactos centered-defense-*.png en output/prepare-attack-review. Sin cambios de reglas, escrituras en Firebase, commit ni despliegue.

## 2026-09-21 — Suma centrada entre los dados entrantes

- Ajustado únicamente el signo entre grupos del ataque entrante: ocupa el hueco completo y centra el texto, con separación compartida de 22 px en escritorio y 18 px en móvil.
- README y DESIGN actualizados. Preview recompilada; 2 comprobaciones de navegador correctas (1440 y 390 px), desviación de centrado de 0 px y sin errores. Recorte inspeccionado; preview visible actualizada.
- Artefactos incoming-plus-centered-1440.png e incoming-plus-checks.json en output/prepare-attack-review. Sin cambios de reglas, commit ni despliegue.

## 2026-09-21 — Evitar arrastre accidental de imágenes en defensa

- Añadido draggable={false} al arte del equipo defensivo, arma entrante y protección. Se mantiene el comportamiento del componente LoadingImage y la selección por clic; no afecta al inventario ni al HUD.
- README actualizado. Preview recompilada y comprobación PC correcta: un gesto real de arrastre sobre Daga no inicia drag nativo, dos clics alternan y restauran la selección, confirmación habilitada y sin errores de consola.
- Preview visible actualizada. Informe combat-image-drag-checks.json en output/prepare-attack-review. Sin cambios de reglas, commit ni despliegue.

## 2026-09-21 — Fundido dual compartido en Ataque inminente

- Petición: corregir el corte central y desequilibrio entre las ilustraciones del ataque dual recibido usando la composición aprobada de Preparar ataque.
- Extraídas sin alterar valores las reglas de arte dual a CanvasCombatWeaponArt.css, compartidas por preparación y defensa de dos armas: capas del 57% con superposición simétrica, máscaras enfrentadas y el mismo encuadre. La variante de una arma conserva sus reglas. README y DESIGN actualizados.
- Preview recompilada. Tres comprobaciones correctas: defensa/preparación en PC 1440 y móvil 390, más regresión de una arma. Misma anchura por arma, sin desbordamiento; recortes PC/móvil inspeccionados y sin corte central abrupto. No cambian reglas ni controles.
- Preview visible en defense-dual&equipment=single&reserve=none. Capturas dual-defense-header-1440/390.png y referencias de preparación en output/prepare-attack-review. Sin commit ni despliegue.

## 2026-09-21 — Preparación de varias armas enemigas

- Petición: acercar la preparación del ataque dual enemigo al diseño aprobado de jugador y eliminar las tarjetas ilustradas duplicadas entre resumen y selección.
- Dos armas enemigas usan ahora el arte simétrico compartido, perfiles de Daño/Alcance y rasgos efectivos del glosario. Tres o más mantienen todas las armas visibles; los ejemplares iguales se distinguen por identidad, sin asignar manos a enemigos.
- «Elegir armas» abre un selector compacto plegable con selección accesible, mínimo una arma y bloqueo durante confirmación. Al cerrarlo queda inerte y fuera del recorrido del teclado; movimiento reducido soportado. Una acción principal y Amenaza siguen usando el runtime existente. La suma distingue armas y modificadores y usa el fallback de Base ofensiva del token.
- README y DESIGN actualizados; la nueva propuesta queda pendiente de valoración estética. No se altera el HUD.
- Validación: 25/25 pruebas en las suites nueva de selección enemiga y modal existente. Cinco casos de navegador correctos, sin errores: dos Dagas PC/móvil, dos armas distintas, tres armas con cambios y tránsito a defensa, y regresión del dual jugador. Revisadas capturas de selector cerrado/abierto en escritorio y móvil; único ajuste final de especificidad para la nota del coste en cursiva.
- Preview abierta en ?mode=enemy-dual&reserve=none&transition=defense-player, con Confirmar ataque conectado a defensa en el entorno aislado. Capturas enemy-dual-detail-*.png y enemy-dual-open-detail-*.png en output/prepare-attack-review. Sin escrituras en Firebase, commit ni despliegue.
- Confirmación final acotada: nota de coste en Alegreya cursiva en PC/móvil, apertura por teclado, panel cerrado inerte y cancelación correctos; objetivos táctiles de 46/60 px. Cliente develop-web-game completado e inspeccionado. Informes enemy-combined-checks.json y enemy-combined-final-checks.json, sin errores.

## 2026-09-21 — Nombre y daño juntos en Elegir armas

- El usuario valora el selector plegable y pide acercar el perfil al nombre. Agrupados nombre y daño en una línea con 12 px de separación y alineación de texto; Ejemplar permanece debajo. Se conserva toda la superficie seleccionable y el ajuste de nombres largos.
- README y DESIGN actualizados. Preview recompilada; PC 1440 y móvil 390 verificados sin desbordamiento ni errores, con 12 px reales entre nombre y perfil. Selección/desmarcado correctos. Recortes enemy-selector-inline-*.png e informe enemy-selector-inline-checks.json en output/prepare-attack-review.
- Preview visible con selector desplegado. Sin cambios de reglas, nuevas pruebas unitarias, commit ni despliegue.

## 2026-09-21 — Recuperar equilibrio izquierda/derecha en Elegir armas

- El usuario rechaza nombre y daño pegados; aclara que sí aprecia las dos alineaciones, pero no el hueco excesivo. Restaurados nombre/Ejemplar a la izquierda y daño a la derecha dentro de un selector centrado de máximo 300 px, frente a los 420 px iniciales. Eliminadas las reglas de la prueba anterior.
- README y DESIGN actualizados con la corrección de preferencia. Preview recompilada y selector abierto. Tres comprobaciones correctas: PC 1440, móvil 390 y nombre largo en móvil; centrado exacto, sin solapamiento ni desbordamiento y selección intacta. Recortes inspeccionados.
- Evidencias enemy-selector-compact-*.png y enemy-selector-compact-checks.json en output/prepare-attack-review. Sin cambios de reglas, nuevas pruebas unitarias, commit ni despliegue.

## 2026-09-21 — Amenaza múltiple en ataque y defensa

- Petición: seleccionar varios dados de Amenaza en general y concretar la siguiente fase visual. Eliminado el límite de uno en preparación y defensa enemigas, con tipos combinables, repeticiones mediante controles +/− de 44 px y reserva independiente. Sin selección no se añade Amenaza; se conservan SVG, numerales y luz inferior.
- Selección canónica threatSelection con useStored/customDice; arrays attackThreatDice/defenseThreatDice guardan cada tirada real. La reserva conserva su valor (incluido 0), se consume una sola vez y los puntuales no la gastan. Ataque y defensa revalidan recursos al confirmar; defensa transaccional y bloqueada mientras guarda, sin repetir resultados en reintentos. Compatibilidad con combates anteriores.
- Presión, defensa, pérdida de Vida y logs suman y muestran cada dado sin duplicar. Los jugadores mantienen sus dados de acción. README y DESIGN actualizados con la nueva petición; siguiente fase: excedente defensivo (contraataque y reposicionamiento).
- Verificación funcional: 81 pruebas correctas en 8 suites dirigidas (46 reglas/runtime, 25 UI, 10 desglose/logs). Cinco casos de navegador correctos en PC1440, móvil390 y320 sin reserva, sin errores; reserva5 + 2d6 + d4 suma16 de Amenaza,33 de Presión y19 de Defensa en las fixtures. Corregido el operador entre grupos del resultado móvil al apilarlos.
- Preview actualizada y visible con 1d4 + 2d6 seleccionados en enemy-dual&reserve=none&transition=defense-player. Sin commit ni despliegue.
- Confirmación final acotada: operador móvil centrado entre grupos, sin recorte ni desbordamiento. Cliente develop-web-game ejecutado e inspeccionado, sin errores. Evidencias multi-threat-checks.json, multi-threat-final-checks.json y capturas multi-threat-* en output/prepare-attack-review.

## 2026-09-21 — Propuesta de excedente defensivo

- El usuario aprueba Amenaza múltiple y autoriza rediseñar contraataque/reposicionamiento siguiendo Preparar ataque. Se mantiene el HUD protegido y las reglas de combate.
- Sustituido DefensiveExcessChoice legado por CanvasDefensiveExcess. Resultado y decisiones viven en el cuerpo desplazable; el pie conserva la confirmación dorada y continuar sin gastar excedente. Opciones sin recuadros, arte fundido del arma, Cinzel/Alegreya, Presión roja y casillas doradas. El perfil del arma no se presenta como una nueva tirada.
- Elegir respuesta/arma solo prepara; el CTA confirma la defensa. Selector plegable por identidad real de arma, copias diferenciadas, ausencia de selector si solo existe una. Arte precargado, imágenes no arrastrables, controles táctiles y movimiento reducido. La confirmación bloquea también los dados de defensa; evita confirmaciones duplicadas y recupera controles al devolver false.
- Derribado impide reposición; sin arma legal sigue disponible movimiento y descartar, y con ambas opciones bloqueadas puede descartarse. No se revela CD enemiga. Retiradas las reglas CSS del componente legado ya sin consumidores.
- README y DESIGN registran la nueva propuesta pendiente de valoración. 60/60 pruebas en cuatro suites de UI/runtime/estado; seis de la nueva suite repetidas tras corregir el desplegado. Siete escenarios de navegador PC/móvil/320 pasan sin errores ni desbordamiento.
- Revisión visual acotada: las opciones de armas podían quedar debajo del pie al abrir. Corregido para traer el desplegable a la vista al finalizar su animación, con desplazamiento inmediato en movimiento reducido. No se desplaza automáticamente al elegir dados.
- Vista de prueba abierta en ?mode=defense-excess-player, con defensa9 frente a ataque4 (excedente5). Sin commit ni despliegue.
- Confirmación final: la lista abierta queda completamente visible de forma natural (0 px ocultos) en PC/móvil y movimiento reducido. Cliente develop-web-game ejecutado, capturas nativas y estado verificados sin errores. Bundle final servido y preview recargada con cinco puntos de excedente. Informes excess-checks.json y excess-final-checks.json; capturas excess-counterattack/reposition/weapons-final-* en output/prepare-attack-review.

## 2026-09-21 — Continuidad del arte y arma predeterminada del contraataque

- Petición: eliminar popping al cambiar arma y preseleccionar el arma usada para defender o en el último ataque propio, manteniendo el cambio manual.
- Ilustraciones en capas persistentes con fundido de 220 ms. La imagen previa permanece hasta que la candidata está decodificada; las respuestas tardías de selecciones abandonadas no sustituyen la selección actual. Si falla el recurso, se retira el arte anterior para no mostrar otra arma. Se mantiene el comportamiento de movimiento reducido y el bloqueo de arrastre.
- Preferencia por identidad de ejemplar y solo entre contraarmas legales. La defensa actual tiene prioridad; los ataques confirmados recuerdan las armas participantes del actor. La elección manual válida prevalece. No se implementan aún las reglas de doble defensa enemiga ni escudo revisadas en el turno anterior.
- README y DESIGN actualizados. 86 pruebas dirigidas correctas (37 interfaz/precarga, 49 reglas/estado/runtime). Navegador PC1440 y móvil390: preferencia no primera, carga demorada mantiene arte previo, fundido con ambas capas, cambio rápido descarta imágenes tardías y confirmación conserva la elección manual; sin errores ni desbordamiento. Capturas counter-art-final-1440/390.png inspeccionadas y evidencia en counter-art-checks.json. Preview abierta con Estoque preseleccionado y selector desplegado. Sin commit ni despliegue.
- Cliente develop-web-game completado en skill-client-counter-art: estado confirma la preferencia por Estoque; las capturas nativas desplazadas documentan el contraataque completo en PC y móvil.

## 2026-09-21 — Defensa enemiga con dos armas y escudo pasivo

- El usuario autoriza implementar la defensa enemiga revisada y mostrar el escudo junto al equipo, seleccionado por defecto. Una acción reactiva tira el perfil completo de una arma o dos de una mano, sin Base ofensiva; conserva el gasto hasta la siguiente ronda y no gasta Movimiento. Jugadores y HUD protegidos conservan su flujo.
- Selección por identidad de ejemplar, máximo dos manos y un escudo. La segunda arma o el arma a dos manos sustituye el escudo; elegir escudo conserva como máximo una arma de una mano. Escudo solo aporta +1 CD, sin tirar su daño configurado ni gastar acción o Amenaza; sigue disponible cuando la acción principal ya está gastada. La CD guardada permanece como base, con bono separado para esta resolución y compatible con Perforante.
- Encontrados Escudo (sheet-weapon-granescudo), Rodela (sheet-weapon-escudo) y Escudo de torre en el catálogo existente mediante lectura. Se reconoce también el identificador legado de Rodela; Escudo tiene ilustración propia y se utiliza en la preview. No se modifica el catálogo. La regla de escudo se limita a enemigos.
- Runtime revalida equipo, manos, perfiles y recursos en la transacción; congela armas, escudo y bono con la tirada. Resultado muestra dados por arma y el registro incluye ambas armas/escudo sin revelar CD enemiga. El contraataque mantiene una resolución directa del excedente y solo conserva escudo del enemigo atacado si el ataque de origen dejó una mano libre.
- Interfaz mantiene ilustraciones fundidas, daño rojo, selección luminosa y ejemplares diferenciados. Escudo muestra Protección +1 CD / Pasivo · Sin dados; no introduce tarjeta de armadura ni dados ficticios. README y DESIGN actualizados.
- Validación dirigida: 71 pruebas de reglas/selección, 51 de runtime/registros y 42 de interfaz correctas. Cinco escenarios de navegador pasan sin errores ni desbordamiento: selección y tirada dual PC/móvil, escudo solo con/sin acción, y regresión de jugador. Cliente develop-web-game ejecutado; sus bandas virtuales conocidas no aparecen en capturas nativas, inspeccionadas en PC y móvil.
- Preview actualizada en ?mode=defense-enemy-hands con Daga + Escudo por defecto. Evidencia en output/prepare-attack-review/defense-hands-checks.json y capturas defense-hands-shield/dual-1440/390.png. Sin escrituras de prueba en Firebase, commit ni despliegue.

## 2026-09-22 — Modificadores del HUD reflejados en el ataque

- El usuario pide que los dados adicionales elegidos desde el HUD y los rasgos manuales Crítico/Perforante funcionen para jugadores y enemigos y se distingan en las ventanas posteriores. Restricción de opciones solo en Canvas; se mantienen diseño, pliegues, rasgos propios del equipo y otros modos de juego.
- Corregida selección de reglas: los rasgos manuales se aplican por arma antes de alcance/competencia/armadura. Crítico no se transfiere de una mano a otra que no lo tenga; la protección de una sola arma tampoco neutraliza toda la combinación. Los dados extra siguen sin generar Crítico, conservan su origen Modificador y se suman una única vez. Perforante reduce CD una sola vez. El HUD conserva el rasgo manual explícito aunque ya estuviera presente en otra arma del dual.
- Preparación separa el perfil base del arma y muestra dados adicionales bajo Modificadores con los SVG aprobados, nota de tirada y rasgos coloreados. La suma distingue su aporte. Ataque inminente separa resultados de Modificador también con arma única; rasgos añadidos y anulados siguen visibles. No se introduce selección de modificadores en estas ventanas.
- Verificación dirigida: 74 pruebas de reglas/selección, 44 de HUD/transporte/runtime/registro y 34 de interfaz correctas. El test nuevo de UI necesitó declarar bandos distintos en la fixture; corregida la fixture y sus cinco casos pasan. El helper conserva strings de rasgos sin comas añadidas cuando no hay rasgos nuevos, comprobado con 10 pruebas. README y DESIGN actualizados.
- Navegador: cuatro flujos completos correctos (HUD real jugador/enemigo y dual jugador/enemigo) hasta defensa y Vida, en PC/móvil, sin errores ni desbordamiento. Capturas manual-modifiers-*-prepare/defense.png inspeccionadas; dados extra separados, rasgos efectivos coloreados y anulación en Duelo visible. Informe manual-modifiers-checks.json y cliente develop-web-game completado. El servidor aislado 4213 se reanudó tras comprobar libre el puerto; no se abrió otro puerto.
- Preview abierta con Estilete, +2d6, Crítico y Perforante y un dado de acción elegido en ?mode=single-modifier&modifiers=manual&transition=defense-enemy. Confirmar permite probar el paso a defensa. Sin escrituras de prueba en Firebase, commit ni despliegue.

## 2026-09-22 — Poción de curación (en curso)
- Regla contrastada con documento maestro v0.2.40 §10.2 y entrada real Forja `customItems/0Ett8V_mcWfUanXRRIPCG`: uso propio, 1d4 bloques de Vida hasta máximo, una copia; en combate dado de acción cuyo valor se ignora. Enemigos usan su acción principal; exploración no crea dados ni combate.
- Nuevo flujo de confirmación/resultado ilustrado con arte real, acceso desde Objetos y selector de coste del HUD conservado. Cancelar no consume. Envenenado/0Vida bloquean el uso; Vida completa permite gasto consciente con aviso.
- Primera comprobación: 22 tests de definición, modal y regresión de humo pasan. Persistencia transaccional y QA PC/móvil en curso en arnés aislado, sin escrituras reales a Firebase.

### Poción — implementación y validación final
- Consumo transaccional en escena: una copia (incluidas pilas y payloads), Vida, dado de acción/acción principal, run vinculado, recibo idempotente y registro. No escribe datos de prueba en Firebase. Recursos de humo conservan su política anterior.
- Revalida control, turno/bloque, ronda/combate, ataque pendiente, Vida, veneno, identidad y revisión de aventura antes de aplicar. Una confirmación repetida usa la misma tirada; cambiar de escena durante un fallo descarta la sesión antigua. Limpiar cinturón al agotar la última copia impide rematerializarla.
- Definición explícita healing-potion o nombre exacto Poción de curación; objetos genéricos como Poción menor/Poción no se convierten en curativos. No administra a aliados, no levanta caídos y no implementa todavía aplicación de veneno ni antídoto.
- Comprobación final: 108 pruebas aprobadas en 9 suites (reglas, sesión, runtime, modal, humo, economía y registro). Regresiones adicionales del HUD/área: 40 pruebas aprobadas en 6 suites; un aviso jsdom scrollTo preexistente en HUDMovement, sin fallo de test.
- Arte y UI comprobados visualmente en capturas PC 1440 y móvil 390. Preview aislada http://127.0.0.1:4214/?start=confirm; ruta sin query permite flujo completo desde HUD. Build completo inicial compila correctamente; reconstrucción final tras revisión de concurrencia en curso.
- Siguiente iteración: valoración visual de esta poción. Después elegir el siguiente consumible; si es antídoto, implementar antes el flujo de Envenenado completo sin automatizar clases. No desplegado ni commit.
- Cierre: build final de producción compilado correctamente. Revisión responsive adicional 320×640 y 844×390 sin desbordamiento; botón de confirmación visible y contenido desplazable en horizontal.
- QA cerrado: 7 escenarios funcionales y 2 tamaños compactos pasan, cero errores de navegador. Cliente develop-web-game ejecutado e imágenes/estado inspeccionados. Rebuild final del arnés tras ajustes de concurrencia completado; revisión queda disponible en 4214.

## 2026-09-22 — Poción en HUD, tirada compartida y Vida del token

- El usuario autoriza implementar la dirección discutida: preparación compacta desde Objetos, resultado d4 animado sobre el token compartido, registro integrado y Vida por bloques legible con zoom. Prioridad estética y continuidad con el retrato circular, aro dorado y controles actuales. README y DESIGN recogen la preferencia para otras tareas.
- Coste enemigo confirmado expresamente: un recurso a elegir entre principal, Movimiento, reserva de Amenaza o Amenaza manual para ese uso; dado ignorado, curación siempre 1d4. Jugador gasta un dado de acción. Combate OFF utiliza recursos de práctica, no free-use.
- Nuevas copias del generador/recogida con instanceId; normalización de pociones legacy en el consumo. El HUD distingue ejemplares antes de cruzar catálogo/nombre para evitar duplicar la copia del cinturón y ocultar otra. Se preservan consumo único, límites de Vida y revisión de escena/run.
- CanvasPotionPreparation sustituye el modal de poción; elección/cambio/deselección/cancelación sin gasto, confirmación dorada. Tras commit la sesión se cierra y deja el resultado al tablero. Header ilustrado con máscara; Vida segmentada; acceso manual a Amenaza mediante despliegue.
- CanvasTokenLife se limita a perfiles roguelite de Canvas: arco inferior segmentado, lectura exacta seleccionada y tamaño mínimo con zoom; contrarrotación, transiciones por bloques y reduced motion. Renderer mantiene retrato, aro, controles y permisos originales. Los HUD de sistemas antiguos conservan sus recursos.
- Primer lote visual PC/móvil detectó imagen en flujo (LoadingImage no acepta wrapper className); corregido con capa explícita. Horizontal requería reservar 210px para HUD al calcular alto del despliegue; corregido. QA final y build pendientes al escribir esta entrada.
- Pruebas dirigidas iniciales: 35 UI/sesión/humo/HUD, 135 reglas/runtime/inventario/registro y 33 efectos/visibilidad/registro correctas. Suite completa en ejecución, sin escrituras de prueba en Firebase ni despliegue.
- Cierre: suite completa con 142 suites correctas, 884 pruebas aprobadas y una omitida. Tras los últimos ajustes de visibilidad, costes y colocación se repitieron seis suites relevantes: 73 pruebas correctas. Build final de producción compilado; se mantiene el aviso de tamaño del bundle preexistente.
- QA final: 11 escenarios correctos y cero errores de navegador, incluidos costes alternativos, práctica, cancelación, consumo único, límite de Vida y receptor oculto; PC, móvil, 320px y horizontal. Cliente develop-web-game ejecutado y captura/estado inspeccionados. El dado evita los controles y bordes del viewport; el arco de Vida queda dentro del aro para separar los segmentos del tirador de tamaño.
- Preview final en http://127.0.0.1:4214/?start=confirm. Evidencia en output/healing-potion-review/compact-checks.json, capturas compact-*, log-player-* y skill-client-compact/shot-0.png con state-0.json. Dos receptores locales muestran el mismo resultado confirmado; queda pendiente probar una partida real entre clientes Firebase. Sin commit ni despliegue.

## 2026-09-22 — Encaje de la poción y nombres al inspeccionar enemigos

- El usuario aprueba corona, nombres legibles y animación/halo de curación. Pide que el panel de poción quede incrustado en la fila Acciones/Clase/Objetos, como Correr, sin sobresalir; aplicar las nuevas etiquetas también al hover de enemigos no controlados.
- La poción se ancla al tamaño intrínseco de las pestañas, con margen interior en escritorio y ajuste al ancho en móvil. Mantiene pliegue, arte, selección y confirmación; dados en rejilla flexible para conservar tres opciones en pantallas estrechas. Los paneles de armas/modificadores y Correr mantienen su implementación.
- README y DESIGN recogen aprobación y preferencia. 24 pruebas focales de HUD/modificadores/poción/sesión pasan. Revisión visual y ajuste del nombre con permisos en curso.
- Nombres: readout compartido para dueño y enemigo visible, con compensación de zoom y rotación. El modo solo nombre no recibe stats. Separado permiso de ver recursos del permiso de apuntar; enemigos ocultos no montan etiquetas. 16 pruebas de nombres/permisos/corona/humo correctas (40 focales junto al lote del HUD).
- QA detectó poco espacio móvil si se conservaba el ancho estrecho de pestañas. Durante el despliegue de la poción, móvil amplía conjuntamente fila y panel hasta 320px (288px en pantalla320), con ancho idéntico y cierre que conserva la unión. PC mantiene 16px de margen interior. Ocho escenarios y cero errores; hover y Correr correctos. Se está comprobando una última compactación horizontal para que la fila de dados quepa completa.
- Cierre: 9 escenarios de navegador correctos, cero errores. Separación panel/pestañas de 0px; fila completa de dados en horizontal (99.39px dentro de 102.20px), confirmación de 44px. Revisión PC/móvil320/390/horizontal844 y cliente develop-web-game final inspeccionados. Capturas fit-* e informe fit-checks.json en output/healing-potion-review; cliente en skill-client-fit-final. Build final de producción correcto. Sin commit, despliegue ni escrituras de prueba Firebase.

## 2026-09-22 — Recuperar la corona exterior de Vida

- El usuario precisa que aprobó la corona exterior anterior y rechaza su colocación posterior dentro del aro. Restaurados el diámetro screenWidth + 12 y la colocación inferior .27, antes cambiados a -10 y .35 para evitar el tirador. No se cambia color, segmentos de Vida, nombres, panel ni lógica de curación.
- README y DESIGN corrigen la referencia aprobada. Diez pruebas existentes de Vida/nombres/permisos pasan; comprobación visual de zoom y preview en curso.
- La revisión a zoom4.6 detectó que el antiguo límite de 180px también metía los extremos dentro del retrato. Eliminado ese máximo; se conserva el mínimo de lectura. La etiqueta se coloca debajo del arco exterior y su grosor con 4px de separación, para que no tape los segmentos al ampliar. No cambia el nombre de enemigos sin corona.
- Cierre: diez pruebas correctas y revisión visual de la corona en PC/móvil, seleccionada/sin selección, zoom0.6/1.4/4.6. Capturas crown-*.png y cliente skill-client-crown-final inspeccionados; etiqueta separada de la corona, sin errores. Preview4214 reconstruida. Sin cambios de reglas ni despliegue.

## 2026-09-22 — Corrección de sincronización de pociones y geometría de Vida

- Informe real: Vida distinta entre jugador/máster, segunda curación desde estado aparente antiguo, objetos que no vuelven a ocupar huecos del cinturón, parpadeo del HUD y segmentos adelantados al d4. La corona externa aprobada necesita centro exacto al ampliar y segmentos proporcionados en2×2.
- Causas corregidas: identidad duplicada al pegar loot; runItemId sintético distinto de instanceId; refresco de metadatos reconstruía cinturón desde activeRun anterior; locks se registraban después de confirmarse el snapshot; persistencia secundaria publicaba el token capturado antes de curar. Los commits transaccionales de curación ya tiraban1–4; el0 era recuperación efectiva a Vida completa.
- Reconciliación compartida descarta snapshots de versión anterior, limpia protecciones de runtime superadas y persiste hojas editadas de objetos anidados. Guardado de aventura relee escena y vincula revisión de perfil/escena en transacción. Un perfil adelantado espera el estado de escena para no anticipar Vida.
- Presentación desde metadata en el mismo commit de escena: d4/corona comparten1300ms de revelado y3200ms de duración; no se anima de nuevo por el log independiente. La corona conserva el aro dorado y bloques rosados, con centro exacto, grosor4px y segmentos limitados.
- Pruebas: regresiones focales correctas; primera suite completa detectó dos ajustes pendientes (mock de suscripción de creación y límite de importación Canvas/shared), ambos corregidos. QA de dos clientes independientes en curso; sin datos de prueba en Firebase ni despliegue.
- Cierre técnico: 145 suites correctas; 928 pruebas aprobadas y una omitida. Build de producción compilado correctamente. Se añadió regresión de guardado de aventura atrasado y de pickup concurrente que no debe resucitar una copia consumida.
- QA con dos estados React independientes y listeners separados: recogida→consumo→recogida→consumo conserva belt_0, reutiliza belt_1 y ambos clientes llegan3→7→8 pese a snapshots retrasados, invertidos y repetidos, perfiles adelantados y locks antiguos. Los segmentos permanecen3/7 antes del revelado y pasan7/8 después. Curaciones rápidas forman una cola visual de un dado por token.
- Diez vistas geométricas revisadas: PC/móvil,1×1/2×2, seleccionado/sin seleccionar y zoom cercano4.6; centro exacto, trazo4px, huecos2,5px y bloques hasta16px. Informes/capturas en output/healing-potion-review/sync-checks.json y geometry-checks.json. Es transporte local de pruebas con lógica de producción, no E2E Firebase real. Sin commit ni despliegue.

## 2026-09-22 — Proporciones de corona y continuidad móvil de poción

- El usuario confirma que sincronización, recogida y curación funcionan bien. Rechaza corona exagerada al alejar y minúscula al acercar; prefiere proporciones al30%en2×2. Pide animar el ancho móvil al abrir/cerrar poción y cerrar huecos de esquinas entre panel y pestañas. Pregunta el motivo del dado lateral, sin pedir cambiarlo.
- Corona: abandona4px y16px fijos, conserva arco de120grados y escala grosor/márgenes/separaciones con el retrato, con pequeña compensación suave de distancia. No hay radio mínimo de27,5px que la despegue.26pruebas de geometría/presentación pasan; QA de tamaños reales768unidades y porcentajes reales en curso.
- Posición del dado verificada en getCanvasDieOutcomeOffset: prioridad superior derecha, después izquierda/laterales y alternativas centradas, para despejar herramientas sobre el token y bordes de pantalla. Se conserva en esta petición.
- Cierre visual:20configuraciones revisadas con tokens50/100/256/768unidades y zoom10/30/50/100/460%; arco120grados y margen exterior positivo. Capturas proporcional-crown (nombre de archivo proportional-crown-*) muestran referencia768al30%=230,4px y su escalado.
- Móvil: width numérico medido cerrado y transición320ms coordinada con pliegue; unión opaca con esquinas rectas mientras se muestra panel. En390px anima226,47→320→226,47; en320px llega288px.18–20anchos intermedios observados y hueco0px; PC1440 y horizontal844 no cambian ancho. Capturas motion-* e informe de revisión en output/healing-potion-review.
-60pruebas focales correctas: geometría, sincronización de revelado, nombres, poción, HUD/modificadores y dado. Sin cambios de reglas, consumo, sincronización o colocación del dado. Build final en output/crown-mobile-polish-build.log.

## 2026-09-22 — Apertura móvil estable y Vida en tokens pequeños

- El usuario detecta un salto al abrir la poción en móvil y aprueba Vida1×1, pero pide reforzar0,5y0,25.
- Reproducido el salto: el ancho animado cambiaba los saltos de línea y la altura del panel 23–26px durante el pliegue. Corregido con contenido a su ancho final desde el inicio, medición de pestañas fuera de pantalla y pliegue móvil sin traslación ni escala. Escritorio conserva su animación.
- La corona recibe cellSize real desde el renderer. Para tamaños subcasilla se refuerza solo el grosor tomando como referencia 1×1; 0,5≈80% y 0,25≈70% del grosor de 1×1, con compensación de distancia. Radio sigue el retrato; 1×1 y 2×2 conservan exactamente su geometría previa.
- Cierre: 63 pruebas focales correctas y build de producción compilado. QA móvil a 320/390px confirma altura constante de 441px y separación de 0px respecto a las pestañas durante apertura, cierre y reapertura. Doce combinaciones de tamaño/zoom revisadas; cliente oficial sin errores. Artefactos en output/healing-potion-review/dock-final-traces.json, subcell-crown-checks.json y skill-client-subcell-final/. Sin cambios en reglas ni sincronización.

## 2026-09-22 — Remate de la unión móvil de poción

- El usuario señala una línea fina que todavía parece un hueco. Reproducido a 320/390px con DPR 1/2: los rectángulos se tocan, pero el borde superior dorado de las pestañas dibuja una raya distinta del fondo del panel.
- Solo en móvil y mientras existe el despliegue, ese borde toma el fondo opaco de la poción; el panel solapa además 1px para evitar rendijas por rasterizado fraccional. Se conservan alturas, animación y escritorio. README actualizado.
- Validación visual a 320/390px y DPR 1/2: unión continua, solape de 1px, sin raya dorada. Capturas seam-final-* e informe seam-final.json en output/healing-potion-review. Cliente oficial ejecutado en skill-client-seam-final/: selección y consumo correctos (Vida 3→4, una poción restante, una transacción local de prueba).

## 2026-09-22 — Humo por huella en fichas grandes

- Petición: resolver fichas 2×2 y 3×3 parcialmente dentro de Humo sin convertir el contacto parcial en un estado binario de toda la criatura.
- Regla implementada: la huella se divide por los bordes reales de las áreas de Humo. Cada porción interior o expuesta aporta un punto válido de visión; dos porciones en la misma nube continua se ven entre sí y dos porciones exteriores se ven si el segmento no cruza Humo. Interior↔exterior y nubes distintas continúan bloqueados.
- Una ficha parcial participa tanto dentro como fuera; una ficha completamente cubierta conserva el comportamiento de residente interior. `Oculto` vuelve a ser exclusivamente un estado explícito y las zonas nuevas ya no lo declaran.
- Presentación: el Humo sigue dibujándose sobre sus casillas, pero una intersección parcial no aplica niebla, opacidad o desaturación a todo el retrato. La oclusión exterior se conserva mientras exista una porción expuesta.
- Pruebas focales: 10 suites, 118 pruebas correctas, incluidas huellas 2×2/3×3, cobertura completa, alcance real de ataque, render y compatibilidad de objetos. Tras la limpieza final se repitieron las 4 suites directamente afectadas: 42 pruebas correctas.
- Cierre: build de producción correcto. Revisión visual aislada con lógica de producción y cliente oficial `develop-web-game`: 2×2 a media cobertura visible desde exterior e interior, bloqueado al mirar a través de la nube; 3×3 con 4/9 cubiertas visible desde su parte expuesta. El retrato permanece completo y el área cubre únicamente su región geométrica. Estados y capturas en `output/smoke-footprint-review/skill-client*`; sin errores de navegador, commit ni despliegue.

## 2026-09-22 — Integración de la corona de Vida dentro del Humo

- El usuario detecta que la Vida mantiene demasiado color y contraste frente al retrato cubierto, por lo que parece una capa separada.
- Solo con la huella completamente dentro se transmite la densidad de Humo a `CanvasTokenLife`: velo suave en perspectiva interior y más marcado en la inspección general. Se conserva el socket oscuro y el conteo de bloques.
- Hover y selección recuperan parte de la lectura; los bloques que cambian por curación o daño ganan claridad durante el feedback. Los solapes parciales no atenúan toda la corona.
- Cierre: 54 pruebas focales correctas, incluida propagación de densidad, cobertura parcial y timeline de curación. Build de producción correcto. Revisión visual final con el componente de producción y cliente oficial en `output/smoke-footprint-review/skill-client-life-veil-final`: siete bloques siguen contables, corona integrada en la bruma y estado textual coherente. Sin commit ni despliegue.

## 2026-09-22 — Visión estable durante el movimiento en Humo

- Arrastrar una ficha conserva sombras, niebla, Humo y visibilidad de objetivos desde la huella de partida. En combate, la posición de visión se mantiene durante todo el movimiento pendiente hasta confirmar el turno; fuera de combate cambia al soltar.
- El retrato móvil permanece como previsualización. Máscaras SVG, filtro de fichas, indicadores y efectos consultan la misma posición de visión comprometida; se evita tanto el apagón temporal como el vistazo gratuito fuera de la nube.
- Pruebas focales de Humo, render, movimiento y Canvas: 44/44. Revisión visual de arrastre, pendiente y confirmación con la skill develop-web-game y estado render_game_to_text. Build final correcto.


## 2026-09-22 — Humo y Oculto con el mismo aspecto en móvil

- El efecto compartido conserva el shader TokenMagic original en WebGL, con precisión alta cuando el dispositivo la admite, buffer preservado y comprobación de imagen vacía. Se retiró la aproximación 2D porque cambiaba la estética.
- Como respaldo visual se capturaron doce fotogramas reales del mismo shader, en dos densidades (zona y retrato). Dos sprites WebP de 76 y 87 KB los animan si el navegador no puede ejecutar o copiar el shader. En el harness móvil forzando WebGL desactivado, la captura completa muestra la misma niebla; en el navegador normal ambos canvases usan WebGL. Pendiente de comprobación física en el teléfono del usuario.

## 2026-09-22 — Registro ilustrado de curación

- La imagen de la poción ocupa la superficie completa de la entrada del registro y se funde hacia el fondo azul noche, con el texto, la tirada y el coste por encima. Las entradas sin imagen mantienen su disposición anterior.
- Prueba del panel: 6/6. Build de producción correcto. Capturas del componente real a 1440 y 390 px en `output/log-art-review/log-1440.png` y `log-390.png`; imagen cargada, arte del tamaño de la entrada y sin errores de consola.
- Pendiente: valoración estética del usuario antes de extender este tratamiento a nuevos tipos de registro con imágenes.

## 2026-09-22 — Impacto visual al perder Vida

- Un descenso confirmado de Vida dispara un destello cálido rojizo sobre el retrato, coordinado con la pérdida de bloques de la corona. La imagen no se remonta ni se mueve, y los controles quedan libres.
- El efecto se monta solo para una pérdida nueva; no se repite al cargar una escena, se cancela al curar, se reinicia ante otro golpe y se omite con movimiento reducido. Puede mostrarse en una ficha enemiga visible sin revelar su cifra de Vida.
- Prueba focal de componentes y render de Humo: 28/28. Build correcto. Capturas de impacto en escritorio y móvil en `output/token-damage-review/`; revisión de estado y consola sin errores. Pendiente de valoración estética del usuario.

### Simulador de revisión

- Vista aislada en `http://127.0.0.1:4214/?review=damage`, abierta en el navegador integrado. Permite repetir el golpe y elegir velocidad Normal (0,85 s), Lento (2,4 s) o Muy lento (5 s); la partida no cambia.
- Se comprobó la repetición, la Vida 8→6, la imagen y corona en escritorio y móvil de 390 px, sin desbordamiento ni errores de consola. Capturas en `output/token-damage-review/simulator-1440.png` y `simulator-390.png`.

## 2026-09-23 — Bomba explosiva

- Uso integrado: se selecciona dado y casilla de impacto sin alcance máximo; en ese momento se consume una bomba y el dado y se tiran una sola vez 2d8. La Presión compartida es `máx(0, dado + 2d8 − distancia a impacto)`. Después se elige una de cuatro orientaciones 2×2 que contienen el impacto.
- El área alcanza aliados, enemigos y lanzador; una criatura grande solapada resuelve una sola defensa y CD. Los tokens decorativos sin ficha de criatura no detienen la resolución. La cadena usa las defensas activas existentes y conserva tirada, Presión y costes entre objetivos, clientes y recargas.
- Se guarda el origen y la distancia del lanzamiento para que el selector siga mostrando los valores comprometidos. Un blanco retirado se salta sin interrumpir la cadena, incluso si su eliminación llega por snapshot remoto. Otra acción no sustituye una bomba pendiente en práctica.
- Verificación: 151 suites, 974 pruebas correctas (1 omitida), incluida la ruta completa multiobjetivo y la recuperación remota; build de producción correcto. Se ejecutó el cliente oficial de `develop-web-game` y se inspeccionó su captura, pero el navegador aislado solo alcanzó la pantalla inicial porque la escena requiere una sesión con acceso; queda una revisión manual de la secuencia visual en una partida real de máster y jugador.

## 2026-09-23 — Alcance legal de Arrojadiza

- La regla nueva sustituye el lanzamiento ilimitado de la entrada anterior: el dado de acción visible fija el alcance, el mayor si se comprometen varios; los enemigos usan su Base ofensiva. Una casilla fuera de alcance no puede confirmarse, no consume recursos ni dispara tiradas; la distancia sigue restando una vez de la Presión legal.
- La Bomba explosiva muestra en la plantilla y parábola la distancia frente al alcance, tiñe el lanzamiento inválido y valida otra vez los valores recientes dentro de la transacción. El alcance comprometido se conserva al orientar o reanudar la explosión.
- Los ataques con arma Arrojadiza muestran el alcance del dado elegido en Preparar ataque y bloquean su confirmación cuando no llega. Ajuste tampoco puede sustituir el dado por otro que deje el objetivo fuera de alcance.
- Verificación: 151 suites, 980 pruebas correctas y 1 omitida en ejecución secuencial; build de producción correcto. La primera ejecución paralela agotó el tiempo de una prueba ajena al cambio y la repetición secuencial pasó completa.


## 2026-09-23 — Bomba de brea
- Fuente leída: `C:/Users/Arcana/Downloads/documento_maestro_ttrpg_roguelite_v0_2_40.docx` (Bomba de brea, Bombas de zona sin Presión, Terreno difícil, Fuego e Inflamable). Se mantiene la regla más reciente del usuario para alcance enemigo = Base ofensiva.
- Definición tar-bomb; impacto legal, parábola existente y cuatro orientaciones 2×2; consumo transaccional de copia/dado y sincronización de aventura vinculada. Práctica sin crear combate.
- Terreno difícil cobra cada casilla atravesada de la ruta recta del Canvas, por huella completa y sin sumar manchas; integrado en previsualización PC, opciones móvil y validación del runtime; excepcional ignora recargo.
- Ignición ortogonal y expansión de ataques Fuego con Presión compartida, defensa independiente y deduplicación. Conserva Ajuste en blancos posteriores. Limpia brea al concluir cadena o combate; control del máster para Fuego sin Presión.
- TarGroundEffect: textura procedural Canvas2D compartida de 256px, reflejos viscosos lentos, pausa con documento oculto y movimiento reducido; no añade contextos WebGL ni modifica la visión del humo.
- Revisión aislada `output/tar-bomb-review`, puerto 4216. Flujo real de selección/colocación con confirmación simulada; runtime transaccional comprobado mediante pruebas. PC 1280 y móvil 390 sin errores de navegador. No se ha verificado en un móvil físico ni una partida real autenticada.

- Validación: batería completa 153 suites / 989 pruebas aprobadas / 1 omitida. Tras cerrar el caso de contraataque de Fuego y limpieza de cola, pruebas focalizadas: 5 suites / 36 pruebas aprobadas. Build final de producción aprobado, incluido el ajuste de cola. Oficial web_game_playwright_client ejecutado y capturas inspeccionadas en `output/tar-bomb-review/skill-final` y capturas PC/móvil.
- Contraataques Fuego: Excedente compartido sin otra tirada, excluye blanco ya resuelto y difiere su propagación si hay otra área resolviéndose; manchas incendiándose no se disparan repetidamente.

- Cierre: 33 pruebas de reglas/runtime/fin de combate aprobadas tras el último ajuste. Colocación táctil comprobada a 390px sin errores. Prueba visual disponible en http://127.0.0.1:4216/.

## 2026-09-23 — Retratos manchados de brea
- Overlay SVG ligero con salpicaduras y brillo viscoso, recortado al retrato y separado de borde/corona. Intensidad por proporción de huella cubierta; no se acumulan zonas superpuestas. Transición de entrada/salida y movimiento reducido. No cambia reglas ni añade estados persistentes. Simulador 4216 actualizado para entrar/salir.
- Validación del retrato: 19 pruebas relevantes aprobadas, build de producción correcto, capturas PC/móvil inspeccionadas. Entrada y salida táctil verificadas (opacidad 1 dentro / 0 fuera), sin errores en el simulador.

## 2026-09-23 — Brea orgánica en retratos grandes
- Sustituido SVG de gotas fijas por el material animado del suelo, compartiendo textura y bucle de dibujo; máscara procedural 512px con detalle fino, bordes suaves y menor cobertura en la cara. Conserva proporción de contacto y fundido al salir. Los retratos fuera de brea dejan de suscribirse a la animación.
- Simulador con tamaño ampliado, pruebas de entrada/salida táctil y capturas desktop/móvil; sin errores de navegador.
- Validación final: 19 pruebas relevantes aprobadas y build de producción correcto. Captura ampliada a 320px inspeccionada; entrada/salida táctil conserva opacidades 1/0. El aspecto no usa paths SVG ni siluetas fijas.

## Brea en todo el perímetro del retrato
- Corregido el corte heredado del borde cuadrado del charco: el retrato toma únicamente el interior opaco de la textura. Máscara radial alrededor de toda la circunferencia, independiente del tamaño; las fichas rectangulares usan su propio contorno. Conserva detalle, rostro visible y transición al salir.
- Validación: compilación del simulador correcta, captura ampliada inspeccionada, controles táctiles de entrada/salida correctos y sin errores de navegador; cliente oficial web-game ejecutado.

## Brea: recuperar reparto irregular
- El usuario rechaza la franja alrededor de toda la circunferencia. Restaurada la máscara de manchas irregular anterior, conservando el muestreo del interior opaco de la textura que elimina los cortes cuadrados. Sin cambios de reglas, recursos o interacción.


- Ignición de brea: presentación persistida de 5200 ms en todas las rutas de consumo (manual, ataque, explosión sin objetivos, contraataque y objetivo ausente). Canvas2D procedural compartiendo el reloj del evento; no añade daño ni terreno. Limpieza transaccional del máster y caducidad visual local. Corregida retirada accidental de brea en nextRound.
- Simulador en puerto 4216: botón Prender brea repetible, capturas ignition-flames/embers; revisión desktop, caducidad y replay sin errores. Tests de reglas/runtime y build en output/tar-ignition-*.log.


- 2026-09-24: Antídoto + Envenenado. Usuario confirmó aplicación ofensiva únicamente tras perder >=1 Vida. Documento: sin daño periódico, bloqueo de recuperación de Vida, no acumulable, fin de combate; Antídoto a uno mismo o Toque (misma casilla). No se implementa una regla de resurrección pendiente del documento.
- Reutilizado panel plegable de poción con selector de destinatario, recursos y copia transaccionales; persistencia de ambos activeRun cuando procede. Revalidación fresca y recibo idempotente. Venenosa disponible en modificadores, nativa vía aliases, aplicada en ataques/contraataques y registrada. Inspector admite status/statusEffects y retira ambos formatos.
- Efecto de retrato procedural verde compartido entre fichas; corregida acumulación alfa limpiando canvas entre fotogramas. Preview puerto4214 ?item=antidote&start=confirm; Playwright desktop1280 y mobile390: estado eliminado, Vida intacta, una copia consumida, sin errores JS. Arte del Antídoto en el preview leído de Forja (solo lectura); producción resuelve el arte del propio objeto.
- Tests de Antídoto: self/enemy, target linked runs, stale target/move/removal, transaction failure, duplicate confirm; veneno modificación HUD ambos bandos, daño cero/positivo, contraataque, rondas y fin. Logs output/antidote-*.log.

- Verificación final: 155 suites, 1012 pruebas aprobadas y 1 omitida; compilación de producción correcta. No se han desplegado cambios.


## Presteza y Vitalidad (2026-09-27)

- Implementadas con consumo transaccional y HUD de pociones, tanto para jugadores como enemigos (principal, Movimiento, Amenaza o Amenaza manual). Presteza +4 este turno y +1 base hasta final de combate; confirmado por el usuario que el +1 no se acumula. Vitalidad reemplaza su reserva por 2 bloques, absorbe antes que Vida normal, no se cura ni se acumula y persiste entre rondas hasta finalizar combate.
- Los bloques temporales tienen color dorado, revelado sincronizado con la pocion y fases separadas de perdida temporal/normal. Registro ilustrado distingue ambos recursos. Imagen precargada para observadores.
- El catalogo real tiene Presteza y el nombre antiguo "Balsamo de vitalidad menor"; reconocido tambien como Vitalidad sin modificar datos remotos.
- Validacion: 220 pruebas dirigidas en 16 suites, integracion de ataque y guardado comprobada; build de produccion correcto. Playwright en 1280 y 390 px para ambos consumibles, con arte real, sin errores. Vista local: puerto 4214, ?item=haste&start=confirm o ?item=vitality&start=confirm.
- No commit ni despliegue. Se preservan cambios previos del repositorio.

### Revisión visual de pociones y Vida temporal (2026-09-27)

- Unificada la fuente del +2 de la corona con los números de Vida. El inspector representa la misma reserva vidaTemporal con contador y segmentos dorados; mantiene independiente el máximo de Vida normal y actualiza consumo y retirada de la reserva.
- Sustituida la animación reutilizada de Antídoto para estos dos consumibles: Presteza adapta Air Field y Vitalidad adapta Magic Field de TokenMagic. GLSL atribuido y con licencia en src/vendor/tokenmagic/potionFields.js y THIRD_PARTY_NOTICES.md. Efectos transitorios de 3200 ms sobre el retrato, sin cargar imágenes, con movimiento reducido y contexto WebGL compartido.
- Validación: 57 pruebas en 5 suites, build de producción correcto, inspección de capturas desktop y móvil 390x844 para ambas pociones. Shader renderizado sin errores; tipografía del contador temporal comprobada en navegador. Evidencia y scripts en output/potion-fx-review. Vista con inspector: puerto 4214, ?item=vitality&start=confirm&zoom=3&inspector=1.
- Pendiente únicamente valoración estética del usuario. Sin commit ni despliegue.

### Estoque y competencias — 28/09/2026
- Revisada la definición remota weapons/Estoque: tenía Crítico, Destreza y Perforante, sin competencia ni Duelista. Actualizada solo esa entrada a v0.2.40 con precondición de updateTime; copia anterior y posterior en output/estoque-catalog-*.json. No se ha reactivado la entrada eliminada sheet-weapon-estoque.
- Confirmadas las competencias Simple y Marcial del Pícaro maestro. Corregida la falsa pérdida de rasgos cuando category contiene weapon/weapons en vez de una competencia; soporta nombres españoles e ingleses.
- Duelista visible en el selector individual mediante displayTraits, sin transferirlo a la otra mano ni a la resolución ofensiva. La sincronización Canvas refresca inventario y loadout con la Forja conservando recursos e identidades de copias.
- Validación: 69 pruebas en 6 suites, build de producción, cliente de develop-web-game e interacción selector → preparar → confirmar en 1280x900 y 390x844 sin errores de página. Perforante comprobado fuera y dentro de Duelo, con y sin Duelista; pérdida real de competencia respetada. Evidencias en output/estoque-review. Sin commit ni despliegue de código.

### Golpe sucio del Pícaro — 28/09/2026
- Implementado el gasto base de Astucia pendiente: Confirmar ataque tira y compromete dados; si hay Astucia y un dado original de arma Toque/Duelista/Arrojadiza, abre awaiting-cunning antes de defensa. Permite continuar gratis o pagar 1 una sola vez, repetir un dado y conservar original/nuevo en awaiting-cunning-choice. Respeta elegibilidad por mano, excluye acción/modificadores/furtivo y conserva/reemplaza únicamente la cadena crítica del dado elegido.
- Transacción de escena + activeRun, autoridad de control/reserva remota, bloqueo de doble clic, tirada estable al reintentar y decisión guardada compartida. APIs y ventana defensiva bloqueadas hasta decidir. Brea prendida por un ataque espera la decisión para fijar la Presión compartida definitiva.
- Ventana reutiliza arte fundido y composición del combate aprobado. Dados de Astucia en verde azulado, comparación con Presión final por opción, coste y registro explícitos. No implementa generación de Astucia, Furtivo ni habilidades de niveles posteriores.
- Vista aislada: http://127.0.0.1:4222/?mode=cunning&start=confirm . Elegir d6, confirmar, repetir y elegir resultado. Capturas y prueba completa desktop/móvil en output/cunning-review.
- Validación: 146 pruebas dirigidas en 11 suites; cobertura de gasto, rechazo por reserva/control/dado inválidos, defensa bloqueada, Astucia cero, no gastar, conservar original, críticos, doble clic y reintento de transacción con guardado atómico de aventura. Revisión visual final 1280x900 y 390x844 sin errores de página, con fundido continuo, botones legibles y comparación de Presión. Código local, sin commit ni despliegue.
- Compilación de producción completada correctamente (`output/status-build.log`). Cambios locales, sin despliegue.
- Verificado: 21 pruebas / 3 suites correctas (recursos, buffs y confirmación del escenario). Playwright ratón y móvil táctil: 2→1→0 reflejado en inspector y token, Vida normal intacta, sin errores JS; captura móvil inspeccionada. Cliente develop-web-game ejecutado.

## Alineación sobre el marco rectangular (2026-09-28)
- Solicitud: estados centrados en el borde izquierdo como Compartido; Vida inferior alineada igual que Postura superior. Anclajes a 3 unidades fuera del token, centro del trazo de selección. Sigue los bordes girados manteniendo iconos derechos. Diseño circular conservado.
- 31 pruebas / 3 suites pasan, incluida la prueba de coronas antes obsoleta ahora actualizada al nuevo anclaje. Revisión visual PC/móvil, 0.25, 2x2, rotación y múltiples estados; cliente develop-web-game ejecutado y capturas inspeccionadas. Sin cambios de reglas.

## Corrección y retirada de Vida temporal (2026-09-28)
- Nueva petición sustituye la restricción previa del inspector: los bloques vacíos ahora permiten restaurar manualmente hasta el bloque pulsado; «Retirar extra» elimina stats.vidaTemporal y sus huecos. Mantiene Vida normal y reglas de curación automática. Respeta el guardado existente mediante Confirmar cambios.
- 72 pruebas / 4 suites correctas, incluyendo curación automática. Playwright PC y móvil: gastar 2→1→0, restaurar 2, retirar reserva y comprobar desaparición; sin errores JS. Captura móvil inspeccionada y cliente develop-web-game ejecutado.

## Vida temporal: edición discreta (2026-09-28)
- Usuario rechaza la fila de ayuda y el botón Retirar extra. Eliminados. La cifra dorada +N existente pasa a ser el acceso para retirar la reserva, con tooltip y nombre accesible; los segmentos conservan gastar/restaurar. Sin nuevos elementos visibles.
- 8 pruebas del inspector pasan. Revisión Playwright ratón y táctil conserva gastar/restaurar/retirar; cliente develop-web-game ejecutado.

## Vendaje y Sangrado (2026-09-28)
- Fuente: documento_maestro_ttrpg_roguelite_v0_2_40.docx, párrafos 423–430, 868 y 1764–1765; artículo Vendaje y su imagen de Forja comprobados mediante lectura del catálogo, sin escrituras remotas.
- Vendaje integrado en HUD y flujo de consumibles: un dado sin importar el resultado, objetivo propio o criatura a Toque, consumo de una unidad, eliminación exclusiva de Sangrado, aventura enlazada y registro atómicos/idempotentes. Enemigos usan el sistema de pagos de consumibles existente. Imagen precargada y animación de entrega con tonos de lino.
- Sangrado obliga a elegir al comienzo de la activación entre 1 Vida (temporal primero) y renunciar al Movimiento básico. Correr sigue permitido; quitar Sangrado después de elegir no devuelve ese Movimiento. No acumula; una aplicación durante la propia activación espera a la siguiente. Se elimina al terminar combate. El inspector permite aplicación/retirada; armas y modificadores Sangrado requieren daño real de Vida y respetan la supresión de rasgos. El distintivo espera a su fase del resultado. Se desactiva para perfiles Canvas el antiguo daño por gastar Velocidad del sistema de rol.
- Elección protegida por transacción y clave de activación, control de ficha, revisión de aventura y rechazo de acuses antiguos; guarda movimiento/vida y registro juntos. Ataques, consumibles, Correr, movimiento y fin de activación esperan la elección pendiente.
- Verificación final: 177 suites completas correctas, 1217 pruebas pasan y 1 omitida; compilación de producción correcta. Playwright escritorio 1280×900 y móvil 390×844: elección, panel ilustrado, pago, consumo único, retirada del estado y Vida intacta; sin errores JS. Capturas revisadas en output/bandage-review, cliente develop-web-game ejecutado. Prueba aislada disponible en http://127.0.0.1:4230/?item=bandage&zoom=3. No se ha desplegado ni modificado una partida real.

## Efecto de Sangrado y cura de Vendaje (2026-09-28)
- Petición: un estado visual reconocible sobre el token como Envenenado y una cura de Vendaje comparable a Presteza/Vitalidad. Añadido TokenBleedingEffect: manchas y regueros carmesí animados, textura Canvas compartida a 24 fps, círculo o máscara alfa fija de la figura; pausa con pestaña oculta, fotograma estático con movimiento reducido y limpieza al retirar estado. Respeta isPresentedBleeding para no anticipar la fase del ataque.
- Vendaje usa modo propio del shader de campos existente: bandas luminosas entrelazadas color lino, barrido y cierre; sin botella ni imagen descargada en la animación. Mantiene la conexión entre criaturas cuando el origen es visible. El reloj del evento llega también al efecto de Sangrado: empieza a retirarlo a los 1050 ms y termina con fundido. Reaplicar interrumpe correctamente la retirada.
- 100 pruebas / 7 suites pasan: reloj y no repetición de la cura, eliminación/recuperación del estado visual, máscaras, transferencia visible y consumo. Producción compila. Playwright confirma shader real ready, limpieza, reaplicación y ausencia de errores en círculo 2×2, figura 2×2 y móvil; consumo real revisado de nuevo en escritorio/móvil. Capturas inspeccionadas en output/bleeding-fx-review. Cliente develop-web-game ejecutado e inspeccionado.
- Revisión repetible: http://127.0.0.1:4230/?item=bandage&combat=off&selected=0&review=bleeding&zoom=4 ; añadir cutout=1 para figura transparente. Botones Aplicar Sangrado / Ver Vendaje exclusivos de la maqueta. Pendiente únicamente de valoración estética del usuario, sin cambios en reglas ni despliegue.
