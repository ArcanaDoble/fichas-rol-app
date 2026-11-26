# Varias zonas en Parry libre

Solicitud del 22/10/2026: permitir ataques y parries en varias zonas, incluidas las cinco, tanto para jugadores como para máster, conservando la sencillez del toque único y el secreto.

## Recorrido

- **Una zona** mantiene el funcionamiento anterior: otra punta sustituye la seleccionada.
- **Varias zonas** convierte las puntas en selecciones independientes. Otro toque desmarca la misma zona.
- **Todas** selecciona las cinco y permite vaciarlas. No se puede fijar una selección vacía.
- Ataque rojo y parry azul; las coincidencias se revelan con ambos colores. Las coincidencias parciales se distinguen y enumeran sin decidir daño o efectos de mesa.
- En teclado, las flechas recorren las zonas múltiples sin cambiar la selección; Espacio/Intro marca o desmarca. El foco de las puntas no seleccionadas conserva su trazo visible.

La cantidad, el modo y las zonas no aparecen ante el rival ni los espectadores antes de ambas confirmaciones. El conjunto completo queda fijado con SHA-256 y nonce aleatorio. Las paradas de una zona y los historiales anteriores conservan el protocolo v1. Los conjuntos múltiples usan v2, con orden canónico y rechazo de duplicados, zonas desconocidas y revelaciones alteradas o ambiguas.

## Comprobaciones

- Suite completa: **227 suites, 1581 pruebas correctas y una omitida**.
- Tras endurecer los tipos del mensaje de revelación: tres suites dirigidas, 23 pruebas correctas.
- Integración con tres clientes: selección/desmarcado, Todas, elección vacía deshabilitada, secretos ante espectador, revelación automática e historial con coincidencia parcial.
- Navegador: clic directo en dos lanzas; selección de las cinco; desmarcado con Espacio; intercambio de roles y selección defensiva azul; foco visible en una zona no seleccionada. PC 1440 px, móvil 412 px y 320 px, con desplazamiento vertical disponible.
- La comprobación usa sala, componentes y transacciones reales con transporte en memoria. No modifica partidas de producción.

[Prueba de ambos lados](http://127.0.0.1:4173/output/playwright/parry-free-preview.html) · [Sala local con participantes automáticos](http://127.0.0.1:4173/output/playwright/parry-free-integration-preview.html?view=master) · [Registro de publicación](multiple-zones-release.json).

![Selección múltiple en PC](evidence/multiple-zones-desktop.png)

![Resultado parcial en móvil](evidence/multiple-zones-result-mobile.png)
