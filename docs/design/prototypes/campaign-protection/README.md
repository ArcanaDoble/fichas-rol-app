# Campaña: protección principal y refuerzo

Implementación local autorizada el 28 de octubre de 2026 a partir de la
[maqueta valorada por el usuario](../../references/campaign-protection-reinforcement-approved.png).

## Uso

En el personaje de Campaña, abrir **Equipo → Equipables → Cuerpo** y pulsar
**Equipar refuerzo**. El selector ofrece únicamente piezas poseídas en el
inventario que tengan la palabra **Refuerzo** en sus rasgos o etiquetas, sin
importar mayúsculas. El nombre y las zonas corporales no determinan la ranura.
Las armaduras sin ese rasgo se eligen en la carta principal.

Los guardabrazos y otras piezas parciales siguen perteneciendo al catálogo
**Armaduras**. También se admiten objetos antiguos de **Accesorios** que
incluyan las etiquetas **Armadura** y **Refuerzo**; equipar su copia
en refuerzo libera su antigua ranura de accesorio. No se crea ninguna colección
ni categoría de inventario nueva.

Se conserva `equippedItems.reinforcement` junto a `body`. Las copias físicas,
la eliminación, el guardado y los cambios de conjunto respetan esa identidad.
La aportación física está limitada a +1 RD; la cabecera suma las dos piezas.
Un valor desconocido se muestra como «—» y no se importa una CD del roguelite.
Los accesorios antiguos pueden conservar su RD explícita en el texto de efecto.

Al modificar la protección se aplica la diferencia conocida a la RD de la ficha,
conservando las aportaciones manuales previas. Sin RD manual, se deriva del equipo.
Los cambios se guardan con el guardado habitual de la ficha. El Canvas reconoce
la copia como armadura equipada y usa el total de protección cuando no hay una
RD manual que lo sustituya.

## Presentación

- Escritorio: carta principal de aproximadamente 75 % y refuerzo de 25 %,
  de igual altura y con ilustración fundida.
- Columna de 520 px o menos: refuerzo unido al borde inferior del atuendo,
  sin hueco, con separador fino y banda de unos 70 px. Ambas piezas mantienen
  sus controles independientes. Vacío, muestra solo «Sin refuerzo» y «Equipar».
- Botones nativos, retirada con área táctil existente y selección operable con
  teclado; Escape cierra el selector. No se cambia el HUD Combat.
- Solo las fichas de Campaña muestran esta ranura; el equipo del roguelite
  conserva su disposición anterior.

## Comprobaciones locales

`npm.cmd test -- --watchAll=false --runInBand`: **231 suites correctas;
1.621 pruebas correctas y una omitida**. Incluye nuevas regresiones de
clasificación, copias, traslado desde accesorios, equipar/quitar, cambio de
conjunto, reconciliación con el inventario, RD y sincronización al Canvas.

Comprobación en Chrome mediante el componente de producción `LoadoutView`,
con un inventario local y adaptadores sin conexión a la base de datos:

- [Escritorio, 1440 px](reinforcement-desktop.png).
- [Móvil, 390 px](reinforcement-mobile.png).
- [Móvil con la ranura vacía](reinforcement-mobile-empty.png): solo «Sin refuerzo»
  y «Equipar», sin etiqueta repetida ni icono.
- Sin desbordamiento horizontal a 390 px; la carta principal mide 326 × 160 px
  y la franja del refuerzo aproximadamente 326 × 70 px.

Tras aplicar el ajuste móvil aprobado, las 21 pruebas existentes de
`LoadoutViewRogueliteInventory.test.jsx` pasan. Se comprobó la selección desde
el hueco vacío, la RD centrada, la unión sin separación y el mantenimiento de
las dos columnas de 160 px de alto en escritorio.

El fixture y su servidor están en `output/playwright/reinforcement-preview.*`.
Sus datos e imágenes ilustrativas no se añaden a ningún personaje real.
La aplicación real de desarrollo se sirve en **http://localhost:3000**.
No se ha publicado este cambio.
