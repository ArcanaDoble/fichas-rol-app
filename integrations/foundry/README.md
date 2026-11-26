# NOMA · Roguelite para Foundry — laboratorio local

Sistema propio para Foundry VTT 14.361. Se instala como `noma-roguelite` y utiliza el mundo separado `noma-roguelite-lab`. No necesita módulos, servicios de pago ni conexión con Firebase durante el juego. Esta entrega es un laboratorio jugable del combate, no una migración completa de NOMA.

## Empezar

1. Abre el mundo **NOMA · Roguelite** como **Gamemaster**. La cuenta local de este laboratorio no tiene contraseña configurada.
2. Selecciona un retrato o un token. **Encuentro → Preparar combate** inicia la preparación; **Ronda → Tirar por todos** resuelve los dados.
3. Selecciona un arma ilustrada y los dados que vas a gastar. Elige objetivo y pulsa **Atacar**. El objetivo resuelve la defensa.
4. Arrastra los tokens para mover. **Correr** consume el dado seleccionado. **Finalizar** termina una activación; el máster puede **Reabrir activación** desde el inspector.
5. **Archivo** contiene clases, bestiario y objetos. **Ver ficha** edita; **Al escenario** añade un token; **Inventario → Abrir catálogo** añade equipo. La ficha permite equipar y preparar dos conjuntos respetando las manos.
6. **Herramientas de escena** muestra las herramientas nativas de Foundry para mapas, muros, luces y documentos. La interfaz propia está en español; el núcleo de Foundry conserva el idioma que tenía instalado.

El usuario local **Jugador de prueba** controla el Bárbaro y permite probar una segunda sesión de navegador. El máster debe permanecer conectado para resolver las solicitudes de combate. El servidor local utiliza el puerto 30000 de la instalación existente.

## Implementado

- Escenario El umbral, tres héroes de demostración, dos Duendes y un Trol, muros reales, visión y luces nativas.
- Interfaz NOMA con ilustraciones configuradas, tipografía, dados SVG originales, coronas segmentadas, inventario y feedback de ataques/impactos.
- Iniciativa, agrupación, tres dados, reservas, Correr, gasto de movimiento, reapertura y avance de ronda.
- Presión, alcance, línea de visión, daño por CD y bloques de Vida. Defensa con reservas de héroe o equipo de enemigo; sobrante para reposicionarse/contraatacar. El enemigo comparte su acción principal entre ataque y defensa.
- Equipo, dos conjuntos, armas a dos manos, edición de fichas y catálogo. Talentos preparados (máximo tres), usos y descanso.
- Recursos de clase editables. Solicitudes de jugador verificadas por el máster mediante el autor autenticado del documento ChatMessage de Foundry.

## Límites concretos

- Efectos particulares de habilidades, talentos, estados, recursos y progresión de clase siguen siendo manuales. Importar una descripción no implementa su efecto.
- No se ha trasladado la generación de salas, botín, tiendas, eventos, economía completa ni la progresión de una run. El laboratorio utiliza equipo elegido para la demostración; no fija nuevas pools ni decisiones de balance.
- El catálogo es una copia local de datos e ilustraciones, sin sincronización bidireccional. Las clases sin tres dados definidos no pueden añadirse hasta configurarlas.
- No incorpora Campaña, parry, zonas, Yerma ni Yuuzu. No modifica el Canvas, las fichas ni los datos remotos de la web.
- Verificación en escritorio y dos sesiones locales. Móvil y acceso remoto no verificados en Foundry. No hay promesa de equivalencia completa con la web.

## Origen y adaptación

Las funciones puras de combate y los dados SVG se compilan desde el código existente de NOMA mediante `engine-entry.js`. El maestro consultado fue `documento_maestro_ttrpg_roguelite_v0_2_42.docx`. El adaptador de Foundry da los empates de iniciativa a los jugadores según ese documento, sin alterar el comparador de la web. Los valores importados y las propuestas del catálogo no se consideran balance probado.

El catálogo preparado contiene cuatro entradas de clase, cuatro de enemigo y 110 objetos; el mundo creado durante las pruebas puede conservar entradas de importaciones anteriores. Las armas y armaduras de la demostración usan su imagen configurada. La CD inicial de la demostración se ajusta a la armadura equipada.

## Desarrollo local

El catálogo distribuido utiliza rutas de imagen del propio sistema. Al regenerarlo, las referencias a originales privados se sustituyen por su copia empaquetada cuando existe. Los campos de imagen opcionales quedan vacíos cuando el sistema carece de una copia.

```powershell
node integrations/foundry/build.cjs
python integrations/foundry/prepare.py
node integrations/foundry/test-rules.mjs
./integrations/foundry/install-local.ps1
```

`prepare.py` necesita el export de solo lectura `output/foundry/catalog.json`; no debe publicarse ese export ni el estado de autenticación del navegador. El instalador copia únicamente el sistema de laboratorio y crea el manifiesto del mundo si no existe; no reinicializa sus datos ni modifica Prueba. Recarga Foundry tras actualizar scripts/estilos.

## Verificación realizada el 16/10/2026

- Pruebas de importación, desempates, grupos, Correr, movimiento, reapertura, alcance, Presión, daño, sobrante y selección/tirada de defensa enemiga: pasan.
- Foundry real: inicio y tiradas de combate, ataque/daño, defensa activa enemiga, gasto de dados y acción principal, edición y guardado de ficha, creación de armadura desde el catálogo.
- Dos clientes: jugador reserva un dado, corre, mueve y ataca; el máster recibe y resuelve. Tras reabrir la activación el jugador vuelve a mover con el presupuesto restante.
- Capturas completas inspeccionadas con Playwright. El cliente de develop-web-game obtuvo estado correcto pero su captura aislada WebGL salió negra; se usaron las capturas completas de navegador para la comprobación visual. Esto no se presenta como una prueba de renderizado superada por aquel cliente.
- La prueba de defensa detectó una confusión entre la lista de IDs y su selección validada; se corrigió y se repitió con consumo real de la acción principal. El ataque inmediatamente después de mover utiliza coordenadas confirmadas, no las interpoladas durante la animación.

Pendiente: una partida de prueba del usuario, efectos específicos de clases, generación de run y verificación móvil.
