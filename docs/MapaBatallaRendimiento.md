# Mejoras de rendimiento pendientes en el Mapa de Batalla

## Observaciones adicionales

1. El listener global de `mousemove` en `MapCanvas` llama a `setMousePosition` en cada frame, forzando el re-render del componente completo incluso cuando solo se necesita la posición para pegar o medir elementos. Este estado se usa como dependencia de `handleKeyDown` y de varios cálculos derivados, propagando renders innecesarios al stage de Konva (`src/components/MapCanvas.jsx`, líneas 4050-4070).

:::task-stub{title="Reducir renders por seguimiento de cursor"}
1. Sustituye el `useState` de `mousePosition` por un `useRef` compartido y expón un helper que lea ese ref bajo demanda (p. ej. `getMousePosition`).
2. Si algún cálculo necesita reaccionar en caliente (como la mirilla), publica eventos `requestAnimationFrame` que actualicen solo los componentes interesados mediante `useFrame` o un estado local memoizado.
3. Evita que `handleKeyDown` y otros callbacks dependan de `mousePosition`; pásales el valor actual desde el ref justo antes de usarlo.
4. Verifica que el pegado inteligente siga funcionando y ejecuta `npm test`.
:::

2. `diffTokens` crea un `Map` con copias superficiales de todos los tokens previos y compara cada campo mediante `deepEqual`. En mapas grandes esto supone dos iteraciones completas y una comparación profunda por token, aunque la mayoría de los cambios son simples flags (`x`, `y`, `layer`). (`src/components/MapCanvas.jsx`, líneas 1420-1465).

:::task-stub{title="Optimizar diffTokens para cambios frecuentes"}
1. Conserva en un `useRef` un `Map` con los tokens actuales para accederlos en O(1) sin clonar cada objeto en cada diff.
2. Reemplaza `deepEqual` por un comparador especializado que solo inspeccione los campos mutables conocidos (`position`, `rotation`, `light`, etc.) o por un checksum incremental.
3. Devuelve inmediatamente cuando el token previo y el nuevo son la misma referencia para aprovechar memorias aguas arriba.
4. Asegúrate de que el resultado siga siendo compatible con `mergeTokens` y ejecuta `npm test`.
:::

3. Varias rutas usan `JSON.parse(JSON.stringify(...))` para clonar tokens y hojas, creando basura y bloqueando el hilo principal cuando se copian grupos grandes (`src/components/MapCanvas.jsx`, líneas 3625-3715). Con fichas complejas el tiempo de serialización domina al pegado y la duplicación de tokens.

:::task-stub{title="Sustituir clonados con JSON por utilidades más eficientes"}
1. Extrae un helper `cloneSheet` en `src/utils/token.js` que use `structuredClone` (con fallback) o copias específicas de los campos requeridos.
2. Reutiliza ese helper en el flujo de copiado/pegado y en `tokenSheets` para evitar serializaciones redundantes.
3. Si se necesitan transformaciones (p. ej. reasignar `id`), hazlo tras clonar para no recorrer el objeto completo varias veces.
4. Comprueba que las nuevas copias mantienen la reactividad esperada y ejecuta `npm test`.
:::

4. Los listeners de hojas (`tokenSheets`) se reconfiguran en cada cambio de `tokenSheetIdsKey`, pero recorren todo el arreglo de tokens dos veces: una para suscribirse y otra para limpiar los que ya no existen. Con escenas extensas esto supone `O(n)` suscripciones redundantes después de cada sincronización (`src/components/MapCanvas.jsx`, líneas 2040-2085).

:::task-stub{title="Estabilizar listeners de hojas"}
1. Mantén en un `useRef` el conjunto de `tokenSheetId` visibles y calcula las altas/bajas comparando con el nuevo conjunto mediante operaciones en `Set`.
2. Suscríbete solo a los IDs nuevos y anula los listeners de los eliminados sin recorrer la lista completa en cada render.
3. Agrupa las altas en una única tanda usando `Promise.allSettled` cuando haya que precargar varias fichas.
4. Vuelve a ejecutar `npm test` tras los cambios.
:::

