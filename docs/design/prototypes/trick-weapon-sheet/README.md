# Truco desde la carta equipada · referencia aprobada

Propuesta del 29/10/2026, a partir de la captura de Equipo / Manos de Yuuzu.
Es una maqueta aislada, sin Firebase ni cambios en LoadoutView o el inspector.

La variante con el icono centrado abajo fue aprobada el 29/10/2026 y ya está
implementada en la ficha real. LoadoutView cambia el borrador de la misma copia;
«Guardar cambios» guarda el perfil y actualiza el equipo del token en el Canvas
visible, incluso si el Canvas no está abierto en esa ventana. El inspector muestra
su imagen y atributos activos. Por petición posterior del usuario, este es el
único flujo activo: flechas y «Guardar cambios». El acceso de Truco del Canvas
y el panel de pago de dados quedan aplazados; no se consumen dados automáticamente.

- Mantener la carta y su ilustración, quitar/equipar, mano hábil/torpe y conjunto.
- El usuario rechaza el botón grande en el pie de la carta: ocupa demasiado y pide
  una solución más estética. Esa variante se conserva en las primeras capturas como
  referencia rechazada.
- El usuario concreta que quiere **solo el icono de las flechas** y después señala
  en su captura que debe ir **centrado en la parte inferior de la carta, bajo los
  rasgos**, no debajo del nombre. Sin texto de forma ni coste junto al icono. El título
  indica la forma de destino y recuerda guardar los cambios.
- Aplicar el efecto de la cruz de quitar equipo: transición de 140 ms de color,
  opacidad y luz suave. En las flechas se mantiene el oro; la cruz usa rojo.
  El foco de teclado utiliza el mismo contorno romboidal.
- Tanto fuera como dentro del combate, las flechas preparan un borrador y
  «Guardar cambios» aplica la forma. No hay cobro automático ni diálogo de dados.
- Cambiar la ilustración, daño, alcance y rasgos dentro de la misma carta.
- Conservar la misma copia del arma y sus manos; no ocupar un segundo espacio.
- En móvil, el control conserva un área táctil de 44 px aunque su dibujo sea pequeño.

El control «Con combate activo» pertenece a la propuesta histórica de pago de
dados; no forma parte del flujo actual de Equipables y guardado. Las ilustraciones
son referencias; el estoque usa un arte provisional.

Las capturas de PC y móvil se guardan en esta carpeta tras revisar la maqueta.
Las variantes anteriores se conservan como registro; no recuperar el botón grande
ni la posición bajo el nombre del arma.
