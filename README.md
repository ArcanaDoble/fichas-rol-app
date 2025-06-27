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

### 🎲 **Gestión de Personajes**

> **Versión actual: 2.2.0**

**Resumen de cambios v2.2.0:**
- **Sistema de velocidad revolucionario** - Gestión de iniciativa basada en velocidad con actuación simultánea
- **Interfaz de combate mejorada** - Diseño compacto y elegante para "Únete al combate"
- **Efectos visuales avanzados** - Bloque "Actúan Simultáneamente" con borde pulsante dorado
- **Tooltips de glosario corregidos** - Información del glosario funciona correctamente en resumen de enemigos
- **Colores de botones optimizados** - Botones + verdes y papelera con degradado rojo sutil
- **Componente Boton mejorado** - Detección automática de colores personalizados
- **Gestión de permisos mejorada** - Jugadores pueden editar solo sus personajes, master puede editar todo

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

### 🏃 Cómo usar el Sistema de Velocidad

1. **Acceso**: Modo Máster → "⚡ Sistema de Velocidad"
2. **Unirse al combate**: Los jugadores pueden añadir sus personajes con velocidad inicial
3. **Gestión de velocidad**: Usa los botones + y - para ajustar velocidad
4. **Actuación simultánea**: Cuando hay empate, actúan todos juntos
5. **Controles del master**: Añadir enemigos, resetear velocidades, gestionar participantes

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

#### v2.2.0 (Diciembre 2024)
- **Sistema de velocidad revolucionario** - Gestión de iniciativa basada en velocidad con actuación simultánea
- **Interfaz de combate mejorada** - Diseño compacto y elegante para "Únete al combate"
- **Efectos visuales avanzados** - Bloque "Actúan Simultáneamente" con borde pulsante dorado
- **Tooltips de glosario corregidos** - Información del glosario funciona correctamente en resumen de enemigos
- **Colores de botones optimizados** - Botones + verdes y papelera con degradado rojo sutil
- **Componente Boton mejorado** - Detección automática de colores personalizados
- **Gestión de permisos mejorada** - Jugadores pueden editar solo sus personajes, master puede editar todo

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

### 🎮 **Sistema de Velocidad Revolucionario (Diciembre 2024)**
- ✅ **Gestión de iniciativa basada en velocidad** - Sistema donde actúa quien tiene menos velocidad
- ✅ **Actuación simultánea** - Cuando hay empate de velocidad, actúan todos juntos
- ✅ **Interfaz de combate mejorada** - Diseño compacto y elegante para "Únete al combate"
- ✅ **Efectos visuales avanzados** - Bloque "Actúan Simultáneamente" con borde pulsante dorado
- ✅ **Gestión de permisos mejorada** - Jugadores pueden editar solo sus personajes, master puede editar todo
- ✅ **Controles del master** - Añadir enemigos, resetear velocidades, gestionar participantes
- ✅ **Línea de sucesos** - Visualización clara del orden de actuación con colores por jugador

### 🎨 **Mejoras Visuales y UX (Diciembre 2024)**
- ✅ **Tooltips de glosario corregidos** - Información del glosario funciona correctamente en resumen de enemigos
- ✅ **Colores de botones optimizados** - Botones + verdes y papelera con degradado rojo sutil
- ✅ **Componente Boton mejorado** - Detección automática de colores personalizados
- ✅ **Efectos visuales refinados** - Bordes pulsantes y animaciones suaves
- ✅ **Interfaz más compacta** - Mejor aprovechamiento del espacio en pantalla

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

</details>

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

