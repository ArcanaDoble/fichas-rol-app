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

Cambios recientes destacados (v2.1)
Inventario RE4

    Grid 10 × 8 con rotación, 18 objetos, cinco rarezas, animaciones y guía integrada.

Minijuegos

    Calculadora de dados integrada.
    Cerrajería con diana decreciente y niveles de dificultad revisados.
    Texto centrado en las instrucciones de la cerrajería.
    Arreglos menores: constante DADOS exportada y validación PropTypes en MasterMenu.
    Configuración Firebase mejorada: usa variables de entorno o credenciales por defecto.


UX / UI

    Pantallas de inicio y login rediseñadas, notificaciones Toast, modales avanzados, gradientes y efectos de partículas.

Componentes

    Boton, Input, Tarjeta y Modal refactorizados; LoadingSpinner y sistema de confirmaciones unificados.

Técnicos

    Optimización con useMemo y useCallback, manejo robusto de errores, persistencia con metadatos y código más modular.

<details> <summary>Historial completo de mejoras anteriores</summary>

    Cálculo de carga física y mental y visualización con iconos.

    Edición y eliminación de recursos dinámicos con validaciones.

    Tooltips editables y adaptados a móviles.

    Interfaz de equipamiento mejorada y gestión de poderes.

    Inventario modular drag & drop con persistencia en Firestore.

    Selector de estados con iconos, glosario configurable y sistema de slots animados.

    Prototipo de inventario RE4 incrustado vía iframe para pruebas.

    Tests unitarios ampliados y código limpiado de variables sin usar.

</details>
Contribución

    Haz fork del proyecto.

    Crea una rama (git checkout -b feature/nueva-caracteristica).

    Commit de tus cambios (git commit -m 'Añadir nueva característica').

    Push a tu rama (git push origin feature/nueva-caracteristica).

    Abre un Pull Request.

Licencia

Este proyecto se distribuye bajo licencia MIT. Consulta el archivo LICENSE para más información.