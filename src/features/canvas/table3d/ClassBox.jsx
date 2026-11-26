import React, { useEffect, useRef, useState } from 'react';

export default function ClassBox({ choices, busy, placementRef, onChoose }) {
  const gesture = useRef(null);
  const rail = useRef(null);
  const ignoreClick = useRef(false);
  const [lifting, setLifting] = useState(false);

  useEffect(() => {
    const placement = placementRef.current;
    return () => placement?.clear();
  }, [placementRef]);

  function pick(event, character) {
    if (busy || !event.isPrimary || event.button !== 0) return;
    ignoreClick.current = false;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      character,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event) {
    const held = gesture.current;
    if (!held || held.id !== event.pointerId) return;
    if (
      !held.dragging &&
      Math.hypot(event.clientX - held.x, event.clientY - held.y) < 9
    )
      return;
    if (
      !held.dragging &&
      event.pointerType === 'touch' &&
      Math.abs(event.clientX - held.x) > Math.abs(event.clientY - held.y) * 1.35
    ) {
      rail.current.scrollLeft -= event.clientX - (held.lastX ?? held.x);
      held.lastX = event.clientX;
      held.scrolling = true;
      ignoreClick.current = true;
      return;
    }
    if (held.scrolling || !placementRef.current) return;
    held.dragging = true;
    setLifting(true);
    held.position = placementRef.current.preview(held.character, {
      x: event.clientX,
      y: event.clientY,
    });
  }
  function finish(event, cancel = false) {
    const held = gesture.current;
    if (!held || held.id !== event.pointerId) return;
    gesture.current = null;
    if (held.dragging) {
      ignoreClick.current = true;
      const position =
        !cancel &&
        placementRef.current?.preview(held.character, {
          x: event.clientX,
          y: event.clientY,
        });
      placementRef.current?.clear();
      setLifting(false);
      if (position) onChoose(held.character, position);
    }
  }
  return (
    <section
      className={'n3-box' + (lifting ? ' is-lifting' : '')}
      aria-label="Caja de aventureros"
    >
      <header>
        <h2>Fichas de clase</h2>
        <p>Elige tu ficha y equipa las cartas que encontrarás a su lado.</p>
        {choices.length > 2 && (
          <nav aria-label="Recorrer las clases">
            <button
              type="button"
              aria-label="Clases anteriores"
              onClick={() =>
                rail.current.scrollBy({
                  left: -rail.current.clientWidth * 0.8,
                  behavior: 'smooth',
                })
              }
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Más clases"
              onClick={() =>
                rail.current.scrollBy({
                  left: rail.current.clientWidth * 0.8,
                  behavior: 'smooth',
                })
              }
            >
              ›
            </button>
          </nav>
        )}
      </header>
      <div className="n3-class-rail" ref={rail}>
        {choices.map((character) => (
          <button
            type="button"
            className="n3-class-choice"
            key={character.id}
            disabled={busy}
            onPointerDown={(e) => pick(e, character)}
            onPointerMove={move}
            onPointerUp={(e) => finish(e)}
            onPointerCancel={(e) => finish(e, true)}
            onLostPointerCapture={(e) => finish(e, true)}
            onClick={() => {
              if (!ignoreClick.current) onChoose(character);
              ignoreClick.current = false;
            }}
          >
            {character.portrait && (
              <img src={character.portrait} draggable={false} alt="" />
            )}
            <b>{character.name}</b>
            <small>
              {character.actionDice.map((n) => 'd' + n).join(' · ')}
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}
