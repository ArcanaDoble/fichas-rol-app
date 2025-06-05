# Fichas Rol App

Fichas Rol App es una aplicación web desarrollada en React para crear y gestionar fichas de personaje. Toda la información de cada jugador se almacena en Firebase y el catálogo de equipo proviene de hojas de cálculo públicas de Google Sheets, por lo que se actualiza automáticamente.

## Características principales

- **Modo Jugador y Modo Máster**. Los jugadores pueden crear su ficha introduciendo su nombre y el máster puede acceder con una contraseña para refrescar el catálogo de armas y armaduras.
- **Gestión de atributos y recursos**. Cada ficha contiene los cuatro atributos principales (destreza, vigor, intelecto y voluntad) representados con dados y una lista editable de recursos (postura, vida, ingenio, cordura, armadura, etc.). Es posible añadir o eliminar recursos personalizados y definir su color e información emergente.
- **Equipamiento desde Google Sheets**. Las armas y armaduras se cargan de hojas de cálculo públicas. El máster puede buscar y revisar todas las opciones y los jugadores pueden equiparse desde su ficha.
- **Habilidades personalizadas**. El máster puede crear poderes en Firebase y los jugadores pueden equiparlos en su ficha.
- **Claves consumibles**. Cada jugador puede definir sus propias Claves, acciones especiales con contador de usos que se editan desde la ficha.
- **Carga física y mental**. El peso del equipo afecta a la Postura y a la Cordura. La aplicación calcula automáticamente la carga física y mental acumulada e indica la penalización correspondiente.
- **Edición de tooltips**. Los textos explicativos de cada recurso pueden editarse directamente en la interfaz tanto en ordenador como en móviles.
- **Interfaz responsive**. Está pensada para verse correctamente en móviles y escritorio y utiliza TailwindCSS para los estilos.
- **Inventario drag & drop**. Nuevo componente modular con slots configurables para arrastrar objetos.
- **Pruebas automáticas**. Se incluye un conjunto básico de pruebas con React Testing Library en `src/App.test.js`.

## Instalación y uso

1. Clona este repositorio.
2. Ejecuta `npm install` para instalar las dependencias.
3. Configura tus credenciales de Firebase en `src/firebase.js` si es necesario.
4. Lanza la aplicación con `npm start` y abre `http://localhost:3000` en el navegador.

### Despliegue en Firebase

1. Ejecuta `npm run build` para generar la versión de producción.
2. Despliega la carpeta `build` con `firebase deploy`.

### Ejecutar las pruebas

Las pruebas se ejecutan con `npm test`.

```bash
npm test
```

## Cambios recientes

A lo largo del proyecto se han añadido numerosas mejoras, entre ellas:

- Cálculo de carga física y mental y visualización con iconos.
- Edición y eliminación de recursos dinámicos con validaciones.
- Bloque de "añadir recurso" plegable para simplificar la interfaz.
- Tooltips explicativos editables y adaptados a móviles.
- Mejoras de estilo y responsividad utilizando Tailwind.
- Actualización de metadatos y pruebas automatizadas.
- Interfaz de equipamiento mejorada.
- Gestión de poderes creados en Firebase.
- Sección de Claves con contador de usos personalizable.
- Inventario modular con arrastrar y soltar.
- Barras de estadísticas con diseño responsive.
- Recursos con unidades en círculos para mayor claridad.
- Cartas de atributos optimizadas para móvil.
- Comportamiento de los tooltips refinado al pasar el ratón o hacer doble toque.
- Barra de Claves limitada a 10 unidades y botón para reiniciar sus usos.
- Botón "Volver al menú principal" en la pantalla de acceso de Máster.
- Equipamiento y poderes centrados cuando solo hay un elemento equipado.
- Selector de estados con iconos para llevar el control de efectos activos.
- Inventario disponible en las fichas de jugador.
- Slots del inventario habilitables con un clic y almacenamiento persistente.
- Persistencia del inventario en Firestore en lugar de localStorage.
- Buscador de objetos con texto visible y envío con Enter.
- Sugerencia automática al buscar objetos con tabulación para autocompletar.
- Botón de papelera para eliminar objetos arrastrándolos.
- Estilo de los slots y botones optimizado para móviles.
- Opción para borrar slots del inventario.
- `DndProvider` movido al nivel raíz de la aplicación para evitar errores de contexto.
- Persistencia completa del inventario (posiciones, cantidades y objetos eliminados).
- Botones de aumento y disminución con estilo más compacto y adaptable a móviles.
- Arreglada la sincronización inicial del inventario para que los cambios se
  conserven tras recargar la página.
- Estética del inventario renovada con bordes brillantes y controles más grandes.
- Efecto luminoso al pasar el ratón sobre los slots o al contener un objeto.
- Animaciones de arrastre y para indicar intentos inválidos sobre slots deshabilitados.
- Animación de rebote al soltar objetos en los slots.
- Iconos de eliminar y cerrar slot ampliados y adaptados a pantallas táctiles.
- Inventario guardado de forma individual para cada jugador.
- Soporte de arrastre en dispositivos móviles gracias a TouchBackend.
- Cantidad de objetos aumentable arrastrando repetidas veces al mismo slot.
- Animación de activación del slot con resaltado verde.
- Papelera y botón de nuevo slot con animaciones al pasar el ratón.
- Edición y eliminación de habilidades creadas por el máster.
- Los slots del inventario se crean habilitados por defecto y se eliminan con doble clic.
- Tamaño de los slots adaptado a pantallas grandes.
- Tarjetas de armas, armaduras y poderes sin bordes de color.
- Imágenes de espada, armadura y músculo como marcas de agua.
