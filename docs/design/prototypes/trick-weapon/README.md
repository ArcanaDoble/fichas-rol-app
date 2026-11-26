# Armas con Truco · referencia aprobada

Maqueta aprobada inicialmente el 29 de octubre de 2026. El usuario aplaza después
el acceso directo del Canvas: el flujo activo es **Equipables → flechas → Guardar cambios**.
La maqueta de esta carpeta sigue aislada: no conecta con Firebase ni modifica personajes.
La aplicación utiliza `trickForms` para los dos perfiles y `activeFormId` por copia.
En la Forja, escribir **Truco** en Rasgos habilita las pestañas y ambas cartas; cada
forma tiene arte propio. El inspector del Canvas muestra la forma guardada desde
Equipables. La acción **Acciones → Truco** y su pago de dados, presentes en esta
maqueta histórica, están desconectados de la aplicación y pendientes para el futuro.
No se ha publicado ni modificado automáticamente ningún arma del catálogo del usuario.

## Petición y perfiles aportados

El usuario quiere introducir el Bastón enroscado como una sola arma legendaria
que cambia entre estoque y látigo. La palabra de poder **Truco** habilitaría
la configuración de una segunda forma y su segunda previsualización en la forja.
Cada forma debe tener su imagen y sus atributos configurables.

| Forma | Daño | Alcance | Manos | Ataque | Rasgos |
| --- | --- | --- | --- | --- | --- |
| Estoque | 1d12 | Cercano | Una | 1 DA | Perforante, Torso, Crítico |
| Látigo | 2d4 | Intermedio | Una | 1 DA | Crítico, Sangrado, Barrido, Sin guardia |

Transformar cuesta un dado de acción, ignorando su valor. No se han alterado
estos perfiles ni propuesto cambios de equilibrio.

## Dirección visual propuesta

- Forja en PC: ambas cartas ilustradas una bajo otra a la izquierda; etiqueta
  de cada forma y nexo discreto «Transformar · 1 DA». A la derecha, nombre y
  rareza comunes, Truco y pestañas para editar cada forma sin duplicar todos
  los formularios. Arte, daño, alcance, empuñadura, coste, competencia y rasgos
  pertenecen al perfil elegido.
- Forja en móvil: reutilizar el patrón Editar/Ver carta como «Datos del arma»
  y «Ver las dos formas». Las dos previsualizaciones están disponibles y el
  formulario cambia con la pestaña Estoque/Látigo.
- Ficha: una copia física y una carta de equipo con su forma activa. Botón
  explícito para preparar la otra forma, sin un segundo objeto equipable.
- Canvas: acción contextual «Transformar en látigo · 1 DA». Se despliega una
  elección de dado; confirmar cambia el perfil y consume el dado elegido.
  Cancelar conserva forma y recursos. La maqueta muestra el contenido propuesto,
  no un rediseño del selector de armas o de los modificadores protegidos del HUD.

Se conserva la dirección de NOMA: ilustraciones, fundidos, serif, superficie
azul noche, oro e indicación de rareza. La imagen de estoque es provisional,
tomada de `/armas/estoque.webp`; la del látigo procede del archivo local del usuario
`Baston_enroscado_Bloodborne_latigo.png`. No son dos ilustraciones finales aprobadas.

## Reglas de integración propuestas

Estas decisiones se presentan para revisión, no como reglas ya incorporadas:

1. La forma preparada se elige libremente fuera de combate. Con combate activo,
   tanto la ficha como el Canvas deben pasar por el mismo pago; abrir la ficha
   no puede eludirlo.
2. Transformar en combate requiere controlar la ficha, estar en su activación,
   tener el arma equipada y disponer de un recurso de acción válido. Bloquearlo
   durante un intercambio pendiente; no transforma como reacción defensiva.
3. Para PJ, gastar un DA disponible, a elección del jugador. Para PNJ que reciban
   estas armas, proponer acción principal o un recurso de Amenaza válido. No
   reutilizar la defensa o el movimiento básicos como pago de ataque.
4. Cambiar la forma no finaliza el turno, no renueva recursos y no revierte la
   forma al terminar la ronda. La elección se conserva al reconectar y guardar.
5. Ataque, alcance, selección de objetivo, dual, parry y contraparry consultan
   únicamente los atributos de la forma activa. Las propiedades de ambas formas
   no se unen. Con la interpretación propuesta de Sin guardia, el látigo no
   aparece como arma de parry, pero otra arma o escudo válidos siguen disponibles.
6. Si una forma exige otra empuñadura, comprobar que la otra mano esté libre.
   Nunca desequipar ni borrar silenciosamente el objeto que la ocupa.

## Modelo y puntos de código

Una definición de catálogo con dos perfiles de forma e identificadores estables.
La copia poseída guarda un `activeFormId` independiente del catálogo. El nombre
común, rareza y valor se comparten; la representación efectiva resuelve el perfil
activo conservando `instanceId` y `templateId`. Una forma no es otra copia ni
permite equipar el mismo objeto en dos conjuntos.

- `src/features/roguelite/catalogItem.js`: normalizar y guardar perfiles anidados
  con compatibilidad para armas actuales de una sola forma. Truco se reconoce
  explícitamente en los rasgos, sin inferirlo del nombre del objeto. Si se retira
  el rasgo, no destruir sin aviso los datos de la segunda forma.
- `src/components/RogueliteForge.jsx` y `admin/RogueliteCatalogFields.jsx`: editor
  por forma, previsualizaciones e imágenes independientes. La entrada actual en
  `equipment_images` se identifica por nombre; no debe forzar la misma imagen
  sobre las dos formas. Preferir imagen propia del perfil resuelto.
- `equipmentPool.js`, `campaignEquipment.js` y `LoadoutView.jsx`: mantener una
  instancia física al equipar, cambiar conjunto o forma y reconciliar inventario.
- `src/utils/forgeEquipmentSync.js`: preservar la elección de forma de cada
  copia al refrescar el catálogo. La lista actual de identidad no incluye ese
  estado; un refresco no debe restaurar una forma predeterminada.
- `rogueliteTokenSheetSync.js`, `campaignSystem.js`, `campaignPersistence.js`:
  resolver y persistir la forma en inventario y equipo, sin que una sincronización
  con la ficha sustituya la elección por un dato anterior.
- Combate: añadir una operación transaccional de transformación con comprobación
  de turno, control, recurso y forma vigentes. Consumo y cambio se confirman juntos;
  un recibo/id de operación evita doble pago por reintento o doble pulsación.
  La selección de ataque guarda la forma y los atributos comprometidos; rechazar
  un borrador que use una forma anterior a la vigente.
- `campaignAttackRules.js`: añadir la exclusión explícita de Sin guardia en
  `getCampaignParryOptions`. Actualmente esa función acepta armas cuerpo a cuerpo
  sin excluir ese rasgo. Aplicar el perfil activo antes de calcular armas legales
  de defensa y respuesta.

## Comprobación de la maqueta

Ejecutar con el servidor local de archivos del proyecto:

```powershell
node output/playwright/serve-reinforcement-preview.cjs
npx.cmd --yes --package @playwright/cli playwright-cli -s=trick-weapon open http://127.0.0.1:4173/docs/design/prototypes/trick-weapon/index.html --browser chrome
npx.cmd --yes --package @playwright/cli playwright-cli -s=trick-weapon run-code --filename=docs/design/prototypes/trick-weapon/check-preview.cjs
```

La comprobación ejercita formularios independientes y previsualización, gasto
del dado seleccionado, agotamiento, sustitución de rasgos y defensa, misma forma
entre las vistas del ejemplo y ausencia de desbordamiento a 390 px. Sin errores
de JavaScript. No prueba la integración real, permisos, persistencia ni Firebase.

- [Forja PC](forge-desktop.png)
- [Forja móvil, edición](forge-mobile-editor.png)
- [Forja móvil, dos cartas](forge-mobile-previews.png)
- [Canvas PC, después de cambiar](canvas-desktop.png)
- [Canvas móvil, elegir dado](canvas-mobile-choice.png)
- [Canvas móvil, después de cambiar](canvas-mobile.png)

Antes de considerar lista una implementación real, verificar copias independientes,
guardado/recarga, refrescos de catálogo, control de PNJ, costes atómicos sin doble
gasto, bloqueos por turno/intercambio y legalidad de alcance/defensa/dual.
