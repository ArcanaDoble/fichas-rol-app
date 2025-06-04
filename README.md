# Fichas Rol App

Aplicación web para crear y gestionar fichas de rol de jugadores. Permite almacenar atributos, armas y armaduras, junto con otros recursos, en una base de datos de Firebase. El catálogo de equipos se mantiene en hojas de cálculo públicas de Google Sheets, por lo que cualquier cambio allí se refleja automáticamente en la aplicación.

## Instalación

1. Clona el repositorio.
2. Ejecuta `npm install` para instalar las dependencias.
3. Ejecuta `npm start` para iniciar la aplicación en modo desarrollo.

## Despliegue en Firebase

1. Configura Firebase en el archivo `src/firebase.js` con tus credenciales.
2. Ejecuta `npm run build` para generar los archivos de producción.
3. Despliega la carpeta `build` con `firebase deploy`.

## Funcionalidades

- Gestión de armas, armaduras, atributos y recursos de personajes.
- Interfaz adaptable a distintos dispositivos.
- Autenticación básica mediante contraseña maestra.
- Tooltip de recursos mejorado: se muestra al pasar el ratón,
  se puede fijar con un clic y editar con doble clic.

