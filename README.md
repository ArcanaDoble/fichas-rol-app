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

### 🆕 **Sistema de Inventario RE4 Completo** (v2.0)
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

### 🔧 **Mejoras de UX/UI**
- ✅ **Menú máster rediseñado** con mejor presentación visual
- ✅ **Integración React nativa** (eliminado iframe, ahora usa componentes React)
- ✅ **Backend adaptativo** (HTML5Backend para escritorio, TouchBackend para móviles)
- ✅ **CSS mejorado** con animaciones, scrollbars personalizados y efectos de hover
- ✅ **Tooltips avanzados** con información detallada de objetos
- ✅ **Accesibilidad mejorada** con soporte para `prefers-reduced-motion`

### 🛠️ **Mejoras Técnicas**
- ✅ **Performance optimizada** con `useMemo` y `useCallback`
- ✅ **Gestión de estado mejorada** con hooks personalizados
- ✅ **Collision detection perfecto** considerando rotación de objetos
- ✅ **Persistencia en Firebase** con timestamps y metadatos
- ✅ **Manejo de errores robusto** con feedback visual
- ✅ **Código modular** con componentes reutilizables

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

