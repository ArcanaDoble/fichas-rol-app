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
- **Modo Master y Jugador** - Controles especializados según el rol del usuario
- **Mapa de Batalla integrado** - VTT sencillo con grid y tokens arrastrables
- **Fichas de token personalizadas** - Cada token puede tener su propia hoja de personaje
- **Nombre en tokens** - El nombre del personaje aparece justo debajo del token en negrita con contorno negro (text-shadow en cuatro direcciones y leve desenfoque)
- **Nombre escalable** - La fuente del nombre aumenta si el token ocupa varias casillas
- **Mini-barras en tokens** - Cada stat se muestra sobre el token mediante cápsulas interactivas y puedes elegir su posición
- **Barras compactas** - Las barras de recursos son más pequeñas y están más cerca del token
- **Ajustes al hacer doble clic** - Haz doble clic en un token para abrir su menú de configuración
- **Iconos de control de tamaño fijo** - Engranaje, círculo de rotación y barras mantienen un tamaño constante al hacer zoom
- **Mapas personalizados** - Sube una imagen como fondo en el Mapa de Batalla
- **Grid ajustable** - Tamaño y desplazamiento de la cuadrícula configurables
- **Mapa adaptable** - La imagen se ajusta al viewport manteniendo su proporción
- **Zoom interactivo** - Acerca y aleja el mapa con la rueda del ratón
- **Paneo con botón central** - Desplaza el mapa arrastrando con la rueda
- **Sombra de arrastre** - Mientras arrastras un token queda una copia semitransparente en su casilla original

### 🎲 **Gestión de Personajes**

> **Versión actual: 2.3.7**

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
- Otros cambios y ajustes menores.

**Resumen de cambios v2.1.10:**
- Nuevo botón dorado para aplicar buffs a las estadísticas.
- El botón verde "+" ahora incrementa el recurso hasta su valor base.
- Otros ajustes menores.

**Resumen de cambios v2.1.11:**
- Lista completa de jugadores en el campo **Controlado por** al editar un token.

**Resumen de cambios v2.1.12:**
- Indicador de carga en el mapa con spinner mientras se descarga la imagen.

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
- Corrección del parpadeo al arrastrar tokens y vista previa estable bajo el cursor.

### 🛠️ **Características Técnicas**
- **Interfaz responsive** - Optimizada para móviles y escritorio con TailwindCSS
- **Persistencia en Firebase** - Almacenamiento seguro y sincronización en tiempo real
- **Tooltips informativos** - Información detallada editables en tiempo real
- **Glosario configurable** - Términos destacados con descripciones personalizadas
- **Pruebas automáticas** - Suite de pruebas con React Testing Library

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
- **Mejoras en Sistema de Velocidad** - Los jugadores ahora pueden eliminar sus propios participantes, no solo el master
- **Botón de papelera mejorado** - Color rojo consistente con el sistema de velocidad en inventario y línea de sucesos
- **Consumo de velocidad inteligente** - Las píldoras muestran el consumo real basado en emojis 🟡 del equipamiento
- **Interfaz más intuitiva** - Píldoras organizadas por color (azul para armas, morado para poderes) sin subtítulos

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


