# NOMA — Dirección de arte acordada

**Sangrado y Vendaje — petición del 28/09/2026:** el usuario solicita un efecto persistente sobre el token, comparable al de Envenenado pero reconocible como Sangrado, y sustituir el efecto de objeto del Vendaje por una animación del estilo de Presteza/Vitalidad. Implementación para valorar: manchas y regueros carmesí sobre la imagen, con alfa en figuras; bandas de luz color lino que la envuelven y retiran gradualmente las marcas. Mantener el retrato legible, la secuencia del ataque y los efectos recortados en todos los tamaños.

Referencia de preferencias del usuario, actualizada el 20 de septiembre de 2026. Leer antes de proponer o modificar interfaces. Esta guía concreta las reglas generales de AGENTS.md; las nuevas instrucciones explícitas del usuario tienen prioridad.

## Experiencia buscada

En el tablero de cartas, las barajas son los montones de cartas con imágenes ya existentes. El usuario rechazó una interfaz y un sistema de mazos separados (24-09-2026). Duplicar en cantidad, barajar y robar deben integrarse en esos mismos objetos mediante menú contextual y un acceso táctil. Tiempo y eventos están en las imágenes; no añadirles un editor ni una resolución de reglas automática.

En la gestión del montón, el usuario pide controles de cantidad estéticos y cómodos para móvil: evitar las flechas nativas de los campos numéricos; usar botones táctiles y cantidades rápidas. El inventario debe permitir cambiar el orden arrastrando cartas, sin extraerlas por accidente. Los robos de varias cartas deben mostrar la salida y el volteo progresivamente, una carta tras otra (24-09-2026).

El botón de baraja en la barra flotante de la carta debe usar el mismo tamaño, espaciado, oro y comportamiento visual que los botones vecinos. El usuario rechazó expresamente el recuadro, fondo y borde propios de ese botón; el icono debe quedar integrado directamente en la barra (24-09-2026).

La barra de cuatro opciones debe verse alineada con el eje vertical de la carta. El usuario percibe su centrado geométrico ligeramente desplazado a la derecha y pide una corrección óptica hacia la izquierda, conservando la distribución de los controles (24-09-2026).

NOMA es un juego de mesa digital con sensaciones de RPG/JRPG de fantasía medieval: interesante, divertido, elegante y vivo. La comodidad al jugar forma parte de su estética. Evitar el aspecto futurista, tecnológico o de panel administrativo. El carácter JRPG se refiere al ritmo, la respuesta y la presentación de las decisiones; no implica cambiar las ilustraciones a anime.

La claridad debe convivir con la presencia del arte, la iluminación y la respuesta de los controles. No interpretar «limpio», «óptimo» o «no genérico» como eliminar efectos, aplanar superficies, reducir todo a filas diminutas o imponer rectángulos sin personalidad.

## Referencias aprobadas, por función

Las siguientes capturas fueron proporcionadas y valoradas positivamente por el usuario. Son referencias estéticas, no especificaciones de reglas ni garantía de que sus valores de juego sigan vigentes. Las animaciones se deben comprobar en los componentes: una captura estática no demuestra su comportamiento.

| Referencia | Qué conservar y trasladar |
| --- | --- |
| [Mazo inicial y equipamiento](docs/design/references/initial-deck.png) | Referencia principal de identidad: arte grande integrado en la superficie, fundido con el nombre, perfil del arma ordenado, equipo reconocible, luz y borde asociados a rareza. Mantener ambos slots de mano, mostrando el segundo ocupado cuando corresponda. |
| [Inventario](docs/design/references/inventory.png) | Tarjetas ilustradas, encuadre y fundido, jerarquía entre nombre, estadísticas, efecto y lore; iluminación al hover y lectura de rareza. Las cartas tienen sentido en este juego. |
| [HUD Combat](docs/design/references/combat-hud.png) | Referencia principal de interacción: distribución, pestañas Acciones/Clase/Objetos, menú que aparece al atacar, pliegues de modificadores y feedback del fin de turno. |
| [Presentación de clases](docs/design/references/class-overview.png) | Retrato protagonista, nombre integrado, dados reconocibles, contraste de escalas y barras segmentadas de recursos. |
| [Progresión](docs/design/references/class-progression.png) | Diferencia clara entre actual/bloqueado, marcos con esquinas recortadas, jerarquía y ritmo. No copiar las grandes dimensiones de esta pantalla a todos los controles. |

El usuario también valora las estadísticas de aventura, las barras de Vida y la alineación de estados del inspector. El inspector es una referencia secundaria; el inventario y el HUD tienen más peso. No existe aquí una captura separada del inspector.

## Lenguaje visual

- **Alineación de fichas rectangulares (28/09/2026):** los medallones de estado deben tener su centro sobre el borde izquierdo del marco, igual que el indicador de compartido. Postura superior y Vida inferior se centran sobre sus respectivos bordes de forma simétrica. Conservar el diseño lateral curvo aprobado para retratos circulares.

- **Siluetas sin retrato circular (27/09/2026):** el usuario pide que todos los efectos sobre la ficha se ciñan a la transparencia de su imagen, como Oculto. Compartir máscara alfa con encaje `contain`, sin estirar la silueta ni animar la máscara fuera de la figura. Mantener intactos los retratos circulares. Implementada para revisión una base inferior de Vida segmentada y una superior de Postura/Hambre, con nombre y cifras unificados, en sustitución de los puntos antiguos de las fichas estándar no circulares. Las trayectorias, dados y mensajes permanecen fuera de la máscara para conservar su lectura.

- **Ilustración y texto:** el arte debe estar encuadrado intencionalmente y fundirse con la superficie mediante máscaras/degradados legibles. Los nombres deben sentirse integrados. Evitar sustituir automáticamente un arma ilustrada por una miniatura de lista.
- **Color:** partir del azul noche y negro existentes, oro cálido para interacción/selección y tonos marfil para nombres. Conservar rojo de combate en títulos ofensivos y confirmación de ataque; colores de rareza y recursos tienen significado. Tomar valores del componente de referencia, no inventar una paleta nueva en cada ventana.
- **Tipografía:** conservar Cinzel y Alegreya en los papeles que ya cumplen; usar la tipografía de interfaz existente para lectura funcional. Nombres y cifras clave necesitan presencia. Evitar etiquetas y datos esenciales demasiado pequeños para aparentar densidad.
- **Bordes y formas:** mantener geometrías por función: retratos y fin de turno circulares, HUD con su contorno, equipo con sus marcos y progresión con recortes. No uniformar todo ni aplicar una prohibición general de radios.
- **Luz:** el brillo al interactuar, la iluminación del arte y el acento por rareza están aprobados. Deben dirigir la mirada y expresar estado; evitar neón futurista o iluminar indiscriminadamente toda la pantalla.
- **Movimiento:** conservar sensación de despliegue, pliegue, selección y confirmación. El menú debe tener relación espacial con el control que lo abre. Las transiciones muestran continuidad; no rediseñar los efectos aprobados solo para hacerlos más sobrios. Mantener opción de movimiento reducido y evitar que una animación bloquee la siguiente acción.

## Humo y fichas de varias casillas

- El retrato es una representación visual; las reglas usan la huella rectangular completa de la ficha, sin interpretar cabeza, torso, patas ni orientación de la ilustración.
- Una ficha parcialmente solapada con Humo conserva simultáneamente una parte interior y otra expuesta. Puede relacionarse con criaturas de la misma nube desde su parte interior y con el exterior desde una parte expuesta si la línea no atraviesa Humo.
- Solo una ficha cuya huella completa esté cubierta se presenta como residente interior. Un roce o una cobertura parcial nunca debe aplicar niebla, opacidad o desaturación a todo el retrato.
- El área dibujada ya comunica qué porción está dentro. No recortar el retrato ni inventar un umbral de 50 %, centro de ficha o mayoría de casillas.
- `Oculto` es un estado explícito y separado. Una zona de Humo bloquea visión por geometría, pero no añade ni elimina ese estado.
- La Vida sigue siendo legible dentro del Humo, pero no debe sobresalir como una capa ajena: desaturar y atenuar suavemente la corona cuando la huella está completamente cubierta. Selección, hover y feedback de curación pueden recuperar claridad de forma temporal. No aplicar este tratamiento global a solapes parciales.
- Durante el arrastre de una ficha, el retrato sigue la previsualización, pero la visión, las sombras y los objetivos visibles permanecen en la posición de partida. Fuera de combate se actualizan al soltar; en combate, al confirmar el turno. La previsualización nunca debe oscurecer de golpe el mapa conocido ni revelar el exterior del Humo sin gastar el movimiento.
- Humo y `Oculto` deben conservar el aspecto del shader TokenMagic en móvil. Si un navegador no puede ejecutarlo o copiar sus fotogramas, usar fotogramas capturados del propio shader, no una niebla de diseño distinto.

## Móvil como experiencia jugable

El usuario pide jugar y moverse cómodamente desde móvil, además de PC. No basta con encoger el escritorio.

- Controles principales con iconos legibles y área táctil amplia; como objetivo de diseño, aproximadamente 44–48 px CSS para acciones táctiles frecuentes, adaptado a la composición.
- Dar espacio entre acciones incompatibles, especialmente confirmar, cancelar y gastar recursos.
- Información esencial y acciones accesibles sin depender de hover, clic derecho o gestos no explicados. Ofrecer respuesta visual al tocar y estado seleccionado persistente.
- Evitar letras diminutas para forzar toda una ventana a caber. Permitir scroll y adaptar la composición preservando el tamaño de los dados y controles que se usan.
- Revisar escritorio, móvil vertical y horizontal; áreas seguras, contenido largo y menús desplegados. Conservar el espacio del tablero durante el juego.
- Reutilizar animaciones y recursos; preferir transformaciones y opacidad, limitar efectos costosos repetidos. La fluidez y la legibilidad son parte de la dirección artística.

## Elementos protegidos y alcance

El **selector de armas del HUD Combat y sus modificadores están explícitamente protegidos**. El usuario pidió restaurarlos y no volver a tocarlos estéticamente. No incluirlos en otro rediseño de ventanas de ataque, defensa o resolución sin una nueva petición específica.

Las reglas, recursos, permisos, alcance, datos ocultos y consumo de acciones no deben cambiar por una tarea estética. La aprobación de un componente no autoriza a modificar otros para uniformarlos.

## Estado de la propuesta de combate

La propuesta de dos columnas con ilustración lateral y armas en filas compactas fue **rechazada**. Los archivos actuales de CanvasCombatActionModal y CanvasCombatDetails todavía contienen esa propuesta: no tratarlos como referencia aprobada por estar implementados. El selector del HUD sí fue restaurado.

Tras revisar la maqueta, el usuario autoriza probar **solo Preparar ataque** en la aplicación. La composición de la imagen le parece mejor, pero ajena al Canvas y demasiado generada. No debe copiarse literalmente su estética. Defensa, resolución y el selector del HUD quedan fuera de esta iteración.

Preferencias concretadas para esta prueba:

- Recuperar el fondo y borde originales de «Ataque inminente»: base `#1a1b26`, borde rojo oscuro y resplandor rojo localizado. El componente legado `CombatReactionModal` conserva esa referencia.
- Dados originales sin recuadros ni tics: elevación al hover y luz de apoyo bajo el dado al seleccionarlo. La selección debe seguir siendo legible por toque y teclado.
- Evitar cajas para cada dato. Integrar ilustraciones, texto y regiones mediante fundidos, alineación y separación; los límites pueden disolverse con el entorno.
- Retratos fundidos en los laterales de la cabecera: atacante a la izquierda y objetivo a la derecha, usando sus imágenes reales. No encerrarlos en medallones en esta ventana.
- Probar una confirmación con forma propia y el dorado de las pestañas del HUD, manteniendo la semántica roja del título y la envolvente de combate. Esta prueba no cambia la paleta de otras confirmaciones.
- Validar una ventana a la vez con el usuario antes de extender su diseño a otras. La lógica de combate sigue vigente y no debe rehacerse por esta petición estética.

La implementación de prueba usa `CanvasAttackPreparation.jsx` y estilos limitados a `.attack-preparation-frame`. El usuario valora positivamente la composición, la animación de dados, los retratos y especialmente la forma y el dorado de Confirmar ataque: conservar estos elementos en las siguientes iteraciones. El selector del HUD continúa protegido.

Afinado solicitado tras esa valoración: el arma debe adoptar la tipografía y el tratamiento de las armas equipadas (nombre, estadísticas y franja de rasgos), usando el coste real del ataque. Simplificar la explicación de selección de dados e integrarla en la composición. Mantener la tipografía de la suma junto a confirmar y presentar la nota «El arma se tira al confirmar» con un tratamiento discreto en cursiva. Estas preferencias no amplían el alcance a defensa o resolución.

En la siguiente revisión el usuario pide reemplazar las bolitas amarillas del coste por una representación de dados: símbolo de dados ya usado en inventario y cantidad, sin nueva caja. Los rasgos deben recoger sus colores reales del glosario; conservar la pequeña franja propia de los rasgos, pero eliminar bandas amplias que cortan el arte. La unión de retratos y arma mediante dos fundidos horizontales separados también fue objetada. Se probó una escena ilustrada continua con retratos que se disuelven desde los laterales. Estas precisiones solo afectan a Preparar ataque.

**Aprobado: un arma, sin retratos.** El usuario aprueba la preparación de un ataque individual con el arma como única ilustración, conservando nombres de los participantes, composición, tipografía, dados, colores y botón. Las cabezas fusionadas con el arma producían un efecto cómico. Esta valoración sustituye la preferencia anterior por retratos laterales en esta ventana; no afecta a otros componentes.

**Aprobado: Ataque dual del jugador.** El usuario aprueba conservar el flujo Atacar → objetivo → arma individual o Ataque dual en el selector del HUD → preparar dados → confirmar. No repetir la selección de armas en la preparación. Solo el primer botón del HUD Canvas cambia de nombre a «Preparar ataque», conservando su diseño y modificadores; la confirmación definitiva mantiene «Confirmar ataque». La preparación dual muestra dos armas visibles a la vez sobre una misma superficie ilustrada, con nombres, identificación de manos, perfiles y rasgos efectivos por arma; un único coste de dos dados, selección común y suma desglosada. Móvil no utiliza carrusel. El usuario aprueba también esta composición dual. La ampliación de la selección de arsenal enemigo y las ventanas de defensa/resolución quedan fuera de esta iteración.

**Afinado de avisos de preparación:** el usuario pide priorizar su integración estética y reducir los mensajes. Presentar Duelo y Toque como notas breves junto al arma afectada, con Alegreya en cursiva, contexto en Cinzel discreto y tonos cálidos existentes. Evitar párrafos sueltos en tipografía de interfaz debajo de los dados, recuadros y avisos duplicados. Las ayudas de Amenaza y falta de dados siguen el mismo tratamiento; conservar la información que determina una decisión y los mensajes desconocidos.

**Prueba vigente: defensa básica — Ataque inminente.** El usuario autoriza avanzar a la ventana de quien recibe el ataque. Se heredan fondo, borde, tipografías, ilustraciones fundidas, dados con luz inferior y forma de confirmación de la preparación aprobada. La composición es vertical: arma y Presión entrante con sus dados reales; protección integrada y selección de dados (jugadores) o equipo y Amenaza (enemigos); resultado de Vida y cálculo junto al botón. Confirmar defensa usa dorado; Recibir ataque, rojo, y solo aparece sin defensa elegida o sin defensa activa disponible. Antes de tirar defensa enemiga se muestra que está pendiente y se identifica expresamente el daño hipotético sin defensa. La CD enemiga no se presenta a jugadores. No se han rediseñado las opciones de excedente, contraataque, reposición, ajuste ni registro. Esta composición de defensa está pendiente de valoración estética; preparación individual y dual siguen aprobadas.

**Afinado de defensa enemiga:** el usuario valora el planteamiento de defensa y pide sustituir las pestañas de origen de Amenaza por selección directa sobre los dados existentes; ninguna selección equivale a no gastar Amenaza. Conservar la distinción entre el valor real de reserva y los dados aún por tirar sin volver a introducir un selector de modos. Las ilustraciones defensivas deben mostrar suficiente arma, sin reducirse al mango por un recorte apaisado. Rasgos con el tratamiento y colores de glosario de Preparar ataque; Presión entrante con la tipografía de las estadísticas del arma. Mantener la composición y reglas aprobadas.

**Siguiente fase pendiente — excedente defensivo.** El usuario recuerda expresamente que, una vez terminado el planteamiento de defensa básica, habrá que ajustar la estética del resultado al superar el ataque: excedente, selector del arma de contraataque, opciones de Contraatacar y Reposicionarse, y continuación sin gastar excedente. La captura proporcionada el 20 de septiembre muestra la presentación actual como referencia del problema, no como diseño aprobado. Abordar esta fase como continuación de la composición aprobada, con claridad del efecto de cada elección y comodidad en PC/móvil. Este recordatorio fija el orden del trabajo; no autoriza adelantar ahora esa implementación ni cambiar sus reglas.

**Detalle de presión y dados defensivos:** Presión entrante vuelve a la disposición horizontal anterior (cifra a la izquierda, etiqueta a la derecha), conservando Alegreya y Cinzel como en las estadísticas del arma. Los dados puntuales de Amenaza muestran su número de caras dentro y omiten la etiqueta dN inferior; la reserva conserva su resultado real y su tipo. El d20 de Amenaza debe tener un contorno continuo y facetas unidas. El valor del perfil del equipo defensivo va en rojo, como el daño del arma.

**Amenaza en preparación enemiga:** el usuario pide aplicar el mismo selector directo de defensa también a Preparar ataque. Compartir los dados, numerales, luz inferior, reserva diferenciada y adaptación móvil; usar «En ataque» al seleccionar. No mantener pestañas de origen: ningún dado equivale a Sin Amenaza y repetir la selección la elimina. Conservar las reglas, el arte del arma y la composición aprobada.

**Defensa con equipo único:** la etiqueta «Presión entrante» debe compartir exactamente el rojo de su cifra. Si el enemigo solo dispone de un arma defensiva, centrar su ilustración bajo Equipo defensivo, con ancho contenido y proporción cuadrada; evitar que ocupe únicamente la columna izquierda o se estire a todo el panel. Conservar el fundido, rasgos y selección aprobados.

**Dados del resultado defensivo:** centrar la tirada ya resuelta bajo «Tirada defensiva», alineada con el resultado. Usar el mismo tamaño de SVG que los dados seleccionables de Preparar ataque (74px en escritorio, 70px en móvil); mantener legibles el tipo y la procedencia de Equipo/Amenaza, sin cajas ni apariencia de control seleccionable.

**Arma defensiva sin seleccionar:** debe verse claramente más oscura y menos marcada, con nombre discreto y rasgos menos saturados. La selección recupera el arte luminoso, los colores y la línea dorada; el hover o foco solo insinúan disponibilidad. Mantener texto legible y posibilidad de seleccionar de nuevo, también en móvil.

**Continuidad al abrir defensa:** evitar que el arte junto a CD aparezca de golpe después de Preparar ataque. Precargar y decodificar la protección antes de abrir Ataque inminente, también en el cliente que recibe el ataque. Una carga excepcionalmente tardía debe integrarse mediante un fundido discreto, sin mover la composición ni retrasar datos y controles; respetar movimiento reducido.

**Prueba vigente — texto centrado en equipo defensivo único:** el usuario pide probar nombre, Defensa y rasgos en el centro de la imagen de la única arma defensiva. Mantener el arte y sus estados seleccionado/oscuro, integrar el texto con sombra difuminada y situar la línea dorada bajo ese grupo. Pendiente de valoración del usuario; no cambia la composición de selección con varias armas.

**Alineación de la suma entrante:** el signo «+» debe quedar exactamente centrado entre los grupos de dados, respetando la separación de escritorio y móvil.

**Arte dual en Ataque inminente:** reutilizar la composición aprobada de Preparar ataque, con dos ilustraciones de igual ancho y máscaras enfrentadas hacia el centro. Evitar un corte vertical o dar más superficie a una de las armas.

**Prueba vigente — preparación del ataque con varias armas enemigas:** el usuario rechaza la repetición de tarjetas seleccionadas arriba y selector ilustrado debajo. Dos armas enemigas deben compartir el fundido, perfiles y rasgos del ataque dual de jugador. La selección se concentra en «Elegir armas», un desplegable compacto que distingue ejemplares y conserva el mínimo de una arma. Los enemigos pueden combinar más de dos; la composición debe mostrarlas todas sin asignar manos ni coste de jugador. Mantener una acción principal y la Amenaza opcional. Pendiente de valoración estética.

**Afinado del selector enemigo:** el usuario valora la dirección de «Elegir armas» y la composición con nombre a la izquierda y daño a la derecha. Rechaza pegarlos uno al otro; el problema era la distancia excesiva. La prueba actual conserva las dos alineaciones dentro de una lista más estrecha y centrada (máximo 300 px), con «Ejemplar» debajo del nombre. Mantener el desplegable y sus estados. Pendiente de valoración.

## Dónde comprobar la identidad existente

**Modificadores del ataque:** el usuario pide conservar la elección en el desplegable de modificadores del HUD y reflejarla en las ventanas posteriores para jugadores y enemigos. En Canvas, los únicos rasgos manuales ofrecidos son Crítico y Perforante; esta selección no elimina rasgos propios del equipo. La preparación muestra los dados adicionales como un grupo «Modificadores», con los SVG y tipografía aprobados, sin introducir otra selección ni cajas. Mantener el daño base junto al arma y separar el aporte de modificadores en la suma. Tras tirar, agrupar sus resultados como «Modificador», aparte de Acción, Arma, Crítico y Amenaza. Identificar los rasgos añadidos con los colores del glosario y una nota breve si quedan sin efecto.

**Defensa enemiga con dos armas y escudo:** mostrar el escudo junto al equipo defensivo ilustrado, con «Protección +1 CD» y «Pasivo · Sin dados», seleccionado por defecto si existe. No colocarlo en la ilustración de armadura ni presentar su daño o rasgos ofensivos como defensa. Respetar dos manos: una arma a dos manos, dos armas de una mano, o arma de una mano y escudo; cambiar una combinación incompatible ajusta la selección directamente. Escudo pasivo disponible incluso con la acción principal gastada; las armas sí consumen una única acción reactiva y suman todos sus dados, sin Base ofensiva. Mantener el arte, los estados atenuados y los colores aprobados, distinguir ejemplares iguales y mostrar su procedencia tras tirar. El +1 se aplica sobre la CD base de la ficha sin sobrescribirla. Jugadores y selector HUD conservan su funcionamiento.

**Afinado del contraataque:** evitar la aparición brusca del arte al elegir otra arma. Preparar las ilustraciones y mantener la anterior hasta que la siguiente esté decodificada; fundir ambas sin cambiar dimensiones ni introducir indicadores de carga. Respetar movimiento reducido y bloquear el arrastre nativo. Por defecto, usar el arma con la que el defensor acaba de defenderse o, en jugadores que defienden con dados, una del último ataque propio que siga siendo válida. Permitir cambiarla con el selector existente; nunca sustituir una selección manual válida al actualizar el estado.

**Prueba vigente — excedente defensivo:** el usuario autoriza ahora rediseñar contraataque y reposicionamiento como continuación de Preparar ataque. La prueba mueve resultado y decisiones al cuerpo desplazable, con dos opciones sin tarjetas rectangulares, selección dorada y una escena del arma fundida para el contraataque. Destacar Presión del excedente, nunca el perfil de una nueva tirada; movimiento usa casillas y explica que se elige posición después en el tablero. «Cambiar arma» despliega una lista en flujo solo cuando hay varias armas válidas. Elegir opción/arma prepara; la confirmación dorada del pie resuelve. El pie conserva también la salida sin gastar excedente. Mantener dados anteriores accesibles, reglas de Derribado/alcance y no revelar CD enemiga. Esta petición sustituye el aplazamiento anterior de esta fase; la estética queda pendiente de valoración del usuario.

**Amenaza múltiple — petición vigente:** eliminar el límite de un dado en preparación y defensa enemigas. Permitir varios tipos, ejemplares repetidos y combinación con la reserva. Conservar los SVG, la luz inferior y el toque directo para seleccionar/desmarcar cada tipo; al seleccionarlo aparecen controles discretos de cantidad con objetivos táctiles de 44 px. La reserva se selecciona una sola vez y mantiene su valor tirado. No introducir pestañas ni nuevos recuadros. Esta petición sustituye la restricción anterior de máximo un dado. El siguiente trabajo visual pendiente es el excedente defensivo: contraataque y reposicionamiento.

- `src/components/CombatHUD.jsx`: disposición, menú de armas y animaciones aprobadas.
- `src/components/CombatModifiersPanel.jsx`: pliegues y selección de modificadores aprobados.
- `src/components/LoadoutView.jsx`: equipo, ocupación de manos y estados de interacción.
- `src/components/RogueliteInventoryCard.jsx` y reglas `.noma-inventory-card` de `src/index.css`: fundido, arte, rareza, jerarquía y lore.
- `src/components/ClassList.jsx`, componentes de clase y progresión: presentación del campeón y recursos; localizar el componente vigente antes de reutilizarlo.
- `tailwind.config.js` y `src/index.css`: tipografías y estilos existentes.

## Uso de ayudas externas

Impeccable puede ayudar a analizar composición, movimiento y adaptación. Sus criterios generales no sustituyen esta dirección. No retirar fundidos, mayúsculas, serifas, cartas, luz o radios aprobados solo porque una guía los clasifique como patrones habituales. Una petición de rediseñar una ventana no descarta la identidad aprobada del resto de NOMA.

Skill personal instalada: `noma-art-direction`, disponible en el perfil local de Codex. Impeccable 4.3.1 se instaló desde `pbakaus/impeccable`, revisión `f2c7051853848826aac2f4646581d62a732155ad`, sin añadir hooks automáticos al proyecto. Figma y Frontend Design no son requisitos del proyecto.

**Dirección autorizada — poción y resultado sobre el token (22 de septiembre):** sustituir la ventana grande de preparación/resultado por un despliegue compacto unido a Objetos del HUD. Conservar el arte real de Forja fundido, nombre Cinzel, cifras/notas Alegreya, dados dorados con luz inferior y confirmación con el recorte aprobado. Elegir un recurso prepara; «Beber poción» confirma. Cambiarlo o cancelar no consume. Después el despliegue se cierra y el tablero muestra el d4 con numerales rápidos que desaceleran hasta el resultado guardado, seguido de +Vida efectiva y un pulso suave. El mismo resultado se muestra a máster y jugadores que puedan ver el token; la animación no bloquea el juego ni necesita «Continuar». Evitar superponer dado y controles del token. Mantener movimiento reducido. No repetir resultados antiguos al reconectar o abrir la escena. Separar tirada y curación real cuando se alcanza la Vida máxima.

**Costes de poción actualizados:** jugadores gastan un dado de acción e ignoran su valor. El usuario confirma para enemigos un recurso a elegir: acción principal, Movimiento o un dado de Amenaza, incluida Amenaza añadida manualmente para ese uso. No sumar su valor a la curación. Combate desactivado es también su modo de prueba habitual: mostrar recursos de práctica y recorrer elección/consumo; no dar por hecho que quiere uso gratuito. Mantener una sola copia por uso, bloqueo con 0 Vida/Envenenado y consumo transaccional. El registro comparte composición y hora a la izquierda del registro de ataques, con arte de poción, dado aprobado y recuperación/coste claros.

**Prueba estética del registro ilustrado (22 de septiembre):** cuando una entrada incluye imagen, probar el arte como fondo de toda la entrada con el fundido nocturno del equipamiento, dejando legibles identidad, dado, resultado y coste. La miniatura aislada de la poción ya no ocupa un lateral. Pendiente de valoración del usuario antes de extender el tratamiento a otros tipos de registro.

**Prueba autorizada — Vida legible del token:** el usuario está especialmente vinculado al retrato circular, su aro dorado y los controles existentes de rotar/giro libre/eliminar/ajustar tamaño; conservar esa identidad y disposición. Mejorar la Vida mediante piezas separadas en el arco inferior, cada pieza un bloque. Los vacíos permanecen reconocibles y el tamaño de lectura tiene un mínimo en pantalla al alejar el mapa. Al seleccionar o inspeccionar con ratón aparece nombre y Vida exacta; en móvil no depender del hover. Los tokens no circulares usan una cinta segmentada. No recuperar Postura o Armadura del sistema antiguo para roguelite ni inventar nuevos recursos. Animar solo bloques afectados por daño o curación, respetando movimiento reducido. Evaluar zoom normal, zoom alejado, PC y móvil antes de ampliar a otras herramientas. Esta dirección está autorizada; la valoración de su acabado visual corresponde a la próxima revisión del usuario.

**Aprobación y ajuste posterior (22 de septiembre):** el usuario aprueba expresamente la corona de Vida, las etiquetas de nombre adaptadas al zoom y el dado/halo de curación. Preservar esos acabados. Extender la misma etiqueta al nombre de un enemigo visible al pasar el ratón, sin revelar su Vida ni otorgar controles. El panel ilustrado de poción gusta, pero debe nacer de la fila Acciones/Clase/Objetos, quedar pegado a ella y no superar su ancho, como el selector de Correr; conservar el pliegue existente, los dados y la ilustración. Esta relación espacial es referencia para futuros consumibles. No intensificar el efecto con un tinte rojo sobre el retrato que pueda confundirse con daño.

**Corrección expresa — corona exterior (22 de septiembre):** la aprobación anterior se refiere a la corona que rodeaba por fuera la parte inferior del aro dorado. El usuario rechaza el ajuste posterior que redujo el diámetro y subió los segmentos al interior del retrato. Recuperar esa colocación exterior, con los bloques alineados en una misma curva; no volver a meterlos dentro para evitar el tirador de tamaño. Se mantienen las etiquetas adaptadas al zoom, el panel de poción y el halo aprobados.
La corona debe acompañar al tamaño del retrato al acercar el zoom: un máximo fijo de diámetro la encoge y vuelve a introducir sus extremos dentro del aro. Conservar solo el mínimo de legibilidad al alejar.

### Precisión de la corona y curación compartida (22-09-2026)

La corona aprobada permanece fuera del retrato. Su centro debe coincidir exactamente con el del círculo permanente, independientemente de selección, zoom y tamaño1×1/2×2. No desplazar el arco para compensar los controles de selección.

**Corrección posterior del usuario:** el grosor fijo de4px y la longitud máxima de16px fueron rechazados al comprobar zooms reales. La referencia de proporciones preferida es la vista al30%, especialmente en2×2: conservar ese equilibrio entre retrato, grosor, huecos y arco al acercarse. Al alejarse puede haber una compensación leve de legibilidad, pero nunca un radio mínimo que convierta la Vida en una semicircunferencia separada y desproporcionada. Comprobar tamaños reales del token (incluidos256/768unidades), además de los50/100del prototipo. Referencia: [proporciones preferidas](docs/design/references/token-life-zoom-preference.png).

**Poción móvil:** la ampliación y contracción de Acciones/Clase/Objetos debe ser animada, coordinada con el pliegue. La unión con el panel debe ser opaca y continua, sin huecos de esquinas por donde se vea el tablero. Mantener el escritorio y los selectores de armas/modificadores. Referencia del defecto a corregir: [unión móvil](docs/design/references/potion-mobile-dock-gaps.png).

**Refinamiento posterior:** el usuario aprueba el resultado en 1×1, pero pide más presencia en 0,5 y 0,25. Tomar el grosor de 1×1 como referencia para reforzar esos tamaños pequeños; conservar el radio de su propio retrato y el comportamiento aprobado de 1×1 y 2×2. El tamaño se calcula respecto a la casilla real, no a píxeles de mundo arbitrarios. En móvil, el panel de poción tampoco debe cambiar bruscamente de altura mientras se ensanchan las pestañas: el contenido debe mantener una composición estable durante el pliegue.

En curaciones, la corona no debe anticipar el dado: guardar el estado de juego al confirmar, pero mostrar los bloques recuperados y su resplandor al revelarse el resultado. El registro es histórico y no debe disparar una segunda animación. La interfaz ha de tolerar la llegada de escena y ficha en distinto orden.

**Respuesta al daño (prueba del 22 de septiembre):** al perder Vida, el retrato recibe un destello de impacto cálido y rojizo a la vez que la corona marca los bloques perdidos. No mover el token ni sus controles, ni reproducir el efecto al cargar un estado antiguo o al curarse. El efecto es breve, no muestra cifras privadas y se omite con movimiento reducido. Pendiente de valoración estética del usuario.

**Afinado de secuencia (23-09-2026, pendiente de valoración):** en ataques Canvas, el número flotante de Vida perdida da la señal de inicio al destello del retrato y a la desaparición de segmentos. Si antes se presenta una parada, los tres esperan su fase del resultado. Sustituir el halo rojo grande y prolongado por un impacto corto y una estela de color discreta sobre el propio retrato. La Vida real se confirma al resolver el combate, pero la corona espera visualmente al resultado; si no llega el registro, termina la espera sin dejarla desactualizada. Los cambios manuales de Vida conservan una respuesta local.

- Brea (23-09-2026): el usuario pide que el retrato se manche al estar dentro de la zona. Las manchas son un efecto visual temporal de contacto, no un estado persistente ni una penalización nueva.

- Revisión de brea en retratos: las manchas SVG de contorno fijo se rechazaron por parecer pintadas a partir de 2×2. Usar la textura viscosa del suelo con máscara irregular difuminada, rostro reconocible y acabado consistente al ampliar.
- Revisión posterior: el usuario prefiere manchas irregulares repartidas por varias partes del retrato, no una franja continua alrededor del círculo. Conservar el reparto anterior y eliminar únicamente los cortes procedentes de la textura cuadrada del suelo.

- Brea prendiendo: avance visible y progresivo de una esquina a la opuesta, conservando la superficie oscura por delante del fuego; evitar encender toda la zona de golpe.

- Al superponerse Humo y Brea, dibujar la brea del suelo y su ignición por encima del humo, independientemente del orden de creación. Preferencia corregida por el usuario: el humo ocultaba completamente la brea; conservar la densidad actual del humo. En retratos mantener las manchas de brea debajo del velo de humo y preservar la legibilidad de la corona.


## Pociones: revisión solicitada el 27-09-2026

El usuario pide que el +2 de Vida temporal comparta la tipografía de los otros números de la corona, y que el inspector muestre también el aumento y el dorado sin alterar la Vida normal. Rechaza los efectos de consumo de Presteza/Vitalidad reutilizados del Antídoto. Solicita adaptar efectos de TokenMagic: se implementan Air Field para Presteza y Magic Field dorado para Vitalidad, pendientes de su valoración visual. Deben ser efectos transitorios al tomar las pociones.

**Vida temporal en inspector (28/09/2026):** el usuario rechaza añadir una fila explicativa o un botón «Retirar extra». Mantener la barra y cifras existentes, con operaciones integradas en ellas. Sin ayuda permanente ni nuevas filas para esta edición.
