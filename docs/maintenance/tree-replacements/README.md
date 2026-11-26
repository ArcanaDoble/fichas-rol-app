# Sustitución de tres árboles del Canvas

5 de noviembre de 2026. El usuario proporciona tres PNG transparentes para sustituir las variedades equivalentes, manteniendo el resto de la biblioteca.

| Adjunto | Variedad existente |
| --- | --- |
| `codex-clipboard-9bbe193f-d9ae-4acb-8482-8ed9b2ffe299.png` | `local-01-arbol-podrido` — Árbol podrido |
| `codex-clipboard-26741789-f55c-49f9-abb6-f2af57cd8d06.png` | `local-03-arbol-calcinado-con-brasas` — Árbol calcinado con brasas |
| `codex-clipboard-609c805d-0c10-413f-a21b-f0d6390b721a.png` | `local-02-arbol-en-llamas` — Árbol en llamas |

## Recursos y geometría

Se conservan los nombres, identificadores y rutas. Se sustituyen seis archivos en `public/scenery/trees`: tres ilustraciones WebP de 1024 × 1024, calidad 90, y tres miniaturas de 192 × 192, calidad 82. La compresión conserva exactamente el alfa de cada imagen redimensionada, sin añadir fondo ni recortar el encuadre.

Se recalculan los contornos con la función existente `contour` de `scripts/import_tree_scenery.py` sobre los PNG originales de 1254 × 1254. Solo cambian estas tres entradas del catálogo; las otras doce permanecen iguales. El Canvas sigue aplicando la posición, giro, tamaño, modo de visión y grosor del tronco guardados en cada árbol. No se reescriben escenas ni datos de juego.

## Comprobaciones

- 18 pruebas existentes correctas de escenografía y renderizado de árboles (dos suites), incluida visión, entrada parcial, transparencia y transformación de geometría.
- Compilación de producción correcta. Antes de actualizar el catálogo se compiló la fuente local y se comprobaron los mismos nombres con hash de JavaScript y CSS que en producción; después cambia el JavaScript que contiene el catálogo y se mantiene el CSS.
- Canvas real con datos de prueba en Edge: tres imágenes cargadas, giro a 45°, cambio de ancho y alternancia entre copa y tronco para cada variedad. Inspector revisado también a 412 × 915; selección de capa mediante teclado en esa comprobación móvil. Sin excepciones JavaScript.
- [Canvas de escritorio](desktop.png), [inspector móvil](mobile.png) y [registro de publicación y recursos](release.json).

La actualización se publica en `nomarol.web.app` y `base-de-datos-noma.web.app`. Los árboles existentes usan automáticamente los recursos y contornos nuevos por su identificador.
