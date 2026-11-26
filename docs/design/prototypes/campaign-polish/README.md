# Campaña: previa interactiva del acabado

**Actualización posterior — objetivo táctil y alcance:** corregida y publicada la pérdida de objetivo tras el evento de ratón compatible con un toque. La prueba reproduce el fallo anterior con el controlador de tokens, runtime de combate y HUD reales; verifica ambos roles, la preparación del arma y la exclusión de un objetivo realmente lejano. La corrección consume el evento en el token antes de deduplicarlo, conservando las reglas de alcance y la presentación protegida del HUD. Pasan tres regresiones nuevas y la suite completa: 220 suites, 1540 pruebas correctas y una omitida. Compilación correcta, previas recompiladas y manifiesto remoto coincidente con `main.2d0377fb.js` y `main.b2355d8a.css`, ambos HTTP 200. La comprobación de este ajuste se realizó mediante React DOM y pruebas del flujo; no se afirma una nueva prueba manual en un dispositivo móvil. [Registro actualizado](release.json).

**Actualización posterior — arrastre de muros:** publicada la corrección del retorno al origen al mover la línea completa. Tanto esta previa como `campaign-canvas-preview.html` se recompilan con el controlador corregido. Se reproducía el fallo al guardar la caja del muro sin el delta de sus extremos; las pruebas usan los controladores reales y la misma combinación de cambios del guardado. Pasan siete regresiones nuevas y la suite completa: 219 suites, 1537 pruebas correctas y una omitida. Compilación correcta; el manifiesto remoto coincide con `main.307b9419.js` y `main.b2355d8a.css`, ambos HTTP 200. No se ha realizado una nueva comprobación visual en navegador por el bloqueo de acceso indicado para la entrega anterior. [Registro actualizado](release.json).

## Corrección tras probar la web: Amenaza y zonas reveladas

El mismo acceso directo se aplica después al perfil inicial del inspector y la ficha de PNJ de Campaña, por petición del usuario al detectar allí el desplegable anterior. `CampaignThreatTray.css` se carga desde el propio componente para que estas pantallas compartan su presentación sin depender de la ventana de combate. La fórmula inicial no dice «al confirmar»: conserva la aplicación al siguiente combate y la recuperación por ronda. Las pruebas verifican guardado de copias, compatibilidad con `threatDie`, vaciado y exclusión del editor en la vista de jugador. La inspección visual automática de este último ajuste quedó impedida por un rechazo de acceso del navegador; no se afirma haber obtenido nuevas capturas de esos dos editores.

Se retira el desplegable nativo rechazado por el usuario. `CampaignThreatTray` muestra los seis poliedros en una fila directa, tomando el patrón del [Dice Roller de Roll20](https://help.roll20.net/hc/en-us/articles/360039674933-Dice-Roller), con el arte y colores existentes de NOMA. Cada clic añade un dado del grado; los contadores admiten varias copias, el botón inferior retira una y «Vaciar» limpia la selección. No se tiran antes de confirmar ni se conceden dados puntuales gratuitos a jugadores delegados. Preparación, defensa, inspector y ficha de PNJ usan el mismo componente. El selector protegido del HUD conserva sus controles.

El resultado usa las mismas lanzas y proporciones de la selección: rojo para el atacante, azul para el parry y división bicolor si ambos coinciden. Centro usa núcleo rojo con contorno azul. Se reflejan todas las zonas en ataques duales y parries de dos zonas; las evasiones no reciben un falso marcador de parry. El resultado se ofrece por igual a máster y jugador sin incluir valores reservados. Las acciones del panel permanecen fijas al pie mientras se recorre contenido.

Capturas del Canvas real con datos locales: [Amenaza en preparación móvil](evidence/threat-tray-mobile.png), [Amenaza defensiva en PC](evidence/threat-tray-defense-desktop.png), [parry fallado en móvil](evidence/reveal-missed-mobile.png), [parry fallado en PC](evidence/reveal-missed-desktop.png), [parry acertado del jugador](evidence/reveal-matched-player-desktop.png). La previa importa directamente los componentes de producción.

Estado a 20/10/2026: **integración y despliegue autorizados por el usuario**. El acabado pasa al Canvas real para su prueba en la web. La implementación canónica está en `src/features/canvas/components/CampaignCombatOverlay.jsx`, `CampaignCombatControls.jsx` y `CampaignCombatOverlay.css`. Los archivos de esta carpeta reexportan esa implementación. La previa también la importa directamente; el build ya no redirige el overlay a una copia candidata. Las capturas conservan la evidencia de revisión previa.

**Publicación actualizada con Amenaza inicial:** [NOMA](https://base-de-datos-noma.web.app). `firebase deploy --only hosting --project base-de-datos-noma --non-interactive` terminó correctamente. Se verificaron HTTP 200 para el sitio y sus archivos, la coincidencia del manifiesto remoto con el JavaScript `main.546f329f.js` y el CSS `main.b2355d8a.css`, la compilación de producción y 218 suites correctas (1530 pruebas correctas y una omitida). Las nuevas pruebas comprueban el perfil inicial del inspector y de la ficha, incluidas copias, grados, vaciado y permisos; las anteriores siguen cubriendo preparación, defensa y revelación. Las capturas y las comprobaciones visuales de 1280 × 800, 390 × 844, 319 × 671 y 844 × 390 corresponden a la entrega anterior de Amenaza puntual y revelación. No se han obtenido capturas nuevas del editor inicial por el bloqueo de acceso del navegador indicado arriba. [Registro de publicación](release.json).

## Ajustes funcionales posteriores: valores reservados y Amenaza

Los ajustes funcionales del usuario se aplican al motor integrado y a la misma interfaz que utiliza la previa. Su incorporación visual queda autorizada por la petición de despliegue registrada arriba. La previa permite alternar «Ver como jugador/máster» y activar «Reserva múltiple»; cambiar de muestra reinicia los datos ilustrativos. En defensa, el jugador controla al objetivo (también si es un PNJ); en preparación y ataque controla al atacante. Un controlador de máster local representa al rival en la demostración, usando el mismo motor, sin atribuir esos permisos a la interfaz de jugador.

- El máster ve todos los valores. Cada jugador ve los recursos propios o de sus PNJ controlados. El bando no concede acceso a los valores del rival. Se proyectan los recursos y el ataque para la vista, y se retiran desgloses del rival del resultado, ronda, inspector y registro de jugadores.
- Evasión permite comprometer un intento con cualquier valor disponible. La comparación con la acción se hace al resolver; si falla, se gasta el recurso, se recibe el golpe y no se mueve la ficha. El botón y los errores previos no revelan el umbral.
- La ficha de PNJ guarda un perfil inicial con varias copias y grados de Amenaza. El inspector permite configurarlo para el siguiente combate. Se tira y recupera al abrir cada ronda, como la reserva del roguelite. Los encuentros antiguos con una sola reserva siguen siendo compatibles.
- El máster puede seleccionar Amenaza puntual con `CampaignThreatTray`, repetir grados mediante acceso directo y añadirla al ataque o defensa. Se tira al confirmar y no consume una reserva que no haya seleccionado. No se fija un límite de cantidad. Los jugadores delegados consumen sus reservas, pero no crean dados puntuales libres. El anterior desplegable con `EnemyThreatDice` fue rechazado tras probar la web.

**Límite de esta separación:** `firestore.rules` permite lectura/escritura sin autenticación individual y la escena compartida conserva valores para resolver. Esto evita spoilers en las superficies normales, pero no es una protección frente a herramientas de desarrollo o consultas directas. La confidencialidad de datos exige autenticación, permisos y separación de estado por usuario; no se ha modificado ese sistema en esta petición.

Comprobado con la suite completa (`216` suites, `1515` pruebas correctas y `1` omitida) y compilación de producción. Las pruebas nuevas cubren control delegado, ataques entre aliados, datos proyectados, registro del jugador, evasión fallida sin aviso previo, varias copias/grados, gasto/devolución/renovación y Amenaza puntual del máster. Evidencia adicional: [jugador en móvil](evidence/privacy-player-mobile.png), [resultado sin cifras del rival](evidence/privacy-evasion-result.png), [máster en PC](evidence/privacy-master-desktop.png), [reserva múltiple](evidence/threat-multiple-master.png).

La propuesta extiende la identidad existente de NOMA. Sus autoridades son [DESIGN.md](../../../../DESIGN.md), [PRODUCT.md](../../../../PRODUCT.md), el [selector de conjuros aprobado](../../references/spell-target-selector-approved.png) y el [panel ilustrado de consumibles](../../references/consumable-panel-spell-reference.png). Se comparó con sus superficies azul noche, bordes dorados finos, ilustración fundida, dados y confirmación. Las lanzas proceden de la referencia de [Kingdom Come 1 confirmada](../../references/kcd1-combat-rose-tutorial-detail.png).

## Recorrer la previa

Con el servidor local del repositorio en el puerto 4173, abrir [la escena interactiva](http://127.0.0.1:4173/output/playwright/campaign-polish-preview.html?stage=aim&token=portrait). La barra «Previa · sin aplicar» permite alternar Preparar, Ataque, Parry y Evasión, así como Retrato y Silueta. Cambiar de muestra o recargar restablece los datos ilustrativos.

Desde la raíz del repositorio, reconstruir tras una edición con:

```powershell
node output/playwright/build-campaign-polish.cjs
```

El script usa la instalación de esbuild existente en la caché de npm. Si falta, su propio diagnóstico indica cómo prepararla. La página necesita el servidor estático que sirve la raíz del proyecto, las hojas de estilo del harness y los recursos del repositorio.

Seleccionar la lanza sobre el token cambia la zona; «Fijar ataque» confirma. Flechas y 5 eligen las cinco zonas de combate. La defensa permite Parry o Evasión; la rosa de evasión muestra destinos reales de una casilla y su huella sobre el mapa. Flechas, teclado numérico y Home/PageUp/End/PageDown permiten recorrerlos. Un destino bloqueado se puede enfocar para identificarlo y conserva su bloqueo al confirmar.

## Qué se está evaluando

El usuario objetó el menú intermedio integrado, su miniatura rectangular de espada y sus iconos decorativos de escudo, espada y mirilla; pidió acercarlo a los controles del roguelite. También rechazó los ocho botones voluminosos de evasión, pidió el dado habitual para la acción básica de valor fijo 5 y señaló que el clic sobre partes de una lanza a veces elegía Centro. Solicitó sombras oscuras, especialmente sobre siluetas, y uso cómodo en PC y móvil.

| Elemento del candidato | Relación con el acabado existente |
| --- | --- |
| Panel inferior | Azul noche (`#0b1120`), borde dorado fino y radio de 16 px en PC; toma como autoridad el lenguaje de `AreaPlacementOverlay` y del selector aprobado. |
| Arma | Ilustración grande fundida hacia el panel y el texto, siguiendo el panel de consumibles; se retira la miniatura rectangular. |
| Tipografía | Cinzel para títulos y botones, Alegreya para prosa y cifras, Lato para metadatos; fuentes comprobadas en navegador. |
| Confirmación | Conserva el botón dorado con la esquina recortada del menú de preparación. |
| Recurso de PNJ | Reutiliza `ActionDieButton` y su SVG habitual, muestra el valor fijo y la leyenda «Valor fijo»; no rotula ese recurso como una tirada d6. |
| Ataque y parry | Conservan las cinco zonas lógicas y el oro/rojo aprobados. Las dos lanzas inferiores eligen Abajo. |
| Evasión | Ocho lanzas representan destinos de movimiento. Muros y actores bloquean destinos mediante los validadores del juego; no se crean zonas de impacto nuevas. |
| Lectura sobre token | Sombra oscura bajo las lanzas; foco de teclado marfil independiente de la dirección seleccionada en rojo. |
| Adaptación | En móvil aumenta la rosa y usa un centro táctil de 44 px. En horizontal bajo, el panel pasa a un lateral y mantiene la confirmación accesible. |

Las regiones de entrada integradas son sectores polares sin solapamientos. Centro mide 24 px en PC y 44 px con puntero táctil; la rosa pasa de escala 0,95 a 1,25 para que los talones visibles de las lanzas queden fuera de Centro. Estas medidas son específicas de este selector de combate.

## Fidelidad al flujo real y límites

[CampaignCombatOverlay.jsx](CampaignCombatOverlay.jsx), [DirectionalControls.jsx](DirectionalControls.jsx) y [CampaignPolish.css](CampaignPolish.css) son la implementación React del candidato. El overlay acepta los mismos props que el de producción. Importa `CanvasAttackPreparation`, `ActionDieButton`, el anclaje/foco existente y los validadores reales de recursos, zonas, parry y evasión.

El [harness](../../../../output/playwright/campaign-polish-preview.jsx) monta `TacticalSectionCore`, `CanvasWorkspaceShell` y `useCanvasFeatureController`. El [build](../../../../output/playwright/build-campaign-polish.cjs) importa la presentación de producción directamente. El motor y las reglas de Campaña se ejecutan como en el juego. La escena usa [Firestore en memoria](../../../../output/playwright/campaign-polish-firestore.js) y un [adaptador inerte de Storage](../../../../output/playwright/tree-preview-storage.js), por lo que las operaciones de prueba permanecen locales. Estos adaptadores y la barra de muestras no forman parte de la compilación publicada.

La previa y la aplicación comparten los componentes y estilos de producción. El selector de armas del HUD Combat y sus modificadores están protegidos. La solicitud posterior autoriza publicar mediante Firebase Hosting; el despliegue no modifica las reglas de Firestore ni utiliza los datos de la demostración. No se crea un commit.

## Comprobaciones realizadas

- El candidato compila y se recorrió sin errores de navegador. Las fuentes cargaron y las comprobaciones de Cinzel y Lato dieron resultado positivo.
- Se verificaron 25 puntos de punta, centro, talón y bordes de las lanzas en PC, y los mismos 25 en móvil: cada punto correspondió al área de selección prevista. Centro táctil medido en 44 px.
- Selección mediante flechas, huella del destino en coordenadas del mapa y bloqueo por muro se comprobaron usando el runtime real con la escena en memoria.
- Una ronda completa recorrió Fijar ataque en Derecha → defensa con d10 de valor 7 y Parry en Derecha → «Golpe detenido». La Vida de Yerma se conservó en 53 → 53.
- Se capturaron PC, móvil, silueta, PNJ en evasión, preparación, horizontal bajo y móvil de 319 px. En horizontal 844 × 390, la confirmación terminó a 367 px dentro del panel de 378 px y su contenido midió 345 px sin desbordamiento vertical.
- Se corrigieron en un único lote la carga de fuentes y el foco de evasión señalados por la revisión independiente; se recapturó la evidencia. El mismo revisor dio ambas correcciones por resueltas y dejó la previa lista para revisión del usuario.
- El detector se ejecutó una vez y devolvió `[]` en `output/playwright/campaign-polish-detect.json`. Esta tarea de prototipo no ejecutó la batería completa `npm test`; no hay commit.

La revisión técnica y el pase de esas dos correcciones no constituyeron por sí solos aprobación del usuario. La autorización posterior para integrar y desplegar se registra al principio de este documento.

## Evidencia de la versión revisada

| Vista | Captura |
| --- | --- |
| Ataque, PC 1280 × 800 | [attack-desktop.png](evidence/attack-desktop.png) |
| Ataque, móvil 390 × 844 | [attack-mobile.png](evidence/attack-mobile.png) |
| Silueta, móvil 390 × 844 | [silhouette-mobile.png](evidence/silhouette-mobile.png) |
| Evasión de PNJ, PC 1280 × 800 | [npc-evasion-desktop.png](evidence/npc-evasion-desktop.png) |
| Evasión de PNJ, móvil 390 × 844 | [npc-evasion-mobile.png](evidence/npc-evasion-mobile.png) |
| Preparación, móvil 390 × 844 | [preparation-mobile.png](evidence/preparation-mobile.png) |
| Horizontal 844 × 390 | [landscape.png](evidence/landscape.png) |
| Móvil estrecho 319 × 671 | [small-mobile.png](evidence/small-mobile.png) |
| Foco de evasión inicial | [evasion-focus-initial.png](evidence/evasion-focus-initial.png) |
| Foco sobre dirección bloqueada | [evasion-focus-blocked.png](evidence/evasion-focus-blocked.png) |

`evidence/evasion-mobile.png` es una captura anterior conservada como historial; las vistas finales de evasión son las dos `npc-evasion-*` de la tabla.

## Procedencia de los recursos

La espada usa `public/armas/espada_de_acero.webp`; los retratos usan `public/yerma/Yerma.webp` y `public/yerma/Taiga.webp`. La silueta de prueba `output/playwright/campaign-polish-assets/giant-overhead.png` es una copia sin cambios del archivo del usuario `Gigante_no_muerto_hacha_cenital.png`. No se generaron imágenes nuevas.

La ausencia preexistente de `.impeccable/design.json` se deja registrada como deriva de documentación; esta tarea no migra el sistema visual ni repara sus artefactos auxiliares.
