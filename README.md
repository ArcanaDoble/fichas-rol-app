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

## 📋 Arquitectura del proyecto

```
src/
├── components/
│   ├── inventory/             # Inventario tradicional
│   └── [otros componentes]    # UI general
├── firebase.js                # Configuración Firebase
└── App.js                     # Componente principal
```

## 🔄 Historial de cambios

**Resumen de cambios v2.1.3:**

- ✅ **Errores críticos solucionados** - Imports de iconos faltantes corregidos para evitar errores de compilación
- ✅ **Código completamente limpio** - Eliminación de todos los console.log y console.error innecesarios
- ✅ **Expresiones regulares optimizadas** - Corrección de escapes innecesarios en patrones de búsqueda
- ✅ **Imports optimizados** - Eliminación de useState no usado en Input.jsx
- ✅ **Compilación perfecta** - Proyecto ahora compila sin errores ni warnings de ESLint
- ✅ **Mantenibilidad mejorada** - Código más limpio y fácil de mantener


- ✅ **Velocidad aleatorizada mejorada** - Variación sutil de ±10% para evitar patrones predecibles
- ✅ **Balance de dificultad mantenido** - Misma variación en todos los niveles sin afectar jugabilidad
- ✅ **Información de velocidad** - Mostrar variación porcentual en tiempo real y resultados
- ✅ **Historial mejorado** - Incluye datos de velocidad para análisis de intentos anteriores


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

- ✅ Nueva casilla "Rangos de visión" en el mapa de batalla del máster
- ✅ Permite ocultar el contorno amarillo de visión de los tokens


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
