# Parry libre — acabado de sala de duelo

Petición del 21/10/2026: mejorar toda la estética y sorprender dentro de la identidad ya aprobada de NOMA. Refinamiento amplio de esta herramienta, sin cambiar de mundo visual, mecánica ni textos solicitados en la corrección anterior.

## Dirección y composición

- Modo Operate: entrar, identificar un rival, atacar con un clic, fijar zona y seguir la revelación común. El modelo compartido y el secreto permanecen intactos.
- PC: cabecera compacta, registro lateral de personajes de 300–320 px y zona de parada dominante. Los retratos reales de la partida, fundidos hacia el fondo como el equipo ilustrado de NOMA, son el material visual principal.
- Móvil: pestañas Participantes/Parada, retratos y controles táctiles legibles. El objetivo y las lanzas conservan su espacio; no se impone una pantalla de bienvenida ni aceptación.
- Sala en espera: composición de medallones con los participantes reales presentes. No inventar personajes, rivales ni ilustraciones de relleno. Mantener el título y las instrucciones actuales.
- Parada activa: retrato del defensor al centro, marco fino dorado, fondo del mismo retrato fundido y doble arco exterior que distingue la confirmación del atacante y del defensor. Los arcos solo representan confirmaciones públicas; nunca zonas privadas.
- Historial: lista con nombres y pequeña reproducción de las lanzas con el resultado verificado. Solo se dibujan las elecciones después de su verificación, con la semántica rojo/azul existente.

## Gramática visual

Derivar materiales y fundidos de `docs/design/references/initial-deck.png`, medallones del retrato de ficha y lanzas de la referencia de Kingdom Come 1. Azul noche, oro cálido e identidad marfil; rojo para ataque/salida y azul para parada. Cinzel en identidad y controles principales, Alegreya en nombres y juego, Lato en datos secundarios. Bordes finos y separadores; nada de iconos decorativos de escudos o espadas, nuevas fuentes, panel administrativo o tarjetas genéricas.

El título gana presencia sin convertirse en una cabecera gigante. Grupos estrechos, regiones funcionales claras, secundarios legibles y controles de al menos 44 px. Confirmación y «Otra ronda» usan oro sólido (#c8aa6e), hover (#dbc087), texto azul noche (#0b1120) y la geometría recortada de preparación de ataque. La X queda aislada y centrada en su área táctil; el foco del nombre refuerza solo el subrayado dorado. Salir conserva rojo y respuesta al ratón/foco. Los nombres largos deben poder partirse sin empujar los botones.

## Respuesta y estados

La firma visual es el cierre de los dos arcos de compromiso seguido de la revelación de las lanzas: cada arco cambia al fijar su participante, y el resultado usa los colores existentes. Transiciones breves y finitas; movimiento reducido omite la animación. No introducir movimiento ambiental continuo, efectos mágicos que tapen la cara ni una demora artificial al confirmar.

Cubrir sala preparada, selección, una elección fijada, revelación, espectador, historial, imágenes ausentes, nombres largos y errores existentes. Mantener «Últimas paradas», «Elige un rival, fija en secreto y descubre el resultado.» y «Los dados y el daño se resuelven en mesa.». No recuperar Disponible ni el lema eliminado.

## Contrato de verificación

Implementación desde los componentes reales; una ronda conjunta de capturas PC y móvil, un único lote de correcciones y como máximo una confirmación adicional. Revisión final independiente y documentación del alcance. Comprobar elección mediante teclado/toque, secreto para espectadores, cambio de objetivo y reapertura del máster. No modificar el selector protegido de armas, los datos del juego ni el protocolo de compromisos.

## Entrega verificada — 21/10/2026

Implementado en `FreeParryProvider`, `FreeParryWindow` y `FreeParry.css`: retratos reales fundidos tras las filas, identidad propia con retrato, medallones de miembros de la sala durante la espera y defensor protagonista con fondo fundido. Los dos arcos dependen exclusivamente de las confirmaciones públicas; las miniaturas del historial reutilizan `CombatRose` con resultados verificados. Se conservan los textos exactos anteriores, el recorrido sin invitaciones, el secreto y el selector protegido del HUD. Es un refinamiento local dentro del mundo visual de NOMA.

| Vista | Sala / participantes | Elección | Resultado |
| --- | --- | --- | --- |
| PC · 1280 × 720 | [Sala](evidence/visual-room-desktop.png) | [Elección](evidence/visual-aim-desktop.png) | [Resultado](evidence/visual-result-desktop.png) |
| Móvil · 390 × 844 | [Participantes](evidence/visual-roster-mobile.png) | [Elección](evidence/visual-aim-mobile.png) | [Resultado](evidence/visual-result-mobile.png) |
| Móvil · 320 × 740 | — | — | [Resultado con desplazamiento vertical](evidence/visual-result-320.png) |

La verificación emplea componentes y servicio de producción con transporte local en memoria, sin escribir en la sala real. Incluye selección por teclado y toque. La [revisión independiente](visual-review.md) comprobó las siete capturas y las fuentes y concluyó `ship`, sin correcciones materiales. La advertencia preexistente del detector sobre `max-width` corresponde al contenedor de la antigua previa, sin efecto material en esta sala; esta revisión no constituye aprobación visual posterior del usuario.

Pasan cuatro suites dirigidas y 21 pruebas: `FreeParryIntegration`, `freeParryProtocol`, `ParryFreePreview` y `ClassListCampaignSmoke` ([log](../../../../output/playwright/parry-visual-tests.log)). La [compilación de producción](../../../../output/playwright/parry-visual-build.log) termina correctamente. Las 224 suites de [room-release.json](room-release.json) pertenecen a la entrega inicial de la sala y no se vuelven a atribuir a este refinamiento.

Publicado en [NOMA](https://base-de-datos-noma.web.app), únicamente Hosting de `base-de-datos-noma`, con manifiesto remoto y hashes SHA-256 de JS/CSS verificados. [Registro de esta entrega](visual-release.json).

## Corrección de controles — 21/10/2026

La corrección expresa del usuario sustituye el acabado anterior de tres controles: X Lucide de 20 px, centrada en un área de 44 × 44 px a 10 px del extremo derecho y a media altura de cabecera; foco del nombre limitado al subrayado dorado, sin cuadro ni resplandor; y «Otra ronda» con el oro sólido y la geometría de `CanvasAttackPreparation.css` descritos arriba.

| Vista | Nombre con foco y cierre | Resultado y «Otra ronda» |
| --- | --- | --- |
| PC · 1280 × 720 | [Captura](evidence/controls-name-desktop.png) | [Captura](evidence/controls-result-desktop.png) |
| Móvil · 390 × 844 | [Captura](evidence/controls-name-mobile.png) | [Captura](evidence/controls-result-mobile.png) |

Pasan dos suites y 11 pruebas ([log](../../../../output/playwright/parry-controls-tests.log)) y la [compilación](../../../../output/playwright/parry-controls-build.log). La revisión independiente concluye `ship`, sin correcciones materiales. Publicado en Hosting de `base-de-datos-noma`, con manifiesto y hashes SHA-256 de JS/CSS coincidentes: [registro](controls-release.json).
