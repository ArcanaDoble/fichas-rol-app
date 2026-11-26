# Imágenes de habilidades enemigas en el Canvas

Corrección del 22/10/2026. La ilustración de una habilidad se guardaba al desplegar
el enemigo, pero `getObjectImage` solo reconocía `icon`, el catálogo compartido y
las imágenes incorporadas por nombre. El inspector ignoraba `image` y
`imageSource` de la propia habilidad, y mostraba el rayo de reserva.

El resolvedor reconoce ahora las imágenes explícitas del elemento antes de
consultar el catálogo. No cambia el diseño de tarjetas ni las reglas. La
corrección también sirve al reabrir tokens ya guardados que conserven esos campos;
no requiere eliminarlos ni desplegarlos de nuevo.

## Comprobaciones

- Regresión reproducida antes de la corrección en Campaña y Roguelite: la imagen
  estaba en el documento persistido, pero no se montaba en la tarjeta.
- Prueba integrada con despliegue directo real y Firestore en memoria, lectura
  del payload serializado, render de inventario y reapertura. Comprueba imágenes
  de habilidad, `imageSource` de respaldo, arma ilustrada, habilidad sin imagen y
  conservación de daño/descripción.
- 26 pruebas dirigidas correctas; suite completa: 230 suites, 1600 pruebas
  correctas y una omitida. Compilación de producción correcta.
- Chromium 1280×1000 y 390×844 con componentes y CSS de producción: añadir y
  reabrir el encuentro, imágenes cargadas sin error, sin desbordamiento horizontal.
  Las ilustraciones locales de Fauces/Garras son muestras para el ensayo; no
  sustituyen imágenes guardadas del usuario.
- Sin cambios en encuentros reales durante las pruebas.

## Evidencia

- [Inspector PC](desktop.png)
- [Inspector móvil](mobile.png)
- [Publicación verificada](release.json)

El ensayo local usa `preview.jsx`, el despliegue de `canvasSpawn.js` y el inspector
real `CanvasEquipmentSection` con Firestore en memoria. URL de trabajo:
`http://127.0.0.1:4173/output/playwright/enemy-ability-images-preview.html`.

Logs: `output/playwright/enemy-ability-images-tests.log`,
`output/playwright/enemy-ability-images-focused.log`,
`output/playwright/enemy-ability-images-build.log` y
`output/playwright/enemy-ability-images-deploy.log`.
