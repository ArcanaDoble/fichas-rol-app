# Auditoría final de sistema

23 de octubre de 2026. Leído completo `docs/rules/bardo-informe-2026-10-23.md` y contrastado con el maestro v0.2.42, el registro B01–B08, la crítica previa y `comprobacion-economia.json`.

**No encuentro un error material que obligue a cambiar el dictamen, las cuentas, las reglas propuestas o su atribución. No propongo reescribir párrafos por motivos de estilo.**

## Comprobaciones que pasan

- **Declaración anterior al arma.** El informe la selecciona expresamente y distingue la variante posterior examinada por los revisores. Los ejemplos fijan resultados para evaluar una decisión legal tomada antes de conocerlos; no atribuyen al Bardo conocimiento anticipado. La ventaja 2/0 existe también bajo este momento de gasto, aunque su frecuencia esperada pueda disminuir.
- **Ejemplo 2/0.** Ataque normal 4+6+3=13 produce dos bloques; defensa 2 deja 8−2=6 y produce un bloque propio. En B08, ataque 4+5+3=12 produce dos bloques; defensa 2+1=3 deja 8−3=5 y evita daño. Con los dados indivisibles restantes no aparece una asignación 2/0 en ese caso fijado, ni por separar los ataques ni por defender con varios dados. El informe incluye la hipótesis de no usar defensa enemiga y Vida suficiente, por lo que no cuenta al enemigo muerto atacando después ni conserva simultáneamente su acción de ataque y defensa.
- **Ejemplo desfavorable.** Tres ataques 6+7 causan 2+2+2=6 bloques contra CD 6. Tras interpretar quedan dos oportunidades ofensivas y Presión total máxima 13+13+6=32, cuyo techo es cinco bloques; concentrar ambos dados en un único ataque tampoco supera ese techo. Los rasgos y Crítico quedan excluidos expresamente.
- **Dominancia del mayor.** La demostración se mantiene con declaración previa al arma: la diferencia h−l se compromete con el dado l en la misma resolución que habría utilizado h. No necesita observar su tirada. Es una dominancia débil dentro de los usos fungibles descritos, no la afirmación de que siempre convenga interpretar. El informe conserva esa distinción.
- **Economía de acciones.** El dado invertido deja de pagar otra acción o defensa, los receptores pagan sus propios dados y los puntos no satisfacen Pesada ni Ataque dual. El apoyo no produce otra tirada de arma por sí mismo. La defensa activa con puntos exige igualmente una defensa normal pagada; no crea una reacción gratuita.
- **Enemigos.** Se respeta su asimetría: acción principal y movimiento, no tres dados universales. El informe reconoce que defender consume la acción principal. También distingue Amenaza de una oportunidad de acción.
- **Instrumento y manos.** Se declara como propuesta una excepción concreta al cambio de conjunto, y también se declara como nueva la incorporación del instrumento fuera de los conjuntos. No se presenta como regla ya disponible en el maestro. La actuación breve y el efecto residual resuelven la simultaneidad física sin fingir música sostenida.
- **Recurso.** Inspiración es el fondo finito, con generación mediante interpretación y gasto en apoyo. No añade una segunda reserva oculta. La once-por-ronda y la caducidad están escritas de manera expresa.
- **Preferencias del usuario.** B08 se atribuye al usuario y se presenta como exploración que reabre su preferencia colectiva anterior. El informe no le atribuye una aprobación del núcleo, una prohibición de acciones adicionales, una ficha elegida ni la obligación de que cada dado sostenga el mismo dilema. La selección editorial se identifica como recomendación del asistente.
- **C temporal.** La alternativa recoge Preludio y Coda, sin los cuales el caso mínimo de dos posiciones sería neutro. Se reconoce que adelantar una acción ante el enemigo de mayor iniciativa es una nueva ventaja y que una intervención no es un turno completo.
- **Alcance de la prueba.** Los casos y el JSON solo demuestran posibilidades de asignación con resultados fijados. El informe no los convierte en probabilidades de victoria, balance de clases o validación de una run.

La atribución de decisiones está especialmente bien delimitada al final: queda fijada una dirección recomendada para el siguiente trabajo, mientras la aprobación sigue perteneciendo al usuario. No es una clase cerrada ni una implementación autorizada.

## Límite de esta auditoría

Esta revisión comprueba el sistema local y su representación en el informe. No he revalidado las tres fuentes externas: esa verificación pertenece al análisis de referencias. No hay un fallo sistémico detectado que requiera un párrafo sustitutorio.
