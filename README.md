# 🎮 Fichas Rol App

**Aplicación web avanzada para gestión de fichas de personaje con sistema de inventario estilo Resident Evil 4**

Fichas Rol App es una aplicación web desarrollada en React para crear y gestionar fichas de personaje de rol. Toda la información se almacena en Firebase y el catálogo de equipo proviene de Google Sheets, actualizándose automáticamente. Incluye un revolucionario sistema de inventario estilo Resident Evil 4 con grid 10×8, drag & drop fluido y rotación de objetos.

## ✨ Características principales

### 🎯 **Sistema de Inventario RE4 (NUEVO)**
- **Grid 10×8 con collision detection perfecto** - Sistema tetris-like para optimizar espacio
- **Drag & Drop fluido con preview visual** - Arrastra objetos con vista previa en tiempo real
- **Rotación de objetos con click derecho** - Rota armas y objetos para encajar mejor
- **18 tipos de objetos diferentes** - Armas, munición, curación, tesoros, objetos clave y más
- **Sistema de rareza con colores** - Común, poco común, raro, legendario y único
- **Responsive design** - Optimizado para móviles y escritorio
- **Efectos visuales y animaciones** - Feedback visual para todas las acciones
- **Stackeado automático** - Los objetos compatibles se combinan automáticamente
- **Guía interactiva** - Sistema de ayuda integrado con controles y consejos

### ⚡ **Sistema de Velocidad Avanzado (NUEVO)**
- **Línea de sucesos en tiempo real** - Seguimiento visual del orden de actuación
- **Píldoras de Equipamiento interactivas** - Uso directo de armas y poderes desde la ficha
- **Consumo de velocidad inteligente** - Cálculo automático basado en emojis 🟡 del equipamiento
- **Permisos granulares** - Jugadores pueden eliminar sus propios participantes
- **Interfaz color-coded** - Identificación visual por jugador y tipo de equipamiento
- **Sincronización en tiempo real** - Cambios instantáneos para todos los participantes
- **Modo Master y Jugador** - Controles especializados según el rol del usuario

### 🎲 **Gestión de Personajes**

> **Versión actual: 2.1.2**

**Resumen de cambios v2.1.2:**
- Sistema de Píldoras de Equipamiento integrado en el Sistema de Velocidad para uso directo de armas y poderes
- Mejoras en permisos de eliminación: jugadores pueden eliminar sus propios participantes
- Botón de papelera con color rojo consistente en todo el sistema
- Consumo de velocidad inteligente basado en emojis 🟡 del equipamiento
- Interfaz más limpia y organizada para mejor experiencia de usuario

**Resumen de cambios v2.1.1:**
- Rediseño visual de la vista de enemigos como cartas tipo Magic, con layout responsive y efectos visuales exclusivos.
- Las tarjetas de armas y armaduras equipadas mantienen su diseño clásico, separando estilos de cartas de enemigos y equipamiento.
- Animaciones suaves y modernas en atributos, estadísticas y reordenamiento de listas.
- Mejoras de usabilidad y visuales en la ficha de enemigos, imágenes y minijuegos.
- Corrección de bugs visuales y de interacción en tarjetas y componentes.

- **Modo Jugador y Modo Máster** - Interfaces especializadas para cada rol
- **Gestión de atributos y recursos** - Dados para atributos y recursos personalizables
- **Equipamiento desde Google Sheets** - Catálogo dinámico de armas y armaduras
- **Habilidades personalizadas** - Creación y gestión de poderes únicos
- **Claves consumibles** - Acciones especiales con contador de usos
- **Carga física y mental** - Sistema automático de penalizaciones por peso
- **Estados del personaje** - Seguimiento de efectos activos con iconos
- **Inventario tradicional** - Sistema de slots drag & drop para objetos básicos

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

### 🎮 Cómo usar el Inventario RE4

1. **Acceso**: Modo Máster → "🎒 Inventario RE4"
2. **Añadir objetos**: Usa los controles por categoría (Armas, Munición, Curación, etc.)
3. **Mover objetos**: Arrastra y suelta en el grid 10×8
4. **Rotar objetos**: Click derecho en objetos rotables
5. **Eliminar objetos**: Doble click en cualquier objeto
6. **Ayuda**: Botón "❓" para guía completa

### ⚡ Cómo usar el Sistema de Velocidad

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
│   ├── re4/                    # Sistema de inventario RE4
│   │   ├── InventoryRE4.jsx   # Componente principal
│   │   ├── InventoryItem.jsx  # Items con rotación
│   │   ├── InventoryControls.jsx # Controles y categorías
│   │   ├── InventoryHelp.jsx  # Guía interactiva
│   │   ├── InventoryEffects.jsx # Efectos visuales
│   │   ├── ItemPreview.jsx    # Preview durante drag
│   │   ├── GridCell.jsx       # Celdas del grid
│   │   └── itemTemplates.js   # 18 tipos de objetos
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

### 🆕 **Sistema de Inventario RE4 Completo** (v2.1)
- ✅ **Grid 10×8 perfecto** con collision detection avanzado
- ✅ **18 tipos de objetos** organizados en 6 categorías (Armas, Munición, Curación, Objetos Clave, Tesoros, Misceláneos)
- ✅ **Rotación con click derecho** para objetos compatibles
- ✅ **Preview visual durante drag** con validación en tiempo real
- ✅ **Sistema de rareza** (Común, Poco común, Raro, Legendario, Único)
- ✅ **Efectos visuales** para todas las acciones (añadir, mover, rotar, eliminar)
- ✅ **Responsive design** optimizado para móviles y escritorio
- ✅ **Iconos SVG personalizados** para mejor apariencia visual
- ✅ **Guía interactiva** con controles, categorías y consejos
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

### 🎮 **Mejoras en Minijuego de Cerrajería (Diciembre 2024)**
- ✅ **Velocidad aleatorizada mejorada** - Variación sutil de ±10% para evitar patrones predecibles
- ✅ **Balance de dificultad mantenido** - Misma variación en todos los niveles sin afectar jugabilidad
- ✅ **Información de velocidad** - Mostrar variación porcentual en tiempo real y resultados
- ✅ **Historial mejorado** - Incluye datos de velocidad para análisis de intentos anteriores

### 🔧 **Corrección de Permisos Firebase (Diciembre 2024)**
- ✅ **Reglas de Firestore configuradas** - Solucionado error "Missing or insufficient permissions"
- ✅ **Configuración de seguridad** - Añadidas reglas permisivas para acceso completo a datos
- ✅ **Archivos de configuración** - Creados `firestore.rules` y `firestore.indexes.json`
- ✅ **Despliegue actualizado** - Firebase configurado correctamente para producción

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
=======
Fichas Rol App

Fichas Rol App es una aplicación web desarrollada en React para crear y gestionar fichas de personaje de rol.
Toda la información se almacena en Firebase y el catálogo de equipo proviene de Google Sheets, por lo que se actualiza automáticamente.

Desde la versión 2.1 incluye un sistema de inventario tipo “Resident Evil 4” con cuadrícula 10 × 8, arrastrar-soltar fluido y rotación de objetos.
Características principales

    Modo Jugador / Modo Máster
    El jugador crea su ficha; el máster accede con contraseña para refrescar catálogos y ayudas.

    Atributos y recursos personalizables
    Destreza, vigor, intelecto y voluntad (dados) + recursos editables (postura, vida, cordura, etc.).

    Equipamiento dinámico
    Armas y armaduras cargadas de Google Sheets; búsqueda y equipación en tiempo real.

    Habilidades y Claves
    Poderes creados en Firebase y acciones especiales con contador de usos.

    Carga física y mental automática
    El peso del equipo modifica Postura y Cordura y muestra penalizaciones.

    Tooltips y glosario editables
    Textos de ayuda modificables desde la propia interfaz.

    Inventario tradicional con drag & drop
    Slots activables, animaciones y persistencia en Firestore.

    Inventario RE4 (nuevo)

        Grid 10 × 8 con detección de colisiones y rotación (click derecho)

        18 tipos de objetos, rarezas y “stacking” automático

        Previsualización durante el arrastre, guías interactivas y diseño responsive

    Calculadora de dados y minijuego de cerrajería con dificultad progresiva

    Interfaz responsive con TailwindCSS y animaciones suaves (Framer Motion).

    Pruebas automáticas incluidas (React Testing Library).

Instalación y uso

    Clona este repositorio.

    Ejecuta npm install para instalar las dependencias.

    Copia .env.example a .env y rellena tus claves de Firebase, la contraseña de Máster y el ID de la hoja de cálculo de Google. Si no proporcionas estas variables, la aplicación usará las credenciales por defecto incluidas en `src/firebase.js` para conectarse al proyecto público.

    Inicia la aplicación con npm start y abre http://localhost:3000.

Comandos útiles
Acción	Comando
Servidor de desarrollo	npm start
Ejecutar pruebas	npm test -- --watchAll=false
Lint + Prettier	npm run lint · npm run format
Build producción	npm run build
Despliegue Firebase	firebase deploy
Despliegue en Firebase

    Ejecuta npm run build para generar la carpeta build.

    Despliega con firebase deploy.
    El firebase.json ya incluye el rewrite ** → /index.html para SPA.

Arquitectura del proyecto (resumen)

src/
├── components/
│   ├── re4/             # Inventario Resident Evil 4
│   ├── inventory/       # Inventario clásico por slots
│   └── ui/              # Boton, Modal, Toast, etc.
├── hooks/               # Hooks personalizados
├── firebase.js          # Configuración Firebase
└── App.js               # Enrutado principal