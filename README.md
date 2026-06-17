# 🎮 Fichas Rol App

**Aplicación web avanzada para gestión de fichas de personaje con sistema de inventario avanzado**

Fichas Rol App es una aplicación web desarrollada en React para crear y gestionar fichas de personaje de rol. Toda la información se almacena en Firebase y el catálogo de equipo proviene de Google Sheets, actualizándose automáticamente. Incluye un sistema de inventario con grid 10×8, drag & drop fluido y rotación de objetos.

## ✨ Características principales

### ⚔️ Gestor de Combate del Bestiario (Estilo de Campaña Gótica)

- **Estética Visual de Campaña Gótica**: Fusión estética total con el Bestiario, utilizando un fondo de pantalla oscuro de campaña (`bg-[#050b14]`), tarjetas carmesí profundo (`bg-[#1a0505]`), bordes finos óxido/carmesí (`border-red-900/30`), tipografía clásica medieval (`font-['Cinzel']`) y esquinas rectas (`rounded-none` / `rounded-sm`).
- **Responsividad Completa Adaptativa**:
  - **Tabletas (desde `md: 768px`)**: La barra de herramientas principal se organiza horizontalmente en una sola línea compacta y las métricas de "Encuentro Activo" se disponen en fila para optimizar el espacio de control.
  - **Móviles (`< 768px`)**: Layout ultra compacto y 100% responsivo. La barra de herramientas se colapsa inteligentemente en dos filas: el título con botón de retroceso arriba y los botones de acción ("Limpiar Encuentro" y "Añadir Enemigo") abajo, distribuidos al 50% de ancho útil simétricamente y evitando cualquier desbordamiento horizontal.
  - **Sencillo, Elegante y Simétrico**: El bloque de resumen de "Encuentro Activo" se transforma en una grilla simétrica de 3 columnas divididas por bordes rústicos, donde los indicadores ("ENEMIGOS", "HERIDOS", "ALTERACIONES") se apilan verticalmente sobre el número en pantallas pequeñas, evitando textos encimados.
  - **Sincronización Perfecta de Botones**: Ajuste simétrico de los botones "Limpiar Encuentro" y "Añadir Enemigo" en la cabecera para tener la misma tipografía `Cinzel`, idénticas dimensiones y una altura fija estandarizada (`h-11` en móvil, `h-10` en tablets y escritorio) para asegurar un alineamiento perfecto.
  - **Retratos de Enemigo Limpios**: Reubicación estratégica del botón de eliminar enemigo (`FiTrash2`), retirándolo del retrato donde tapaba la ilustración del monstruo y posicionándolo en la esquina superior derecha del bloque de información básica (`absolute right-2 top-2 sm:right-3 sm:top-3 z-10`).
  - **Protección de Textos**: Incorporación de un padding de seguridad responsivo (`pr-8 md:pr-0` en nombre y tipo) para prevenir solapamientos con el botón en móviles, mientras se conserva el ancho completo en PC para evitar cortes de texto o saltos de línea indeseados.
  - **Retratos Góticos Expandidos con Soporte de Acento en PC**: El retrato en PC se expande ocupando todo el ancho de la columna izquierda (18rem) sin divisores. Los textos flotan con soporte responsivo y se anclan visualmente con un **pilar vertical carmesí** en el margen izquierdo (`md:border-l-2 md:border-red-500/40 md:pl-4 md:bg-gradient-to-r md:from-[#0c0202]/85 md:via-[#0c0202]/40 md:to-transparent`), reaccionando al pasar el cursor con un brillo intenso (`group-hover:md:border-red-500/70`). El botón de eliminar enemigo se ubica de forma independiente en la esquina superior derecha del retrato.
- **Controles de Recursos Segmentados Interactivos**:
  - Escalas rúnicas de bloques medievales dibujadas con polígonos recortados (`clip-path`) en perfecta coherencia con las barras de estado de la Ficha de Detalle.
  - Ajuste de celdas mediante clic directo e interactivo, complementado con steppers (`+` / `-`) en los laterales para modificaciones precisas en móviles.
- **Estados y Alteraciones de Campaña**:
  - **Animaciones Cinematográficas con Cero Latencia y Máscaras**: Transiciones ultra fluidas al añadir/quitar alteraciones de estado.
    - **Zero-Latency Height Tracking**: La altura de la tarjeta de combate sigue reactivamente al `ResizeObserver` con latencia cero en actualizaciones de estados, eliminando el efecto elástico y logrando un ajuste en tiempo real perfecto.
    - **Técnica de Máscaras (Outer Wrapper Masking)**: Los estados activos están envueltos en un contenedor de máscara `inline-block overflow-hidden` que colapsa su ancho, alto y márgenes (horizontal y vertical) de forma simultánea. El botón interno permanece estático, **evitando cualquier deformación tipográfica o compresión visual de textos e iconos**.
    - **Desplazamiento Flexbox 100% Fluido**: Al colapsar los márgenes dinámicamente a `0` en la salida (`exit`), el layout flexbox se reorganiza gradualmente frame-a-frame, eliminando por completo los saltos bruscos de 1 frame de altura al desmontarse del DOM.
    - **Colapso de Tarjeta Elegantísimo**: Al eliminar un enemigo de la lista, la tarjeta principal colapsa su altura a `0` de forma coordinada con su desvanecimiento, logrando que los enemigos inferiores se desplacen verticalmente con suavidad cinematográfica.
  - Limpieza de badges redundantes (eliminación de la etiqueta "En combate" y remoción completa del marcador de marcador de posición "Sin alteraciones" para priorizar el espacio visual).
  - Píldoras de estado con colores góticos armoniosos y desaturados (gama de slate, rose, teal, indigo, amber, red, cyan, yellow, stone, emerald, orange, blue, violet, sky, flame) que se sincronizan perfectamente en su estado activo y visualización en el modal de selección.
-   **Buscador y Modales en Bloque**: Búsqueda integrada fluida con divisor carmesí y modales planos con bordes reforzados estilo campaña.
-   **Retratos a Sangre en Bloque Limpio (Cero Bandas Negras)**: Integración de retratos adaptativos en corte completo (`object-cover object-center`) en el bloque de columna izquierda (`w-20 sm:w-24`) de las tarjetas en el modal de selección ("Añadir Enemigo"). Esto asegura que la ilustración de cualquier criatura rellene por completo el área visual flush a los bordes, eliminando bandas negras horizontales (letterboxing) o verticales (pillarboxing) sin importar la relación de aspecto original de la imagen. Se acompaña de un degradado de difuminado lateral y un pilar rúnico carmesí en el hover.
- **Peanas de Color y Secuenciador de Duplicados (Tabletop RPG)**:
  - **Numeración Romana Inteligente**: Al añadir enemigos repetidos, el sistema calcula de forma autónoma el primer número entero libre (ej. *Maniquí I*, *Maniquí II*), rellenando huecos en caso de eliminaciones de manera autocurativa.
  - **Identificador de Peana Táctico**: Cada contendiente posee un badge interactivo con brillo rúnico. Al pulsarlo, cicla en tiempo real entre 6 tonalidades góticas (Carmesí, Ámbar, Esmeralda, Zafiro, Amatista, Ceniza), sincronizándose instantáneamente con Firestore.
  - **Retroiluminación Dinámica en PC**: En la vista de escritorio, el color seleccionado tiñe y genera un halo luminoso (glow) sobre el pilar decorativo vertical izquierdo de la tarjeta, facilitando la identificación visual rápida a distancia.
- **Layout Compacto Móvil**: Reducción de más del 60% en la altura de la tarjeta de enemigo en móvil para eliminar scroll innecesario. Muestra la información básica horizontalmente y condensa las 5 estadísticas en una cuadrícula simétrica de mini-badges táctiles con micro-barras de progreso.
- **Ajustador Táctil (Tactile Bottom Sheet Drawer)**: Cajón deslizante animado desde la base del móvil con interfaz gótica de alto contraste. Incorpora botones táctiles gigantes para `+`/`-` de 64px, visualización gigante de valor, atajos rápidos tácticos ("CURAR MÁXIMO" y "DERROTAR") y barra rúnica de segmentos gruesos optimizada para el pulgar.
- **Selector de Color de Etiquetas Interactivo**: Sistema premium de 5 esferas (4 presets góticos carmesí, ámbar, esmeralda y zafiro con brillo rúnico individual + 1 esfera blanca premium con punto arcoíris y selector nativo de color hexadecimal) que permite personalizar el color de cada etiqueta de forma independiente, visible al pasar el ratón en PC (hover) o al enfocar en móvil (focus con retardo de 150ms para registro de toques). Los tags calculan dinámicamente sus bordes al 50% de opacidad y fondo al 10% de opacidad, y las etiquetas vacías se limpian del almacenamiento `tagName|#hexColor` de forma automática al perder el foco.

### ⚖️ Karma exclusivo de Yuuzu

- Estadística especial "Karma" disponible únicamente en la ficha de Yuuzu, con control fino entre -10 y +10 y visualización como balanza (blanco para karma positivo, negro para karma negativo y neutro sin color).

### 🧭 **Mapa de Rutas (Lite SVG)**

- **Versión sin Pixi** enfocada a dispositivos modestos o sesiones rápidas. Renderiza el grafo con SVG y estilos Tailwind.
- **Pan, zoom y snap al grid** implementados con transformaciones CSS, manteniendo la misma estructura de nodos y conexiones del constructor original.
 - **Sincronización de iconos**: comparte el catálogo de iconos personalizados con el minimapa mediante Firestore y `localStorage`.
- **Herramientas equivalentes**: selección, creación, conexión, duplicado, bloqueo/desbloqueo, deshacer/rehacer y auto-layout.
 - **Persistencia optimizada**: guarda automáticamente en el navegador y permite importar/exportar mapas en JSON reutilizable entre campañas.
 - **Conexiones discontinuas** con guiones SVG y remates redondeados que mantienen el estilo visual original del proyecto.
- **Halos y candados sincronizados**: slider de intensidad para el destello y uso automático del icono personalizado 15 cuando el nodo está bloqueado.
- **Formas personalizables**: cambia cada nodo entre panel suavizado, círculo, triángulo con iconografía centrada, diamante u hexágono desde el panel lateral o el menú flotante, con estilos y resaltados adaptados a cada figura.
- **Formas poligonales refinadas**: triángulos, diamantes y hexágonos ajustan su centro óptico, degradados y contornos de selección para mantener iconografía y resaltados equilibrados.
- **Edición contextual ultra rápida**: haz doble clic sobre un nodo para desplegar el panel flotante con controles táctiles para renombrar, cambiar tipo y estado, ajustar notas, destello y acceder a acciones de bloqueo, duplicado o eliminación sin abandonar el mapa.
- **Nodos circulares renovados**: el estilo base ahora replica los nodos luminosos de la campaña, con aro exterior en degradado frío, brillo interior y cápsula para iconos que resaltan tanto los estados normales como los bloqueados.
- **Cómo acceder**: desde el menú Máster elige «Mapa de Rutas (Lite)» para abrir esta vista basada en SVG.

### 🧙‍♂️ **Lista de Clases estilo D&D (NUEVO)**

- **Tarjetas coleccionables** con estética inspirada en D&D y contadores de estado (disponible, progreso, bloqueada).
- **Buscador y orden dinámico** para filtrar por nombre, rol o dificultad y reorganizar la cuadrícula al instante.
- **Editor de retratos integrado** con recorte y zoom para ajustar la miniatura de cada clase antes de guardarla.
- **Panel de detalle interactivo** al pulsar una clase, con pestañas de Resumen, Inspiración (Hitos), Nivel de Campeón, Reglas y Equipación.
- **Acceso directo** desde el menú Máster mediante la nueva opción «Lista de Clases».
- **Constructor de cartas**: la antigua pestaña «Tienda» de la ficha pasa a ser «Cartas» y abre un canvas para previsualizar una carta con textos guía, escribir su nombre, descripción y texto narrativo, subir una imagen de cabecera, definir rasgos y configurar dados, alcance, tipo de combate, cargas y consumos con ranuras táctiles; sus iconos propios cargan en WebP optimizado y el Máster también dispone de acceso directo desde su menú principal.
- **Constructor de cartas por contenedores**: el diseño de carta deja de depender de fondos completos por tipo y pasa a usar una plantilla generada en canvas cuyo marco ocupa todo el tamaño exportable, con cabecera de imagen/título, zona beige con textura de papel y contenedores reordenables para alcance, consumo, daño, rasgos, minion y descripción; carga y consumo usan cuatro slots fijos con estados vacíos visibles, nuevos iconos de consumo tintados por tipo de recurso, elementos con iconos dedicados y color propio, y `Variable` dibujado en canvas. El menú de contenedores concentra la gestión con un máximo de seis por carta, alcance y minion limitados a una instancia, consumo/daño/rasgos/descripción repetibles, y cada contenedor repetido de daño, consumo, rasgos o descripción dispone de su propia caja de edición independiente para configurar valores distintos. Las descripciones pueden ajustar su tamaño según el espacio real disponible, insertar iconos desde un compendio visual con los assets nuevos y ya no convierten palabras clave automáticamente en iconos. Los rasgos se editan por bloque con un máximo de tres etiquetas. Si no queda ningún contenedor activo, el cuerpo de la carta muestra un aviso centrado de `Sin contenedores habilitados`. El contenedor `Minion` queda disponible como estructura de menú sin renderizarse todavía en la carta, y el icono de cabecera puede dejarse vacío o elegirse entre los iconos de cabecera dedicados, que se dibujan junto al título con un tamaño equivalente al texto, además de presets de acento más un color hexadecimal personalizado.
- **Tipos de arma simplificados en cartas**: el constructor de cartas usa solo tres iconos WebP para `Cuerpo a cuerpo`, `Distancia` y `Magia`, reemplazando el catálogo anterior de iconos de armas específicas.
- **Recursos en cartas modulares**: las cargas y consumos se gestionan desde sus propios contenedores, sin el selector lateral antiguo de modos de recursos.
- **Dado Variable y Elementos en Armas**:
  - Se añade el dado **DX** (dado variable) al final de la selección de dados de daño para armas. Al activarse, se oculta la cantidad numérica en la carta y se sustituye la celda de cantidad en el editor por el aviso: *"Dado variable. Depende de otros factores."*
  - Se agrega el icono **Variable** al final de la pool de consumos para su selección y asignación en ranuras.
  - Se integra un selector de **Elemento / Estado** para armas. Si un arma tiene un elemento asignado (distinto de "Ninguno"), se ocultan los campos de dados y cantidad en el editor y se dibuja el icono del elemento en lugar del dado en el canvas con las mismas propiedades.
- **Cuadros de texto en cartas**: las descripciones y textos narrativos del constructor se dibujan sobre paneles negros translúcidos sin marco, con padding interno y texto de usuario alineado desde la esquina superior izquierda.
- **Previsualización del constructor más pulida**: el halo detrás de la carta usa luces elípticas difuminadas y una sombra más suave para evitar cortes visibles alrededor de la previsualización.
- **Subida directa a colección de personaje**: desde el constructor, un jugador puede subir el PNG final a una colección base con el nombre exacto del personaje; si no existe se crea con permisos de edición para ese jugador, y si existe oculta se muestra un aviso para contactar con el Master.
- **Subida automática del Master por tipo**: el constructor del Master puede enviar la carta creada a una colección base oculta según su tipo (`Acciones`, `Estados`, `Armas`, etc.); si existe una colección equivalente la reutiliza y, si no existe, la crea sin permisos visibles para jugadores.
- **Cartas disponibles con descarga PNG**: las barajas muestran el lateral como `Cartas disponibles` y cada carta importable incluye un icono para descargar su imagen en PNG sin pasar por el constructor.
- **Borrado visual de barajas y colecciones**: eliminar una baraja o colección base abre un aviso personalizado con la misma estética del borrado de cartas base.
- **Barajas en el tablero de cartas**: en encuentros de tablero, la biblioteca de cartas muestra las barajas normales disponibles para Master o jugador. Al seleccionarlas se crea un tablero con el nombre de la baraja y sus cartas distribuidas con holgura, manteniendo el orden original para poder moverlas juntas y reorganizarlas luego en mesa.
- **Ocultación de cartas dentro de tableros**: el Master puede marcar un tablero de cartas desde el inspector para que los jugadores vean solo el tablero, sin revelar las cartas contenidas ni sus posiciones hasta que se saquen o se elimine el tablero.
- **Ajustes de trampa y armadura en cartas**: las trampas y armaduras amplían el cuadro de texto al ocultar sus rasgos, y las armaduras usan ranuras específicas sin selector de consumo/elemento.
- **Separación de reglas y lore en cartas**: el cuadro de texto permite insertar separadores con `---` y marcar bloques narrativos con `[lore]...[/lore]`, con botones directos en la barra de formato del editor.
- **Cartas de Minion**: el antiguo tipo `Habilidad` del constructor pasa a `Minion`, con dado, cantidad, alcance/regla, tipo de arma, una fila superior de atributos `Hambre`, `Cuerpo` y `Mente` con iconos y valores editables, y hasta 4 rasgos en las dos filas inferiores.
- **Rendimiento del constructor de cartas**: el canvas agrupa redibujos rápidos, reutiliza cargas de imágenes en curso, precarga recursos comunes en segundo plano y usa una previsualización interna más ligera en móvil sin perder resolución al exportar.
- **Edición directa de todos los campos**: haz clic en título, subtítulo, descripción, etiquetas, reglas o listas para actualizar la clase y guarda los cambios con un solo botón.
- **Hitos con seguimiento**: marca la inspiración completada mediante checks persistentes y resaltados que mantienen el estilo luminiscente del panel.
- **Niveles de clase dinámicos**: controla el número de niveles con un deslizador configurable desde 0 en adelante y edita cada hito de progreso en línea.
- **Equipación categorizada**: arma, armadura y habilidad cuentan con formularios propios y una vista previa sincronizada que refleja de inmediato los datos introducidos.
- **Recorte de retratos mejorado** con mayor rango de zoom para ajustar imágenes verticales sin perder la estética de las cartas.
- **Cartas de equipación enriquecidas** con estadísticas clave (daño, consumos, cargas, rasgos) resaltadas como palabras de poder enlazadas al glosario y paneles teñidos automáticamente según la rareza configurada.
- **Ficha de configuración responsiva** que aprovecha todo el ancho disponible, evita recortes en pantallas ultrapanorámicas, ajusta el retrato a un ancho máximo seguro y mantiene contenedores desplazables dentro de cada bloque para conservar el layout compacto.
- **Seguimiento de niveles completados** mediante casillas activables por nivel con resaltado esmeralda que conservan el progreso dentro de la ficha.
- **Vista previa de equipación refinada** con iconos automáticos para consumos y cargas, categorías saneadas y paneles de rareza que conservan el efecto hover incluso en armas especiales.
- **Rarezas coherentes en equipables**: armas, habilidades, armaduras, accesorios y objetos equipados usan el color exacto definido en el glosario de rarezas.
- **Edición de etiquetas corregida en móvil** para que el botón «Añadir etiqueta» vuelva a funcionar tras los ajustes responsive.

### ⚡ **Sistema de Velocidad Avanzado (NUEVO)**

- **Línea de sucesos en tiempo real** - Seguimiento visual del orden de actuación
- **Píldoras de Equipamiento interactivas** - Uso directo de armas y poderes desde la ficha
- **Consumo de velocidad inteligente** - Cálculo automático basado en emojis 🟡 del equipamiento
- **Coste automático por acciones** - Al resolver ataques y defensas se suma la velocidad consumida al participante
- **Animación de daño sin duplicados** - Cada reacción de combate confirma una sola vez y el efecto flotante se deduplica por evento resuelto
- **Combate del Canvas estabilizado** - Los tokens controlados por el máster desempatan primero cuando comparten velocidad mínima, y la resolución de ataques tolera tokens sin ficha vinculada evitando que Firestore deje el resultado en carga permanente.
- **Indicador de ocupación bloqueada reforzado** - Al arrastrar sobre una formación completa o una ficha 1x1/grande, el Canvas muestra siempre una celda roja con X y motivo aunque el token arrastrado no quepa dentro de una sola casilla.
- **Controles de token seguros en móvil** - La barra de acciones invisible ya no captura toques y el borrado del token se ejecuta solo con un click/tap confirmado, no al empezar un gesto táctil.
- **Previsualización fantasma original restaurada para jugadores** - Los movimientos pendientes del Canvas vuelven a usar la silueta gris dorada y la línea discontinua clásica, incluso al arrastrar sobre formaciones, duelos o casillas ocupadas.
- **Optimización invisible del Canvas** - Se reducen renders y suscripciones redundantes durante arrastres, rotaciones y cambios sin modificar estética, reglas ni controles visibles.
- **Imágenes locales de equipamiento restauradas en Canvas** - Las armas, objetos, armaduras y accesorios antiguos vuelven a resolver sus assets locales WebP desde el inspector y HUD del Canvas.
- **Subidas de imágenes optimizadas a WebP** - Tokens, mapas, cartas, iconos, retratos y equipamiento personalizado se redimensionan y guardan en WebP al subirlos a Firebase Storage cuando el navegador lo permite.
- **Permisos granulares** - Jugadores pueden eliminar sus propios participantes
- **Interfaz color-coded** - Identificación visual por jugador y tipo de equipamiento
- **Sincronización en tiempo real** - Cambios instantáneos para todos los participantes
- **Sincronización manual de la ficha del jugador** - Usa los botones de TokenSettings para subir o restaurar cambios (mantiene la imagen del token)
- **Estados sincronizados de la ficha al token** - Al activar condiciones desde la ficha se aplican inmediatamente al token controlado
- **Modo Master y Jugador** - Controles especializados según el rol del usuario
- **Modo "hot seat"** - Alterna entre fichas controladas con Tab o el selector
- **Selector de ficha centrado** - Muestra el nombre personalizado de cada token
- **Canvas táctico integrado** - VTT principal con escenarios, grid, tokens y combate automatizado
- **Zonas del canvas con anclaje de rotación** - Las zonas rectangulares, circulares, de peligro y de escalera/desnivel se ajustan suavemente a 0°, 90°, 180° y 270° al rotarlas libremente.
- **Tablero de cartas** - El modo Tablero permite crear tableros transparentes y redimensionables para ordenar cartas en mesa, apilar cartas y mantener manos separadas por jugador para que la iniciativa y el HUD muestren la mano real de cada token.
- **Mano contextual en Tablero** - La mano de cartas se escala en escritorio según la resolución disponible y se oculta al deseleccionar el token haciendo clic en una zona vacía del tablero.
- **Fichas de recurso en Tablero** - Añade marcadores circulares compactos en 3D real con valor y color editable para representar costes, recuperación de velocidad u otros recursos sandbox directamente sobre la mesa; los tableros suman su valor, las arrastran consigo al moverlos y todos los participantes pueden manipularlas.
- **Dados 3D en Tablero** - Permite generar dados D4, D6, D8, D10, D12 y D20 como objetos compartidos con color y tamaño configurables. Incluye la mecánica premium de **Lanzamiento por Tirachinas con Tensión Elástica**, donde el arrastre limitado a 150px renderiza una banda elástica rúnica y brillante que transita dinámicamente de Amarillo/Ámbar a Carmesí mediante HSL. Al soltar, el dado es disparado físicamente con precisión sincrónica (vía `flushSync`) en la dirección contraria al vector de arrastre.
- **Registro de tiradas en Tablero** - La pestaña Logs incorpora un lanzador múltiple de D4, D6, D8, D10, D12 y D20 con historial compartido, total de la reserva y desglose visual de cada dado usando la misma estética del inspector; cada tipo de dado puede marcarse como crítico/explosivo y cada dado del registro puede anularse o reactivarse para recalcular el total.
- **Fichas de token personalizadas** - Cada token puede tener su propia hoja de personaje
- **Copiar tokens conserva su hoja personalizada** - Al duplicar un token se clona su ficha con todos los valores (base, total y modificados), colores y visibilidad de estadísticas manteniendo IDs independientes en los mapas del máster y del jugador
- **Tokens almacenados individualmente** - Cada ficha se guarda como documento en `pages/{pageId}/tokens/{tokenId}`
- **Fichas de jugador sin personaje persistentes** - Los tokens asignados a un jugador pero sin ficha asociada guardan sus cambios en `localStorage` igual que los del máster
- **Cargar ficha del jugador bajo demanda** - Usa el selector o el botón "Restaurar ficha" para sincronizar manualmente
- **Nombre en tokens** - El nombre del personaje aparece justo debajo del token en negrita con contorno negro (text-shadow en cuatro direcciones y leve desenfoque)
- **Nombre escalable** - La fuente del nombre aumenta si el token ocupa varias casillas
- **Mini-barras en tokens** - Cada stat se muestra sobre el token mediante cápsulas interactivas y puedes elegir su posición
- **Barras compactas** - Las barras de recursos son más pequeñas y están más cerca del token
- **Corrección de miniaturas** - Vista previa sin parpadeos al pasar el ratón sobre las imágenes del sidebar
- **Ajustes al hacer doble clic** - Haz doble clic en un token para abrir su menú de configuración
- **Iconos de control de tamaño fijo** - Engranaje, círculo de rotación y barras mantienen un tamaño constante al hacer zoom
- **Estados en tokens** - Nuevo botón para aplicar condiciones como Envenenado o Cansado y mostrar sus iconos, ahora aún más grandes, sobre la ficha
- **Botones de estados y ajustes con sombra** - El engranaje y el acceso a estados lucen ahora una sombra negra más notoria para sobresalir
- **Mapas personalizados** - Sube una imagen como fondo en el Canvas táctico
- **Grid ajustable** - Tamaño y desplazamiento de la cuadrícula configurables
- **Luces ambientales configurables** - Añade focos persistentes con radios brillante y tenue, color, opacidad y activación sincronizados para todos los clientes
- **Cuadrícula personalizable** - Alterna visibilidad y define color y opacidad con controles sincronizados entre sesiones
- **Mapa adaptable** - La imagen se ajusta al viewport manteniendo su proporción
- **Zoom interactivo** - Acerca y aleja el mapa con la rueda del ratón
- **Paneo con botón central** - Desplaza el mapa arrastrando con la rueda
- **Sombra de arrastre** - Mientras arrastras un token queda una copia semitransparente en su casilla original
- **Control de capas** - Desde Ajustes puedes subir o bajar un token para colocarlo encima o debajo de otros
- **Capa de tiles** - Inserta losetas independientes para escenografía, muévelas y redimensiónalas desde su propia capa
- **Auras siempre debajo** - El aura de un token nunca se superpone sobre los demás, incluso al cambiar su capa
- **Barra de herramientas vertical** - Modos de selección, dibujo, medición y texto independientes del zoom
- **Herramienta de mirilla** - Selecciona atacante y objetivo mostrando una línea roja
- **Tienda táctica contextual** - El máster gestiona una tienda compartida desde el icono de bolsa: puede fijar oro individual para cada jugador activo (0‑9999), elegir hasta cuatro objetos sugeridos del catálogo completo y sincronizar los cambios con el botón “Actualizar tienda”. Los jugadores consultan esas recomendaciones con filtros, colores de rareza y vista previa detallada, y cuando compran un objeto su saldo y el del máster se actualizan en tiempo real
- **Inventario sincronizado** - El nuevo icono de mochila separa la tienda del resto de herramientas y centraliza los objetos comprados: los jugadores consultan su inventario con la misma estética de la tienda, mientras que el máster puede revisar el de todos, añadir recompensas manuales o retirar elementos al instante
- **Notificaciones animadas de inventario** - Cada compra o ajuste manual sacude la mochila de la barra de herramientas con un destello y muestra contadores flotantes (+1/−1) que se difuminan suavemente para reforzar la sensación de guardar o retirar objetos
- **Mapa desplazado** - El mapa se ajusta para que la barra de herramientas no oculte la cabecera ni los controles
- **Ajustes de dibujo** - Selector de color y tamaño de pincel con menú ajustado al contenido
- **Ajustes de regla** - Formas (línea, cuadrado, círculo, cono, haz), reglas de distancia (Chebyshev, Manhattan, Euclídea, 5/10/5), conversión de unidades personalizable, opciones de cuadrícula, visibilidad para todos y menú más amplio
- **Medición precisa y fluida** - La distancia se calcula con ajuste a la cuadrícula pero la regla sigue al cursor en tiempo real
- **Dibujos editables** - Selecciona con el cursor para mover, redimensionar o borrar con Delete. Cada página guarda sus propios trazos con deshacer (Ctrl+Z) y rehacer (Ctrl+Y)
- **Muros dibujables** - Herramienta para crear segmentos de longitud fija con extremos siempre visibles como círculos. Cada muro muestra una puerta en su punto medio y puedes alargarlo moviendo sus extremos en modo selección; los cambios se guardan al soltar.
- **Puertas configurables** - Al pulsar la puerta de un muro puedes abrir un menú para marcarla como secreta, cerrada u abierta y cambiar el color del muro; los ajustes se guardan en Firebase.
- **Dificultad de puertas** - Puedes asignar una CD a cada puerta y resetearla cuando quieras. Los jugadores deben superar la tirada para abrirlas.
- **Mensajes de puertas** - El chat indica quién intenta abrir la puerta y si la prueba fue superada.
- **Muros dibujables** - Herramienta para crear y alargar segmentos arrastrando antes de guardarlos. Se corrige un error que impedía dibujarlos correctamente.
- **Cuadros de texto personalizables** - Se crean al instante con fondo opcional; muévelos, redimensiónalos y edítalos con doble clic usando diversas fuentes
- **Edición directa de textos** - Tras crearlos o seleccionarlos puedes escribir directamente y el cuadro se adapta al contenido
- **Gestión de estilos de texto** - Al seleccionar un texto se despliega un panel para guardar estilos, aplicarlos en varios cuadros y restablecer cambios rápidamente
- **Notas en Ajustes de ficha** - Editor enriquecido para que jugadores y máster anoten información sobre el token con opciones de alineado de texto
- **Selector de iconos optimizado** - Los iconos de Lucide y los emojis se generan localmente y se cargan más rápido; además, el botón «+» para crear celdas queda centrado
- **Buscador de emojis bilingüe** - El minimapa permite buscar emojis tanto en inglés como en español
- **Buscador de iconos en caché** - El minimapa reutiliza los datos de emojis descargados para evitar peticiones repetidas al desplazarse por el listado
- **Anotaciones emergentes** - Ahora puedes agregar notas a cada celda y se muestran en un tooltip estilizado al seleccionarla o pasar el cursor
- **Pings temporales en el minimapa** - Haz doble clic o Alt+clic sobre una celda para resaltar su posición con una animación breve sincronizada
- **Exploración compartida persistente** - Las casillas reveladas en el modo explorador se sincronizan al instante entre máster y jugadores y se conservan al recargar o cambiar de dispositivo
- **Compartición instantánea de cuadrantes** - Al añadir o quitar jugadores compartidos desde el máster, los permisos se guardan automáticamente en Firebase y llegan al instante a los clientes autorizados
- **Permisos entre jugadores** - Los jugadores pueden compartir cuadrantes guardados con otros jugadores disponibles (sin incluirse a sí mismos) y, al editar uno ajeno, siempre se muestra quién es el creador original
- **Permisos de cuadrantes reforzados** - Los navegadores de escritorio reciben los cuadrantes asignados sin inconsistencias
- **Anotaciones por cuadrante** - Cada cuadrante guarda sus notas con un identificador persistente en Firestore y las migraciones de datos antiguos se aplican automáticamente en memoria
- **Panel maestro de notas** - Revisa y gestiona todas las anotaciones de un cuadrante desde un resumen consolidado

### 🎲 **Gestión de Personajes**

> **Versión actual: 2.7.11**

**Resumen de cambios v2.7.11:**

- **Ajuste de límites en el lateral izquierdo del cuerpo**:
  - Se desplazó la coordenada de inicio horizontal del filtro del cuerpo y del texturizado procedimental a `x = 152` con un ancho de `1584px` (alcanzando el límite derecho en `1736px`).
  - Esto desplaza la cobertura hacia la izquierda para eliminar por completo la holgura lateral izquierda observada en la plantilla de la carta, manteniendo la simetría con respecto a los bordes exteriores de madera de la carta.

**Resumen de cambios v2.7.10:**

- **Restauración de cabecera y corrección de límites del cuerpo**:
  - Se revirtió el filtro de la cabecera (`applyHeaderColorFilter`) a su diseño original con opacidades originales y sin capa de mezcla normal (según preferencia del usuario).
  - Se amplió el ancho horizontal del filtro del cuerpo de la carta (`applyBodyColorFilter` y texturizado procedimental) a `1576px` para que el color se extienda de forma óptima bajo el borde derecho y elimine cualquier holgura o franja sin pintar detectada.

**Resumen de cambios v2.7.9:**

- **Sincronización del filtro de color de la cabecera**:
  - Se actualizó el filtro de la cabecera (`applyHeaderColorFilter`) para utilizar la misma fórmula de mezcla que el cuerpo (opacidades del `color` a `0.55`, `multiply` a `0.20`, y adición de la capa `source-over` al `10%`).
  - Esto garantiza que tanto la cabecera como el cuerpo tengan la misma intensidad de coloración y respondan de forma idéntica a tonalidades neutras/negras/grises.

**Resumen de cambios v2.7.8:**

- **Intensidad de coloración de Fondo cuerpo y soporte de Negro/Gris**:
  - Se incrementaron los valores de opacidad de las capas de fusión en el cuerpo para equipararlos con los de la cabecera (`color` a `0.55` y `multiply` a `0.20`).
  - Se agregó una tercera capa de fusión normal (`source-over` con opacidad `0.10`) que proyecta pigmento directo sobre el pergamino base. Esto permite que colores neutros/acromáticos (como negro, ceniza y gris) tiñan y oscurezcan adecuadamente el fondo sin perder las imperfecciones de la textura original.

**Resumen de cambios v2.7.7:**

- **Ajuste de límites horizontales del color de Fondo cuerpo**:
  - Se ampliaron los límites horizontales de la coloración y el pergamino procedimental del cuerpo (de `x = 168` y ancho `1552` a `x = 160` y ancho `1568`) para que cubran completamente la superficie del papel de izquierda a derecha.
  - Se incrementó el radio de esquina del recorte cóncavo (notched corners) a `52` para ajustarse perfectamente al marco de madera exterior y bordes dorados del pergamino.

**Resumen de cambios v2.7.6:**

- **Máscara de recorte con esquinas cóncavas en Fondo cuerpo**:
  - Se sustituyó el recorte de rectángulo redondeado por un trazado vectorial personalizado que replica de forma milimétrica las esquinas cóncavas decorativas (notched corners, radio `44`) del pergamino interior de la plantilla base.
  - Se ajustaron los límites de coloración (de `y = 752` a `y = 2420`, y de `x = 168` a `x = 1720`) para alinearlos exactamente dentro de las líneas negras del marco, evitando pintar el divisor superior, el marco inferior de madera y las esquinas biseladas.

**Resumen de cambios v2.7.5:**

- **Alineación y recorte de bordes en Fondo cuerpo**:
  - Se extendieron los límites del filtro del cuerpo de la carta (de `y = 740` a `y = 2440`) para rellenar completamente la zona de pergamino eliminando la franja sin teñir bajo la cabecera.
  - Se aplicó una máscara de recorte (`clip()`) al contorno del rectángulo redondeado del pergamino (`drawRoundRectPath`) para que la coloración no se desborde del contorno ni pinte el marco exterior de madera o las esquinas de la carta.

**Resumen de cambios v2.7.4:**

- **Corrección en la aplicación del filtro de color en Fondo cuerpo**:
  - Se corrigió un error que impedía que se tiñera el cuerpo de la carta al editar cartas de tipo General / Armas / Habilidades / etc., debido a que la carga del asset base (`general.png`) omitía la etapa del canvas de dibujo procedimental del papel.
  - Ahora el filtro de color del cuerpo se aplica correctamente superpuesto a la zona de pergamino de la plantilla base cargada.

**Resumen de cambios v2.7.3:**

- **Menú dedicado "Fondo cuerpo" para la Carta**:
  - Se añadió un panel de control independiente "Fondo cuerpo" en el editor lateral (con presets y selector hexadecimal) igual al de "Fondo cabecera".
  - Esto permite personalizar el filtro de color de la textura del cuerpo de la carta de forma independiente del color del acento de la carta.

**Resumen de cambios v2.7.2:**

- **Filtro de color tipo Photoshop para el Cuerpo de la Carta**:
  - Se implementó el mismo sistema de filtro de color dinámico (modos de mezcla `color` y `multiply`) para la textura de papel del cuerpo de la carta, en reemplazo del anterior filtro de color sólido de baja opacidad.
  - Ahora, al seleccionar colores de acento personalizados o preestablecidos (como Verde, Rojo, Azul, etc.), la textura del papel, imperfecciones y partículas del fondo se tiñen de manera orgánica y realista.
  - La selección de la base ("Base", color `#c46f1f`) muestra la textura cálida de papel beige original sin filtros.

**Resumen de cambios v2.7.1:**

- **Botones de Estilo Individuales para Contenedores de Descripción**:
  - Reemplazamos los botones globales de estilo de texto del pie de página por selectores individuales e independientes para cada contenedor de descripción.
  - Ahora cada bloque de descripción dispone de su propio par de botones interactivos ("Narrativo" / "Principal") colocados en su cabecera dentro del editor lateral. Esto permite tener, por ejemplo, una descripción principal y otra de lore/narrativa coexistiendo y configuradas de manera independiente dentro de la misma carta.

**Resumen de cambios v2.7.0:**

- **Ampliación de Límite de Caracteres en Descripción**:
  - Elevamos el límite máximo de caracteres (`descriptionMaxLength`) a un valor generoso y fijo de `4000` (anteriormente limitado dinámicamente a valores bajos como ~500-1000). Esto elimina la restricción del navegador que impedía escribir descripciones largas en la caja de edición lateral.
- **Auto-crecimiento del Último Contenedor de la Carta**:
  - Modificamos el cálculo del alto modular (`getModularContainerHeight`) para que, si el bloque de descripción es el último contenedor renderizable de la carta, este crezca dinámicamente y ocupe el 100% del espacio vertical restante disponible hasta el límite inferior (`contentBottom`), permitiendo visualizar descripciones extensas sin solapamiento con los slots de carga del pie.

**Resumen de cambios v2.6.9:**

- **Rediseño de Slots de Carga en Menú y Rombos Clicables**:
  - Reemplazamos los dropdowns `<select>` del editor lateral por 5 rombos SVG interactivos y del mismo tamaño (38px).
  - Estos rombos ciclan dinámicamente entre Vacío, Hambre (verde), Cuerpo (rojo) y Mente (azul) al hacer click sobre ellos, y muestran abreviaturas claras ("HAM", "CUE", "MEN") en su interior para evitar textos truncados.
- **Justificado del Texto de Descripción Principal**:
  - Implementamos la alineación justificada para el bloque principal de descripciones de la carta. Las líneas intermedias distribuyen su espaciado de forma uniforme, mientras que la última línea de cada párrafo se alinea a la izquierda de forma limpia.
- **Optimización de Espacio y Eliminación de Divisor Redundante**:
  - Eliminamos la línea divisora rústica con rombo que se dibujaba de manera redundante tras el último contenedor activo de la carta.
  - Redujimos el espacio reservada para el pie de página de cargas de `170px` a `110px` (`CHARGE_FOOTER_RESERVED_HEIGHT`), ampliando el espacio vertical disponible para descripciones en la carta.

**Resumen de cambios v2.6.8:**

- **Revertido de Slot 3 y Contenedor de Carga Inline**:
  - Habilitamos nuevamente la edición del tercer slot de carga en el panel lateral (removiendo el divisor estático) para que sea completamente interactivo e igual al resto de slots de carga.
  - Modificamos el flujo de renderizado en `drawCardCanvas` para dibujar el bloque de cargas `charge` de forma inline como un bloque modular estándar en lugar de forzarlo como un pie de página fijo. Esto evita que el bloque de descripción se comprima en exceso y cause guionizados antiestéticos en el texto.
  - Calculamos centros de rombos en `drawInlineChargeContainer` (`[areaCenterX - 186, areaCenterX - 102, areaCenterX, areaCenterX + 102, areaCenterX + 186]`) para que la separación física libre (de borde a borde) entre todos los rombos sea exactamente la misma (~20.5px).

**Resumen de cambios v2.6.7:**

- **Alineación de Estilo de Cargas Modulares y Pintado de Color**:
  - Modificamos `drawModularChargeFooter` para usar el mismo grosor de línea (`lineWidth = 3`) y color (`rgba(181,92,18,0.58)`) de los divisores estándar del cuerpo de la carta (`drawContainerDivider`).
  - Rediseñamos los rombos del pie de cargas para que utilicen `drawSectionDiamond` con rellenos de colores sólidos correspondientes a cada tipo de carga (verde para Hambre, rojo para Cuerpo, azul para Mente y el color de acento de la carta para ranuras vacías), eliminando por completo los iconos y bordes oscuros en el pie de página.
  - Aseguramos que el tercer rombo central actúe de forma puramente decorativa (siempre pintado con el color base `accent`), y deshabilitamos su edición en el panel lateral mostrando un casillero estático con la etiqueta "Divisor".
  - Ajustamos los tamaños de los rombos: el central conserva su escala destacada (`70px`), mientras que los otros cuatro se adaptan a un tamaño de `45px` y se redistribuyen de forma equidistante (`[764, 848, 944, 1040, 1124]`) para equilibrar perfectamente los espacios vacíos intermedios.
  - Implementamos la función `drawBlackIcon` y actualizamos `drawSlotIcon` para pintar las siluetas de los iconos de consumo en negro sólido dentro de los carriles/ranuras de las cabeceras.

**Resumen de cambios v2.6.6:**

- **Iconos de Cabecera Dinámicos a Escala del Título**:
  - Los iconos de tipo de arma y de elemento de la cabecera se escalan de forma dinámica para coincidir exactamente con el tamaño de fuente calculado para el título de la carta (`iconSize = titleSize`).
  - Habilitamos que se rendericen tanto el icono del elemento (`elementIconImg`) como el del tipo de arma (`weaponIconImg`) de forma contigua en la esquina superior derecha si ambos están presentes, organizándose de derecha a izquierda.
  - El algoritmo de ajuste del ancho del título (`fitModularTitleFont`) se ha refinado para contemplar el espacio ocupado por ambos iconos a su escala correspondiente, previniendo cualquier desbordamiento visual.

**Resumen de cambios v2.6.5:**

- **Restauración del Alineamiento de Precisión de Combate**:
  - Implementamos la medición de sub-cadenas mediante `measureText` usando la fuente activa para determinar el desplazamiento X necesario.
  - Esto asegura la alineación horizontal de cada tipo de combate con el rombo divisor central (`x = 944`):
    - *Cuerpo a cuerpo*: Centra la letra **"A"** intermedia en el rombo.
    - *Distancia*: Centra la **primera letra "A"** (izquierda) en el rombo.
    - *Magia*: Alinea el límite de división **entre las letras "A" y "G"** en el rombo.
  - Mantiene el espaciado correcto de `34px` hacia el icono de arma.

**Resumen de cambios v2.6.4:**

- **Refinamiento de la Textura de Polvo y Partículas (Stardust)**:
  - Incorporamos la carga local y asíncrona de `stardust.png` (ubicado en `public/interfaz/stardust.png`) para integrarla como un patrón repetitivo en el canvas sin tildar el origen, permitiendo exportar las cartas como PNG de forma segura.
  - Fusionamos el patrón de stardust con partículas procedimentales optimizadas: motas oscivas/cálidas (`rgba(70, 55, 40)`) y brillantes con opacidades y tamaños calibrados para que la textura sea visible pero extremadamente sutil y elegante.
- **Atenuación Extrema de Puntos de Acento**:
  - Redujimos el tamaño de los 120 puntos de la cuadrícula del color de acento a `1.2px` con una opacidad de tan solo el `4%` (antes `16%`) para que se fundan delicadamente con el fondo rústico sin simular ruido digital.

**Resumen de cambios v2.6.3:**

- **Rediseño del Icono de Mente (Cerebro) Blanco y Detallado**:
  - Implementamos el color **blanco sólido (`#ffffff`)** en todos los lóbulos del cerebro de Mente para asegurar que el icono se vea predominantemente blanco y claro.
  - Evitamos el empastado/oscurecimiento del icono reduciendo el trazo interno de las arrugas a un grosor fino (0.8px en pantalla).
  - Extrajimos y aplicamos el trazo exterior grueso reglamentario (6px en pantalla) de manera exclusiva sobre las siluetas exteriores (sin agujeros internos) de los hemisferios izquierdo y derecho, preservando la nitidez de los surcos internos.
- **Alineación de Precisión en Tipos de Combate**:
  - Ajustamos la alineación de las etiquetas de tipo de combate respecto al rombo central del divisor (`x = 944`):
    - *Cuerpo a cuerpo*: El centro de la letra **"A"** se alinea exactamente en el rombo.
    - *Distancia*: El centro de la **primera letra "A"** (izquierda) se alinea en el rombo.
    - *Magia*: El límite divisorio **entre la "A" y la "G"** se sitúa exactamente en el rombo.
- **Rediseño del Flujo de Carga de Imagen de Portada**:
  - Eliminamos la barra de botones externos de carga y borrado para compactar y limpiar el formulario lateral, renombrando la sección como **"Imagen portada"**.
  - Habilitamos que el propio recuadro de la imagen (tanto con imagen cargada como con el marcador de posición) responda al click para abrir el selector de archivos locales.
  - Añadimos la opción de eliminar la imagen mediante un botón flotante sutil de cruz ("X") en la esquina superior derecha (`h-6 w-6`), de tono gris atenuado (`text-slate-500`) por defecto para mezclarse con el fondo, y que se resalta vívidamente en rojo al pasar el cursor, deteniendo la propagación del click.
- **Textura de Polvo y Partículas de Estrellas (Stardust)**:
  - Reemplazamos la textura plana o de papiro por un algoritmo procedimental de polvo de estrellas y partículas de stardust (con semilla determinista `2026`).
  - Dibuja 1800 micro-partículas de ruido fino, 600 partículas medianas simulando motas y 80 partículas grandes y difuminadas tipo glow sobre el fondo beige de los contenedores, logrando una estética rica en partículas similar al stardust del panel de resumen de clases.

**Resumen de cambios v2.6.2:**

- **Integración y Ajuste del Icono de Mente SVG**: Integramos el nuevo diseño vectorial personalizado para el recurso **Mente** utilizando los caminos vectoriales de `mente.svg` (un cerebro detallado visto desde arriba).
  - **Estilo Sincronizado Homogéneo**: Se adaptó el renderizado de forma uniforme para todos los caminos del SVG (hemisferios y surcos internos), rellenándolos con `iconFill` (color translúcido de fondo) y contorneándolos con `tint` (color de contorno del tema), sin aplicar tintados parciales selectivos.
  - **Resolución de Errores de Sintaxis**: Corregimos los delimitadores de cadenas (errores de comillas y acentos graves) en el canvas del constructor de cartas (`CardBuilder.jsx`).

**Resumen de cambios v2.6.1:**

- **Rediseño de los Iconos Vectoriales de Consumo**: Rediseñamos y actualizamos visualmente todos los iconos vectoriales dibujados en el canvas de la carta en `CardBuilder.jsx` para ofrecer una estética premium y semánticamente alineada a cada recurso:
  - **Mente**: Rediseñado para soportar el renderizado dinámico de caminos vectoriales complejos.
  - **Cuerpo**: Sustituido el monigote de palo por un corazón estilizado con un destello decorativo de luz.
  - **Hambre**: Sustituido el letrero/estómago por un muslo de carne/hueso de alta calidad (drumstick) con marcas de parrilla.
  - **Armadura**: Escudo reducido de 100px a 68px de alto y refinado internamente para un encaje perfecto en la ranura.
  - **Recurso**: Reemplazada la caja 3D abstracta por un saco de monedas con un lazo superior, nudos y una moneda con grabado rúnico.
  - **Variable**: Signo de interrogación ajustado a 64px y removido el círculo interno redundante para una diagramación más limpia.
  - **Tiempo**: Reloj de arena enriquecido con depósitos de arena arriba y abajo y un chorro cayendo por el centro.

**Resumen de cambios v2.6.0:**

- **Constructor de Barajas y Mazos (Deck Builder)**: Diseñamos e implementamos un sistema premium e interactivo para la gestión y creación de múltiples barajas de cartas tácticas (`DeckBuilderView.jsx`).
  - **Acceso para Jugadores**: En la lista de clases en modo jugador (`ClassList.jsx`), la pestaña "Constelación/progresión" se transforma por completo en un constructor de barajas adaptado a la estética de la ficha, manteniendo intacta la progresión de niveles clásica en la interfaz del Master.
  - **Acceso para el Master**: Añadimos un acceso directo independiente ("Colección de Barajas") en el menú principal del Master (`MasterMenu.jsx` y enrutado en `App.js`) para acceder a los mazos globales de la campaña sin interferir con las fichas de los jugadores.
  - **Efecto 3D Tilt Hover y Glare**: Cada carta implementa un envoltorio 3D de inclinación interactiva y destellos de reflejos (glare) en tiempo real al deslizar el ratón, imitando la sensación física de un juego de cartas premium.
  - **Intercambio por Arrastre (Drag & Drop)**: Las cartas permanecen ancladas a una cuadrícula estable y el arrastre usa una copia flotante fija, evitando desbordes laterales o cartas fuera de la interfaz. Al soltar una carta sobre otra se intercambian sus posiciones de forma inmediata, sin movimiento residual posterior al drop.
  - **Orden Manual de Barajas**: Las barajas normales también pueden arrastrarse unas sobre otras para intercambiar posición y guardar un `sortOrder` propio, disponible tanto para Master como para jugadores.
  - **Color Personalizable de Barajas**: Master y jugadores pueden cambiar el color visual de sus barajas desde una paleta plana de esferas integrada en el catálogo, con tonos aplicados directamente a la carpeta y persistidos en Firestore. Al entrar en una baraja, el color seleccionado se refleja de forma contenida en la línea de cabecera y el propietario. Las colecciones base respetan sus reglas de permisos: el Master y los usuarios con edición también pueden ajustar su color.
  - **Controles Flotantes de Carta Refinados**: El botón de eliminación pasa a una papelera integrada con la estética oscura/dorada de las cartas, y el cambio de tipo/rol queda como control iconográfico compacto con microindicador de rotación.
  - **Glossy Glare más Realista**: El reflejo hover de las cartas mantiene el brillo circular bajo el ratón, pero con una caída radial más suave, elegante y sutil para parecer una luz blanca real sobre una superficie brillante, sin barras ni ondas marcadas.
  - **Colecciones Base del Master**: El Master puede crear barajas especiales con distintivo de base de datos para actuar como bibliotecas universales de cartas. Cada colección permite asignar permisos por jugador (`Oculto`, `Ver`, `Editar`) y publicar u ocultar cartas concretas sin eliminar el resto de la colección. Las colecciones base editables incluyen subida directa de cartas desde imagen, y esas cartas aparecen como plantillas mostrando el nombre de su colección de origen.
  - **Orden Visual de Colecciones Base**: Las colecciones universales se muestran separadas debajo de las barajas normales mediante una línea de sección. Por defecto se ordenan alfabéticamente, pero el Master puede arrastrarlas unas sobre otras para intercambiar su posición y guardar un orden manual persistente.
  - **Confirmación de Borrado en Cartas Base**: Al eliminar una carta de una colección base, tanto el Master como los jugadores con permiso de edición reciben un aviso personalizado adaptado a la estética de cartas y optimizado para móvil, evitando borrados accidentales de la base de datos compartida.
  - **Buscador de Biblioteca y Clasificación**: Un buscador lateral recopila exclusivamente las cartas de colecciones base del Master para las que el usuario tenga permisos, permitiendo agregarlas con un solo toque. Cada carta cuenta con un selector de categoría estético tipo badge pill (Acción, Atributo, Trampa, Arma, Armadura, Minion, Habilidad, Estado) y contadores dinámicos que resumen el tipo de baraja creada; al pulsar un contador se filtra la baraja activa por ese tipo.
  - **Cabeceras y Títulos Premium**: Rediseño visual de las cabeceras del constructor de barajas en `DeckBuilderView.jsx` utilizando tipografía clásica `Cinzel`, degradados de color dorados (`from-[#f0e6d2] to-[#c8aa6e]`), sombras de texto rúnicas y subtítulos descriptivos ampliados con espaciado ancho (tracking) para maximizar la inmersión y coherencia con el diseño general del juego.

**Resumen de cambios v2.5.3:**

- **Remoción de Consumo y Escalado de Atributos**: Implementamos la desactivación automática y total del riel de consumo y de sus ranuras (círculos) en las cartas de Acción cuando se selecciona un atributo (`Cuerpo`, `Hambre` o `Mente`) en `CardBuilder.jsx`. Esto elimina la opción anterior de "Quitar Letrero de Consumo" y oculta dinámicamente toda la configuración de consumo del panel lateral para una interfaz de usuario completamente limpia. Asimismo, reestructuramos el motor de dibujo en el canvas para que las imágenes de atributos se rendericen maximizadas y centradas dentro de la ventana de ilustración de la carta (`rx = 125, ry = 410, rw = 1630, rh = 2100`), aplicando coordenadas de recorte exactas para omitir sus márgenes transparentes originales (`290px` - `300px`) y un algoritmo de escalado proporcional (cover/fill) con máscara de bordes redondeados, garantizando un acabado estético de alta definición y 100% libre de distorsiones o achatamientos.

**Resumen de cambios v2.5.2:**

- **Atributos de Acción e Icono Central Personalizado**: Implementamos la capacidad de renderizar una imagen de atributo (`Mente`, `Cuerpo` o `Hambre`) en el centro de la carta de Acción en [CardBuilder.jsx](file:///c:/Users/Arcana/Documents/Proyectos/fichas-rol-app/src/components/CardBuilder.jsx). Integramos una barra de selección en el panel lateral para alternar entre el modo `Dado` y los tres atributos. Al seleccionar un atributo, el sistema carga su imagen correspondiente (`Mente.webp`, `Cuerpo.webp` o `Hambre.webp`) y la plasma en el centro. Habilitamos además una opción interactiva ("Quitar Letrero de Consumo") para ocultar por completo la placa base metálica del riel de consumo.

**Resumen de cambios v2.5.1:**

- **Modos de Recursos Personalizados para Cartas de Trampa**: Este comportamiento pertenece al diseño anterior del constructor de cartas. En el diseño modular actual, los recursos se añaden y ordenan mediante contenedores dedicados, sin el bloque lateral de modos `Carga + consumo`, `Solo carga`, `Solo consumo` o `Sin recursos`.

**Resumen de cambios v2.5.0:**

- **Centrado Adaptativo de Rasgos Solitarios**: Implementamos un algoritmo inteligente de detección de rasgos en [CardBuilder.jsx](file:///c:/Users/Arcana/Documents/Proyectos/fichas-rol-app/src/components/CardBuilder.jsx) que evalúa fila por fila (pares de rasgos). Si en una fila del formulario lateral el usuario escribe texto para un rasgo (izquierdo o derecho) y deja el rasgo complementario vacío o con el valor por defecto (`-`), el sistema oculta automáticamente la columna vacía del canvas y redibuja el rasgo con contenido centrado horizontalmente en el medio de la carta (con un ancho expandido de `740` px, idéntico al de las cartas que cuentan con un único rasgo como las trampas). Si ambos rasgos tienen texto o ambos están en blanco, se dibuja su maquetación normal en doble columna de forma simétrica.

**Resumen de cambios v2.4.99:**

- **Botonera de Selección de Ranuras de Tiempo**: Rediseñamos por completo el selector de ranuras de tiempo de las cartas de Acción en la barra lateral de [CardBuilder.jsx](file:///c:/Users/Arcana/Documents/Proyectos/fichas-rol-app/src/components/CardBuilder.jsx) para unificarlo estéticamente con el selector de "Filas / Pares visibles" de los rasgos. Reemplazamos la caja de selección desplegable (`select`) por un grupo de botones horizontales (`5`, `6` y `7`) de dimensiones idénticas (`h-7 w-10` y esquinas cuadradas). Al pulsar sobre cualquiera de las cifras, el estado se actualiza dinámicamente y el botón seleccionado adquiere un resalte dorado atómico (`border-[#c8aa6e] bg-[#c8aa6e]/15 text-[#f0e6d2]`), resultando en una interfaz sumamente interactiva, de rápido acceso y mucho más limpia.

**Resumen de cambios v2.4.98:**

- **Compactación del Selector de Ranuras de Tiempo**: Refinamos la interfaz inicial de selección en Acción simplificando la nomenclatura y reduciendo el relleno (comportamiento modificado en v2.4.99 por una botonera de números interactiva).

**Resumen de cambios v2.4.97:**

- **Ranuras de Tiempo Dinámicas para Cartas de Acción**: Añadimos soporte para habilitar hasta 7 ranuras de tiempo (consumo) en las cartas de Acción en [CardBuilder.jsx](file:///c:/Users/Arcana/Documents/Proyectos/fichas-rol-app/src/components/CardBuilder.jsx). En la barra lateral se integra un nuevo selector dinámico que permite elegir entre 5 (predeterminado), 6 o 7 ranuras. Al aumentar el número de slots, el riel de consumo centrado (`drawActionConsumptionRail`) calcula dinámicamente el ancho físico total requerido por los círculos (`slotsWidth`) y escala horizontalmente su base (`railWidth`), garantizando una diagramación perfectamente equilibrada y simétrica en el canvas sin importar el número de ranuras habilitadas. Al cambiar a cualquier otro tipo de carta (Armas, Armaduras, Habilidades, etc.), el sistema restablece de forma segura el arreglo a 5 slots para evitar regresiones de formato.

**Resumen de cambios v2.4.96:**

- **Alineación Centrada para Texto Narrativo (Lore)**: Añadimos soporte de alineación horizontal centrada en [CardBuilder.jsx](file:///c:/Users/Arcana/Documents/Proyectos/fichas-rol-app/src/components/CardBuilder.jsx) para los bloques de texto narrativo (`isLore`). El motor de dibujo calcula dinámicamente el ancho natural del texto formateado en cada línea y ajusta el cursor de inicio para centrar simétricamente las oraciones dentro de los márgenes de la carta. Esto proporciona un acabado visual sumamente elegante y clásico para las citas de flavor o texto de trasfondo.

**Resumen de cambios v2.4.95:**

- **Centrado Vertical Automático para Textos Cortos**: Añadimos soporte de alineación vertical equilibrada en [CardBuilder.jsx](file:///c:/Users/Arcana/Documents/Proyectos/fichas-rol-app/src/components/CardBuilder.jsx) para los cuadros de descripción de las cartas. Cuando el contenido redactado es corto y no ocupa toda la altura física disponible del panel (por ejemplo, en descripciones simples de 1 a 4 líneas), el motor calcula dinámicamente la altura total requerida por todos los elementos (líneas de texto, separadores y espacios de interlineado) y aplica de forma matemática un desfase de inicio vertical para posicionar todo el bloque de contenido exactamente en el centro geométrico del panel. Esto mantiene la total consistencia del tamaño de letra base de la baraja y erradica por completo la sensación visual de vacío inferior o asimetría.

**Resumen de cambios v2.4.94:**

- **Justificación Uniforme y Constante para Texto no Guionizado**: Refinamos y unificamos el motor de justificación tipográfica en [CardBuilder.jsx](file:///c:/Users/Arcana/Documents/Proyectos/fichas-rol-app/src/components/CardBuilder.jsx). Eliminamos el umbral restrictivo de líneas laxas (`maxAllowedShare`) y el comportamiento estanco post-icono (`isAfterIcon`) que forzaban la caída a alineación izquierda. Ahora, todos los espacios de la línea (incluidos los que siguen a los iconos de palabra clave) absorben la justificación de manera homogénea y equilibrada, distribuyendo el ancho sobrante de forma atómica y garantizando un párrafo totalmente justificado. La conmutación a alineación izquierda se reserva exclusivamente para casos de imposibilidad física extrema (líneas con menos de 2 espacios).

**Resumen de cambios v2.4.93:**

- **Umbral de Líneas Laxas (Loose Lines) en Justificación**: Implementamos un control de calidad tipográfica inicial para conmutar a alineación izquierda cuando el estiramiento superaba 1.5 veces el ancho por defecto (comportamiento modificado en v2.4.94 para garantizar justificación uniforme).

**Resumen de cambios v2.4.92:**

- **Espacio Estanco y Natural tras Iconos en Justificado**: Corregido el ensanchamiento tipográfico excesivo de la justificación justo después de un icono de palabra clave. Modificamos el tokenizador `getStyledWordsOfLine` para marcar los espacios en blanco que siguen inmediatamente a un token de palabra clave (`isAfterIcon`). En el renderizado justificado, estos espacios se mantienen estancos a su ancho natural (`measureStyledWordWidth`), mientras que los espacios estándares entre palabras absorben y distribuyen el resto del ancho excedente de forma atómica. Si se desactivan los iconos (p. ej. en bloques de Lore), todos los espacios se justifican de manera uniforme.

**Resumen de cambios v2.4.91:**

- **Escalado Proporcional Dinámico del Límite de Caracteres**: Implementado el aumento proporcional automático del límite de caracteres (`maxLength`) en el cuadro de texto de descripción en base al espacio físico real ocupado por el panel de texto en el canvas. Al desactivar rasgos o quitar pares de slots (ranuras de cargas/consumos), el panel del canvas se expande verticalmente (hasta un máximo de `1772` píxeles de alto en cartas sin rasgos como Armaduras y Trampas), lo que incrementa lineal y proporcionalmente el límite de escritura permitida (escalando dinámicamente desde `520` hasta un máximo de `1245` caracteres).

**Resumen de cambios v2.4.90:**

- **Optimización de Espaciado en Iconos Inline**: Corregido el problema de espaciado excesivo (huecos grandes) que se generaba alrededor de los iconos de palabras clave integrados en el texto. Sustituimos el margen fijo basado en caracteres de espacio (`spaceCharWidth`) por un margen proporcional exacto de 15% del tamaño de fuente (`fontSize * 0.15`) en ambos lados de la imagen. Esto previene la duplicación de espacios en blanco y mantiene los iconos de elementos, dados y consumos perfectamente integrados y visualmente equilibrados con el texto adyacente.

**Resumen de cambios v2.4.89:**

- **Precisión Tipográfica en Justificación de Texto**: Solventado cualquier posible desfase (offset) de alineación sub-píxel o pixel-level en el canvas de previsualización de cartas bajo texto justificado. Se asociaron y preservaron los estilos originales de segmento (negrita, cursiva, color) en los tokens de espacio (`getStyledWordsOfLine`) y se rediseñó el motor de justificación para medir y calcular dinámicamente el ancho de espacio natural de cada estilo mediante `measureStyledWordWidth`, asegurando una coincidencia matemática exacta de 100% con los límites físicos (`maxWidth`) de la carta independientemente de su formato.

**Resumen de cambios v2.4.88:**

- **Previsualización de Cartas con Botón Central (PC/Escritorio)**: Implementación del acceso rápido mediante el clic del botón central/rueda del ratón (`e.button === 1`) sobre cartas en el tablero (`isBoardMode && isCardItem`), abriendo la previsualización ampliada idéntica a la pulsación larga de móvil. Se bloquea el autoscroll del navegador.
- **Volteo de Cartas mediante Clic Derecho y Persistencia Inmediata**: Integración del evento `onContextMenu` para permitir voltear cartas rápidamente con clic derecho en PC. Se unificaron y configuraron todas las vías de volteo de cartas (HUD rápido, botón del inspector y clic derecho) para persistir inmediatamente en Firestore de forma atómica y en tiempo real.
- **Sincronización Multiusuario Segura y Conflict-Free en VTT**: Solucionado el problema crítico de sincronización de Firebase donde múltiples jugadores editando o arrastrando fichas a la vez sobrescribían los cambios de otros. Se implementaron bloqueos transaccionales con reconciliación de cambios de servidor en vivo, prevención generalizada de rebotes (snapbacks) de cualquier campo persistente (`recentLocalWritesRef` con soporte para posición, rotación, volteo y otros parámetros) durante modificaciones rápidas y consecutivas, y resguardo local de borradores de edición de inspector para Master y jugadores.

**Resumen de cambios v2.4.87:**

- **Sincronización Absoluta de Pilas en Previsualización de Contenedores**: Corrección del comportamiento al expulsar cartas apiladas desde el menú inferior de previsualización de un tablero. Al sacar una carta hija, se desvincula de forma limpia de su pila y se recalcula el contador del montón restante. Al sacar la carta superior (padre), se mueve todo el montón (padre e hijos) de forma sincronizada a la derecha, impidiendo conteos erróneos u hojas de cartas que queden huérfanas o "invisibles" dentro del tablero.
- **Previsualización de Cartas para Todos los Contenedores**: Habilitada la barra inferior de previsualización con imágenes en miniatura para todos los tableros contenedores (`isCardContainer`) que tengan cartas dentro al seleccionarlos o pasar el ratón, permitiendo expulsar cartas de forma individual a la derecha del tablero con un solo clic.
- **Preservación de Posición al Eliminar Tableros**: Modificado el borrado de tableros contenedores en `deleteItem` para que las cartas de su interior conserven exactamente su posición y rotación originales en el tablero de juego en lugar de agruparse y moverse automáticamente.
- **Preservación de Pilas de Cartas en Contenedores**: Corrección del comportamiento al mover una pila de cartas a un contenedor del tablero, manteniendo intacta la relación de jerarquía (pilas) e impidiendo que las cartas inferiores salgan desplazadas individualmente, garantizando que el contador general del contenedor compute correctamente el total de la pila.
- **Sincronización de Pilas en Desacoples**: Se ajustó el desacople de contenedores y los flujos de desapilado rápido (`unstackTopCard`, `unstackAllCards`, `unstackSpecificCard`) para sincronizar de manera consistente el contenedor de destino de las cartas resultantes.
- **Apilamiento 3D Dinámico de Fichas**: Se implementó una lógica de orden de arrastre virtual que permite que la ficha que se está arrastrando se eleve dinámicamente en 3D (`translateY`) al pasar sobre un montón de fichas estáticas, simulando una torre física en tiempo real. Al soltarse, la ficha se sitúa permanentemente encima del montón y conserva su z-index (`zIndex: 999` en arrastre) y posición exacta de coordenadas de destino.

**Resumen de cambios v2.4.86:**

- **Unificación de Caja de Descripción**: Eliminados los cuadros de texto divididos ("Texto principal" y "Texto narrativo") para todas las cartas (armas, habilidades y trampas), unificándolos en un único cuadro de texto de descripción ("Descripción") que abarca todo el espacio disponible. Se conservan los botones de estilo inferior ("Narrativo" y "Principal") para permitir seleccionar el formato de tipografía del bloque único.

**Resumen de cambios v2.4.85:**

- **Unificación de Altura en Selectores**: Ajustados los selectores del formulario (tipo de arma, dado de daño, y selector de elemento) para establecer una altura unificada de `38` píxeles (`h-[38px]`). Esto alinea de forma exacta sus dimensiones con los botones y el input del selector de cantidad de dados, ofreciendo un acabado visual perfectamente equilibrado y libre de asimetrías.

**Resumen de cambios v2.4.84:**

- **Descripción Dividida Dinámica para Armas sin Rasgos**: Habilitado el modo de descripción dividida (Texto Principal y Texto Narrativo) automáticamente en cartas de Arma (`weapon`) cuando no se muestran rasgos (`showTraits` desactivado). Ambos cuadros se dibujan de forma simétrica con alturas idénticas de `705` píxeles, maximizando el espacio de la carta de forma equilibrada.

**Resumen de cambios v2.4.83:**

- **Distribución Equitativa de Cuadros de Texto**: Rediseñado el espacio de la descripción dividida en cartas de trampa y habilidad. Se ajustaron las coordenadas y alturas para que tanto el cuadro de texto **Principal** como el cuadro **Narrativo** tengan exactamente la misma altura física (de `705` píxeles cada uno con rasgos activos, y de `858`/`859` píxeles sin rasgos activos), garantizando una presentación perfectamente equilibrada en el canvas.

**Resumen de cambios v2.4.82:**

- **Diseño Centrado y Simplificado para el Selector de Estilo**: Eliminada la etiqueta del selector de estilo y centrados los botones "Narrativo" y "Principal" de forma horizontal debajo del cuadro de texto de descripción. Esto asegura una presentación limpia y minimalista alineada con la caja de texto, funcionando perfectamente en PC y móviles.

**Resumen de cambios v2.4.81:**

- **Refinamiento Estético del Selector de Estilo**: Reubicado el selector de estilo de descripción debajo del área de texto (`textarea`) y rediseñado utilizando un grupo de botones estilizados de alternancia en color dorado y gris oscuro. Esto restaura el encabezado clásico original con "Descripción" y "Guionizar" en sus posiciones iniciales, evitando desbordamientos de columna en PC y móvil, integrándose armoniosamente en la maquetación.

**Resumen de cambios v2.4.80:**

- **Estilo de Texto Personalizable para Cartas de una Única Descripción**: Añadida una propiedad y selector visual en el editor (`CardBuilder.jsx`) para cartas que solo tienen un bloque de descripción (como Armas, Armaduras y Estados). Permite seleccionar dinámicamente el estilo entre **Narrativo** (cursiva, por defecto) y **Principal** (normal), adaptando el renderizado en el canvas a la preferencia del diseñador.

**Resumen de cambios v2.4.79:**

- **Expansión Dinámica del Cuadro de Texto de Habilidad y Trampa**: En `CardBuilder.jsx`, cuando no se muestran rasgos (`showTraits` desactivado), el cuadro de texto principal (`primary`) se expande dinámicamente hacia arriba para cubrir el espacio vacío debajo del título. Se inicia en `y = 508` y aumenta su altura a `787` (en lugar de `y = 815` y altura `480`), permitiendo aprovechar al máximo el espacio de la carta cuando no hay letreros ni rasgos definidos.

**Resumen de cambios v2.4.78:**

- **Restauración de Alineación Superior para Textos**: Eliminado el centrado vertical en los bloques de descripción de la carta en `CardBuilder.jsx`. El texto vuelve a su comportamiento estándar e inicial de alinearse directamente desde la parte superior del cuadro de texto (`y = dynamicLayout.y`), tanto para descripciones cortas como largas, garantizando una disposición clásica y uniforme.

**Resumen de cambios v2.4.77:**

- **Corrección de Relación de Aspecto en Previsualización**: Reubicada la clase restrictiva de altura máxima `lg:max-h-[calc(100vh-220px)]` desde la etiqueta `<canvas>` de la carta directamente hacia su contenedor `div` con relación de aspecto (`aspectRatio: '1888/2624'`). Esto soluciona por completo la distorsión o achatamiento vertical de la previsualización en pantallas de menor altura o portátiles, garantizando que el canvas y el contenedor escalen de forma proporcional y mantengan las dimensiones originales y correctas de la carta sin deformarse.

**Resumen de cambios v2.4.76:**

- **Previsualización Optimizada y sin Scroll en Móvil**:
  - Reemplazado `overflow-x-hidden` por `overflow-hidden` en el contenedor `<main>` en móvil/tablet para ocultar la barra de scroll vertical interna no deseada, manteniendo `lg:overflow-visible` en PC para el preview flotante.
  - Reducido el padding horizontal base de la previsualización de `p-4` a `p-3` en móvil para ganar mayor espacio horizontal útil.
  - Aumentado el ancho máximo de la previsualización de la carta de `335px` a `380px` en móvil y de `440px` a `460px` en tabletas (`sm:`). Esto permite que el canvas de la carta aproveche de forma óptima el área del contenedor y se visualice significativamente más grande.

**Resumen de cambios v2.4.75:**

- **Desbloqueo de Scroll Táctico en PC (Ajuste Estético)**: Sustituidas las clases restrictivas del contenedor principal `<main>` en `CardBuilder.jsx` de `lg:static lg:overflow-hidden` a `lg:relative lg:overflow-visible` en escritorio. Esto corrige la limitación técnica del navegador que bloqueaba la posición sticky del canvas, permitiendo que la carta flote suavemente a lo largo del viewport con un elegante margen de 48px (`lg:top-12`) mientras el fondo oscuro y el encuadre de la tarjeta conservan su tamaño completo.

**Resumen de cambios v2.4.74:**

- **Previsualización de Carta Flotante en PC**: Modificado el contenedor interno de la previsualización en `CardBuilder.jsx` para añadir posicionamiento sticky y alineación de inicio en resoluciones de escritorio (`lg:sticky lg:top-8 lg:self-start lg:h-fit`). Esto permite que la carta se desplace suavemente con el scroll del usuario en PC mientras el fondo oscuro general (`bg-[#05070d]/30`) y el encuadre exterior de la sección `<main>` conservan su estructura, tamaño y centrado originales sin verse modificados.

**Resumen de cambios v2.4.73:**

- **Corrección Estética en Regla de Alcance (CardBuilder)**: Reordenado el flujo de dibujo del canvas en `CardBuilder.jsx` para garantizar que las marcas verticales normales (blancas) se integren perfectamente y sin costuras con la línea horizontal central (eliminando cualquier trazo de contorno negro que corte la línea blanca principal). Solo la marca seleccionada (roja) conserva su contorno negro completo y continuo por encima de todo.
- **Ticks Consistentes y Robustos**: Redimensionado el alto de todos los ticks para que tengan la misma altura majestuosa que el tick seleccionado (`y - 36` a `y + 36`), y aumentado su grosor (outline negro de 48px, línea interna blanca de 22px) para que se sientan equilibrados y con peso visual en la composición.
- **Cero Protrusiones en Extremos**: Desplazados los puntos de inicio y fin de la barra horizontal central 15px hacia el interior de forma que sus extremos redondeados queden totalmente contenidos dentro del área de los ticks exteriores, eliminando cualquier imperfección de contornos salientes a los lados.
- **Separación de Texto de Rango**: Incrementada la distancia vertical de la etiqueta del rango ("TOQUE", "CERCANO", etc.) a `labelY = y + 120` (y a 635px en la llamada) para proporcionar un espacio limpio y despejado bajo los nuevos ticks grandes.

**Resumen de cambios v2.4.72:**

- **Reordenación de Habilidades por Arrastrar y Soltar (Bestiario)**: Implementada la funcionalidad completa de Drag & Drop para las habilidades de un enemigo en la vista de detalle.
- **Soporte Híbrido Completo (Ratón y Táctil)**:
  - **Ratón**: Soporte para la API HTML5 Drag and Drop nativa. Permite hacer clic en cualquier parte de la tarjeta de habilidad (excepto campos editables y botones) y arrastrarla para cambiar su posición con una elegante previsualización semitransparente (`opacity-30`) y borde discontinuo carmesí.
  - **Táctil (Dedo/Móvil)**: Tirador de arrastre táctil integrado mediante un icono de agarre (`GripVertical`) junto al punto decorativo de cada habilidad. Utiliza la regla de diseño `touch-none` para desactivar el scroll del navegador solo en el tirador, permitiendo un arrastre táctil preciso y natural sin desplazamientos de pantalla accidentales.
- **Optimización de Firestore**: Para evitar escrituras masivas e innecesarias en la base de datos, el reordenamiento visual se realiza de forma instantánea en memoria local y la sincronización con Firebase (Firestore `setDoc`) se pospone de forma óptima hasta el momento exacto en que se suelta la habilidad (`onDragEnd` / `onTouchEnd`).

**Resumen de cambios v2.4.71:**

- **Integración de Animaciones de Combate VTT**: Nuevo sistema de efectos visuales flotantes sincronizados en tiempo real que muestran el resultado de cada ataque.
- **Feedback Visual Avanzado**: Los números de daño aparecen sobre los tokens con colores específicos según el recurso perdido (Vida en rojo, Armadura en gris, Postura en azul).
- **Daño multibloque escalonado**: Cuando un mismo impacto rompe varios bloques, cada pérdida se muestra con la animación clásica pero con un retraso breve entre una y otra para que Postura, Armadura y Vida no se tapen.
- **Colores de daño sincronizados con las barras**: Los textos flotantes usan la misma paleta que los recursos del juego, incluyendo Postura en verde, Vida en rojo, Armadura en gris, Ingenio en azul y Voluntad/Cordura en morado.
- **Cola de reacciones más clara**: Cuando un token encadena varios ataques, el modal prioriza el siguiente ataque aún sin decidir y marca los anteriores como ya gestionados en el tracker superior, evitando que el progreso visual se quede atrás.
- **Orden estable en ataques encadenados**: La cola de `combat_events` conserva el orden original del golpe usando marcas de tiempo del cliente como respaldo, evitando que Firestore reordene los ataques y el tracker vuelva erróneamente a `1 de 2`.
- **Indicadores de Reacción**: Mensajes dinámicos de «¡Bloqueo Perfecto!», «¡Contraataque!» y «¡Evasión!» que aparecen tras resolver la reacción del defensor.
- **Tinte de Daño Pulsante**: Los tokens que pierden bloques de vida o postura muestran un pulso rojo majestuoso y un efecto de impacto escalable en el canvas.
- **Sincronización Transversal**: Las animaciones se disparan para todos los jugadores conectados en el momento en que el defensor pulsa «Continuar» en su modal de reacción.
- **Transiciones Majestic**: Animaciones lentas y fluidas (4.0s de duración) diseñadas para garantizar la visibilidad total de lo sucedido durante el intercambio.
- **Fix: Previsión de movimiento en combate (Canvas Jugador)**: Corregido un bug donde al arrastrar el token de vuelta a su posición original tras una previsión, el fantasma gris (ghost) saltaba a la posición de previsión anterior en lugar de permanecer en el inicio real del turno.

**Resumen de cambios v2.4.70:**

- Se retiró el panel de «Encuentro activo» y toda su persistencia local para simplificar el flujo del máster.
- Animaciones de sincronización en la tienda táctica: los lotes sugeridos ahora resaltan con un pulso más suave al añadir o comprar objetos, el máster recibe un aviso con los detalles de la compra en tiempo real y los objetos adquiridos quedan marcados como vendidos para poder reemplazarlos rápidamente.
- Vista de ficha con pestaña **General** como layout predeterminado y nueva vista **Equipamiento** centrada en armas, armaduras y poderes.
- Distribución responsive optimizada que aprovecha los espacios laterales para mostrar estadísticas y equipo sin alargar la ficha.
- Campos de rasgos con autocompletado inteligente basado en el glosario al crear o editar armas, armaduras y habilidades.
- Conversión automática de valores numéricos a sus iconos correspondientes en consumo, tecnología, cargas y valor al guardar equipamiento o poderes, manteniendo el número junto al icono en tecnología y valor.
- Animaciones de ganancia y gasto de oro en la tienda táctica con conteo progresivo del saldo del jugador e indicadores flotantes.
- Las armas sin rareza personalizada adoptan ahora un tono gris común y un fondo coherente en la vista previa para diferenciarse de las legendarias.

**Resumen de cambios v2.4.68:**

- Panel de filtros de enemigos con diseño encapsulado, bordes suaves y resultados destacados, mejorando la estética en escritorio y móvil.
- Controles de búsqueda, orden y filtros más accesibles y responsivos, con indicadores compactos y botón de retratos en formato pill.
- Sistema de rarezas personalizadas para armas, armaduras y poderes, con paletas de color aplicadas automáticamente en fichas y catálogos.

**Resumen de cambios v2.4.68:**

- Optimización de assets locales: imágenes de armas, armaduras, objetos, dados, estados y marcas convertidas a WebP para reducir drásticamente el peso del proyecto sin pérdida visual perceptible.

**Resumen de cambios v2.4.67:**

- Recuperado el degradado dorado y violeta clásico de las cartas de enemigos cuando no se selecciona un color personalizado, manteniendo el nuevo sistema de tematización sin perder el estilo original.

**Resumen de cambios v2.4.66:**

- Edición libre de etiquetas en las cartas de enemigos con chips reordenables, atajos de teclado y opción de restablecer las etiquetas clásicas «Criatura — Enemigo».
- Selector de color base que genera automáticamente degradados, bordes y botones coordinados para cada carta de enemigo, manteniendo el estilo mágico incluso con paletas personalizadas.

**Resumen de cambios v2.4.65:**

- Cartas de enemigos más contenidas en escritorio gracias a un ancho máximo reducido en cada breakpoint.
- Ajuste del layout para que cada carta respete su ancho máximo dentro de la cuadrícula de cuatro columnas.

**Resumen de cambios v2.4.64:**

- Rejilla de enemigos en escritorio nuevamente con cuatro columnas para recuperar la disposición solicitada inicialmente.
- Cartas de enemigos con un ancho máximo duplicado en escritorio, aprovechando mejor cada columna sin perder la cuadrícula.

**Resumen de cambios v2.4.63:**

- Cartas de enemigos que ocupan dos columnas completas en escritorio para acercarse al ancho deseado y dar más protagonismo al retrato.
- Botones de acciones reorganizados para situar «Eliminar» en el centro y mantener una jerarquía visual equilibrada junto a «Editar» y «Ver ficha».

**Resumen de cambios v2.4.62:**

- Cartas de enemigos un 50 % más anchas en escritorio para aprovechar mejor la cuadrícula de cuatro columnas y resaltar el retrato.
- Eliminados los contadores de Ataque y Defensa para evitar lecturas confusas y mantener la atención en los atributos clave de la carta.

**Resumen de cambios v2.4.61:**

- Editor visual de retratos para enemigos con recorte y zoom antes y después de guardar la carta.
- Editor de retratos de enemigos integrado en la propia carta de creación: permite arrastrar y ampliar la imagen sin ventana emergente, siguiendo el flujo de las fichas de personaje/clase.
- Controles de estadísticas del creador de enemigos rediseñados con steppers oscuros y táctiles, sin los botones numéricos nativos blancos del navegador.
- Cabecera del creador de enemigos ajustada para móvil: el botón «Guardar enemigo» pasa a una fila segura y se elimina el desbordamiento horizontal.
- Buscador de rasgos reutilizables en la línea de habilidades de la ficha de enemigo para añadir títulos y descripciones ya usados en otros enemigos sin copiarlos manualmente.
- Gestor de combate del bestiario rediseñado con panel de encuentro, filas de enemigo más anchas, recursos segmentados manipulables y franja de efectos activos integrada para mejorar lectura y uso en escritorio y móvil.
- Cartas de enemigos más compactas en escritorio con cuatro columnas y líneas divisorias punteadas entre ellas.
- Indicadores de Ataque y Defensa con etiquetas claras y textos de ayuda para explicar los valores mostrados.
- Botones de acciones de enemigo rediseñados con iconos y degradados acordes al estilo coleccionable.

**Resumen de cambios v2.4.60:**

- Rejilla de enemigos en escritorio con cuatro columnas y mayor separación para evitar cartas gigantes.
- Cartas de enemigos con marco y ornamentos inspirados en Magic: The Gathering, incluyendo indicador de nivel y sección de poder/defensa.
- Nuevo tratamiento visual para la variante "magic" con brillos, degradados y bordes dorados reactivos al hover.

**Resumen de cambios v2.1.1:**

- Rediseño visual de la vista de enemigos como cartas tipo Magic, con layout responsive y efectos visuales exclusivos.
- Las tarjetas de armas y armaduras equipadas mantienen su diseño clásico, separando estilos de cartas de enemigos y equipamiento.
- Animaciones suaves y modernas en atributos, estadísticas y reordenamiento de listas.
- Mejoras de usabilidad y visuales en la ficha de enemigos, imágenes y minijuegos.
- Corrección de bugs visuales y de interacción en tarjetas y componentes.

**Resumen de cambios v2.1.2:**

- Sistema de Píldoras de Equipamiento integrado en el Sistema de Velocidad para uso directo de armas y poderes
- Mejoras en permisos de eliminación: jugadores pueden eliminar sus propios participantes
- Botón de papelera con color rojo consistente en todo el sistema
- Consumo de velocidad inteligente basado en emojis 🟡 del equipamiento
- Interfaz más limpia y organizada para mejor experiencia de usuario

**Resumen de cambios v2.1.3:**

- Corrección de errores críticos de compilación: imports de iconos faltantes (GiFist, FaFire, FaBolt, FaSnowflake, FaRadiationAlt)
- Limpieza completa de código: eliminación de todos los console.log y console.error innecesarios
- Corrección de expresiones regulares: eliminación de escapes innecesarios en patrones de búsqueda
- Eliminación de imports no usados: useState en Input.jsx
- Proyecto ahora compila sin errores ni warnings de ESLint
- Optimización de rendimiento y mantenibilidad del código

**Resumen de cambios v2.1.4:**

- Prevención de error al mostrar el icono de daño cuando no se define el tipo

**Resumen de cambios v2.1.5:**

- Corrección al eliminar equipamiento de enemigos

**Resumen de cambios v2.1.6:**

- Corrección de equipamiento sin datos al agregar nuevas armas, armaduras o poderes en enemigos

**Resumen de cambios v2.1.7:**

- Cierre automático de la previsualización al editar fichas de enemigo

**Resumen de cambios v2.1.8:**

- Las ventanas de edición y vista de enemigos se cierran al pulsar fuera del modal

**Resumen de cambios v2.1.9:**

- Animación de dados mejorada con deslizamiento en la dirección del control.
- Nuevos botones **Guardar datos** y **RESET** para respaldar y restaurar la ficha.
- Nuevo botón dorado **BUFF** para aplicar bonificaciones a las estadísticas.
- Corrección de carga de mapas; se muestra un mensaje de error si la imagen falla.
- Dependencias de ESLint eliminadas para evitar peticiones innecesarias.

**Resumen de cambios v2.1.10:**

- Los cuadros de texto creados en el mapa ahora muestran un marco inicial para
  facilitar su edición.

- Nuevo botón dorado para aplicar buffs a las estadísticas.
- El botón verde "+" ahora incrementa el recurso hasta su valor base.
- Otros ajustes menores.

**Resumen de cambios v2.1.11:**

- Lista completa de jugadores en el campo **Controlado por** al editar un token.

**Resumen de cambios v2.1.12:**

- Indicador de carga en el mapa con spinner mientras se descarga la imagen.

**Resumen de cambios v2.1.13:**

- El token ya no se mueve al editar su nombre en los ajustes.

**Resumen de cambios v2.1.14:**

- Crear personaje ya no envía peticiones repetidas a Firebase al escribir el nombre.

**Resumen de cambios v2.2.0:**

- Botón **Guardar datos** para respaldar la ficha completa.
- Botón **RESET** que restaura la ficha al último respaldo guardado.
- Copia de seguridad ahora también incluye estadísticas eliminadas, claves,
  estados e inventario.
- **Modo Jugador y Modo Máster** - Interfaces especializadas para cada rol
- **Gestión de atributos y recursos** - Dados para atributos y recursos personalizables
- **Equipamiento desde Google Sheets** - Catálogo dinámico de armas y armaduras
- **Habilidades personalizadas** - Creación y gestión de poderes únicos
- **Rasgos en habilidades** - Define rasgos de cada poder y se muestran en sus tarjetas
- **Claves consumibles** - Acciones especiales con contador de usos
- **Carga física y mental** - Sistema automático de penalizaciones por peso
- **Estados del personaje** - Seguimiento de efectos activos con iconos
- **Inventario tradicional** - Sistema de slots drag & drop para objetos básicos y personalizables

**Resumen de cambios v2.2.1:**

- Las fichas nuevas ahora incluyen las estadísticas base de Postura, Vida,
  Ingenio, Cordura y Armadura con sus colores predeterminados.
- Dos resistencias configurables: por defecto Vida para carga física e
  Ingenio para carga mental, seleccionables por el jugador.

**Resumen de cambios v2.2.2:**

- Límite de 5 objetos por ranura en el inventario tradicional.
- Nuevo recurso "pólvora" con color e icono propios.

**Resumen de cambios v2.2.5:**

- Ajuste exclusivo: los buffs de Álvaro siempre cuentan como base cuando se usan para la resistencia física o mental.
- Detección mejorada de la ficha de Álvaro para aplicar la regla solo a él.

**Resumen de cambios v2.2.6:**

- Corrección: los buffs de Postura solo cuentan para la resistencia en la ficha de Álvaro.

**Resumen de cambios v2.2.80:**

- La defensa personalizada se respeta aunque el arma o poder tenga rasgo crítico.
- Se garantiza un único evento de contraataque y se añade la prueba correspondiente.

**Resumen de cambios v2.2.7:**

- Se corrige la penalización de Postura para que otras fichas ignoren el buff al calcular la resistencia.

**Resumen de cambios v2.2.8:**

- Postura solo suma su buff a la resistencia física o mental de Álvaro.

**Resumen de cambios v2.2.11:**

- Grid del Mapa de Batalla ahora puede escalarse y desplazarse para ajustarse al fondo.

**Resumen de cambios v2.2.12:**

- Imagen del mapa se escala automáticamente al contenedor sin perder la relación de aspecto.

**Resumen de cambios v2.2.13:**

- Opción para indicar el número de casillas y ajustar la grid al mapa cargado.
- Mapa sin bordes negros utilizando escalado tipo cover o contain.
- Zoom interactivo con la rueda del ratón en el Mapa de Batalla.
- Búsqueda con autocompletado para objetos de inventario personalizados.
- El formulario de nuevos objetos es ahora más usable en móviles.
- El panel de objetos personalizados se mantiene abierto al crear un ítem.

**Resumen de cambios v2.2.14:**

- Paneo con el botón central del ratón para mover el mapa.

**Resumen de cambios v2.2.15:**

- Nuevo componente **AssetSidebar** para subir y organizar imágenes del mapa.

**Resumen de cambios v2.2.16:**

- Animaciones de despliegue de carpetas y al crear nuevas.
- Las carpetas y sus imágenes ahora se guardan en localStorage.

**Resumen de cambios v2.2.17:**

- Miniaturas completas con object-contain y tamaño fijo de 64 px.
- Previsualización flotante estilo Roll20 al pasar el ratón sobre un asset.

**Resumen de cambios v2.2.18:**

- Arrastre directo de assets al mapa para crear tokens.
- Selección y movimiento por teclado con WASD o Delete.

**Resumen de cambios v2.2.19:**

- Hooks de drag & drop actualizados a la sintaxis de `react-dnd` v14.

**Resumen de cambios v2.2.20:**

- Tokens redimensionables con snapping a la grid y rotación libre.

**Resumen de cambios v2.2.21:**

- Snapping estricto al mover y redimensionar tokens, con ángulo persistente.

**Resumen de cambios v2.2.22:**

- Manejo de rotación más preciso y handle que sigue al token.
- Redimensionado con mínimo de ¼ de celda y drag bloqueado durante el resize.

**Resumen de cambios v2.2.23:**

- Handle de rotación siempre sincronizado al mover el token.
- Rotación alrededor del centro del token.
- Redimensionado cuadrado en múltiplos de celda a partir de 1×1.

**Resumen de cambios v2.2.24:**

- La rotación usa el centro del token como pivote real.

**Resumen de cambios v2.2.25:**

- Giro con angle snapping: si el ángulo está a ±7° de 0°, 90°, 180° o 270° se ajusta automáticamente.

**Resumen de cambios v2.2.26:**

- Hacer clic fuera del mapa deselecciona el token activo.

**Resumen de cambios v2.2.27:**

- Snapping preciso de tokens tras el drag usando la posición real del puntero.

**Resumen de cambios v2.2.28:**

- Nueva lógica de snap basada en la esquina superior-izquierda del token para
  alinearlo siempre con la celda inferior/izquierda.

**Resumen de cambios v2.2.29:**

- Simplificación del drag: el token se mueve libremente y se corrige con
  bounding-box al soltar el ratón.

**Resumen de cambios v2.2.30:**

- Snap definitivo calculado con el centro del token y Math.round para
  garantizar el centrado perfecto.

**Resumen de cambios v2.2.31:**

- Corrección de error al soltar un token: el handle de rotación se actualiza
  correctamente sin fallos de referencia.

**Resumen de cambios v2.2.32:**

- Solucionado desvío inicial al colocar un token por primera vez: ahora se
  alinea en la casilla correcta sin desplazarse a una adyacente.

**Resumen de cambios v2.2.33:**

- Carpetas anidadas en **AssetSidebar** con ventanas flotantes arrastrables.
- Doble clic en una carpeta abre su contenido en primera plana.
- Posibilidad de crear subcarpetas ilimitadas y arrastrar tokens al mapa.

**Resumen de cambios v2.2.34:**

- Las ventanas evitan duplicados y se cierran si se elimina la carpeta.
- Gestión mejorada del z-index para mantenerlas siempre en primer plano.

**Resumen de cambios v2.2.35:**

- Corrección de warning de dependencia faltante en `AssetSidebar` al mover la ventana.

**Resumen de cambios v2.2.36:**

- Rediseño visual de **AssetSidebar** con ancho fijo, fondo oscuro y borde lateral.
- Encabezados de carpeta como botones con icono y subcarpetas resaltadas.
- Miniaturas en grid uniforme y barra lateral con scrollbar personalizada.

**Resumen de cambios v2.2.37:**

- Iconos de subcarpeta sin borde amarillo para un aspecto más limpio.
- Tokens del mapa pueden abrir la ficha de enemigo con un nuevo icono de engranaje.

**Resumen de cambios v2.2.38:**

- Corregido error al abrir la ficha de un enemigo recién asignado al token.

**Resumen de cambios v2.2.39:**

- Icono de engranaje se sitúa en la esquina inferior izquierda del token y abre la ficha al pulsarlo.

**Resumen de cambios v2.2.40:**

- Engranaje separado del token con la misma distancia que el botón de rotación.

**Resumen de cambios v2.2.41:**

- Las fichas personalizadas de los tokens se crean usando los datos del enemigo seleccionado.

**Resumen de cambios v2.2.42:**

- Las fichas de token muestran atributos y equipo como la vista completa de enemigos.

**Resumen de cambios v2.2.43:**

- Las fichas de token también resaltan términos del glosario en la vista de ficha.

**Resumen de cambios v2.2.44:**

- Pueden mantenerse varias ventanas de Ajustes de ficha y hojas de token abiertas a la vez.

**Resumen de cambios v2.2.45:**

- Las ventanas de ficha de token son flotantes y no se cierran al abrir otra.

**Resumen de cambios v2.2.46:**

- Corrección de compilación por etiqueta `div` sobrante en `EnemyViewModal`.

**Resumen de cambios v2.2.47:**

- El Mapa de Batalla incluye accesos rápidos a las Fichas de Enemigos,
  el Sistema de Velocidad y las herramientas del máster.

**Resumen de cambios v2.2.48:**

- Las Fichas de Enemigos ahora incluyen un acceso directo al Mapa de Batalla.

**Resumen de cambios v2.2.49:**

- En el Mapa de Batalla el encabezado queda fijo y muestra el botón al Sistema de Velocidad del máster.

**Resumen de cambios v2.2.50:**

- El encabezado del Mapa de Batalla deja espacio al sidebar de assets para que sus botones no queden tapados.

**Resumen de cambios v2.2.51:**

- La Asset Sidebar y el lienzo del Mapa se desplazan 56 px para no solapar la barra de accesos rápidos.

**Resumen de cambios v2.2.52:**

- Nueva dependencia `use-image` para cargar imágenes en el Mapa de Batalla.
  **Resumen de cambios v2.2.53:**
- Corrige error de compilación por cierre extra de `div` en `App.js`.

**Resumen de cambios v2.2.54:**

- Nuevo botón para volver al Menú Máster desde Herramientas.
- Acceso directo a Herramientas en la vista de Fichas de Enemigos.

**Resumen de cambios v2.2.55:**

- Las fichas flotantes del Mapa de Batalla vuelven a ser movibles y cerrables.

**Resumen de cambios v2.2.56:**

- Las fichas de token ahora pueden editarse de forma independiente, guardando sus cambios en localStorage.
- Las fichas de token se guardan también en Firestore y se sincronizan en tiempo real.

**Resumen de cambios v2.2.57:**

- Equipar armas, armaduras y poderes en fichas de token usa el catálogo activo para mostrar todos los datos.

**Resumen de cambios v2.2.58:**

- Ahora las fichas de token permiten editar sus atributos básicos.
- Las imágenes dentro de las fichas se muestran completas con `object-contain`.

**Resumen de cambios v2.2.59:**

- El nombre configurado en Ajustes de ficha se muestra al pasar el cursor sobre el token.

**Resumen de cambios v2.2.60:**

- El nombre del token se muestra siempre justo debajo y sigue al token en todo momento, en negrita con contorno negro (text-shadow en cuatro direcciones) y leve desenfoque.

**Resumen de cambios v2.2.61:**

- Las fichas de token sin ficha de enemigo usan la imagen del token y permiten editar sus estadísticas. El nombre personalizado se muestra al ver la ficha.

**Resumen de cambios v2.2.62:**

- Al editar las estadísticas de una ficha de token se puede modificar el valor base y el actual (base a la izquierda, actual a la derecha).

**Resumen de cambios v2.2.63:**

- Eliminado el campo duplicado "Mostrar en token" en el editor de fichas.
- La escala del mapa se calcula correctamente cuando no hay imagen de fondo.
- Las barras de recurso se muestran más cerca del token.

**Resumen de cambios v2.2.64:**

- Las mini-barras de los tokens vuelven a mostrar un borde oscuro para que el diseño no sea tan plano.
- El borde se hace un poco más grueso para que sea visible con cualquier zoom.

**Resumen de cambios v2.2.65:**

- Se aumenta considerablemente el grosor del borde de las mini-barras para darles más presencia.

**Resumen de cambios v2.2.66:**

- Las barras de recurso mantienen su tamaño aunque cambies el zoom. Se ven siempre como cuando el zoom está al máximo.

**Resumen de cambios v2.2.67:**

- Las barras de recurso vuelven a escalarse con el zoom para no ocupar demasiado espacio al alejar el mapa.

**Resumen de cambios v2.2.68:**

- Las mini-barras mantienen su grosor visible sin importar el nivel de zoom.

**Resumen de cambios v2.2.69:**

- Las mini-barras se dibujan en una capa fija y conservan su tamaño en píxeles aunque hagas zoom.

**Resumen de cambios v2.2.70:**

- Las barras de recurso se separan un poco del token.

**Resumen de cambios v2.2.71:**

- Se incrementa la distancia de las barras a 20 píxeles.

**Resumen de cambios v2.2.72:**

- Las mini-barras de los tokens se muestran solo al pasar el cursor sobre el token.

**Resumen de cambios v2.2.73:**

- Se puede elegir la visibilidad de las barras del token: para todos, solo para su controlador o nadie.

**Resumen de cambios v2.2.75:**

- Nueva opción **Aura** con radio, forma, color y opacidad configurables.
- Selector de visibilidad para el aura y nuevas opciones de opacidad y tinte del token.

**Resumen de cambios v2.2.76:**

- El tinte del token respeta la forma de la imagen en lugar de cubrir el rectángulo completo.
- El tinte se aplica con el filtro RGBA y los tokens sin imagen mezclan el color base con el tinte.

**Resumen de cambios v2.2.77:**

- Corrección de error "Konva is not defined" al aplicar el filtro de tinte.

**Resumen de cambios v2.2.78:**

- Las texturas de los tokens se cargan con `crossOrigin: 'anonymous'` para que el tinte se aplique correctamente.

**Resumen de cambios v2.2.79:**

- El tinte del token se aplica con el filtro `Konva.Filters.RGBA` directamente sobre la imagen.
- Se elimina el rectángulo rojo que cubría toda la celda.

**Resumen de cambios v2.2.80:**

- El tinte cachea la textura para aplicar el filtro y elimina la caché al desactivarlo.

**Resumen de cambios v2.2.81:**

- La imagen se clona sobre sí misma con `globalCompositeOperation: 'multiply'` para colorear sin perder nitidez.
- Se elimina el uso del filtro `RGBA` y el cacheado de la textura.

**Resumen de cambios v2.2.82:**

- Eliminado el último `useEffect` que aplicaba el filtro RGBA en `MapCanvas.jsx`.
- El overlay colorea el token sin desenfoque ni referencias a `tintRgb`.
- Añadido `updateSizes` a las dependencias de su `useEffect` correspondiente.

**Resumen de cambios v2.2.83:**

- El overlay vuelve a usarse con un `Rect` en modo `source-atop` para evitar el cuadrado opaco.
- El `useEffect` que ajusta tamaños mantiene solo `[cellSize, selected]` y se ignora la advertencia de ESLint.

**Resumen de cambios v2.2.84:**

- Nuevo selector de páginas en el Mapa de Batalla con configuración de grid independiente por página.

**Resumen de cambios v2.2.85:**

- Las páginas del mapa se guardan en Firebase con su fondo y tokens.
- Se elimina la barra de ajustes de grid en el canvas.
- Cada página muestra una miniatura de su fondo en el selector.

**Resumen de cambios v2.2.86:**

- El botón "Examinar" para subir el fondo se muestra ahora encima de las miniaturas.
- Las miniaturas del selector de páginas se han ampliado para mayor visibilidad.

**Resumen de cambios v2.2.87:**

- Las imágenes del Mapa de Batalla ahora se almacenan en Firebase Storage.
- Se limita el almacenamiento total a 1GB para prevenir errores de tamaño.

**Resumen de cambios v2.2.88:**

- Vista previa inmediata del mapa al seleccionar una imagen.
- Corregido un problema que impedía mostrar el fondo tras subirlo.

**Resumen de cambios v2.2.89:**

- Las carpetas y miniaturas del panel de assets se guardan ahora en Firebase.

**Resumen de cambios v2.2.90:**

- Subida de mapas corregida usando el SDK de Firebase Storage.

**Resumen de cambios v2.2.91:**

- Bucket de Firebase Storage actualizado a 'base-de-datos-noma.firebasestorage.app'.

**Resumen de cambios v2.2.92:**

- Imágenes de fondo deduplicadas usando hashes SHA-256 y referencias en Firestore.
- Posibilidad de eliminar páginas del mapa de batalla.

**Resumen de cambios v2.2.93:**

- Se corrige la visibilidad del botón de ajustes en el selector de páginas.

**Resumen de cambios v2.2.94:**

- Diseño responsive para el selector de páginas y su botón de ajustes.

**Resumen de cambios v2.2.95:**

- Sincronización en tiempo real del panel de assets usando Firebase.

**Resumen de cambios v2.2.96:**

- Corrección de error al guardar páginas cuando un token tenía valores `undefined`.

**Resumen de cambios v2.2.97:**

- Subida de tokens deduplicada usando hashes SHA-256.
- Carpetas y tokens del panel de assets se mantienen tras recargar gracias a la caché local de Firestore.

**Resumen de cambios v2.2.98:**

- Se evita sobrescribir los datos de assets al cargar la página esperando a que Firebase devuelva la información.

**Resumen de cambios v2.2.99:**

- Corrección de carga inicial del Mapa de Batalla: los tokens aparecen sin necesidad de cambiar de página.

**Resumen de cambios v2.3.0:**

- Los tokens muestran únicamente un spinner mientras se carga su imagen, sin el rectángulo rojo temporal.

**Resumen de cambios v2.3.1:**

- El mapa de batalla se ajusta automáticamente a la pantalla y ya no requiere scroll en tamaño estándar.

**Resumen de cambios v2.3.2:**

- El encabezado y controles del Mapa de Batalla se desplazan dejando espacio para la barra lateral de assets.

**Resumen de cambios v2.3.3:**

- La barra lateral de assets comienza en la parte superior y ocupa toda la altura del lado derecho.

**Resumen de cambios v2.3.4:**

- Puedes mover imágenes entre carpetas arrastrándolas y soltándolas sobre la carpeta de destino.

**Resumen de cambios v2.3.5:**

- Corrección del drag & drop de tokens en la barra lateral de assets.

**Resumen de cambios v2.3.6:**

- Vista previa del token al arrastrar y movimiento más fluido entre carpetas.

**Resumen de cambios v2.3.7:**

- Corrección del parpadeo al coger tokens y al pasar el cursor sobre las miniaturas.

**Resumen de cambios v2.3.8:**

- Actualización del arrastre para React DnD v14+ evitando la advertencia `spec.begin`.

**Resumen de cambios v2.3.9:**

- Se evita el parpadeo en **AssetSidebar** al mover fichas o abrir sus ajustes.

**Resumen de cambios v2.3.10:**

- El nombre de los tokens se centra correctamente al cargar el mapa.

**Resumen de cambios v2.3.11:**

- La barra lateral de assets incluye botones para alternar entre gestión de carpetas y un nuevo chat (aún sin funcionalidad).

**Resumen de cambios v2.3.12:**

- El chat de la barra lateral ahora permite enviar mensajes como "Master" y mantiene el historial.

**Resumen de cambios v2.3.13:**

- Los mensajes del chat se guardan en Firebase y solo el Máster puede eliminarlos.

**Resumen de cambios v2.3.14:**

- El botón para eliminar mensajes se mantiene visible incluso con textos largos.

**Resumen de cambios v2.3.15:**

- El chat reconoce tiradas como `2d6+1` o cálculos matemáticos y muestra el resultado.

**Resumen de cambios v2.3.16:**

- El resultado de las tiradas en el chat ahora se presenta con el mismo estilo que la calculadora de dados.

**Resumen de cambios v2.3.17:**

- Corrección de paréntesis duplicado en **MapCanvas** que impedía compilar la aplicación.

**Resumen de cambios v2.3.18:**

- Animación al desplegar el menú de ajustes de la herramienta de dibujo.

**Resumen de cambios v2.3.19:**

- Se evita la ráfaga inicial de peticiones POST a Firestore al cargar la barra
  lateral de assets.

**Resumen de cambios v2.3.20:**

- Sincronización de páginas optimizada para evitar envíos repetidos a Firestore.

**Resumen de cambios v2.3.21:**

- Cada página se guarda como documento individual y solo se sincroniza la que está abierta.

**Resumen de cambios v2.3.22:**

- La suscripción a la página actual depende solo de la página abierta y solo actualiza los metadatos cuando cambian, evitando resuscripciones infinitas.

**Resumen de cambios v2.3.23:**

- Los cuadros de texto creados en el mapa ahora tienen un tamaño mínimo inicial para ser visibles al colocarlos.

**Resumen de cambios v2.3.24:**

- Los textos creados en el mapa cuentan con un fondo semitransparente por defecto y el cuadro de edición aparece enfocado con un borde visible.
- Al editar un texto, el área de edición muestra el mismo color y fondo del texto y se puede redimensionar manualmente.

**Resumen de cambios v2.3.25:**

- Se vuelve al sistema de edición mediante ventana emergente. Al crear un texto se solicita el contenido con `prompt` y al hacer doble clic sobre él se puede modificar.
- Los textos siguen pudiéndose redimensionar manualmente con el transformador.

**Resumen de cambios v2.3.26:**

- Los textos del mapa ahora se guardan por página. Al crear un texto en una
  página no aparece en el resto, funcionando igual que los trazos de dibujo.

**Resumen de cambios v2.3.27:**

- Corrección al crear carpetas en el Asset Sidebar. El botón "+ Carpeta" ahora
  crea correctamente carpetas en la raíz.

**Resumen de cambios v2.3.28:**

- Añadido buscador de tokens en la sección de assets para localizar imágenes por nombre.

**Resumen de cambios v2.3.29:**

- Asignar un jugador a un token ya no descarga automáticamente su ficha; usa **Restaurar ficha** para importarla manualmente.

**Resumen de cambios v2.4.0:**

- Sistema de Capas implementado con organización del contenido del mapa en 3 capas independientes.
- Filtrado por capas y asignación automática de nuevos elementos a la capa seleccionada.

**Resumen de cambios v2.4.1:**

- Detección de colisiones con muros para tokens y prevención de colocación en áreas bloqueadas.
- Movimiento WASD restringido que respeta las colisiones con muros.

**Resumen de cambios v2.4.2:**

- Sistema de puertas interactivas con iconos realistas y orientación automática.
- Interacción intuitiva para alternar entre cerrada/abierta desde la capa fichas.

**Resumen de cambios v2.4.3:**

- Sistema de iluminación y visibilidad con cálculo realista de áreas iluminadas usando ray casting.
- Configuración de luz en tokens con radio brillante y un radio adicional de luz tenue (permitiendo desactivar la tenue), color e intensidad personalizables. La luz brillante usa el 100% de la intensidad seleccionada y la luz tenue atenúa la oscuridad con el 80%.
- El radio tenue se dibuja a partir del borde de la luz brillante para que siempre sea visible y nunca emana directamente del token.

**Resumen de cambios v2.4.6:**

- Corrección del sistema de oscuridad para que funcione correctamente en todas las páginas del mapa de batalla.
- Sistema de sombras avanzado con polígonos combinados de iluminación y opacidad configurable.
- Opción para activar/desactivar la oscuridad por página en los ajustes del mapa.

**Resumen de cambios v2.4.7:**

- Fondo automático con grid para nuevas páginas del mapa de batalla.
- Canvas blanco con grid negro y bordes predeterminado al crear páginas.
- Listo para usar inmediatamente sin necesidad de subir imagen de fondo.

**Resumen de cambios v2.4.8:**

- Sistema de visión individual para tokens en ajustes de iluminación.
- Botón "Tiene visión" que controla si el token puede ver el mapa.
- Oscuridad completa (100%) para jugadores sin visión activa.
- Solo pueden ver su propia ficha cuando la visión está desactivada.

**Resumen de cambios v2.4.9:**

- Sistema de oclusión de visión para botones de puertas implementado.
- Los botones de puertas ahora se ocultan completamente cuando están fuera del polígono de visión del jugador.
- Uso del mismo sistema de sombras/oscuridad que los tokens para controlar visibilidad sin efectos de "popping".
- Corrección del sistema de copia y pegado de muros que fallaba por cálculo incorrecto del centro.
- Los muros ahora se pegan correctamente manteniendo su posición relativa y estructura de coordenadas.
- Transiciones suaves cuando los botones de puertas entran/salen del rango de visión.

**Resumen de cambios v2.4.10:**

- Optimización de escritura en Firebase para nombres de tokens con debouncing mejorado (800ms).
- El campo de nombre del token ahora usa debouncing para evitar escrituras excesivas en Firebase.
- Nuevo botón "⚡ Añadir al Sistema de Velocidad" en ajustes de tokens.
- Integración automática con el sistema de velocidad usando el controlador del token como propietario.
- Verificación de nombres duplicados antes de agregar al sistema de velocidad.
- Detección automática del tipo de participante (jugador/enemigo) basado en el controlador.

**Resumen de cambios v2.4.11:**

- Vista de Mapa de Batalla simplificada para jugadores accesible desde fichas de personaje.
- Botón 🗺️ "Mapa de Batalla" en fichas de jugadores para acceso directo al mapa.
- Interfaz restringida para jugadores: oculta selector de páginas, botón subir mapa, menús de master.
- Toolbar simplificada para jugadores: solo herramientas de selección, dibujar, regla y texto.
- Detección automática del token del jugador y activación del modo de visión.
- Restricciones de gestión de tokens: jugadores solo pueden editar SU token controlado.
- Sistema de assets personalizado por jugador con estructura Firebase separada.
- Chat con colores únicos automáticos para cada jugador basados en hash del nombre.
- Navegación automática a la página donde está ubicado el token del jugador.
  **Resumen de cambios v2.4.12:**

- El Mapa de Batalla para jugadores ahora incluye un chat integrado que admite los mismos comandos de la calculadora de dados.
- El nombre del Máster en el chat se muestra en color dorado con un ligero brillo para destacarlo.

**Resumen de cambios v2.4.12:**

- El Mapa de Batalla para jugadores ahora incluye un chat integrado que admite
  los mismos comandos de la calculadora de dados.

**Resumen de cambios v2.4.13:**

- El ataque con la herramienta de mirilla ahora requiere pulsar dos veces sobre
  el objetivo para mostrar el modal de ataque.
- Las tarjetas de poderes equipados muestran ahora **Daño** justo debajo del nombre, antes de **Alcance**, usando el valor definido en el campo Poder al crear la habilidad.

**Resumen de cambios v2.4.14:**

- Corrección: al seleccionar un poder en el modal de ataque o defensa se precarga
  ahora el daño definido en la habilidad.

**Resumen de cambios v2.4.15:**

- El botón "⚡ Añadir al Sistema de Velocidad" en ajustes de tokens ahora es
  más pequeño y usa el mismo color verde que el botón de los jugadores en el
  mapa de batalla.

**Resumen de cambios v2.4.16:**

- Ajuste de daño: ahora se aplica primero a la Postura, luego a la Armadura y por último a la Vida. El daño sobrante no se transfiere a la siguiente estadística.
- Mayor tolerancia antes de sincronizar los datos al editar fichas y tiempo de ventana de defensa ampliado a 20s.

**Resumen de cambios v2.4.17:**

- En el chat, las frases **recibe daño**, **bloquea el ataque** y **contraataca** ahora se resaltan con colores.
- Al recibir daño se muestran animaciones "-X" para **cada** tipo de bloque perdido, con el color de la barra afectada. Los contraataques y defensas perfectas también tienen su propia animación.
- Las animaciones de daño se sincronizan entre pestañas y ahora se ven durante más tiempo para apreciarlas mejor.
- Las animaciones de pérdida de varios bloques se muestran ahora una al lado de otra para mayor claridad y la vida se reduce de forma más lenta, desapareciendo tras 7 segundos.
  El Máster ahora también ve estas animaciones cuando los jugadores reciben daño.
- Ahora las animaciones se comparten entre jugadores y el máster mediante Firestore.
- MapCanvas pasa ahora el `pageId` a los modales de ataque y defensa para sincronizar animaciones.
- Las fichas controladas por el Máster ahora muestran la pérdida de bloques en la vista de todos los jugadores.
- Los eventos de daño se conservan 7 segundos en Firestore para garantizar la sincronización entre navegadores.

**Resumen de cambios v2.4.18:**

- Si un ataque no rompe ni reduce bloques ahora se muestra "**resiste el daño**" en azul en el chat.
- El mensaje automático del ataque ahora muestra los valores actualizados de Vigor y Destreza del defensor.

**Resumen de cambios v2.4.19:**

- Cerrar la ventana de defensa sin responder cuenta como no defenderse y registra una defensa de 0.

**Resumen de cambios v2.4.20:**

- Se añade una animación "Resiste el daño" en el mapa cuando un ataque no causa pérdida de bloques, usando el mismo color azul que en el chat.
- La animación de daño reduce su tamaño de fuente de 40 a 30 para mejorar la legibilidad.

### 🛠️ **Características Técnicas**

- **Interfaz responsive** - Optimizada para móviles y escritorio con TailwindCSS
- **Persistencia en Firebase** - Almacenamiento seguro y sincronización en tiempo real
- **Tooltips informativos** - Información detallada editables en tiempo real
- **Glosario configurable** - Términos destacados con descripciones personalizadas y ajuste de color por código hex
- **Editor de notas con Tiptap** - Edición de texto con negrita, cursiva, subrayado, listas, colores y alineación
  - Ahora las listas numeradas y con viñetas se muestran con sangría adecuada dentro del editor
- **Pruebas automáticas** - Suite de pruebas con React Testing Library
- _Nuevo:_ pruebas que simulan el cambio entre páginas y verifican que los tokens
  se mantienen independientes para jugadores y máster (`PageSwitchTokens.test.js`).
- _Nuevo:_ prueba rápida de cambio de página para asegurar que no se mezclan los tokens
  al navegar velozmente (`QuickPageSwitch.test.js`).
- _Nuevo:_ prueba de sincronización de movimiento de tokens entre jugador y máster
  usando un listener activo (`TokenListenerSync.test.js`).
- _Nuevo:_ prueba de mapeo de nombres de equipo al guardar fichas de tokens
  (`EquipmentSync.test.js`).
- _Nuevo:_ prueba de animaciones de daño actualizada con `act()` y mocks de eventos
  (`MasterDefenseAnimation.test.js`).

## 🧪 Pruebas manuales de gestos táctiles

- **MinimapBuilder**
  - Abrir el minimapa en una tablet o móvil con soporte táctil.
  - Alternar el panel de propiedades (abrir/cerrar) y confirmar que el área del
    cuadrante sigue respondiendo al arrastre y a los toques.
  - Realizar un gesto de pinza para acercar/alejar y soltar todos los dedos;
    repetir el gesto para verificar que el zoom vuelve a iniciarse desde cero
    sin quedarse bloqueado.
- **MapCanvas**
  - Cargar un mapa en un dispositivo táctil y hacer zoom con el gesto de pinza.
  - Alejar los dedos fuera del lienzo y volver a tocar para confirmar que el
    zoom táctil sigue disponible y que el mapa no mantiene punteros fantasma.
  - Repetir la apertura/cierre de paneles laterales del mapa para asegurarse de
    que los listeners táctiles continúan activos en el lienzo principal.

## 🚀 Instalación y uso

### Requisitos previos

- Node.js 16+
- npm o yarn
- Cuenta de Firebase (opcional, para persistencia)

### Instalación

```bash
# 1. Clona el repositorio
git clone https://github.com/ArcanaDoble/fichas-rol-app.git
cd fichas-rol-app

# 2. Instala las dependencias
npm install

# 3. Configura Firebase (opcional)
# Edita src/firebase.js con tus credenciales

# 4. Inicia la aplicación
npm start
```

La aplicación estará disponible en `http://localhost:3000`

1. **Acceso**: Modo Jugador → Botón "⚡" en herramientas
2. **Agregar personaje**: Introduce nombre y velocidad inicial
3. **Usar equipamiento**: Click en píldoras de armas/poderes para aumentar velocidad
4. **Gestionar participantes**: Master puede agregar enemigos y resetear velocidades
5. **Eliminar participantes**: Master puede eliminar cualquier participante, jugadores solo los suyos
6. **Seguir orden**: Actúa siempre quien tiene menos velocidad

### 🔧 Comandos disponibles

```bash
# Desarrollo
npm start          # Inicia servidor de desarrollo
npm test           # Ejecuta las pruebas
npm run build      # Genera build de producción

# Despliegue
firebase deploy    # Despliega a Firebase Hosting
```

## 📋 Arquitectura del proyecto

```
src/
├── components/
│   ├── inventory/             # Inventario tradicional
│   └── [otros componentes]    # UI general
├── firebase.js                # Configuración Firebase
└── App.js                     # Componente principal
```

## 🎯 Últimas mejoras implementadas

**Resumen de cambios v2.1.2:**

- **Sistema de Píldoras de Equipamiento** - Nuevas píldoras interactivas en el Sistema de Velocidad que permiten usar armas y poderes equipados directamente
- **Vincular ficha de jugador** - Al asignar un controlador ya no se descarga automáticamente su ficha; usa **Restaurar ficha** para importarla desde Firestore
- **Fichas de jugador completas** - Las estadísticas personalizadas y el equipamiento se muestran correctamente al enlazar
- **Carga de imágenes optimizada** - Las tarjetas ya no hacen peticiones en bucle al equipar objetos
- **Sincronización total de fichas de jugador** - Se respetan las posiciones personalizadas de estadísticas y se cargan armas, armaduras y poderes equipados
- **Datos de jugador normalizados** - Armas, armaduras y poderes se guardan como nombres simples al sincronizar desde el mapa
- **Mejoras en Sistema de Velocidad** - Los jugadores ahora pueden eliminar sus propios participantes, no solo el master
- **Botón de papelera mejorado** - Color rojo consistente con el sistema de velocidad en inventario y línea de sucesos
- **Corrección de error en MapCanvas** - Paréntesis faltante causaba fallo de compilación
- **Consumo de velocidad inteligente** - Las píldoras muestran el consumo real basado en emojis 🟡 del equipamiento
- **Coste automático por acciones** - Al resolver ataques y defensas se suma la velocidad consumida al participante
- **Mejoras responsive móviles** - Botones de Mapa de Batalla y Herramientas y formularios de enemigos se adaptan mejor a pantallas pequeñas
- **Interfaz más intuitiva** - Píldoras organizadas por color (azul para armas, morado para poderes) sin subtítulos
- **Corrección de desincronización** - Las páginas ya no se actualizan antes de
  cargarse por completo
- **IDs de fichas** - Cada token creado ahora recibe un `tokenSheetId` único para evitar conflictos
- **Copiado de tokens completo** - Al duplicar un token se clonan también sus estadísticas y se asigna un `tokenSheetId` independiente
- **Guardado exclusivo para el máster** - Los tokens, líneas y otros datos del mapa solo se guardan si el usuario es máster
- **Menús de token robustos** - Se eliminan IDs obsoletos al abrir configuraciones o estados, evitando errores si la ficha fue borrada
- **Sincronización de puertas** - Abrir o cerrar puertas se guarda correctamente al mover un token
- **Mirilla funcional para ataques** - Los jugadores pueden seleccionar objetivos enemigos con un clic y atacar con un segundo clic
- **La mirilla apunta a tokens ajenos** - Ahora también puedes fijar como objetivo fichas controladas por otros jugadores o por el máster
- **Atributos con color en fichas** - Destreza, Vigor, Intelecto y Voluntad muestran sus colores y los valores de dados se ven en gris armadura (#9ca3af)
- **Doble clic seguro en mirilla** - Al usar la mirilla, el doble clic ya no abre el menú de ajustes del token
- **Iconos de puerta siempre orientados** - Los SVG de las puertas se muestran correctamente aunque el muro se dibuje al revés
- **Edición de estadísticas fiable** - Al borrar una estadística de la ficha se elimina también de `resourcesList`, evitando que reaparezca

**Resumen de cambios v2.1.1:**

- Vista de enemigos rediseñada como cartas coleccionables (Magic-like), con responsive y efectos visuales exclusivos.
- Equipamiento equipado (armas/armaduras) restaurado a su diseño clásico, sin efectos de carta.
- Animaciones suaves en atributos, dados y listas reordenables.
- Mejoras visuales en imágenes de enemigos y atributos.
- Corrección de bugs visuales y de interacción.

- ✅ **Estadísticas en tiempo real** (ocupación, valor total, etc.)

### 🎨 **Mejoras de UX/UI Completas** (v2.1)

- ✅ **Pantalla de inicio rediseñada** con animaciones y efectos de partículas
- ✅ **Login de máster mejorado** con diseño moderno y feedback visual
- ✅ **Selección de jugador renovada** con grid de personajes existentes
- ✅ **Menú máster completamente rediseñado** con mejor presentación visual
- ✅ **Componentes mejorados** (Boton, Input, Tarjeta) con más variantes y estados
- ✅ **Sistema de notificaciones Toast** para feedback de acciones
- ✅ **Modales avanzados** con confirmaciones y efectos de transición
- ✅ **Loading spinners** con múltiples variantes y animaciones
- ✅ **CSS mejorado** con animaciones personalizadas, gradientes y efectos
- ✅ **Scrollbars personalizados** y efectos de hover mejorados

### 🔧 **Mejoras de Componentes**

- ✅ **Boton mejorado** con tamaños, variantes, estados de loading y iconos
- ✅ **Input avanzado** con validación visual, iconos, clear button y estados
- ✅ **Tarjeta renovada** con efectos de hover, gradientes y estados interactivos
- ✅ **Modal system** con confirmaciones, overlay personalizable y hooks
- ✅ **Toast notifications** con tipos, auto-dismiss y animaciones
- ✅ **LoadingSpinner** con múltiples tamaños, colores y variantes

### 🛠️ **Mejoras Técnicas**

- ✅ **Performance optimizada** con `useMemo` y `useCallback`
- ✅ **Gestión de estado mejorada** con hooks personalizados
- ✅ **Collision detection perfecto** considerando rotación de objetos
- ✅ **Persistencia en Firebase** con timestamps y metadatos
- ✅ **Manejo de errores robusto** con feedback visual
- ✅ **Código modular** con componentes reutilizables
- ✅ **ToastProvider** integrado para notificaciones globales
- ✅ **CSS variables** para temas y gradientes personalizados

## 🔄 Historial de cambios recientes

**Resumen de cambios v2.1.3:**

- ✅ **Errores críticos solucionados** - Imports de iconos faltantes corregidos para evitar errores de compilación
- ✅ **Código completamente limpio** - Eliminación de todos los console.log y console.error innecesarios
- ✅ **Expresiones regulares optimizadas** - Corrección de escapes innecesarios en patrones de búsqueda
- ✅ **Imports optimizados** - Eliminación de useState no usado en Input.jsx
- ✅ **Compilación perfecta** - Proyecto ahora compila sin errores ni warnings de ESLint
- ✅ **Mantenibilidad mejorada** - Código más limpio y fácil de mantener
- ✅ **MapCanvas optimizado** - Nuevos refs para tokens y cuadrícula evitan llamadas repetidas a `/Listen`
- ✅ **Animación de daño refinada** - El tinte rojo se desvanece suavemente usando `requestAnimationFrame`
- ✅ **Defensa instantánea** - La ventana se cierra en cuanto se resuelve la tirada
- ✅ **Medición precisa de distancias** - El conteo usa el mayor desplazamiento y el texto se desplaza 20px para evitar que lo tape el cursor

### 🎮 **Mejoras en Minijuego de Cerrajería **

- ✅ **Velocidad aleatorizada mejorada** - Variación sutil de ±10% para evitar patrones predecibles
- ✅ **Balance de dificultad mantenido** - Misma variación en todos los niveles sin afectar jugabilidad
- ✅ **Información de velocidad** - Mostrar variación porcentual en tiempo real y resultados
- ✅ **Historial mejorado** - Incluye datos de velocidad para análisis de intentos anteriores

### 🔧 **Corrección de Permisos Firebase **

- ✅ **Reglas de Firestore configuradas** - Solucionado error "Missing or insufficient permissions"
- ✅ **Configuración de seguridad** - Añadidas reglas permisivas para acceso completo a datos
- ✅ **Archivos de configuración** - Creados `firestore.rules` y `firestore.indexes.json`
- ✅ **Reglas de Storage añadidas** - Nuevo archivo `storage.rules` con acceso abierto para subir imágenes
- ✅ **Despliegue actualizado** - Firebase configurado correctamente para producción
- 🔧 **CORS habilitado en Storage** - Ejecuta `gsutil cors set cors.json gs://<YOUR_BUCKET_NAME>`
  con este `cors.json`:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "HEAD"],
    "maxAgeSeconds": 3600
  }
]
```

- 🔧 **Fondos de mapa persistentes** - Las imágenes se suben automáticamente a `Mapas/` en Firebase Storage evitando guardar URLs temporales `blob:`
- 🔧 **Guardado inmediato de mapas** - Tras la subida, la página se actualiza en Firestore con la URL definitiva
- 🔧 **Rutas seguras en Storage** - Los archivos se guardan usando `encodeURIComponent` para evitar errores por espacios o acentos

**Resumen de cambios v2.1.4:**

- ✅ **Snap perfecto tras drag** - Los tokens quedan totalmente centrados en la casilla al soltarlos

**Resumen de cambios v2.1.5:**

- ✅ **Listado completo de jugadores** - Ahora se muestran todos los nombres en "Controlado por" al editar un token
- ✅ **Ajustes de token en tiempo real** - Los cambios se aplican sin cerrar la ventana de configuración

**Resumen de cambios v2.1.6:**

- ✅ **Tinte nítido** - El token usa filtro RGBA en lugar de un overlay
- 🔧 **Cacheado con pixelRatio** - La imagen se cachea a la resolución de pantalla para no perder nitidez
- 🛠️ **pixelRatio ajustado** - El zoom del mapa se tiene en cuenta para evitar desenfoque
- 🚫 **Selección intacta** - El contorno de selección ya no se tiñe

**Resumen de cambios v2.1.7:**

- ✅ Spinner visible mientras se carga la imagen del mapa para evitar pantalla negra

**Resumen de cambios v2.1.8:**

- ✅ Al escribir el nombre del token en los ajustes ya no se mueve accidentalmente

**Resumen de cambios v2.1.9:**

- ✅ Se muestra un mensaje de error si la imagen del mapa falla y se oculta el spinner
- 🔧 Dependencias de ESLint eliminadas para evitar peticiones innecesarias

**Resumen de cambios v2.4.12:**

- ✅ **Restricciones de selección para jugadores** - Los jugadores solo pueden seleccionar tokens que controlan y elementos que crearon
- ✅ **Validación exhaustiva** - Aplicada en selección individual, Ctrl+click, selección múltiple y Ctrl+A
- ✅ **Tracking de creadores** - Campo `createdBy` agregado a líneas, muros y textos para validación de permisos
- ✅ **Visibilidad de barras mejorada** - Master SIEMPRE puede ver barras independientemente de configuración
- ✅ **Sincronización en tiempo real** - Listener `onSnapshot` para cambios instantáneos de visibilidad de mapas
- ✅ **Seguridad reforzada** - Sistema completo de permisos que respeta roles de usuario

**Resumen de cambios v2.4.13:**

- ✅ **Independencia completa de mapas** - Cada mapa mantiene contenido completamente independiente
- ✅ **Carga única por página** - Reemplazado `onSnapshot` por `getDoc` para evitar sincronización cruzada
- ✅ **Estados separados** - Sin propagación de cambios entre mapas diferentes
- ✅ **Cambio de página seguro** - Cambiar página NO elimina contenido de otras páginas
- ✅ **Modificaciones localizadas** - Mover tokens solo afecta página actual
- ✅ **Logs de debug** - Tracking completo de operaciones de carga y guardado por página
- ✅ **Manejo de errores robusto** - Try-catch y promesas con feedback detallado

**Resumen de cambios v2.4.14:**

- ✅ Comparaciones profundas centralizadas en `src/utils/deepEqual.js`

**Resumen de cambios v2.4.15:**

- ✅ Guardados pendientes de tokens, líneas, muros, textos y fondo se cancelan al cambiar de página

**Resumen de cambios v2.4.16:**

- ✅ Listener `onSnapshot` mantiene tokens, líneas y demás elementos actualizados al instante para el máster

**Resumen de cambios v2.4.17:**

- ✅ Se evita que una carga previa de página sobrescriba el estado actual comprobando la versión del efecto

**Resumen de cambios v2.4.18:**

- 📝 Se elimina la indicación redundante de espera dejando solo el mensaje principal

**Resumen de cambios v2.4.19:**

- ✅ Los valores `enableDarkness` y `darknessOpacity` de la página visible se actualizan al instante para los jugadores
- ✅ La visibilidad de las barras de los tokens se propaga en tiempo real entre máster y jugadores

**Resumen de cambios v2.4.20:**

- ✅ Ventanas de ficha movibles para los jugadores
- ✅ Armas, armaduras y poderes se muestran correctamente en su ficha del mapa

**Resumen de cambios v2.4.21:**

- ✅ Nueva herramienta de ataque con línea de distancia
- ✅ Ventanas de ataque y defensa con tiradas automáticas
- ✅ Las barras de vida de fichas de otros jugadores ahora se cargan
  automáticamente
- ✅ Debes elegir tu propio token como atacante y la selección se mantiene hasta cambiar de herramienta
- ✅ Puede apuntar a tokens controlados por otros jugadores o el máster
- ✅ Un clic fija el objetivo y el siguiente inicia el ataque
- ✅ El doble clic no abre ajustes de token cuando se usa la mirilla
- ✅ El objetivo se reconoce al pulsar en cualquier punto de su casilla
- ✅ El atacante y el objetivo se destacan con un marco de color

**Resumen de cambios v2.4.22:**

- ✅ Los cambios en la ficha de un token controlado actualizan al instante la ficha de su jugador
- ✅ Al modificar el equipamiento desde el token, la ficha del jugador se actualiza automáticamente
- ✅ Las fichas de jugador se sincronizan automáticamente con los tokens controlados tras editar la ficha
- ✅ Se corrige un error que impedía aplicar estos cambios cuando se abrían los ajustes del token
- ✅ Activar condiciones desde la ficha ahora refleja el estado al instante en el token correspondiente
- ✅ Guardar la ficha envía el evento de actualización sin esperar a Firebase para evitar retrasos

**Resumen de cambios v2.4.23:**

- ✅ La ficha de jugador se actualiza automáticamente al recibir el evento `playerSheetSaved` desde otras pestañas o tokens
- ✅ Al detectar cambios en `localStorage`, la ficha se actualiza sin recargar la página
- ✅ Los estados de los tokens controlados se sincronizan al instante al modificarse `localStorage`

**Resumen de cambios v2.4.24:**

- ✅ El máster puede seleccionar cualquier token como atacante sin fijar objetivo automáticamente
- ✅ El objetivo solo se fija al hacer clic sobre otro token, permitiendo cambiarlo fácilmente
- ✅ Prueba unitaria garantiza el funcionamiento correcto

**Resumen de cambios v2.4.25:**

- ✅ El menú de ataque y defensa solo muestra armas o poderes al alcance
- ✅ Mensajes claros cuando no hay equipamiento o ningún arma puede utilizarse

**Resumen de cambios v2.4.26:**

- ✅ Los menús de ataque y defensa listan correctamente las armas y poderes equipados
- ✅ Se tiene en cuenta el alcance aún cuando proviene de valores como "Cuerpo a cuerpo" o "Media"
- ✅ Las tiradas utilizan el daño definido para cada arma o poder

**Resumen de cambios v2.4.27:**

- ✅ Los alcances se limitan a cinco categorías: Toque, Cercano, Intermedio, Lejano y Extremo
- ✅ Se eliminan sinónimos como "corto" o "media" para evitar confusiones

**Resumen de cambios v2.4.28:**

- ✅ Al escoger un arma o poder aparece un campo con su daño por defecto
- ✅ Dicho campo es editable para modificar la tirada de ataque o defensa

**Resumen de cambios v2.4.29:**

- ✅ El campo de daño solo muestra valores como `1d8` o `2d6`, ocultando el tipo de daño
- ✅ También se rellena correctamente el daño de los poderes al seleccionarlos

**Resumen de cambios v2.4.30:**

- ✅ Los resultados extra por "crítico" se muestran en rojo dentro de la calculadora y el chat

**Resumen de cambios v2.4.31:**

- ✅ Nuevo menú de barras para editar estadísticas del token y controlar su visibilidad
- ✅ Las tiradas normales vuelven a mostrar todos los resultados

**Resumen de cambios v2.4.30:**

- ✅ Los menús de ataque y defensa muestran ahora todos los rasgos de las armas y poderes seleccionados (informativo)

**Resumen de cambios v2.4.48:**

- 🔧 `handleDragEnd` solo sincroniza los tokens si realmente cambian de posición

**Resumen de cambios v2.4.30:**

- ✅ Nueva casilla "Rangos de visión" en el mapa de batalla del máster
- ✅ Permite ocultar el contorno amarillo de visión de los tokens

**Resumen de cambios v2.4.30:**

- ✅ Los eventos de visibilidad de barras incluyen la página de origen
- ✅ Los cambios solo se aplican si corresponden a la página abierta, evitando sobrescritura entre escenas

- ✅ El máster puede seleccionar cualquier token como atacante sin fijar objetivo automáticamente
- ✅ El objetivo solo se fija al hacer clic sobre otro token, permitiendo cambiarlo fácilmente
- ✅ Prueba unitaria garantiza el funcionamiento correcto

**Resumen de cambios v2.4.31:**

- ✅ Los mensajes de ataque y defensa muestran el nombre del token si está definido
- ✅ Si el token no tiene nombre, se usa el del asset correspondiente

**Resumen de cambios v2.4.33:**

- ✅ Tras lanzar el ataque se crea una solicitud en la colección `attacks`
- ✅ El jugador objetivo o el máster reciben la notificación y abren la defensa
- ✅ Solo se activa para jugadores con el mapa abierto controlando un token
- ✅ Optimizado el listener para evitar conexiones repetidas a Firestore
- ✅ Suscripción estable para prevenir reconexiones al renderizar el mapa
- ✅ La defensa se resuelve automáticamente si nadie responde
- ✅ Si no hay armas o poderes disponibles, el defensor puede introducir un valor manual de defensa

**Resumen de cambios v2.4.35:**

- ✅ El daño se calcula como `floor(daño / atributo)` y se aplica primero a la postura, luego a la armadura y finalmente a la vida
- ✅ El daño restante no pasa a la siguiente estadística si quedan bloques disponibles en la actual
- ✅ Si la defensa supera al ataque se produce un contraataque automático
- ✅ Los mensajes de chat muestran tiradas, diferencia y bloques perdidos

**Resumen de cambios v2.4.36:**

- ✅ El icono de puerta tiene un área de clic más grande y visible
- ✅ Se cambia el cursor a puntero al pasar sobre el icono

**Resumen de cambios v2.4.37:**

- ✅ Los modales de Ataque y Defensa muestran el consumo de velocidad del arma o poder seleccionado

**Resumen de cambios v2.4.38:**

- ✅ Nuevos botones para restaurar o subir la ficha del jugador desde los ajustes del token

**Resumen de cambios v2.4.39:**

- ✅ Se elimina el botón "Actualizar ficha" manteniendo "Restaurar ficha" y "Subir cambios"

**Resumen de cambios v2.4.40:**

- ✅ El selector de ficha activa puede arrastrarse a cualquier posición de la pantalla

**Resumen de cambios v2.4.41:**

- ✅ Los modales de Ataque y Defensa guardan las estadísticas modificadas con `saveTokenSheet`
- ✅ Al mover un token se mantienen correctos la vida y demás recursos

**Resumen de cambios v2.4.42:**

- ✅ Restaurar la ficha de un jugador aplica valores predeterminados para que las barras sean visibles
- ✅ Las estadísticas pueden modificarse y guardarse sin problemas

**Resumen de cambios v2.4.43:**

- ✅ Las fichas restauradas se normalizan en el tablero para mostrar todas las barras

**Resumen de cambios v2.4.44:**

- ✅ Distintivo visible cuando un token pertenece al jugador actual
- ✅ Mensaje junto a "Restaurar ficha" y "Subir cambios" recordando la vinculación

**Resumen de cambios v2.4.45:**

- ✅ Las animaciones de daño se muestran tanto al atacante como al defensor
- ✅ La ventana de defensa se cierra automáticamente en todas las vistas al resolverse
- ✅ Se sincronizan las animaciones en navegadores distintos mediante Firestore

**Resumen de cambios v2.4.46:**

- ✅ Los modales de Ataque y Defensa cargan la ficha desde Firestore si no está en caché
- ✅ Se actualizan automáticamente al guardarse cualquier ficha

**Resumen de cambios v2.4.47:**

- 🛠️ Se corrigen las animaciones de daño para que todos los jugadores las vean en tiempo real

**Resumen de cambios v2.4.48:**

- Las modificaciones de tokens de los jugadores se fusionan con los datos actuales de Firebase para mantener los tokens de otros jugadores.

**Resumen de cambios v2.4.49:**

- Se cambia la frase de la animación: "¡Defensa perfecta!" por "¡Bloqueo perfecto!".

**Resumen de cambios v2.4.51:**

- Los tokens se tintan de rojo al recibir daño y el tinte se desvanece progresivamente.

**Resumen de cambios v2.4.52:**

- El tinte rojo solo se aplica cuando el token pierde vida, armadura o postura.

**Resumen de cambios v2.4.53:**

- El tinte rojo se desvanece siempre tras 7 segundos sin quedarse pillado.

**Resumen de cambios v2.4.54:**

- La animación del tinte rojo ahora es consistente.

**Resumen de cambios v2.4.55:**

- Debouncing reducido en el Mapa de Batalla para mover tokens y abrir puertas,
  mejorando la sincronización para máster y jugadores.

**Resumen de cambios v2.4.56:**

- El aviso "Vinculado a tu ficha" solo aparece tras usar "Restaurar ficha" en el token.

**Resumen de cambios v2.4.57:**

- "Subir cambios" ahora confirma antes de actualizar y avisa si la ficha no está enlazada.

**Resumen de cambios v2.4.59:**

- Redimensionado de tokens sin snapping hasta soltar, para un ajuste más cómodo.
  **Resumen de cambios v2.4.59:**

- La herramienta de mirilla ya no selecciona el token ni muestra el transformador de tamaño al hacer clic.

**Resumen de cambios v2.4.60:**

- Con la mirilla seleccionada puedes moverte por el escenario pulsando la rueda del ratón y arrastrando, sin usar la herramienta del cursor.

**Resumen de cambios v2.4.61:**

- Se corrige el desplazamiento del escenario con la mirilla activada usando la rueda del ratón.

**Resumen de cambios v2.4.62:**

- La regla se alinea correctamente con el cursor al usar el ajuste a la cuadrícula.

**Resumen de cambios v2.4.63:**

- Se restaura el ajuste de la regla al centro o a la esquina sin desfasar el cursor.
- El conteo de casillas es correcto en todas las direcciones y el texto se muestra desplazado para que no lo tape el ratón.

**Resumen de cambios v2.4.64:**

- El ajuste de la regla ahora desplaza la figura al centro o a la esquina de la cuadrcula en lugar de solo calcular la distancia.

**Resumen de cambios v2.4.65:**

- Los ataques ahora suman el dado del atributo si el arma tiene rasgos como `vigor`, `destreza`, `intelecto` o `voluntad`.
- Se indica visualmente el atributo aplicado y si está duplicado con `x2`.

**Resumen de cambios v2.4.66:**

- Las habilidades incluyen un campo de **rasgos** que se muestra en las tarjetas al equiparlas.

**Resumen de cambios v2.4.67:**

- Los poderes equipados de los tokens ahora incluyen correctamente sus **rasgos**.

**Resumen de cambios v2.4.68:**

- Durante la defensa también se aplican los **rasgos** del arma o poder elegido.

**Resumen de cambios v2.4.69:**

- Se implementa el rasgo **Crítico** que vuelve a tirar el dado de daño cuando
  muestra su valor máximo, acumulando cada nuevo resultado.

**Resumen de cambios v2.4.70:**

- Las armas y poderes ahora pueden consumir Ingenio (🔵).
  Al usarlos se resta de la estadística del atacante y se muestra una animación
  de daño en Ingenio con el color azul correspondiente.

**Resumen de cambios v2.4.71:**

- Las acciones de combate en el chat se resaltan también para los jugadores.

**Resumen de cambios v2.4.72:**

- Las armas y armaduras personalizadas pueden crearse, editarse y eliminarse directamente en la aplicación, guardándose en Firebase.
- El catálogo base sigue cargándose desde Google Sheets.

**Resumen de cambios v2.4.73:**

- Las fichas del mapa se sincronizan parcialmente enviando solo los tokens modificados.
- Las actualizaciones locales fusionan los cambios en lugar de reemplazar todo el arreglo.
  **Resumen de cambios v2.4.74:**

- Se añade prueba de movimiento concurrente de tokens para asegurar que ambas posiciones finales persisten sin revertirse.

**Resumen de cambios v2.4.75:**

- Ahora es posible desactivar los rasgos activos en los menús de ataque y defensa para que no afecten la tirada.

**Resumen de cambios v2.4.76:**

- Se reduce la intensidad mínima de la luz al 5% para transiciones más suaves entre zonas iluminadas.
- La luz tenue aplica ahora el 80% de la intensidad configurada, evitando contrastes irreales.
- La luz brillante emplea el 100% de la intensidad seleccionada para asegurar que nunca sea menos intensa que la tenue.

**Resumen de cambios v2.4.77:**

- Aplicar un estilo de texto guardado ya no reemplaza el contenido del cuadro y puede aplicarse a múltiples textos, manteniendo la opción de restablecer los cambios.

**Resumen de cambios v2.4.85:**

- ✅ Unificación de altura (h-[38px]) en todos los selectores principales del editor de cartas para alineación perfecta.

**Resumen de cambios v2.4.84:**

- ✅ Habilitado el modo de descripción dividida (Texto Principal + Narrativo) en cartas de arma cuando no se muestran rasgos, con cajas simétricas del mismo tamaño.

**Resumen de cambios v2.4.83:**

- ✅ Rediseño de las cajas divididas en trampas y habilidades para que el bloque Principal y el Narrativo tengan idéntico tamaño.

**Resumen de cambios v2.4.82:**

- ✅ Centrado y simplificación de los botones "Narrativo" y "Principal" eliminando la etiqueta de estilo para una estética minimalista.

**Resumen de cambios v2.4.81:**

- ✅ Rediseño estético del selector de estilo como grupo de botones bajo el área de texto para evitar roturas del encabezado.

**Resumen de cambios v2.4.80:**

- ✅ Selector de estilo Narrativo/Principal para descripciones únicas de cartas de arma, armadura y estado.

**Resumen de cambios v2.4.79:**

- ✅ El cuadro de texto principal de habilidad y trampa se expande hacia arriba ocupando el espacio del letrero cuando no se muestran rasgos.

**Resumen de cambios v2.4.78:**

- El constructor de minimapa permite seleccionar múltiples celdas y aplicar cambios de forma simultánea.

**Resumen de cambios v2.4.25:**

- ✅ El menú de ataque y defensa solo muestra armas o poderes al alcance
- ✅ Mensajes claros cuando no hay equipamiento o ningún arma puede utilizarse

**Resumen de cambios v2.4.26:**

- ✅ Los menús de ataque y defensa listan correctamente las armas y poderes equipados
- ✅ Se tiene en cuenta el alcance aún cuando proviene de valores como "Cuerpo a cuerpo" o "Media"
- ✅ Las tiradas utilizan el daño definido para cada arma o poder

**Resumen de cambios v2.4.27:**

- ✅ Los alcances se limitan a cinco categorías: Toque, Cercano, Intermedio, Lejano y Extremo
- ✅ Se eliminan sinónimos como "corto" o "media" para evitar confusiones

**Resumen de cambios v2.4.28:**

- ✅ Al escoger un arma o poder aparece un campo con su daño por defecto
- ✅ Dicho campo es editable para modificar la tirada de ataque o defensa

**Resumen de cambios v2.4.29:**

- ✅ El campo de daño solo muestra valores como `1d8` o `2d6`, ocultando el tipo de daño
- ✅ También se rellena correctamente el daño de los poderes al seleccionarlos

**Resumen de cambios v2.4.30:**

- Se evita que las actualizaciones de otros clientes disparen escrituras del máster.

**Resumen de cambios v2.4.31:**

- Los tokens del mapa se ordenan antes de guardarse para detectar cambios reales y evitar escrituras innecesarias.

**Resumen de cambios v2.4.32:**

- Debounce unificado a 20 ms para el guardado de tokens tanto de jugadores como del máster.

**Resumen de cambios v2.4.33:**

- Optimización del bloqueo de posiciones en el mapa usando un `Set` memoizado de celdas ocupadas por muros.

**Resumen de cambios v2.4.35:**

- Los tokens almacenados en el campo `tokens` se migran automáticamente a la subcolección `tokens` de cada página al iniciar la aplicación.
- Se incluye el script `scripts/migrateTokens.mjs` para ejecutar la migración en colecciones existentes.

**Resumen de cambios v2.4.34:**

- Los tokens controlados por el jugador conservan su posición local al sincronizarse, evitando guardados innecesarios.

**Resumen de cambios v2.4.36:**

- Las animaciones de daño duran ahora 10 s.
- Los números de daño duplican su tamaño para mayor legibilidad.

**Resumen de cambios v2.4.37:**

- El máster puede crear objetos de inventario personalizados con nombre, descripción, icono y color desde sus herramientas.
- Los formularios de creación de objetos personalizados usan la misma estética que los de poder, armadura o arma.
- Los objetos personalizados pueden buscarse, editarse y eliminarse desde las herramientas del máster.

**Resumen de cambios v2.4.38:**

- "Chatarra", "Remedio" y "Pólvora" se incluyen en el buscador de objetos personalizados.
- El formulario de objetos personalizados incorpora un selector de emojis optimizado para móvil.

**Resumen de cambios v2.4.39:**

- Se reemplazó la dependencia del selector de emojis por una compatible con React 19 para evitar errores de instalación.

**Resumen de cambios v2.4.40:**

- El formulario de objetos personalizados permite seleccionar iconos SVG de la librería Lucide.

**Resumen de cambios v2.4.41:**

- Corrección del selector de iconos Lucide evitando el error `iconNode is undefined` al abrirlo.

**Resumen de cambios v2.4.42:**

- Los objetos de inventario personalizados se guardan en Firebase y se comparten entre dispositivos.

**Resumen de cambios v2.4.43:**

- "Comida" aparece entre los objetos predeterminados del gestor de objetos personalizados.

**Resumen de cambios v2.4.44:**

- El editor de color para objetos de inventario personalizados permite ingresar códigos hexadecimales.

**Resumen de cambios v2.4.45:**

- Las imágenes personalizadas de los objetos de inventario ya no pueden arrastrarse accidentalmente al moverlos.

**Resumen de cambios v2.4.46:**

- Los cuadros del inventario ahora tiñen su borde con el color de los objetos personalizados.

**Resumen de cambios v2.4.47:**

- Los tooltips de los objetos del inventario se muestran por encima del formulario de búsqueda.

**Resumen de cambios v2.4.48:**

- Los objetos personalizados del inventario incluyen el mismo efecto de degradado animado y brillo pulsante que los objetos predeterminados.

**Resumen de cambios v2.4.49:**

- Los objetos "Chatarra", "Comida", "Remedio" y "Pólvora" dejan de cargarse por defecto; ahora pueden editarse o eliminarse sin reaparecer.

**Resumen de cambios v2.4.50:**

- La vista de enemigos permite buscar por nombre o descripción y ordenar las fichas alfabéticamente o por nivel.

**Resumen de cambios v2.4.51:**

- Las fichas de enemigos ocupan toda la pantalla en móviles y permiten desplazarse cuando el contenido supera la altura.

**Resumen de cambios v2.4.52:**

- El constructor de minimapas permite guardar presets de estilo de celda y aplicarlos rápidamente desde una barra dedicada.

**Resumen de cambios v2.4.53:**

- Los cuadros del minimapa pueden restablecer su estilo al predeterminado.

**Resumen de cambios v2.4.54:**

- Activar "Editar forma" selecciona todas las celdas para aplicar estilos globales.
- Los botones "+" del minimapa ya no quedan flotando tras eliminar celdas adyacentes.
- Se pueden guardar cuadrantes completos con título y cargarlos desde el constructor.

**Resumen de cambios v2.4.55:**

- Guardar o cargar cuadrantes ya no requiere tener celdas seleccionadas.
- Los cuadrantes guardados muestran una mini previsualización para su identificación.

**Resumen de cambios v2.4.56:**

- El constructor de minimapas permite hacer zoom y desplazarse con rueda del ratón o gestos táctiles y añade un botón "Reset" para volver a la vista inicial.

**Resumen de cambios v2.4.57:**

- Las anotaciones del minimapa se guardan en Firebase y siempre se muestran sobre el cuadrante.
- Se elimina el selector de capas para las anotaciones.
- Se añaden efectos de celda (brillo o pulso) con color personalizable para destacar cuadros específicos.

**Resumen de cambios v2.4.59:**

- El texto de las anotaciones del minimapa se muestra centrado.
- Nuevo efecto de celda "Destellos" con pequeñas partículas brillantes animadas.
- La selección de celdas con efectos visuales se visualiza correctamente.
- Los efectos de celdas no seleccionadas ya no se recortan por superposición con otras celdas.

**Resumen de cambios v2.4.58:**

- El minimapa identifica el cuadrante cargado y permite guardar cambios, duplicar o eliminar cuadrantes.
- Seleccionar un color de brillo ya no deselecciona la celda activa.
- Los efectos de celda se muestran completos sobre las celdas adyacentes.
- Nuevos efectos visuales disponibles: rebote, giro y temblor.

**Resumen de cambios v2.4.60:**

- Tras cargar un cuadrante guardado, el constructor de minimapas ofrece un botón para volver al cuadrante predeterminado.

**Resumen de cambios v2.4.79:**

- Se elimina la visualización del nivel y contadores de equipo superpuestos al abrir una ficha de jugador.

**Resumen de cambios v2.4.80:**

- Las ventanas de ataque y defensa se cierran automáticamente tras resolver las tiradas para no bloquear la animación de daño.

**Resumen de cambios v2.4.81:**

- Se normalizan los identificadores de tokens como cadenas para evitar desincronizaciones y errores al eliminar.

**Resumen de cambios v2.4.82:**

- Corrección: al asignar un token a un jugador, se normaliza el nombre para evitar mensajes de "Acceso Denegado" en el mapa de batalla.

**Resumen de cambios v2.4.83:**

- Duración de las animaciones de daño centralizada en `DAMAGE_ANIMATION_MS` (8 s).

**Resumen de cambios v2.4.84:**

- Las animaciones de daño gestionan su opacidad de forma local sin alterar los tokens, evitando desincronizaciones durante la animación.

**Resumen de cambios v2.4.85:**

- La animación de daño utiliza ahora un `Konva.Tween` que desvanece el tinte del token de 0.5 a 0 en `DAMAGE_ANIMATION_MS`, reemplazando el `requestAnimationFrame` manual.

**Resumen de cambios v2.4.86:**

- La sincronización del minimapa vuelve a ser inmediata: los cuadrantes actualizan su cuadrícula, estilo y casilla de origen en todos los dispositivos sin recargar manualmente.

## 🔄 Historial de cambios previos

<details>
<summary>Ver historial completo de mejoras anteriores</summary>

- Cálculo de carga física y mental con visualización de iconos
- Edición y eliminación de recursos dinámicos con validaciones
- Tooltips explicativos editables adaptados a móviles
- Mejoras de estilo y responsividad con Tailwind
- Interfaz de equipamiento mejorada
- Gestión de poderes creados en Firebase
- Sección de Claves con contador de usos personalizable
- Inventario modular con arrastrar y soltar
- Selector de estados con iconos para efectos activos
- Persistencia completa en Firestore
- Soporte de arrastre en dispositivos móviles
- Glosario configurable con palabras destacadas
- Sistema de slots con animaciones y efectos visuales
- Marcas de agua en tarjetas de equipo
- Efectos de gradiente animado y brillo pulsante

</details>

## 📌 Lógica de Versionado

Se sigue una numeración basada en [Semantic Versioning](https://semver.org/lang/es/). Las actualizaciones de **parche** (2.1.x) corrigen errores y ajustes menores. Las de **minor** (2.x.0) agregan funcionalidades notables sin romper compatibilidad. Un cambio mayor se reserva para modificaciones que alteran significativamente el comportamiento existente.

## 📗 Project Notes

- Token sheets are cached client-side. Listener subscriptions depend only on the set of sheet IDs so moving a token no longer recreates them or triggers repeated Firestore requests.
- Restoring a player sheet no longer overwrites the token sheet ID, ensuring edits persist.
- Enemy tokens automatically clone their template the first time they appear if the token sheet doesn't exist, preserving life and resources across browsers.
- Tokens loaded without a `tokenSheetId` now generate one automatically and persist to Firestore. If the update fails, the original token data is kept to avoid losing sheet changes.
- Token sheets always include basic attributes so they can be edited even if missing in stored data.
- Saving a token sheet now replaces the Firestore document, removing deleted statistics or equipment.
- Realtime listeners only update the local cache instead of rewriting Firestore, ensuring edits persist across browsers.
- Player page listener ignores pending writes to avoid oscillations while Firestore transactions complete.

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -m 'Añadir nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

---

**Desarrollado con ❤️ para la comunidad de rol**

---

## Novedades: Minimapa responsive (v2.4.43)

- Nuevo constructor de Minimapa en modo Máster.
- Iconos personalizados y presets de estilo se sincronizan ahora a través del documento `minimapSettings/customization` en Firestore para que máster y jugadores compartan los mismos recursos visuales.
- Catálogo compartido con opción para eliminar iconos personalizados subidos; los cambios se reflejan al instante en Firestore.
- Guardado protegido: aviso persistente de cambios sin guardar y confirmación antes de cambiar o eliminar cuadrantes activos.
- Agrega celdas desde la periferia con botones cuadrados de borde discontinuo y “+”, ahora con mayor separación del cuadrante para evitar solapes visuales. Al pasar el ratón, se resaltan en verde.
- Agrega celdas individuales en huecos adyacentes a celdas activas mediante “+” interno.
- Elimina celdas de forma intuitiva: botón “−” en la celda seleccionada o modo “Editar forma”. En móvil, mantener pulsado sobre una celda activa para eliminarla.
- Control de escala: Auto‑ajustar (por defecto en móvil) evita romper el responsive cuando crece el número de celdas; disponible control de Zoom manual.
- Nuevo modo “Mover mapa”: activa el toggle dedicado o mantén dos dedos sobre el minimapa para arrastrarlo sin editar celdas; desactívalo para volver al modo de edición.
- Nuevo toggle “Modo legible”: engrosa temporalmente las líneas del grid para mejorar la lectura en móviles o a escalas bajas.
- Buscadores de emojis y Lucide con listado completo de iconos cargados localmente.
- Nueva categoría «Recursos» que añade al selector los iconos de objetos personalizados del inventario creados desde las herramientas de máster.
- Permisos de cuadrantes: el máster puede asignar cuadrantes a jugadores desde la sección «Permisos» y estos aparecen destacados como compartidos y de solo lectura en sus listas.
- Aviso contextual para jugadores al abrir cuadrantes de otros jugadores: destaca con su color quién es el autor y que no podrán editarlo ni eliminarlo hasta recibir permisos, además de mostrar una alerta fija sobre el lienzo con esa información en modo solo lectura.
- Los jugadores pueden añadir anotaciones en cuadrantes compartidos; el máster las ve con un distintivo y sus propias notas permanecen ocultas para los jugadores.
- Nuevo modo explorador para jugadores en cuadrantes compartidos: empiezan en la casilla de origen, ven las adyacentes como incógnitas y pueden descubrir el cuadrante de forma progresiva.
- Estilo rápido «Origen» exclusivo del máster para marcar la casilla de inicio con una flecha orientable (arriba, abajo, izquierda o derecha).
- Botón de eliminación de celdas sin fondo, solo la “X” roja.
- Selección múltiple de celdas para editar o eliminar varias a la vez.
- Selectores de color con opción de introducir valores HEX personalizados.
- Ajustes de interfaz en móviles: los paneles se apilan en una sola columna sin desplazamiento horizontal y el cuadrante gana altura útil para facilitar la interacción táctil.
- Detección automática del modo móvil con controles superiores simplificados; se retiraron los botones PC/Móvil y el botón de regreso destaca en pantallas pequeñas.

Guía rápida: ver `docs/Minimapa.md`.

## 🐛 Correcciones

- Se corrigió un fallo en el constructor de minimapas donde `selectedCell` no estaba definido al aplicar presets o eliminar celdas.
- Se blindó la tienda contra compras simultáneas restando el oro dentro de una transacción de Firestore, evitando que varios jugadores gasten el mismo saldo.
- Se evitó que tras una compra transaccional se enviara una escritura adicional con una configuración obsoleta de la tienda, conservando las deducciones de oro realizadas en paralelo.
- Se corrigió la sincronización de cuadrantes del minimapa para que todos los dispositivos y navegadores compartan siempre la misma lista guardada a través de Firestore.
- Se compactó el guardado de cuadrantes del minimapa en Firestore para centralizar los datos y que se carguen iguales en cualquier navegador o dispositivo.
- Se solucionó que el aviso de cambios sin guardar del minimapa siguiera apareciendo después de guardar cuadrantes o ajustar la flecha de origen.
- Se restableció el estado de cambios sin guardar tras recibir actualizaciones remotas, evitando que los cuadrantes compartidos perdieran estilos u origen al recargarlos.
- Se corrigió la carga de cuadrantes del minimapa cuando Firestore devolvía la cuadrícula como objeto en lugar de matriz, evitando que se reiniciara tras guardar y recargar.
- Se evitó que al reconstruir cuadrículas del minimapa desde Firestore se perdieran estilos, iconos y exploración al compartir un cuadrante con jugadores.
- Se optimizó la edición de celdas del minimapa en móvil apilando los controles de estilo y ajustando el auto-ajuste para evitar que el cuadrante se recorte.
- Se solucionó un error en el mapa de batalla que provocaba un fallo al inicializar `syncManager` antes de su declaración.
- Corregido error al aplicar presets de estilo en el minimapa que provocaba "next[r] is undefined".
- Se corrigió un error de compilación causado por un corchete faltante en `MinimapBuilder.jsx`.
- Se mejoró el efecto de destellos del minimapa con trayectorias y tamaños aleatorios para cada partícula.
- El constructor de minimapas vuelve a mostrar y guardar cuadrantes aunque la sincronización con Firestore falle, guardando una copia local como respaldo.
- Se intensificó el efecto de destellos del minimapa con más partículas, rotación y resplandor para hacerlo más espectacular.
- Se corrigió un fallo al abrir el mapa de batalla como jugador que generaba "enemy is not defined" cargando ahora los datos de enemigos.
- Se añadió una verificación adicional en la hoja de fichas de tokens para evitar referencias a enemigos inexistentes en el mapa de batalla de jugadores.
- Mejora de sincronización de tokens en el mapa de batalla: los cambios remotos se fusionan con el estado local respetando modificaciones pendientes y reflejando eliminaciones.
- Se corrigió un problema donde la eliminación de tokens por jugadores no se reflejaba en el mapa del máster.
- El modal de resultado/reaction log de combate ahora queda limitado al alto del viewport en móvil, con cuerpo scrollable y botón de confirmación siempre accesible como en el modal normal de reacción.
- Se reforzó la sincronización de `damageEvents` con `clientTimestamp` estable y un listener más tolerante, evitando que algunas animaciones de daño se perdieran de forma intermitente en clientes lentos o móviles.
- El HUD de combate vuelve a mostrar solo tres acciones principales (`Atacar`, `Correr`, `Esquivar`) repartidas a ancho completo, y las secciones `Clase` y `Objetos` ya no muestran iconos para mantener el texto centrado.
- En el inspector, el equipamiento vuelve a ordenarse con las armas al principio y las cards de armadura ya no muestran la línea de `Coste` aunque el item traiga ese dato.
- El sistema de armaduras vuelve a sincronizar automáticamente los bloques de armadura del token o ficha al equipar, desequipar o cambiar de armadura, respetando cambios manuales mientras no cambie la armadura activa.
- Los rasgos de una armadura equipada ahora pueden anular rasgos del arma atacante en el flujo de combate, y los modales muestran de forma explícita qué rasgos han quedado anulados por la armadura activa.
- La CD de `Armadura` ahora depende de los rasgos de la armadura equipada: por defecto usa `Vigor`, pero si la armadura lleva `Destreza`, `Intelecto` o `Voluntad`, el umbral y el `Dx` visible del inspector pasan a usar ese atributo.
- Las animaciones de daño del canvas ya no se pierden si el evento entra justo tras una recarga: los popups esperan localmente hasta que el token y el stage estén listos antes de consumirse.
- Los movimientos remotos de tokens en el tablero ya no se teletransportan: ahora los demás clientes ven un desplazamiento interpolado hasta la nueva celda, mientras el cliente que mueve el token mantiene su control inmediato.
- En `CanvasSection` los tokens del tablero SVG también animan su desplazamiento remoto entre la posición anterior y la nueva, sin meter inercia al cliente que está arrastrando la ficha.
- En el modal de reacción del canvas SVG, `Parar` ahora exige la misma diferencia de velocidad que `Evadir` (`V.Diff <= 1`), por lo que ambas reacciones quedan bloqueadas bajo la misma regla.
- Se añadió el rasgo `Derribo` al combate del canvas SVG: si un golpe hace perder al menos 1 bloque de `Postura`, quita automáticamente 1 bloque extra de `Postura`, y el rasgo también puede activarse desde los modificadores compartidos de ataque y parada.
- El modificador visual de `Derribo` en el panel compartido usa icono de martillo y acento verde para distinguirlo del resto de rasgos especiales.
- El rasgo `Crítico` del panel compartido de modificadores ahora usa paleta roja para alinearse con el resto de indicadores ofensivos del combate.
- Se actualiza el rasgo `Hendir` en el combate del canvas SVG: si un golpe hace perder al menos 1 bloque de `Postura`, fuerza 1 bloque de `Armadura`; si hace perder al menos 1 bloque de `Armadura`, fuerza 1 bloque adicional de `Armadura`, aplicándose solo una vez por ataque o parada.
- El resultado de combate y el registro lateral del canvas SVG ahora muestran también los rasgos efectivos usados en el ataque y en la parada, con la misma estética discreta del resto del log para facilitar la lectura de cada resolución.
- En el registro lateral del canvas SVG, la línea de rasgos se compactó para alinearse con `usando ...`, y las pérdidas de `Postura` o `Armadura` ahora separan la pérdida natural de la pérdida adicional causada por `Derribo`, `Hendir` u otros rasgos usando un bloque visual independiente.
- El rasgo ofensivo de postura pasa a mostrarse como `Derribo` en los modificadores y vistas de combate, manteniendo compatibilidad con armas o datos antiguos que todavía lo guarden como `Derribado` o `Derribar`.
- Las animaciones de daño del canvas SVG ya no se pierden si se tarda en confirmar el resultado de combate: el `combat_log` refresca su `clientTimestamp` justo al escribirse, evitando que el filtro de recencia descarte impactos válidos por usar una marca antigua de la resolución previa.
- El panel de modificadores ya no escala en altura al crecer la lista de rasgos: mantiene accesos rápidos visibles y mueve el catálogo completo a un selector overlay con grid táctil, más limpio en móvil y preparado para futuros rasgos.
- El selector completo de rasgos se renderiza ahora en un portal sobre `document.body`, evitando que el modal de combate lo recorte o lo deje semitapado cuando se usa dentro del selector de arma, especialmente en móvil.
- Los microindicadores de atributo en la selección de ataque estabilizan su alineación y `line-height`, evitando que algunas letras queden recortadas en ciertos navegadores o escalas sin cambiar el diseño visual actual.
- En las paradas del canvas SVG, el contraataque ya no depende de comparar un arma con otra, sino de la distancia real entre tokens capturada en el mapa: si el arma defensiva no llega a esa distancia, la parada sigue anulando el daño, pero no devuelve golpe y el resultado del reaction lo explica con esa distancia.
- Cuando una parada anula el golpe pero no puede devolver daño por falta de alcance, la animación del canvas SVG ya no usa `Bloqueo Perfecto`: ahora muestra `Parada sin contraataque` para que el motivo quede claro también en pantalla.
- Las animaciones del canvas SVG ahora secuencian mejor los resultados compuestos: `¡Contraataque!` y `¡Resiste!` aparecen primero, y el daño o los bloques perdidos esperan `1.5s` antes de entrar para evitar solapes visuales.
- Corregida la distancia usada por la restricción de contraataque en paradas del canvas SVG: el `combat_event` ahora guarda exactamente la misma distancia en celdas que muestra el selector de ataque del HUD, evitando falsos positivos donde armas de `Toque` podían devolver golpe a 2 casillas.
- El estado `Derribado` ya condiciona el flujo completo del canvas SVG: si un token se queda sin `Postura` o ya estaba a `0` y pierde `Armadura`/`Vida`, cae derribado; mientras siga así no puede mover ficha en combate ni usar acciones distintas de `Levantarse`, y los ataques entrantes solo le permiten `Recibir golpe`.
- En el HUD de combate, `Correr` se sustituye por `Levantarse`: solo se habilita si el token está derribado, cuesta `1` de velocidad y, al finalizar turno, elimina `derribado` y recupera la `Postura` al máximo.
- Las animaciones flotantes del canvas SVG ya distinguen cuándo un objetivo cae `Derribado`: el `combat_log` guarda el estado recién aplicado y el popup aparece al final de la secuencia, usando el color real del estado y sin cortarse antes aunque haya varios bloques escalonados.
- La condición de `Derribado` en el canvas SVG ya no se infiere por tener `Postura` a `0` manualmente: ahora solo cuenta si el estado `derribado` está realmente aplicado, mientras que el combate sigue pudiendo añadirlo automáticamente cuando corresponde por daño.
- El popup final de `Derribado` ya no espera a que termine de desvanecerse el último bloque perdido: ahora se encadena aproximadamente `1.5s` después del último bloque lanzado, manteniendo la secuencia visual sin ese retraso extra.
- Se añadió el rasgo `Conmocionante`: si un golpe derriba al objetivo, aplica el estado alternativo `Conmocionado` en lugar de `Derribado`, usa el mismo color índigo claro en animación/sidebar, no puede ponerse manualmente y `Levantarse` pasa a costar `2` de velocidad en ese caso.
- En el inspector del token, cuando la ficha está `Conmocionada`, la casilla de `Derribado` se reutiliza visualmente para mostrar `Conmocionado` activo; al desaparecer ese estado, la casilla vuelve a verse como `Derribado`.
- El modificador `Conmocionante` del panel compartido ahora usa el icono de flecha hacia abajo, alineado con la iconografía del estado de caída.

- Rasgo `Fluida` integrado en el canvas SVG: encadena descuentos de `-1` de velocidad contra el mismo objetivo y con la misma arma, también durante `Parar`; se rompe al cambiar de objetivo, cambiar de arma, al ser parado por completo o al realizar otra acción, y nunca baja el coste real por debajo de `1`.
- `Fluida` como modificador manual ya no entra en esa cadena automática: solo abarata este uso puntual en `-1` de velocidad si el arma cuesta más de `1`, mientras que la `Fluida` nativa del arma sigue conservando toda la lógica automática ya programada.
- La resolución de combate del canvas SVG ahora protege mejor los eventos pendientes: si una parada falla al resolverse, el evento vuelve a estado pendiente en vez de quedarse bloqueado en procesamiento.
- La confirmación de reacciones del canvas SVG ahora serializa el payload antes de guardarlo en Firestore y ya no silencia errores al enviar la reacción, evitando bloqueos de `Procesando...` al parar con ciertas armas.
- La configuración de mapas finitos del canvas SVG añade un modo `Mantener tamaño total`: al retocar columnas, filas o tamaño de celda, el sistema reajusta automáticamente el valor complementario para conservar el ancho y alto globales del tablero.
- Cuando cambia el tamaño de celda en el canvas SVG, los elementos con `snap` (tokens, áreas y muros ajustados a rejilla) ahora se recalculan también en coordenadas de celda para no quedar desalineados ni ocupar varias casillas por error.
- En mapas finitos del canvas SVG, las casillas se mantienen cuadradas de forma interna para evitar rejillas rectangulares que desajusten visualmente los tokens, y el `snap` toma como origen real la esquina del mapa finito en vez del origen global del mundo.
- En mapas finitos, `columnas` y `filas` se fuerzan a valores enteros para evitar que aparezcan medias casillas o celdas cortadas en la periferia del tablero.
- En mapas con imagen de fondo del canvas SVG, la calibración de la rejilla ya no recorta la imagen: el fondo conserva siempre su tamaño real, la grid se ajusta encima con casillas completas y el sobrante queda fuera de la rejilla en vez de generar medias celdas.
- Al recalibrar la grid de un mapa con fondo en el canvas SVG, ya no se recolocan automáticamente los items existentes, evitando que muros y luces se desplacen mientras ajustas la rejilla sobre la imagen.
- La calibración de mapas con fondo del canvas SVG ahora “encaja” siempre en combinaciones exactas de casillas cuadradas que cubren toda la imagen: al cambiar columnas, filas o escala, el sistema salta al preset compatible más cercano para evitar que la grid se despegue del fondo.
- Los mapas con fondo del canvas SVG añaden una barra de densidad de casillas debajo de columnas y filas: permite recorrer visualmente los presets exactos válidos del fondo, desde menos casillas grandes hasta más casillas pequeñas, sin perder el ajuste correcto sobre la imagen.
- La barra de `Velocidad` del inspector mantiene el mismo concepto de casillas, pero ahora resume el exceso con un acumulado `+N` y deja siempre solo 10 casillas visibles para que valores sintéticos muy altos no rompan el layout.
- Las imágenes de equipamiento cargadas desde Firebase en el canvas SVG ya no muestran texto feo mientras llegan: las cards del inspector usan un loader visual oscuro/dorado y solo revelan la imagen cuando termina de cargar.
- Se añadió el rasgo `Sangrado` al combate del canvas SVG y a los modificadores: si un golpe o contraataque hace perder al menos 1 bloque de `Vida`, aplica automáticamente el estado `Sangrado` al objetivo y dispara la animación final del estado con su color rojo propio.
- Cuando una misma resolución aplica varios estados a la vez, las animaciones finales del canvas SVG ya no saltan superpuestas: `Derribado`/`Conmocionado` salen primero y los siguientes estados, como `Sangrado`, se encadenan con `1.5s` de separación.
- Mientras un token esté `Sangrando` en modo combate, cada punto real de velocidad gastado le hace perder automáticamente 1 bloque de `Vida`: ocurre al finalizar turno, al cerrar reacciones y también cuando el máster desplaza fichas directamente en combate, mostrando el popup flotante de vida perdida.
- `FloatingCombatEffects` ya renderiza también pérdidas puras de bloques sin `damage` numérico, así que el drenaje automático de `Vida` por `Sangrado` muestra correctamente su `-X Vida` aunque venga solo del gasto de velocidad.
- En las paradas, la pérdida automática de vida por `Sangrado` ya forma parte de la secuencia principal del resultado: aparece después del daño/resiste/contraataque y antes de los estados, sin quedar tapada por la reacción.
- Corregido un fallo en esa secuencia integrada de `Sangrado`: el tramo de vida automática ya no reutiliza por error los bloques del impacto principal, así que se muestra como `Vida` y no como `Postura`.
- Refinada la secuencia visual de `FloatingCombatEffects`: las intros de resultado como `Resiste`, `Bloqueo Perfecto`, `Parada sin contraataque` y `Evasión` siempre salen primero y el resto del daño/bloques arranca `1.5s` después; además, el drenaje por `Sangrado` tras una reacción usa el mismo estilo visual de daño pero con etiqueta `Sangrado`, justo antes de los estados finales, y la vida útil de las secuencias largas se amplió para que no se corte la última animación.
- Corregido el render del contraataque en `FloatingCombatEffects`: los bloques y estados devueltos al atacante ya no se duplican visualmente sobre el defensor al resolver una parada ganadora.
- El HUD principal del combate en el canvas SVG sustituye `Esquivar` por `Controlar`: por ahora permite preparar `Controlar Sangrado` con coste `1`, y cada uso reduce en `1` la vida perdida automáticamente por `Sangrado` al confirmar el turno.
- Las animaciones de drenaje por `Sangrado` integradas en `combat_log` vuelven a mostrarse para todos los clientes activos del canvas, de modo que el resto de jugadores y el máster también ven ese tick automático sobre la ficha afectada.
- Corregido un bug grave del arrastre en modo combate para jugadores en el canvas SVG: si una ficha ya tenía movimiento pendiente, el nuevo drag toma ahora como base la posición visual pendiente real y la línea/ghost del arrastre usa ese mismo punto de partida, evitando saltos erráticos y conectores absurdos.
- Refinado el remanente visual del drag en combate para jugadores: la base matemática del arrastre sigue la posición pendiente actual, pero el ghost y la línea conservan un ancla visual fija en la casilla inicial del turno para no parpadear ni desplazarse mientras arrastras.
- Corregida la interrupción remota del movimiento previsto en vista jugador: si el máster mueve esa ficha, el snapshot deja de preservar la posición local en ese mismo ciclo y el token del jugador se actualiza inmediatamente a la nueva posición remota.
- El remanente visual del drag en combate ya no vuelve a cargar la imagen del token al arrancar el arrastre: el ghost reutiliza la textura ya resuelta del token mediante `background-image`, evitando retardos visibles al aparecer.
- Corregido un bug intermitente al devolver una ficha a su casilla inicial y soltarla en combate: `handleMouseUp` ya no cierra el drag con una posición local obsoleta, sino con la posición real del puntero al soltar, evitando que el token recupere una posición pendiente vieja y que la línea del remanente apunte fuera de sitio.
- Blindado el estado pendiente del movimiento en el canvas SVG: si `pendingTurnState` llega con coordenadas inválidas o nulas, se limpia automáticamente y deja de alimentar el ghost, la línea y la proyección local del token, evitando conectores disparados hacia la esquina superior izquierda al recargar o volver a seleccionar la ficha.
- El drenaje automático de `Sangrado` por gasto de velocidad en el canvas SVG ya no se queda en local: los ticks visuales de vida perdida viajan ahora por un canal compartido de efectos sincronizados del escenario, de modo que todos los clientes activos ven la misma animación aunque el token afectado pertenezca al máster u a otro jugador.
- El HUD de `Clase` del canvas SVG añade la habilidad base `Barrido`: requiere un arma a `Toque` con coste `2+`, cuesta el arma `+1🟡` y permite elegir un frente de tres casillas contiguas alrededor del token para preparar el golpe.
- `Barrido` usa una sola tirada de ataque compartida para todos los objetivos dentro del frente elegido y la compara por separado contra la reacción de cada objetivo, sin activar los rasgos especiales del arma; solo conserva el daño base y los dados de atributo propios del arma.
- El canvas SVG muestra una plantilla visual de `Barrido` alrededor del token atacante para elegir el lado del golpe también desde móvil, y los logs/reactions distinguen ya cuándo el ataque entrante viene de `Barrido`.
- La pestaña `Clase` del HUD de combate del canvas SVG reserva por ahora tres ranuras visuales estables: `Barrido` en el centro y dos placeholders laterales desactivados para futuras habilidades.
- La plantilla de `Barrido` absorbe ya el gesto dentro de sus 3 casillas y del botón de cancelación, evitando que se seleccione una ficha subyacente o se cancele la habilidad al pulsar sobre el propio frente de barrido.
- El selector de `Barrido` simplifica su cancelación a una `X` flotante con la misma estética que los controles del token, para que no quede tapada por la propia plantilla de área.
- La `X` y la propia plantilla de `Barrido` se renderizan ahora en la misma capa visual del contenido del canvas, con la `X` centrada sobre el token atacante para que no destaque por encima de luces o niebla respecto a los demás controles flotantes.
- La plantilla de área de `Barrido` adopta el mismo lenguaje visual que el feedback de casilla bloqueada: celdas rojas con borde discontinuo, una `X` interior y brillo suave al pasar por encima.
- El selector de ataque y el selector de `Barrido` reutilizan ya un loader visual para las miniaturas de arma: la imagen queda oculta hasta `onLoad` y ya no aparece el nombre/alt del archivo mientras carga una imagen remota.
- El selector de `Barrido` usa ya exactamente el mismo resolvedor de imágenes que el selector de ataque normal, así que las armas con arte local del proyecto y las imágenes remotas cargan igual en ambos paneles, con el mismo loader.
- `Controlar Sangrado` ya no solo compensa su propio coste al cerrar turno: su gasto de velocidad queda fuera del cálculo del drenaje y, además, cada uso sigue mitigando `1` tick adicional de `Sangrado` sobre el resto de velocidad gastada ese turno.
- Las armas del catálogo con daño base `0` o `1d0` dejan de caer al fallback de `1d20`: el canvas SVG las resuelve ya como “sin dado base”, de modo que la tirada usa solo los modificadores y dados de atributo que realmente tenga el arma.
- Se añade `Sin guardia` como rasgo negativo al sistema de combate del canvas SVG: aparece en el panel de modificadores, se refleja en logs/resultados y bloquea el uso de `Parar` con cualquier arma que lo tenga, tanto de base como añadido manualmente.
- Se añade `Perforante` al combate del canvas SVG y al panel de modificadores: si el ataque reduce al menos 1 bloque de la capa activa del objetivo, fuerza 1 bloque adicional sobre la siguiente capa disponible una sola vez por ataque.
- La animacion de combate del canvas SVG muestra ahora `Perforante` como un flyoff propio del rasgo, distinguiendo si el bloque adicional afecto a `Armadura` o a `Vida`.
- Se añade el rasgo/disparador `Ralentizado`: si un ataque o parada con ese rasgo reduce al menos 1 bloque del objetivo, su velocidad aumenta en 1 sin aplicar un estado persistente.
- La animacion de combate del canvas SVG muestra el disparo de `Ralentizado` con un flyoff propio `+1 Velocidad`, y el registro del inspector lo resume como resultado mecánico del intercambio.
- Se añade el rasgo/disparador `Empuje`: si un ataque o parada con ese rasgo reduce al menos 1 bloque, desplaza al objetivo 1 casilla alejándolo del golpe sin aumentar su velocidad; respeta muros, fichas grandes y ocupación de `Duelo`/`Formación`, y muestra su flyoff propio.
- Las anulaciones por armadura activa normalizan alias de rasgos como `Derribado`/`Derribo`, `Penetrante`/`Perforante`, `Ralentizar`/`Ralentizado`, `Empujar`/`Empuje` y tambien se aplican por objetivo en `Barrido`.
- En el `CombatReactionModal`, los modificadores manuales de daño para `Parar` se aplican por defecto solo a la parada que se está añadiendo; el modal añade un selector táctil para extenderlos explícitamente a todas las paradas o a las paradas con la misma arma, y los dados extra se guardan como tiradas individuales para no mostrar totales condensados dentro de un único dado.
- El parser de fórmulas de dados ya no interpreta el coeficiente de términos como `+1d10` como si fuera también un modificador plano `+1`, evitando que las fórmulas separadas por dados individuales inflen el total.
- La grid del canvas SVG pasa a un estándar visual base de `12x8` con casilla objetivo `256x256`: los escenarios nuevos arrancan ya en finito con esa métrica, y los mapas con fondo se recalibran automáticamente a la combinación cuadrada más cercana para que la sensación entre mapas siga siendo consistente aunque cambie la resolución original.
- Los campos de `Columnas`, `Filas`, `Ancho` y `Alto` de la configuración de grid dejan de forzar el número en cada tecla; ahora usan un borrador editable y aplican el cambio solo al confirmar, evitando que el valor se reescriba mientras se borra o se teclea.
- El combate táctico del canvas SVG pasa a leer alianzas por `controlledBy` compartido y permite excepciones con `teamId`, editable solo por el máster desde el inspector; si un token tiene `teamId`, ese valor prevalece sobre `controlledBy` para decidir aliados/enemigos.
- Los tokens nuevos de combate nacen ya como fichas compactas de media casilla (`0.5x0.5`), permitiendo `Duelo` o `Formación` de hasta 2 ocupantes por casilla; las fichas grandes de `1x1` siguen ocupando la casilla completa y bloquean compartirla.
- En combate, el render del canvas SVG separa visualmente los 2 ocupantes de una misma casilla, el movimiento ya bloquea entradas inválidas en casillas llenas y `Evadir` queda deshabilitado si el defensor está en `Duelo`.
- El reparto visual de `Duelo` y `Formación` en una casilla compartida se ancla ahora por la derecha como posición base, manteniendo la separación lateral entre los 2 ocupantes.
- Los alcances del HUD de combate SVG se reinterpretan como `Toque = misma casilla`, `Cercano = misma o adyacente`, `Intermedio = 2`, `Lejano = 3` y `Extremo = ilimitado`, manteniendo que todos los alcances pueden golpear también a `Toque`.
- Las armas a `Toque` del canvas SVG pueden golpear también a cualquier ficha grande que no pueda compartir casilla desde una casilla adyacente, aunque no pueda formarse `Duelo` por tamaño; esa misma excepción se respeta también al resolver un contraataque por `Parar`.
- El `snap` del canvas SVG separa ya el centrado en celda del ajuste a rejilla: las fichas de combate compactas siguen centradas dentro de su casilla, pero muros, luces y otros elementos especiales vuelven a alinearse como antes sin desplazarse al centro.
- Las fichas pequenas del canvas SVG, entendidas como menores de `0.5x0.5` casillas, mantienen la excepcion tactica de poder `Evadir` incluso estando en `Duelo`; las fichas normales siguen pudiendo solo `Parar` o `Recibir`.
- El `CombatReactionModal` del canvas SVG muestra ahora tambien el estado de `Duelo` en fichas pequenas, indicando explicitamente que pueden `Evadir` por su tamano en vez de ocultar ese contexto tactico.
- Los tokens grandes del canvas SVG ya se anclan por su esquina de casilla real cuando ocupan varias celdas (`2x2`, `3x3`, etc.), evitando que un `2x2` quede descuadrado por centrarse como si fuera una ficha compacta.
- La ocupacion tactica del canvas SVG deja de mirar solo la celda principal: cualquier token bloquea ahora todas las casillas que cubre por tamano, de modo que no se puede compartir ninguna de las celdas ocupadas por un `2x2`, `3x3` u otro token grande.
- El `CombatReactionModal` del canvas SVG introduce presupuesto de reaccion igual al coste real del ataque recibido: `Evadir` solo puede anular hasta ese numero de dados y `Parar` permite acumular varias paradas con una o varias armas mientras no superen ese mismo coste total.
- El `CombatReactionModal` del canvas SVG permite defensas mixtas dentro del mismo presupuesto: puedes gastar parte de la reaccion en `Evadir` dados y el resto en `Parar`, resolviendo la parada contra el ataque ya reducido.
- Las paradas acumuladas del canvas SVG ya se resuelven y muestran por pasos: cada arma tira por separado con sus propios rasgos de tirada, la defensa total se suma de forma global y el contraataque solo hereda los rasgos globales compatibles (`Agudeza`, `Derribo`, `Hendir`, `Conmocionante`, `Sangrado`, `Ralentizado`, `Perforante`, `Empuje`, `Balístico`) de las armas que realmente alcanzan al atacante.
- Se añade `Elusión` como rasgo exclusivo de ataque en el canvas SVG: si el objetivo intenta `Parar`, el ataque retira automáticamente el dado de parada más alto antes de comparar totales, y el resultado lo marca visualmente en el `CombatReactionModal` y en el registro del inspector.
- Se añade `Balístico` al combate del canvas SVG y al panel de modificadores: sus dados base del arma quitan bloques directamente ignorando `Armadura` y CD, sin convertir en balístico los dados de atributo ni los dados extra manuales; una armadura activa con resistencia `Balístico` anula ese bypass y restaura la resolución normal por capas y CD.
- Se añaden los rasgos `Distancia` y `Bloqueo`: un ataque con `Distancia` no puede pararse y solo permite evadir, salvo que la víctima use un arma con `Bloqueo` o añada `Bloqueo` desde modificadores defensivos antes de confirmar la parada.
- Se añade `Guardia` como rasgo defensivo: al realizar una parada con un arma que lo tenga, la tirada de parada añade un dado extra igual al dado base del arma; en ataques normales queda desactivado desde el panel de modificadores.
- El contraataque de una parada respeta siempre el alcance real del arma defensiva: las paradas fuera de alcance pueden ayudar a desviar el golpe, pero no aportan daño devuelto al atacante.
- El selector de armas del `CombatReactionModal` trata ahora las armas fuera de presupuesto igual que `Sin guardia`: quedan bloqueadas directamente en su card con aviso rojo propio, evitando mensajes sueltos debajo del boton de `Añadir parada`.
- La reaccion defensiva del canvas SVG deja de usar la regla fija de `V.Diff <= 1`: el presupuesto defensivo se calcula ahora como `velocidad final del atacante - velocidad actual del defensor`, de modo que solo puedes `Evadir` o `Parar` mientras no superes la velocidad final del ataque.
- Los ataques normales repetidos por un mismo atacante contra el mismo objetivo dentro del mismo cierre de turno se agrupan ya en una sola ventana de reaccion: se suma su tirada total, el presupuesto defensivo se calcula contra la velocidad final acumulada del atacante y el modal indica que son ataques acumulados; los ataques simultaneos de atacantes distintos siguen generando ventanas separadas.
- Las ventanas de reaccion simultaneas del mismo defensor ya descuentan la velocidad comprometida en otras reacciones pendientes o resueltas antes de cerrar el resultado, y el tracker superior permite saltar entre ataques pendientes para decidir en que orden defenderse.
- La restriccion de `Duelo` para `Evadir` en ventanas multiples pasa a ser por atacante: si el defensor esta en duelo con un token, solo se bloquea la evasion frente a ese atacante concreto; ataques desde fuera del duelo vuelven a permitir evadir si cumplen el resto de requisitos.
- El tracker de ataques pendientes marca ya con tick verde la ventana activa en cuanto su estado pasa a `resuelto`, incluso antes de pulsar `Continuar`, evitando que una evasion completa parezca seguir pendiente.
- El `CombatReactionModal` compacta el aviso de `Duelo`, el resumen de reaccion y las paradas anadidas: se elimina la barra de progreso grande y las paradas pasan a mostrarse como chips para ocupar menos espacio en movil.
- Los avisos de `Armadura activa` y de estados que bloquean la defensa usan ahora el mismo estilo compacto del aviso de `Duelo`, evitando tarjetas de color dispares en la cabecera del reaction.
- El overlay de selección del canvas SVG valida que la caja tenga coordenadas completas antes de moverla, finalizarla o pintarla, evitando crashes intermitentes cuando listeners globales llegan tarde.
- Las imágenes de tokens usan un loader dorado ligero y transparente, mientras que las miniaturas de equipamiento del inspector y las tarjetas de la biblioteca de encuentros del canvas SVG reutilizan el loader dorado completo mientras cargan desde Storage/URL.
- El loader de imagen del canvas SVG detecta ahora imágenes ya resueltas desde caché y cae al fallback si una carga no termina, evitando que los retratos del medidor de velocidad se queden con el spinner infinito.
- Pasar turno sin movimiento ni acciones en el canvas SVG recupera ahora `+1 Postura` si el token no está al máximo, manteniendo el coste mínimo de `+1🟡` y mostrando un flyoff verde sincronizado sobre la ficha.
- El drag de fichas en combate muestra feedback visual cuando una celda no admite el destino: la casilla se marca en rojo con una `X`, la linea de movimiento cambia a rojo y aparece un motivo breve como `Casilla ocupada`, `No cabe en duelo` o `Ficha grande bloquea`.
- El feedback de destino bloqueado centra ahora la silueta roja en la casilla rechazada y oculta la ficha arrastrada durante el drag inválido, manteniendo internamente el destino rechazado para que al soltar vuelva al origen con la misma animación que al chocar contra un muro.
- Al arrastrar desde una casilla válida hacia una casilla bloqueada, el canvas SVG deja de conservar la previsión válida anterior: muestra el destino rechazado en rojo, mantiene estable el render de `Duelo`/`Formación` y, si se suelta ahí, restaura también el coste pendiente de movimiento al origen real del arrastre.
- El aviso textual del destino bloqueado queda ahora por encima de las fichas también en la vista del máster, evitando que tokens grandes tapen mensajes como `Ficha grande bloquea` o `Casilla ocupada`.
- La `X` y el contorno rojo de la casilla bloqueada suben a la misma capa superior del feedback, para que no desaparezcan bajo tokens grandes en la vista del máster.
- El coste pendiente del HUD de combate deja de recrearse en cada micro movimiento del drag: el estado provisional incluye ya `x/y`, no se crea para coste `0` y no se recalcula sobre destinos bloqueados, evitando el parpadeo `Nombre` / `Nombre +X`.
- Se retira el tablero táctico antiguo del menú y del render principal: la entrada `Canvas` abre directamente `CanvasSection`, se elimina `MapCanvas.jsx` y se ocultan los accesos heredados que enviaban enemigos a esa estructura.
- La capa `Mapa` del canvas SVG incorpora marcadores de escenario táctiles: zona, círculo, escalera, cobertura, peligro y etiqueta, con render visual propio y edición desde el inspector para preparar encuentros sin usar tokens ni dibujo libre.
- Los marcadores `Peligro` y `Escalera` del canvas SVG usan ahora patrones vectoriales adaptativos: las líneas se recalculan al redimensionar la zona para mantener legibilidad sin deformarse.
- El marcador `Escalera` usa un diseño de planta con peldaños, marco y sombreado de desnivel, ocupando todo su recuadro; las zonas de mapa se renderizan siempre por debajo de muros y tokens.
- La sección `Tablero` permite añadir cartas a la mesa o a la mano del token activo; en este modo el HUD de combate sustituye acciones, ataques y objetos por una mano horizontal de cartas entre retrato y fin de turno, con volteo y salida rápida a mesa.
- La mano del `Tablero` queda asociada al último token activo y solo se oculta al pulsar en vacío, permitiendo seleccionar o arrastrar cartas de la mesa sin perder el destino de mano.
- En móvil, mantener pulsada una carta del `Tablero` o de la mano abre una previsualización ampliada; en PC/escritorio, hacer clic con el botón central del ratón/rueda sobre una carta del tablero de cartas abre la misma previsualización ampliada de forma instantánea, previniendo el cursor de autoscroll por defecto del navegador. Si el dedo se desplaza en móvil, se cancela la lectura y continúa el arrastre normal.
- El tirador amarillo de redimensionado del canvas usa ahora un área táctil ampliada en móvil y bloquea los gestos nativos mientras se arrastra, manteniendo el mismo aspecto visual.
- La barra de iniciativa/velocidad del canvas se convierte en un carrusel compacto cuando no caben todos los tokens: oculta la barra de scroll, muestra un contador `+N` y permite deslizar con ratón o dedo.
- Las cartas del `Tablero` pueden apilarse arrastrando una sobre otra; la carta arrastrada queda arriba, la pila sustituye el nombre inferior por miniaturas de las cartas ocultas y el inspector permite sacar una carta concreta.
- Las cartas nuevas de la mano se ordenan al extremo derecho del abanico, desplazando las anteriores hacia la izquierda.
- Se perfeccionó el flujo de animaciones en el Gestor de Combate (`CombatTrackerView.jsx`), logrando transiciones de redimensionamiento y colapso de estados completamente fluidas y libres de tirones.
- Se implementó la clase `min-w-0` en los botones de alteraciones activas para sobreescribir el ancho mínimo por defecto de flexbox, permitiendo que Framer Motion colapse su ancho de forma 100% progresiva.
- Se eliminó el conflicto entre la clase CSS `transition-all` y los fotogramas clave de Framer Motion, sustituyéndola por transiciones hover selectivas para `background-color`, `border-color`, `filter` y `color`.
- Se añadió `layout="position"` en badges de estado y en el botón "+ Añadir" (ahora un `<motion.button>`), permitiendo que todos los elementos hermanos se deslicen de forma continua a sus nuevas coordenadas y fila durante el reflow.
- Se calibró la curva de animación de los badges a `0.25s` con aceleración `easeInOut` para un tacto sedoso, lineal y de calidad cinematográfica.
- Se corrigió un error visual en el creador de cartas (`CardBuilder.jsx`) donde el filtro de color personalizado (`customColorActive`) pintaba parcialmente el borde superior de la carta (bajo la cabecera); se reajustó la coordenada Y inicial (`ry = 410`) y la altura del rectángulo (`rh = 2100`) para que el filtro cubra con precisión milimétrica únicamente la textura interior de la carta sin solaparse con el marco dorado del borde superior.

## Novedades: Ocultar Filas de Rasgos y Ampliar Texto en Cartas (v2.4.44)

- **Caja de texto autoadaptable**: Ocultar filas de rasgos libera de forma inmediata espacio vertical, desplazando y agrandando proporcionalmente la caja de descripción (`+240px` por fila en armas/habilidades y `+230px` por fila en armaduras).
- **Selector de pares de rasgos**: Se añadió un control horizontal de botones (`1`, `2`, `3` o `4`) bajo "Filas / Pares visibles" en el panel lateral de rasgos de la carta para configurar la cantidad exacta de filas a mostrar.
- **Entradas laterales dinámicas**: La lista de entradas de texto de rasgos de la barra lateral se reduce y ajusta automáticamente para mostrar únicamente los campos correspondientes a los pares de rasgos configurados como visibles.
- **Mantener interruptor maestro**: El checkbox de visualización "Mostrar" continúa permitiendo ocultar o mostrar todas las filas de rasgos de golpe.
- **Reinicio y ajuste automático**: El estado de filas visibles se restablece y configura de manera inteligente al cambiar de tipo de carta o restablecer el editor.

## Novedades: Formato Enriquecido de Texto (v2.4.45)

- **Marcas de estilo personalizadas**: Soporte completo para renderizado de negrita (`**texto**`), cursiva (`*texto*`) y color personalizado (`[color:#HEX]{texto}`) directamente sobre el canvas de la carta.
- **Medición de ancho precisa**: El empaquetador de líneas y el espaciado de texto justificado miden de forma independiente los anchos reales de cada segmento estilizado más los iconos de palabras clave asociados, garantizando que el texto se adapte sin cortes ni desbordamientos.
- **Anidamiento recursivo de estilos**: Soporte técnico para etiquetas compuestas (como cursivas o negritas anidadas dentro de bloques de colores).
- **Barra de herramientas de formato**: Adición de una botonera de formato sobre las cajas de descripción y texto narrativo en el editor lateral. Permite alternar rápidamente negrita (`B`), cursiva (`I`) y seleccionar colores de una paleta temática de 6 colores listos para usar (`Dorado`, `Rojo`, `Verde`, `Azul`, `Morado`, `Blanco`).
- **Refs táctiles**: Implementación de atajos visuales que conservan la selección de texto y restauran el foco de escritura en la caja del cursor en PC y móviles.

## Novedades: Mejoras de Salto de Línea Estilizado, Alternado de Color e Historial (v2.4.46)

- **Salto de Línea Estilizado y Tokens**: Refactorización de `wrapDescriptionText` mediante tokens de palabras con estilos heredados. Esto garantiza que las líneas resultantes mantengan su formato de negrita, cursiva o color intacto al saltar de línea o al incluir palabras clave con iconos.
- **Guionizado Enriquecido**: Las palabras largas con formato se separan correctamente de forma silábica sobre el texto limpio del token, manteniendo sus marcas estilizadas de apertura y cierre en ambos extremos del corte.
- **Alternado de Color Inteligente**: La pulsación repetida de un color sobre texto ya coloreado retira el formato de color de forma inmediata, facilitando la edición rápida de descripciones.
- **Historial de Deshacer/Rehacer**: Implementación nativa de la pila de historial en textareas para `Ctrl + Z` y `Ctrl + Y`, con agrupación inteligente por tiempo para fusionar pulsaciones rápidas consecutivas en acciones por palabras/frases en lugar de letra a letra.
- **Reinicio con Dado Limpio**: El botón "Restablecer" inicializa la carta de Arma con el elemento `Ninguno` por defecto, permitiendo previsualizar de inmediato un dado limpio de `1d6` en el canvas en lugar del elemento Fuego.

## Novedades: Reordenación de Biblioteca por Arrastrar y Soltar (v2.4.47)

- **Arrastrar para ordenar**: Habilitado el soporte de arrastrar y soltar (Drag and Drop) para ordenar cómodamente las cartas en la "Biblioteca de Cartas" y los tokens en la "Biblioteca de Tokens" dentro de la barra lateral.
- **Interpolación de tiempo inteligente**: El orden se guarda de forma persistente en Firebase recalculando dinámicamente marcas de tiempo equilibradas entre elementos adyacentes, sin necesidad de alterar la base de datos ni añadir colecciones complejas.
- **UX Premium con Animaciones**: 
  - Al arrastrar un elemento, este reduce su opacidad al 35% y muestra un contorno punteado (estilo "hueco vacío").
  - Al pasar sobre un posible destino, la tarjeta destino escala un 105% con un marco dorado brillante y una sombra difusa que indica de forma espectacular que la ranura está lista para recibir el elemento.
- **Seguridad Máster**: Los controles de arrastre se activan únicamente para el Master de la partida (`!isPlayerView`), asegurando que solo el director de juego pueda manipular y organizar los catálogos en tiempo real.

## Novedades: Grid de Cartas Responsivo en la Colección (v2.4.48)

- **Distribución de rejilla fluida**: Se actualizó el layout de la baraja activa para estructurarse en una cuadrícula (CSS Grid) responsiva en lugar de una columna vertical estática o una barra horizontal.
- **Responsividad adaptada al espacio**:
  - **Escritorio y pantallas ultra-anchas**: Las cartas se organizan de 3 en 3 (`xl:grid-cols-3`) cuando hay suficiente espacio útil en la pantalla.
  - **Tabletas y laptops**: Se adaptan automáticamente de 2 en 2 para garantizar que las cartas mantengan su proporción y tamaño óptimo sin comprimirse ni solaparse.
  - **Dispositivos móviles**: Se muestran de 1 en 1 en una sola columna vertical ergonómica, ideal para navegación táctil.
- **Preservación de proporciones**: Se limitó el ancho máximo de las tarjetas a `240px` y se centraron en su celda (`max-w-[240px] mx-auto`), asegurando que la estética premium y su relación de aspecto original se mantengan intactas en cualquier resolución.

## Novedades: Arrastre 2D Dinámico y Ajustes de Controles en Cartas (v2.4.49)

- **Arrastre y reordenación 2D fluida**: Se sustituyó el drag nativo estático por un sistema de arrastre táctil premium basado en Framer Motion (`drag`, `layout`). Las cartas vecinas se desplazan dinámicamente y con físicas suaves para abrir hueco mientras arrastras, reordenando la baraja en tiempo real con latencia cero en la interfaz antes de persistir el orden en Firestore.
- **Controles flotantes simétricos**:
  - **Esquina superior izquierda**: Se reubicó el selector/cambio de rol y tipo de carta, mostrándolo como un botón circular compacto que cambia de color según el tipo actual (Acción, Atributo, Trampa, etc.) y evita tener que usar la barra de botones inferior.
  - **Esquina superior derecha**: Se reemplazó el icono y estilo de la papelera clásica por un botón de cierre limpio (`FiX`) del mismo tamaño exacto y diseño circular translúcido, unificándolo con la línea estética general del resto de la aplicación.
  - **Limpieza del Canvas**: Se eliminaron las barras de herramientas y etiquetas inferiores de la carta, permitiendo que la ilustración base y los textos ocupen todo el espacio visible sin recuadros redundantes.
- **Desactivación inteligente de Tilt**: El efecto de rotación 3D se deshabilita temporalmente sobre la tarjeta que se está arrastrando en ese instante, previniendo distorsiones angulares mientras se desplaza bajo el cursor.

## Novedades: Centrado y Alineación de la Regla de Alcance en el Constructor de Cartas (v2.4.50)

- **Eliminación del título redundante**: Se quitó la etiqueta del contenedor de alcance (el título "ALCANCE") en el canvas de previsualización para despejar el espacio superior.
- **Reducción del padding superior inicial**: Se ajustó la coordenada inicial de renderizado de los contenedores (`y`) a `805` (antes `835`), eliminando el exceso de espacio vacío entre la cabecera de la carta y el primer contenedor.
- **Optimización de altura y márgenes del bloque**: Se estableció la altura del contenedor de alcance en `290px` (y la regla a `trackY = y + 130`), dejando suficiente espacio libre arriba y abajo para que las líneas divisorias respiren y no queden demasiado pegadas al contenido.
- **Alineación horizontal simétrica**: Se desplazaron las coordenadas del raíl (`startX` a `370` y `endX` a `1518`), centrando la regla en el eje `X = 944` para que el círculo de "Intermedio" se alinee de manera idéntica con los rombos/diamantes de las líneas divisorias.

## Novedades: Cartas de Acciones en el Constructor

- **Tipos simplificados**: El constructor muestra los tipos `General`, `Acciones` y `Atributo`.
- **Diseño dedicado**: `General` mantiene el canvas modular editable, `Acciones` usa la plantilla visual específica de acciones y `Atributo` renderiza una base propia.
- **Bases de Atributo**: El tipo `Atributo` permite alternar entre `Cuerpo`, `Mente` y `Hambre`, usando `public/interfaz/atributos/Cuerpo.png`, `Mente.png` y `Hambre.png` como bases dedicadas y colocando el título con sus líneas divisorias en la misma posición visual que las cartas de `Acciones`.
- **Base integrada para General**: Las cartas `General` usan `public/interfaz/general.png` como fondo completo del marco modular, manteniendo encima las posiciones existentes de título, iconos y contenedores.
- **Cabecera integrada en General**: Las imágenes personalizadas de la cabecera se recortan al recuadro real de `general.png` y reciben un difuminado oscuro interior para integrarse con el marco.
- **Encuadre manual de cabecera**: Las imágenes personalizadas permiten ajustar zoom y desplazamiento horizontal/vertical con sliders y botones táctiles, partiendo del mismo autoencuadre que usa la carta renderizada y con opción de volver al autoajuste con `Reajustar`.
- **Color de fondo de cabecera**: Cuando una carta no tiene imagen de portada, el constructor permite elegir un color para el fondo generado de la cabecera con presets y valor hexadecimal independiente del acento.
- **Acciones rápidas a pesadas**: El diseño dedicado añade controles para `Rápida`, `Ligera`, `Estándar` y `Pesada`, generando automáticamente cartas de coste `1` a `4`.
- **Plantilla visual dedicada**: La plantilla de acciones usa una base completa con marco negro y pergamino envejecido, manteniendo por código el título, las líneas y rombos de acento, el selector de tipo de acción y el texto inferior editable.
- **Base integrada para acciones**: Las cartas de `Acciones` usan `public/interfaz/base.png` como fondo completo, ajustado al rectángulo visible real del canvas (`1888x2624`), equivalente al ratio de las cartas exportadas (`737x1024`).
- **Tipografías de acciones**: El título usa `Bebas Neue Regular`, el texto de tiempo usa `Oswald Bold` y el texto inferior usa `Roboto Condensed Regular`.
- **Coste visual de acciones**: El coste central usa `public/interfaz/acciones/numero.webp` y `public/interfaz/acciones/reloj.webp`, escalados y agrupados según el coste de la acción.

## Novedades: Ajuste de Proporción, Alineación y Ornamentos en Cartas de Acción

- **Proporción y alineación de coste**: Se ajustó la altura del reloj de arena (`reloj.webp`) a 610 unidades para una relación de aspecto del 67.5% con el número "1", con un gap de -104 y offset vertical de 40 para alineación perfecta por la base.
- **Rombos uniformes**: Se estandarizó el tamaño del rombo (`diamondSize`) a 30 en todas las líneas divisoras del canvas para mantener una coherencia visual impecable.
- **Línea del título más corta**: Se recortó la longitud de la línea divisora inferior del título (a 1015 de ancho), haciéndola coincidir simétricamente con el tamaño de la línea superior del indicador de tiempo.
- **Centrado del indicador de tiempo**: El texto de tiempo (`X TIEMPO`) y sus chevrons se desplazaron verticalmente a `y = 1875`, quedando exactamente equidistantes y centrados entre la línea divisora superior (`y = 1760`) y la inferior (`y = 1990`).
- **Punteros hacia dentro**: Se invirtieron las direcciones de los chevrons laterales del indicador de tiempo para que apunten hacia dentro (`> X TIEMPOS <`) en lugar de hacia fuera.

## Novedades: Números de Coste Dinámicos en Cartas de Acción (v2.4.51)

- **Números de coste dedicados**: Se sustituyó el número estático por el renderizado dinámico de los dígitos correspondientes para cada tipo de acción:
  - Acción Ligera (Coste 2) -> `2.webp`
  - Acción Estándar (Coste 3) -> `3.webp`
  - Acción Pesada (Coste 4) -> `4.webp`
  - Acción Rápida (Coste 1) -> Mantiene el uso de `numero.webp`.
- **Estandarización de posición del número**: Todos los números de coste (`1`, `2`, `3`, `4`) se dibujan en la misma posición horizontal absoluta (`startX = 400`), previniendo desvíos o saltos del dígito principal.
- **Alineación y escalado de relojes**:
  - **Eje horizontal y solapamiento**: Para costes 1, 2 y 3, el primer reloj se mantiene a un gap relativo al número de `numberHourglassGap = -120`. Para coste 4, el grupo se desplaza un poco a la derecha (`numberHourglassGap = -90`). Todos los relojes mantienen un gap de solapamiento uniforme de `-100` entre sí.
  - **Eje vertical y tamaño**: Los relojes tienen un tamaño proporcional al de coste 2 (`702`): en coste 3 miden `520` de alto y en coste 4 miden `420`. Todos se centran verticalmente en `yOffset = 46`, a excepción de coste 3, donde se elevan un poco (`yOffset = 20`) según lo requerido.
- **Pre-carga optimizada**: Se añadieron los recursos `2.webp`, `3.webp` y `4.webp` al sistema de preloading asíncrono en segundo plano, evitando cualquier parpadeo de carga visual al alternar dinámicamente entre las distintas velocidades de acción.

## Novedades: Filtros de Color y Texturas en la Cabecera de Cartas (v2.4.52)

- **Unificación de diseño en controles**: Se rediseñó por completo el selector de "Fondo cabecera" en el panel lateral para tener la misma estructura, botones con texto, cuadrícula y gradientes estéticos que la sección de "Acento". Se reubicó "Base" como el primer botón de la rejilla y el panel se mantiene visible en todo momento.
- **Filtros de color reales en imágenes**: El selector de color de cabecera ahora funciona como un verdadero filtro de color (mezcla de capas `color` y `multiply` en el canvas) que se aplica sobre la imagen de portada subida, mostrándose dinámicamente tanto en el canvas principal como en la previsualización del panel lateral.
- **Backdrop generado con textura**: Cuando no hay imagen de portada, en lugar de incrustar una capa oscura degradada plana, el generador ahora renderiza la misma textura de pergamino envejecido y polvo de estrellas que el cuerpo del documento, tintado con el filtro del color seleccionado.

## Novedades: Reemplazo de Imágenes de Dados en el Constructor de Cartas (v2.4.53)

- **Optimización de formato y resolución**: Se convirtieron los nuevos dados proporcionados en formato PNG a formato WebP de alta definición y con canal de transparencia (conservando transparencias originales).
- **Estandarización de assets**: Los nuevos dados (`D4`, `D6`, `D8`, `D10`, `D12`, `DX`) se renombraron y reemplazaron en la ubicación del constructor de cartas (`public/dados/cartas/`) para actualizar automáticamente el visualizador del canvas en `CardBuilder.jsx` sin requerir modificaciones en el código fuente.
- **Tinte dinámico con color de acento**: Se implementó el soporte para tintar dinámicamente las imágenes de los dados usando el color de acento seleccionado para la carta (`accent`). El motor de dibujo del canvas en `CardBuilder.jsx` aplica un filtro de mezcla por canal alfa (`source-in`) sobre los trazados del dado antes de renderizarlos, garantizando una perfecta consistencia cromática con la temática de cada carta.
- **Estandarización de ranuras de carga**: Se unificó el tamaño de los rombos de carga en el pie de página de la carta (`drawModularChargeFooter` en `CardBuilder.jsx`), reduciendo el tamaño del tercer rombo (el central) de 70 a 45 píxeles para que sea idéntico y simétrico al de las otras cuatro ranuras. Asimismo, se reajustó la separación horizontal de sus centros (`[764, 854, 944, 1034, 1124]`) para que el espacio y distancia entre cada una de las 5 ranuras sea perfectamente uniforme y equidistante (separadas por exactamente 90 píxeles).
- **Alineación de coste de acción pesada**: Se ajustó la alineación vertical de los relojes de arena en el coste de acción pesada (coste 4) en `drawActionCostAssets` de `CardBuilder.jsx` cambiando su `yOffset` a 20 (idéntico al de coste 3) para subirlos y centrarlos verticalmente con el número 4.
- **Escalado automático de texto de rasgos**: Se implementó un algoritmo de ajuste dinámico de tamaño de letra en `drawModularTraits` para los rasgos de la carta. Si el texto introducido es demasiado largo y supera el espacio útil horizontal de la chapa del rasgo (ancho del badge menos los márgenes del contorno y el bisel de la flecha), el sistema reduce de forma reactiva el tamaño de la fuente paso a paso (de 34px hasta un mínimo de 24px) para garantizar que todo el texto encaje perfectamente sin perder legibilidad ni salirse de los bordes. Adicionalmente, se integró una validación en tiempo real en los campos de entrada de texto (`onChange`) del panel lateral que mide el ancho visual del texto (usando una métrica de canvas a 24px) y bloquea la escritura (no permite introducir más caracteres) en el momento exacto en que la palabra alcanzaría el límite físico del rasgo, ofreciendo una experiencia de usuario impecable que previene de forma activa cualquier desbordamiento.
- **Inserción de iconos en el cursor**: Se actualizó el comportamiento del compendio visual en `insertDescriptionIcon` para que al pulsar sobre cualquier icono de recurso, este se inserte exactamente en la posición del cursor (caret/selección) del área de texto enfocada en lugar de añadirse al final de la descripción. El sistema gestiona automáticamente el espaciado inteligente alrededor del icono insertado y restaura el foco y la posición del cursor inmediatamente después de actualizar el estado de React.

## Novedades: Soporte para Deshacer y Rehacer (Undo/Redo) en Descripciones (v2.4.54)

- **Undo y Redo personalizados (`Ctrl + Z` / `Ctrl + Y`)**: Se implementó un sistema de control de historial personalizado para los campos de texto (`<textarea>`) de descripción de las cartas en `CardBuilder.jsx`. Esto anula el comportamiento nativo del navegador que a veces falla con los componentes controlados de React, permitiendo al usuario volver atrás y adelante en sus cambios de texto de manera fluida y sin perder el foco.
- **Soporte para Contenedores Modulares**: El historial de cambios se mantiene de forma independiente para cada contenedor de descripción utilizando pilas de historial mapeadas por clave única de contenedor (`containerKey`), evitando mezclas de cambios entre distintos contenedores.

## Novedades: Nuevos Iconos de Cabecera y Compendio Visual (v2.4.55)

- **Nuevos iconos de combate y tipo**: Se han agregado los iconos de `Magia`, `Distancia` y `Espada` como opciones seleccionables para el icono de cabecera y ranuras de la carta.
- **Integración con el Compendio Visual**: Estos tres nuevos iconos están ahora disponibles en la paleta del compendio visual, permitiendo insertarlos dinámicamente en cualquier descripción del constructor de cartas en el cursor de forma fluida.
- **Estilos y Tinte de Ranuras**: Se definieron los colores de trazo y fondo rúnico personalizados en `ELEMENT_CONSUMPTION_STYLES` para los tres nuevos iconos (`Magia` en tono violeta, `Distancia` en tono ámbar y `Espada` en tono slate/plata) para su visualización y resaltado coherente en el canvas.
