# API pública del adaptador PixiBattleMap

Esta hoja resume los métodos disponibles para controlar el mapa de batalla basado en Pixi.js a través de `PixiBattleMap` y del `forwardRef` de `PixiMapCanvas`. Los métodos cubren las herramientas expuestas en la UI (tokens, portapapeles, capas, luces, niebla y mediciones).

## Control de mapa

- `loadMap(url, width, height)` – Carga una nueva imagen de fondo con dimensiones específicas.
- `setGrid({ cellSize, color, opacity, visible })` – Actualiza la cuadrícula (tamaño de celda, color y opacidad).
- `centerOn(x, y, scale)` – Centra el viewport en una posición y aplica zoom opcional.
- `toggleFog(enabled, options)` – Activa/desactiva la capa de niebla y ajusta color/opacidad.

## Tokens

- `addToken({ id, textureUrl, x, y, size, layer, rotation, opacity, zIndex, tintColor, vision, metadata })`
  - Inserta o actualiza un token y devuelve el sprite Pixi asociado.
- `updateToken(id, patch)` – Modifica propiedades de un token existente sin recrearlo.
- `removeToken(id)` – Elimina un token concreto del mapa.
- `getSelection()` / `setSelection(ids)` – Recupera o fuerza la selección actual de tokens.
- `setTool(toolId)` – Cambia la herramienta activa (`select`, `draw`, `measure`, etc.) para definir cursores y comportamiento de arrastre.
- `setTokenVision(id, vision)` – Actualiza metadatos de visión asociados a un token.

## Selección y portapapeles

- `copySelection()` – Copia la selección actual (tokens) y devuelve los datos almacenados en el portapapeles.
- `pasteAt(x, y)` – Pega los elementos copiados desplazándolos hasta las coordenadas indicadas.
- `deleteSelection()` – Elimina todos los elementos seleccionados (respeta capas bloqueadas).

## Capas

- `createLayer({ id, type, zIndex, visible, locked })` – Crea una nueva capa Pixi y devuelve su metadatos.
- `setLayerVisibility(layerId, visible)` – Muestra u oculta una capa existente.
- `lockLayer(layerId, locked)` – Bloquea o desbloquea una capa para impedir interacciones.

## Luces ambientales

- `addLight({ id, x, y, brightRadius, dimRadius, color, opacity, layer })` – Crea o actualiza una luz dentro de la capa configurada.
- `removeLight(id)` – Elimina una luz previamente registrada.

## Eventos emitidos

El adaptador expone un sencillo bus de eventos (`on(eventName, handler)` / `off(eventName, handler)`) con las siguientes emisiones relevantes para la UI y el chat/log:

- `token:create` – Cuando se crea un token nuevo (`payload = { id, data }`).
- `token:update` – Tras actualizar propiedades de un token existente.
- `token:move` – Al finalizar un arrastre con posición final (`payload = { id, x, y, data }`).
- `token:remove` – Después de eliminar un token (`payload = { id, data }`).
- `token:paste` – Al duplicar tokens desde el portapapeles (`payload = { tokens: [...] }`).
- `token:vision` – Cuando cambian los datos de visión de un token.
- `light:update` / `light:remove` – Cambios en luces ambientales.
- `selection:change` – Cuando varía la selección múltiple.

Estos eventos permiten mantener sincronizados el chat/log y otros paneles auxiliares sin depender del canvas clásico.
