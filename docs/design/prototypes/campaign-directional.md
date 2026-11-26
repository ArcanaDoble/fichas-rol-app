# Campaña: selección de zonas sobre el token

Iniciado como ensayo el 19 de octubre de 2026 e integrado en el flujo real del
Canvas el 20 de octubre, por petición expresa del usuario. El acabado anterior
de placas y chevrones fue rechazado. El usuario confirmó la captura real del
tutorial de Kingdom Come: Deliverance 1 y la estrella fina sobre el token,
conservando los menús del roguelite y la comodidad en PC/móvil.

La estrella tiene cinco puntas de lanza finas, oro biselado, dirección roja y
punto central. No tiene placas, aros concéntricos ni nombres sobre las puntas.
Mantiene las cinco zonas del maestro de Campaña: Arriba, Izquierda, Derecha,
Abajo (las dos puntas inferiores) y Centro (el punto central). No añade diagonales
al reglamento. El dibujo es SVG para conservar su definición al ampliar.

## Flujo integrado

En un encuentro configurado como Campaña, con una ficha controlada y recursos
disponibles, seguir Atacar → objetivo del mapa → arma → Preparar ataque. Admite
PJ, PNJ y enemigos; compartir bando no impide elegir al objetivo ni cambia su
alianza. La preparación conserva el componente ilustrado `CanvasAttackPreparation`,
sus dados y el selector protegido del HUD con sus modificadores.

1. Elegir el recurso del ataque. En un ataque sencillo o dual todavía no se gasta.
2. Elegir las zonas sobre el token con clic/toque, flechas o 5 para Centro.
   Confirmar fija la elección secreta y paga el ataque.
3. El defensor elige Recibir, Parry o Evasión. Parry exige equipo apto, recurso
   y zona; la dirección atacante permanece oculta. Evasión exige igualar la acción
   atacante y escoger una casilla vecina libre y accesible.
4. Tras pagar la defensa, el navegador del atacante revela la elección y se
   resuelve el intercambio con Vida en puntos y RD. Parry anula los golpes que
   entran por sus zonas aunque el recurso sea menor. Cubrir todo el ataque cuerpo
   a cuerpo e igualar o superar la acción permite una única respuesta, con un arma
   legal que pueda pagarse reutilizando los recursos defensivos ya gastados.
5. El resultado muestra zonas, dados y daño, y conserva la decisión de responder
   o continuar cuando corresponda. La respuesta no abre otra cadena de contraparry.

El ataque dual asigna una zona por mano y aplica daño/RD a cada golpe. El ataque
pesado de Mandoble, o un perfil con `campaignSplit` explícito, paga antes de tirar
y repartir los dados completos entre dos zonas exteriores adyacentes, con al menos
un dado en cada una. Ese reparto ya pagado se recupera al reabrir la escena.
Los demás perfiles pesados requieren definir su trayectoria antes de automatizarlos.

La cámara encuadra temporalmente el objetivo; cámara y selección se restauran
al salir. Las marcas siguen su posición renderizada. El panel contiene recursos
y confirmación, con desplazamiento cuando hace falta y áreas seguras móviles.
En horizontal bajo pasa al lateral. Las áreas de las zonas miden al menos
56 × 56 px aunque sus puntas visibles sean finas; el choque de parry es breve
y se omite con movimiento reducido.

## Probar sin datos reales

Con el servidor local del ensayo abierto:
`http://127.0.0.1:4173/output/playwright/campaign-canvas-preview.html`.
Abrir «Prueba de ataques · Campaña», escoger caso, pulsar Atacar, señalar
el objetivo, desplegar el arma y pulsar Preparar ataque.

Esta página local desechable monta `useCanvasFeatureController`,
`CanvasWorkspaceShell` y el motor de producción. Únicamente sustituye Firebase
por un adaptador en memoria; no reemplaza el motor de combate. Recargar o
«Reiniciar prueba» recupera recursos y Vida ilustrativos. No escribe datos reales.

## Código y límites

- `campaignAttackRules.js`: selección legal, recursos, zonas, defensa,
  evasión, respuesta y resolución de Vida/RD de Campaña.
- `campaignAttackCommitment.js`: compromiso SHA-256 con nonce aleatorio,
  elección local y verificación de la revelación.
- `useCampaignAttackRuntime.js`: preparación, pagos, defensa, revelación,
  resolución y recuperación. `useCanvasCombatRuntime.js` lo conecta a los
  encuentros de Campaña y conserva el motor roguelite para su sistema.
- `CampaignCombatOverlay.jsx` y `CampaignDirectionalCombat.jsx`/`.css`:
  presentación de producción, conectada desde el shell y el enrutado de combate.
- `output/playwright/campaign-canvas-preview.jsx`: monta el flujo real para revisión.
- `output/playwright/campaign-canvas-firestore.js`: escena en memoria;
  recargar o Reiniciar prueba recupera recursos y Vida.

La escena publica el compromiso, no las zonas, hasta que la defensa queda pagada.
La elección secreta y su nonce se guardan en `localStorage` del atacante: tras
desconectarse debe volver ese navegador para revelar. Si la elección se pierde
o el intercambio queda bloqueado, el máster puede cancelarlo antes de resolver
y devolver los recursos del intercambio. Los recibos por ataque y las transacciones
evitan duplicar gasto, daño o registro al reintentar. La resolución actualiza la
Vida del token; los PJ quedan marcados para su persistencia habitual, sin editar
la plantilla del PNJ/enemigo. Se mantienen la autenticación y los permisos de
Firestore existentes; esta integración no los rediseña.

Se resuelven Crítico y Perforante cuando el perfil los configura, y el parry de
proyectiles requiere equipo que declare esa capacidad. Esto no completa todos
los perfiles de armas, capacidades, efectos al impactar ni munición de Campaña.
Las propuestas del documento maestro no son una aprobación global de reglas.
Estados y capacidades ajenos a este flujo conservan sus herramientas existentes
o su resolución manual. El selector de armas y los modificadores del HUD no se
han rediseñado.

## Comprobación de la integración — 20 de octubre

Se comprobó el flujo real en navegador a 1280 × 800, 390 × 844, 319 × 671 y
844 × 390 px: objetivo visible, controles utilizables, sin desbordamiento
horizontal, zonas de al menos 56 × 56 px y restauración de cámara/selección.

- PJ → PJ, parry fallido: Derecha frente a Arriba, acción 5 + arma 4 − RD 1 =
  8 de daño; Vida 53 → 45.
- Enemigo → PNJ, Evasión Sur: acción 4 frente a defensa 4, movimiento de una
  casilla legal, Vida 24 → 24.
- PJ → enemigo, parry acertado con recurso menor: 4 frente a 6, sin daño ni respuesta.

Las pruebas automatizadas cubren las seis combinaciones de actores de la escena,
dos clientes separados para compromiso/revelación, reapertura del reparto pesado,
turnos, recursos, control y reintentos. La ejecución completa terminó con 215
suites, 1507 pruebas aprobadas y una omitida; la última ejecución dirigida, con
26 suites y 380 pruebas aprobadas. La compilación de producción fue correcta.
La revisión final de acabado indicó `ship`, fidelidad a la referencia aprobada
y adaptación móvil correcta, sin correcciones materiales pendientes.

Capturas: [PC](campaign-integrated-desktop.png), [móvil](campaign-integrated-mobile.png),
[móvil estrecho](campaign-integrated-small-mobile.png), [horizontal](campaign-integrated-landscape.png),
[preparación](campaign-integrated-preparation-mobile.png), [defensa](campaign-integrated-defense-mobile.png),
[resultado](campaign-integrated-result-mobile.png) y [evasión del PNJ](campaign-integrated-npc-evasion.png).

## Comprobación histórica de la reproducción local — 20 de octubre

Se comprobó la reproducción a 1280 × 800, 390 × 844 y 319 × 671 px, sin
desbordamiento horizontal ni controles por debajo de 56 × 56 px. Clic y flechas
seleccionan las puntas; 5 selecciona Centro y enciende únicamente su punto. Abajo
enciende las dos puntas inferiores y conserva una sola elección de las cinco.
Al pasar a la defensa se retira el rojo del ataque y no se dibuja su zona.

Un ataque Abajo con acción 6 contra un parry Abajo con dado 2 anula el golpe:
Vida 53 → 53, sin tirar el arma ni habilitar contraparry. La compilación del
ensayo es correcta. El menú de preparación se monta desde el mismo componente
del roguelite. Evidencia: [PC](campaign-kcd1-desktop.png),
[móvil](campaign-kcd1-mobile.png), [móvil estrecho](campaign-kcd1-small-mobile.png)
y [preparación](campaign-kcd1-preparation-mobile.png).

## Comprobación del ensayo anterior

Se recorrieron en navegador un parry acertado con recurso menor (4 frente a 6,
sin daño ni contraparry) y un parry fallido entre personajes (ataque Derecha,
parry Arriba, 7 de daño, Vida 53 → 46). La preparación reutiliza el menú real.
Se comprobó la selección por flechas, el ocultamiento visual de la dirección
atacante, ausencia de desbordamiento horizontal y composición a 319, 390 y
1280 px. Las capturas documentan una propuesta, no una aprobación.

Referencias consultadas: [presentación oficial del combate de Kingdom Come](https://store.steampowered.com/news/app/379430/view/4738306083307782019)
y [resumen oficial de The Blood of Dawnwalker](https://en.bandainamcoent.eu/dawnwalker/news/the-blood-of-dawnwalker-gameplay-reveal-recap).
Se toma su lectura de direcciones como inspiración visual; las cinco zonas y
la resolución siguen el modelo de la prueba de Campaña.
