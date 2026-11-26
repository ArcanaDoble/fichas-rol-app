# Servicio de salas de Canvas 3D

`npm ci --prefix services/canvas3d` instala las dependencias del servicio. Desde la raíz, `npm start` sirve NOMA y la API en `/api/canvas3d`. Las mesas locales se guardan en `.noma/canvas3d` dentro del directorio del usuario. Para una partida de desarrollo se puede crear la sala desde localhost y abrir las invitaciones en los móviles de la misma red. Las invitaciones de un solo uso vinculan un navegador a su puesto.

Para abrir una invitación desde el teléfono, utiliza la dirección de red del ordenador en el enlace. Si funciona en el PC y el teléfono no conecta, comprueba el perfil de esa red en Windows y si su cortafuegos permite conexiones entrantes a Node.js.

`npm test --prefix services/canvas3d` comprueba por HTTP las sesiones simultáneas, las tomas de piezas, el histórico, la reconexión y la visibilidad de cada puesto. La API entrega el fondo recortado por la niebla y sirve las ilustraciones de piezas visibles como texturas WebP de hasta 512 píxeles por lado. `npm start --prefix services/canvas3d` inicia la API por separado en el puerto 4183.

## Servicio del piloto en NOMA

`node services/canvas3d/publish.cjs --plan` muestra los recursos del piloto. Para publicar la API, el comando es `node services/canvas3d/publish.cjs --apply`. Se puede añadir `--firebase-login` para usar la sesión vigente de Firebase CLI con Google Cloud CLI. El despliegue de la aplicación web usa el destino Hosting `noma`, que reenvía las peticiones de las salas a Cloud Run en `europe-west1`.

El script empaqueta únicamente el servicio y sus recursos, crea las identidades de compilación y ejecución y configura una base Firestore llamada `noma-canvas3d` con reglas propias. Las credenciales del máster se cargan desde la versión activa del secreto `noma-canvas3d-master` en Secret Manager. Para elegir la primera clave se puede aportar `CANVAS3D_SETUP_MASTER_KEY` al proceso de publicación. Por defecto se genera una clave aleatoria que el máster puede consultar en Secret Manager. Los puestos de jugador acceden con sus invitaciones.

Las variables del proceso son `CANVAS3D_DATABASE`, `GOOGLE_CLOUD_PROJECT` y `CANVAS3D_MASTER_KEY` en Cloud Run. En desarrollo, `CANVAS3D_DATA_DIR` cambia el directorio local de salas y `CANVAS3D_MASTER_KEY` permite abrir el puesto de máster desde otro equipo. El servicio independiente acepta `PORT` y `CANVAS3D_HOST`.
