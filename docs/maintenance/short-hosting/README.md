# Dirección corta de NOMA

Fecha: 4 de noviembre de 2026.

## Accesos

- Recomendado: **https://nomarol.web.app**.
- Anterior, también operativo: https://base-de-datos-noma.web.app.
- Firebase confirmó que el identificador `noma` está reservado por otro proyecto. Se creó `nomarol` dentro de `base-de-datos-noma`.

El alta usa el subdominio gratuito de Firebase Hosting, sin comprar un dominio. Ambos sitios comparten la aplicación y los servicios del proyecto original. No se modificaron la configuración del SDK, Firestore, Storage ni sus reglas. Los otros sitios del proyecto no forman parte de esta publicación.

## Versión inicial y siguientes publicaciones

Se clonó directamente la versión activa del sitio anterior, con sus 267 archivos y su configuración de Hosting, para estrenar la dirección con la misma aplicación publicada. No se reconstruyó ni desplegó el código local.

`.firebaserc` vincula los destinos `legacy` → `base-de-datos-noma` y `noma` → `nomarol`. `firebase.json` contiene ambos destinos con la misma carpeta `build`, cabeceras y reescritura de la aplicación.

La publicación habitual actualiza los dos enlaces:

```sh
npm run build
firebase deploy --only hosting --project base-de-datos-noma
```

Para actuar de forma excepcional sobre un solo sitio pueden usarse `--only hosting:noma` o `--only hosting:legacy`. Después deben volver a sincronizarse antes de considerar terminada una publicación. El enlace anterior permanece disponible; no se ha añadido una redirección.

Cada dirección tiene sus propias preferencias y caché del navegador. Los personajes y las campañas guardados en Firebase se consultan en la misma base de datos; al usar la dirección nueva se vuelve a elegir el acceso de jugador o máster.

## Comprobaciones

- Configuración cargada y validada con la biblioteca de la Firebase CLI instalada: se resuelven los dos destinos y sus configuraciones coinciden.
- HTML y manifiesto idénticos en ambos enlaces. Comparados por SHA-256 los diez archivos del manifiesto (JavaScript, CSS, fragmentos, fuentes e imágenes) y un retrato público adicional.
- Versiones de Hosting con el mismo número de archivos, tamaño y configuración. Verificada también la reescritura a `index.html` y las cabeceras equivalentes.
- Firebase Storage acepta el nuevo origen: preflight de subida con estado 200 y origen permitido `*`; no se subieron archivos de prueba.
- Edge en PC (1280 × 900) y móvil (412 × 915): inicio, misma lista de cuatro personajes cargada de Firestore y pantalla de contraseña del máster; ninguna excepción JavaScript. No se iniciaron sesiones de partida ni se escribieron datos de juego.
- [Verificación técnica](verification.json), [registro de navegador](browser-check.log), [inicio en PC](desktop.png) y [personajes en móvil](mobile.png).

Guía oficial: [varios sitios de Hosting en el mismo proyecto](https://firebase.google.com/docs/hosting/multisites) y [clonado de versiones publicadas](https://firebase.google.com/docs/hosting/manage-hosting-resources).
