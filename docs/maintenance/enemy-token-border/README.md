# Borde de enemigos por Team ID

El aro del retrato circular, su luz y el contorno de selección usan el rojo de enemigo `#d1746d` solo cuando `teamId === 'enemies'`. Cualquier otro valor conserva el dorado `#c8aa6e`. El cambio de equipo actualiza la presentación al momento; no depende del perfil de personaje ni altera el bando guardado.

## Comprobaciones

- 28 pruebas existentes de renderizado de tokens correctas (dos suites).
- Compilación de producción correcta.
- Canvas real con datos de prueba en Edge: máster y jugador, 1280 × 900 y 412 × 915. Verificado el paso entre `enemies`, `party` y `hostiles`, la conservación del oro en aliados y el contorno rojo de selección.
- [Escritorio](desktop.png) y [móvil](mobile.png).
- [Publicación verificada](release.json).

Registros: `output/playwright/enemy-token-border-tests.log`, `enemy-token-border-build.log` y `enemy-token-border-deploy.log`.
