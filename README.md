# 🎮 Fichas Rol App

**Aplicación web avanzada para gestión de fichas de personaje con sistema de inventario avanzado**

Fichas Rol App es una aplicación web desarrollada en React para crear y gestionar fichas de personaje de rol. Toda la información se almacena en Firebase y el catálogo de equipo proviene de Google Sheets, actualizándose automáticamente. Incluye un sistema de inventario con grid 10×8, drag & drop fluido y rotación de objetos.

## ✨ Características principales

### ⚡ **Sistema de Velocidad Avanzado (NUEVO)**

- **Línea de sucesos en tiempo real** - Seguimiento visual del orden de actuación
- **Píldoras de Equipamiento interactivas** - Uso directo de armas y poderes desde la ficha
- **Consumo de velocidad inteligente** - Cálculo automático basado en emojis 🟡 del equipamiento
- **Permisos granulares** - Jugadores pueden eliminar sus propios participantes
- **Interfaz color-coded** - Identificación visual por jugador y tipo de equipamiento
- **Sincronización en tiempo real** - Cambios instantáneos para todos los participantes
- **Sincronización manual de la ficha del jugador** - Usa los botones de TokenSettings para subir o restaurar cambios (mantiene la imagen del token)
- **Estados sincronizados de la ficha al token** - Al activar condiciones desde la ficha se aplican inmediatamente al token controlado
- **Modo Master y Jugador** - Controles especializados según el rol del usuario
- **Modo "hot seat"** - Alterna entre fichas controladas con Tab o el selector
- **Selector de ficha centrado** - Muestra el nombre personalizado de cada token
- **Mapa de Batalla integrado** - VTT sencillo con grid y tokens arrastrables
- **Fichas de token personalizadas** - Cada token puede tener su propia hoja de personaje
- **Copiar tokens conserva su hoja personalizada** - Al duplicar un token se clona su ficha con los mismos ajustes
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
- **Mapas personalizados** - Sube una imagen como fondo en el Mapa de Batalla
- **Grid ajustable** - Tamaño y desplazamiento de la cuadrícula configurables
- **Mapa adaptable** - La imagen se ajusta al viewport manteniendo su proporción
- **Zoom interactivo** - Acerca y aleja el mapa con la rueda del ratón
- **Paneo con botón central** - Desplaza el mapa arrastrando con la rueda
- **Sombra de arrastre** - Mientras arrastras un token queda una copia semitransparente en su casilla original
- **Control de capas** - Desde Ajustes puedes subir o bajar un token para colocarlo encima o debajo de otros
- **Auras siempre debajo** - El aura de un token nunca se superpone sobre los demás, incluso al cambiar su capa
- **Barra de herramientas vertical** - Modos de selección, dibujo, medición y texto independientes del zoom
- **Herramienta de mirilla** - Selecciona atacante y objetivo mostrando una línea roja
- **Mapa desplazado** - El mapa se ajusta para que la barra de herramientas no oculte la cabecera ni los controles
- **Ajustes de dibujo** - Selector de color y tamaño de pincel con menú ajustado al contenido
- **Ajustes de regla** - Formas (línea, cuadrado, círculo, cono, haz), opciones de cuadrícula, visibilidad para todos y menú más amplio
- **Medición precisa y fluida** - La distancia se calcula con ajuste a la cuadrícula pero la regla sigue al cursor en tiempo real
- **Dibujos editables** - Selecciona con el cursor para mover, redimensionar o borrar con Delete. Cada página guarda sus propios trazos con deshacer (Ctrl+Z) y rehacer (Ctrl+Y)
- **Muros dibujables** - Herramienta para crear segmentos de longitud fija con extremos siempre visibles como círculos. Cada muro muestra una puerta en su punto medio y puedes alargarlo moviendo sus extremos en modo selección; los cambios se guardan al soltar.
- **Puertas configurables** - Al pulsar la puerta de un muro puedes abrir un menú para marcarla como secreta, cerrada u abierta y cambiar el color del muro; los ajustes se guardan en Firebase.
- **Dificultad de puertas** - Puedes asignar una CD a cada puerta y resetearla cuando quieras. Los jugadores deben superar la tirada para abrirlas.
- **Mensajes de puertas** - El chat indica quién intenta abrir la puerta y si la prueba fue superada.
- **Muros dibujables** - Herramienta para crear y alargar segmentos arrastrando antes de guardarlos. Se corrige un error que impedía dibujarlos correctamente.
- **Cuadros de texto personalizables** - Se crean al instante con fondo opcional; muévelos, redimensiónalos y edítalos con doble clic usando diversas fuentes
- **Edición directa de textos** - Tras crearlos o seleccionarlos puedes escribir directamente y el cuadro se adapta al contenido

### 🎲 **Gestión de Personajes**

> **Versión actual: 2.3.21**

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

**Resumen de cambios v2.1.10:**

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
- **Claves consumibles** - Acciones especiales con contador de usos
- **Carga física y mental** - Sistema automático de penalizaciones por peso
- **Estados del personaje** - Seguimiento de efectos activos con iconos
- **Inventario tradicional** - Sistema de slots drag & drop para objetos básicos

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

**Resumen de cambios v2.2.7:**

- Se corrige la penalización de Postura para que otras fichas ignoren el buff al calcular la resistencia.

**Resumen de cambios v2.2.8:**

- Postura solo suma su buff a la resistencia física o mental de Álvaro.

**Resumen de cambios v2.2.11:**

- Grid del Mapa de Batalla ahora puede escalarse y desplazarse para ajustarse al fondo.

**Resumen de cambios v2.2.12:**

- Imagen del mapa se escala automáticamente al contenedor sin perder la relación de aspecto.
- Opción para indicar el número de casillas y ajustar la grid al mapa cargado.

**Resumen de cambios v2.2.13:**

- Mapa sin bordes negros utilizando escalado tipo cover o contain.
- Zoom interactivo con la rueda del ratón en el Mapa de Batalla.

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
- Configuración de luz en tokens con radio, color e intensidad personalizables.

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
- Las animaciones de pérdida de varios bloques se muestran ahora una al lado de otra para mayor claridad y la vida se reduce de forma más lenta, desapareciendo tras 5 segundos.
El Máster ahora también ve estas animaciones cuando los jugadores reciben daño.
- Ahora las animaciones se comparten entre jugadores y el máster mediante Firestore.
- MapCanvas pasa ahora el `pageId` a los modales de ataque y defensa para sincronizar animaciones.
- Las fichas controladas por el Máster ahora muestran la pérdida de bloques en la vista de todos los jugadores.
- Los eventos de daño se conservan 5 segundos en Firestore para garantizar la sincronización entre navegadores.

**Resumen de cambios v2.4.18:**

 - Si un ataque no rompe ni reduce bloques ahora se muestra "**resiste el daño**" en azul en el chat.
 - El mensaje automático del ataque ahora muestra los valores actualizados de Vigor y Destreza del defensor.

### 🛠️ **Características Técnicas**

- **Interfaz responsive** - Optimizada para móviles y escritorio con TailwindCSS
- **Persistencia en Firebase** - Almacenamiento seguro y sincronización en tiempo real
- **Tooltips informativos** - Información detallada editables en tiempo real
- **Glosario configurable** - Términos destacados con descripciones personalizadas
- **Pruebas automáticas** - Suite de pruebas con React Testing Library
- _Nuevo:_ pruebas que simulan el cambio entre páginas y verifican que los tokens
  se mantienen independientes para jugadores y máster (`PageSwitchTokens.test.js`).
- _Nuevo:_ prueba rápida de cambio de página para asegurar que no se mezclan los tokens
  al navegar velozmente (`QuickPageSwitch.test.js`).
- _Nuevo:_ prueba de sincronización de movimiento de tokens entre jugador y máster
  usando un listener activo (`TokenListenerSync.test.js`).
- _Nuevo:_ prueba de mapeo de nombres de equipo al guardar fichas de tokens
  (`EquipmentSync.test.js`).

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

#### v2.1.2 (diciembre 2024)

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
- **Interfaz más intuitiva** - Píldoras organizadas por color (azul para armas, morado para poderes) sin subtítulos
- **Corrección de desincronización** - Las páginas ya no se actualizan antes de
  cargarse por completo
- **IDs de fichas** - Cada token creado ahora recibe un `tokenSheetId` único para evitar conflictos
- **Guardado exclusivo para el máster** - Los tokens, líneas y otros datos del mapa solo se guardan si el usuario es máster
- **Menús de token robustos** - Se eliminan IDs obsoletos al abrir configuraciones o estados, evitando errores si la ficha fue borrada
- **Sincronización de puertas** - Abrir o cerrar puertas se guarda correctamente al mover un token
- **Mirilla funcional para ataques** - Los jugadores pueden seleccionar objetivos enemigos con un clic y atacar con un segundo clic
- **La mirilla apunta a tokens ajenos** - Ahora también puedes fijar como objetivo fichas controladas por otros jugadores o por el máster
- **Doble clic seguro en mirilla** - Al usar la mirilla, el doble clic ya no abre el menú de ajustes del token
- **Iconos de puerta siempre orientados** - Los SVG de las puertas se muestran correctamente aunque el muro se dibuje al revés
- **Edición de estadísticas fiable** - Al borrar una estadística de la ficha se elimina también de `resourcesList`, evitando que reaparezca

#### v2.1.1 (junio 2024)

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

### 🧹 **Limpieza y Corrección de Errores (Diciembre 2024) - v2.1.3**

- ✅ **Errores críticos solucionados** - Imports de iconos faltantes corregidos para evitar errores de compilación
- ✅ **Código completamente limpio** - Eliminación de todos los console.log y console.error innecesarios
- ✅ **Expresiones regulares optimizadas** - Corrección de escapes innecesarios en patrones de búsqueda
- ✅ **Imports optimizados** - Eliminación de useState no usado en Input.jsx
- ✅ **Compilación perfecta** - Proyecto ahora compila sin errores ni warnings de ESLint
- ✅ **Mantenibilidad mejorada** - Código más limpio y fácil de mantener

### 🎮 **Mejoras en Minijuego de Cerrajería (Diciembre 2024)**

- ✅ **Velocidad aleatorizada mejorada** - Variación sutil de ±10% para evitar patrones predecibles
- ✅ **Balance de dificultad mantenido** - Misma variación en todos los niveles sin afectar jugabilidad
- ✅ **Información de velocidad** - Mostrar variación porcentual en tiempo real y resultados
- ✅ **Historial mejorado** - Incluye datos de velocidad para análisis de intentos anteriores

### 🔧 **Corrección de Permisos Firebase (Diciembre 2024)**

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

### 🗺️ **Corrección de Alineado de Tokens (Enero 2025) - v2.1.4**

- ✅ **Snap perfecto tras drag** - Los tokens quedan totalmente centrados en la casilla al soltarlos

### 🔧 **Mejora de selección de controlador (Enero 2025) - v2.1.5**

- ✅ **Listado completo de jugadores** - Ahora se muestran todos los nombres en "Controlado por" al editar un token
- ✅ **Ajustes de token en tiempo real** - Los cambios se aplican sin cerrar la ventana de configuración

### 🖌️ **Mejora de tinte de tokens (Febrero 2025) - v2.1.6**

- ✅ **Tinte nítido** - El token usa filtro RGBA en lugar de un overlay
- 🔧 **Cacheado con pixelRatio** - La imagen se cachea a la resolución de pantalla para no perder nitidez
- 🛠️ **pixelRatio ajustado** - El zoom del mapa se tiene en cuenta para evitar desenfoque
- 🚫 **Selección intacta** - El contorno de selección ya no se tiñe

### 🌀 **Indicador de carga del mapa (Marzo 2025) - v2.1.7**

- ✅ Spinner visible mientras se carga la imagen del mapa para evitar pantalla negra

### 🛑 **Bloqueo de movimiento al editar token (Abril 2025) - v2.1.8**

- ✅ Al escribir el nombre del token en los ajustes ya no se mueve accidentalmente

### 🗺️ **Corrección de carga de mapas (Julio 2025) - v2.1.9**

- ✅ Se muestra un mensaje de error si la imagen del mapa falla y se oculta el spinner
- 🔧 Dependencias de ESLint eliminadas para evitar peticiones innecesarias

### 🔒 **Restricciones de selección y sincronización mejorada (Enero 2025) - v2.4.12**

- ✅ **Restricciones de selección para jugadores** - Los jugadores solo pueden seleccionar tokens que controlan y elementos que crearon
- ✅ **Validación exhaustiva** - Aplicada en selección individual, Ctrl+click, selección múltiple y Ctrl+A
- ✅ **Tracking de creadores** - Campo `createdBy` agregado a líneas, muros y textos para validación de permisos
- ✅ **Visibilidad de barras mejorada** - Master SIEMPRE puede ver barras independientemente de configuración
- ✅ **Sincronización en tiempo real** - Listener `onSnapshot` para cambios instantáneos de visibilidad de mapas
- ✅ **Seguridad reforzada** - Sistema completo de permisos que respeta roles de usuario

### 🚨 **CRÍTICO: Sincronización cruzada entre mapas solucionada (Enero 2025) - v2.4.13**

- ✅ **Independencia completa de mapas** - Cada mapa mantiene contenido completamente independiente
- ✅ **Carga única por página** - Reemplazado `onSnapshot` por `getDoc` para evitar sincronización cruzada
- ✅ **Estados separados** - Sin propagación de cambios entre mapas diferentes
- ✅ **Cambio de página seguro** - Cambiar página NO elimina contenido de otras páginas
- ✅ **Modificaciones localizadas** - Mover tokens solo afecta página actual
- ✅ **Logs de debug** - Tracking completo de operaciones de carga y guardado por página
- ✅ **Manejo de errores robusto** - Try-catch y promesas con feedback detallado

### 🛠️ **Unificación de deepEqual (Julio 2025) - v2.4.14**

- ✅ Comparaciones profundas centralizadas en `src/utils/deepEqual.js`

### 🛡️ **Cancelación de guardados al cambiar de página (Abril 2026) - v2.4.15**

- ✅ Guardados pendientes de tokens, líneas, muros, textos y fondo se cancelan al cambiar de página

### ♻️ **Sincronización en tiempo real para el máster (Abril 2026) - v2.4.16**

- ✅ Listener `onSnapshot` mantiene tokens, líneas y demás elementos actualizados al instante para el máster

### 🔄 **Protección contra cargas desfasadas (Abril 2026) - v2.4.17**

- ✅ Se evita que una carga previa de página sobrescriba el estado actual comprobando la versión del efecto

### 🗺️ **Mensaje simplificado en mapa no disponible (Julio 2026) - v2.4.18**

- 📝 Se elimina la indicación redundante de espera dejando solo el mensaje principal

### 🌑 **Sincronización de oscuridad con jugadores (Julio 2026) - v2.4.19**

- ✅ Los valores `enableDarkness` y `darknessOpacity` de la página visible se actualizan al instante para los jugadores
- ✅ La visibilidad de las barras de los tokens se propaga en tiempo real entre máster y jugadores

### 🛠️ **Corrección de fichas de jugadores en mapa (Agosto 2026) - v2.4.20**

- ✅ Ventanas de ficha movibles para los jugadores
- ✅ Armas, armaduras y poderes se muestran correctamente en su ficha del mapa

### 🎯 **Modo Mirilla (Septiembre 2026) - v2.4.21**

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

### 🔄 **Sincronización automática de fichas (Octubre 2026) - v2.4.22**

- ✅ Los cambios en la ficha de un token controlado actualizan al instante la ficha de su jugador
- ✅ Al modificar el equipamiento desde el token, la ficha del jugador se actualiza automáticamente
- ✅ Las fichas de jugador se sincronizan automáticamente con los tokens controlados tras editar la ficha
- ✅ Se corrige un error que impedía aplicar estos cambios cuando se abrían los ajustes del token
- ✅ Activar condiciones desde la ficha ahora refleja el estado al instante en el token correspondiente
- ✅ Guardar la ficha envía el evento de actualización sin esperar a Firebase para evitar retrasos

### 🔄 **Sincronización entre pestañas (Noviembre 2026) - v2.4.23**

- ✅ La ficha de jugador se actualiza automáticamente al recibir el evento `playerSheetSaved` desde otras pestañas o tokens
- ✅ Al detectar cambios en `localStorage`, la ficha se actualiza sin recargar la página
- ✅ Los estados de los tokens controlados se sincronizan al instante al modificarse `localStorage`

### 🐞 **Corrección de la mirilla para el máster (Diciembre 2026) - v2.4.24**

- ✅ El máster puede seleccionar cualquier token como atacante sin fijar objetivo automáticamente
- ✅ El objetivo solo se fija al hacer clic sobre otro token, permitiendo cambiarlo fácilmente
- ✅ Prueba unitaria garantiza el funcionamiento correcto

### 🎯 **Alcance de armas y poderes (Enero 2027) - v2.4.25**

- ✅ El menú de ataque y defensa solo muestra armas o poderes al alcance
- ✅ Mensajes claros cuando no hay equipamiento o ningún arma puede utilizarse

### 🛠️ **Corrección de nombres y daño de armas (Enero 2027) - v2.4.26**

- ✅ Los menús de ataque y defensa listan correctamente las armas y poderes equipados
- ✅ Se tiene en cuenta el alcance aún cuando proviene de valores como "Cuerpo a cuerpo" o "Media"
- ✅ Las tiradas utilizan el daño definido para cada arma o poder

### 🎯 **Ajuste de valores de alcance (Enero 2027) - v2.4.27**

- ✅ Los alcances se limitan a cinco categorías: Toque, Cercano, Intermedio, Lejano y Extremo
- ✅ Se eliminan sinónimos como "corto" o "media" para evitar confusiones

### ⚔️ **Daño editable en ataques (Enero 2027) - v2.4.28**

- ✅ Al escoger un arma o poder aparece un campo con su daño por defecto
- ✅ Dicho campo es editable para modificar la tirada de ataque o defensa

### ⚔️ **Daño sin tipo en menús (Enero 2027) - v2.4.29**

- ✅ El campo de daño solo muestra valores como `1d8` o `2d6`, ocultando el tipo de daño
- ✅ También se rellena correctamente el daño de los poderes al seleccionarlos

### 👁️ **Rangos de visión opcionales (Enero 2027) - v2.4.30**

- ✅ Nueva casilla "Rangos de visión" en el mapa de batalla del máster
- ✅ Permite ocultar el contorno amarillo de visión de los tokens

### 🔄 **Barras por página (Enero 2027) - v2.4.30**

- ✅ Los eventos de visibilidad de barras incluyen la página de origen
- ✅ Los cambios solo se aplican si corresponden a la página abierta, evitando sobrescritura entre escenas

- ✅ El máster puede seleccionar cualquier token como atacante sin fijar objetivo automáticamente
- ✅ El objetivo solo se fija al hacer clic sobre otro token, permitiendo cambiarlo fácilmente
- ✅ Prueba unitaria garantiza el funcionamiento correcto

### 🏷️ **Nombre de token en chat (Enero 2027) - v2.4.31**

- ✅ Los mensajes de ataque y defensa muestran el nombre del token si está definido
- ✅ Si el token no tiene nombre, se usa el del asset correspondiente

### 🛡️ **Defensa remota mediante Firestore (Enero 2027) - v2.4.33**

- ✅ Tras lanzar el ataque se crea una solicitud en la colección `attacks`
- ✅ El jugador objetivo o el máster reciben la notificación y abren la defensa
- ✅ Solo se activa para jugadores con el mapa abierto controlando un token
- ✅ Optimizado el listener para evitar conexiones repetidas a Firestore
- ✅ Suscripción estable para prevenir reconexiones al renderizar el mapa
- ✅ La defensa se resuelve automáticamente si nadie responde
- ✅ Si no hay armas o poderes disponibles, el defensor puede introducir un valor manual de defensa

### ⚔️ **Daño escalado y contraataque (Enero 2027) - v2.4.35**

- ✅ El daño se calcula como `floor(daño / atributo)` y se aplica primero a la postura, luego a la armadura y finalmente a la vida
- ✅ El daño restante no pasa a la siguiente estadística si quedan bloques disponibles en la actual
- ✅ Si la defensa supera al ataque se produce un contraataque automático
- ✅ Los mensajes de chat muestran tiradas, diferencia y bloques perdidos

### 🏰 **Mejoras en botones de puertas y muros (Enero 2027) - v2.4.36**

- ✅ El icono de puerta tiene un área de clic más grande y visible
- ✅ Se cambia el cursor a puntero al pasar sobre el icono

### ⚡ **Consumo de velocidad en ataque y defensa (Enero 2027) - v2.4.37**

- ✅ Los modales de Ataque y Defensa muestran el consumo de velocidad del arma o poder seleccionado

### 🗄️ **Sincronización manual de fichas (Enero 2027) - v2.4.38**

- ✅ Nuevos botones para restaurar o subir la ficha del jugador desde los ajustes del token

### 🗑️ **Simplificación de botones de ficha (Enero 2027) - v2.4.39**

- ✅ Se elimina el botón "Actualizar ficha" manteniendo "Restaurar ficha" y "Subir cambios"

### 🕹️ **Ventana de cambio de ficha móvil (Enero 2027) - v2.4.40**

- ✅ El selector de ficha activa puede arrastrarse a cualquier posición de la pantalla

### 💾 **Persistencia de cambios en combate (Enero 2027) - v2.4.41**

- ✅ Los modales de Ataque y Defensa guardan las estadísticas modificadas con `saveTokenSheet`
- ✅ Al mover un token se mantienen correctos la vida y demás recursos

### 🛠️ **Edición tras restaurar ficha (Abril 2027) - v2.4.42**

- ✅ Restaurar la ficha de un jugador aplica valores predeterminados para que las barras sean visibles
- ✅ Las estadísticas pueden modificarse y guardarse sin problemas

### 🛠️ **Corrección de barras tras restaurar ficha (Julio 2027) - v2.4.43**

- ✅ Las fichas restauradas se normalizan en el tablero para mostrar todas las barras

### 🔗 **Indicador de ficha enlazada (Enero 2027) - v2.4.44**

- ✅ Distintivo visible cuando un token pertenece al jugador actual
- ✅ Mensaje junto a "Restaurar ficha" y "Subir cambios" recordando la vinculación

### 🛠️ **Corrección de animaciones de daño (Julio 2027) - v2.4.45**

- ✅ Las animaciones de daño se muestran tanto al atacante como al defensor
- ✅ La ventana de defensa se cierra automáticamente en todas las vistas al resolverse
- ✅ Se sincronizan las animaciones en navegadores distintos mediante Firestore


### 🎯 **Alcance de armas y poderes (Enero 2027) - v2.4.25**

- ✅ El menú de ataque y defensa solo muestra armas o poderes al alcance
- ✅ Mensajes claros cuando no hay equipamiento o ningún arma puede utilizarse

### 🛠️ **Corrección de nombres y daño de armas (Enero 2027) - v2.4.26**

- ✅ Los menús de ataque y defensa listan correctamente las armas y poderes equipados
- ✅ Se tiene en cuenta el alcance aún cuando proviene de valores como "Cuerpo a cuerpo" o "Media"
- ✅ Las tiradas utilizan el daño definido para cada arma o poder

### 🎯 **Ajuste de valores de alcance (Enero 2027) - v2.4.27**

- ✅ Los alcances se limitan a cinco categorías: Toque, Cercano, Intermedio, Lejano y Extremo
- ✅ Se eliminan sinónimos como "corto" o "media" para evitar confusiones

### ⚔️ **Daño editable en ataques (Enero 2027) - v2.4.28**

- ✅ Al escoger un arma o poder aparece un campo con su daño por defecto
- ✅ Dicho campo es editable para modificar la tirada de ataque o defensa

### ⚔️ **Daño sin tipo en menús (Enero 2027) - v2.4.29**

- ✅ El campo de daño solo muestra valores como `1d8` o `2d6`, ocultando el tipo de daño
- ✅ También se rellena correctamente el daño de los poderes al seleccionarlos

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
