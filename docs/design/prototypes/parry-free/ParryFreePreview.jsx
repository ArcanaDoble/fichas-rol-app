import React, { useEffect, useReducer, useRef, useState } from 'react';
import ParryWindow from '../../../../src/features/parry-free/FreeParryWindow';
import { compareParryZones, normalizeParryZones } from '../../../../src/features/parry-free/freeParryZones';
import '../../../../src/features/canvas/components/CampaignCombatOverlay.css';
import './parry-free-preview.css';

const seats = ['player', 'master'];
const people = {
  player: { name: 'Yerma', controller: 'Jugador', image: '/yerma/Yerma.webp' },
  master: { name: 'Tirador', controller: 'Máster', image: '/yerma/Taiga.webp' },
};
function previewPreferences(snapshot) {
  const value = snapshot?.privateContent || {};
  return { seat: seats.includes(value.seat) ? value.seat : 'player', device: value.device === 'mobile' ? 'mobile' : 'desktop' };
}
export const initialRound = () => ({ number: 1, attacker: 'master', choices: { player: null, master: null }, locked: { player: false, master: false } });
export const isRevealed = round => seats.every(seat => round.locked[seat]);
export function roundReducer(round, event) {
  if (event.type === 'reset') return initialRound();
  if (event.type === 'next' && isRevealed(round)) return {
    ...initialRound(), number: round.number + 1,
    attacker: event.swap ? seats.find(seat => seat !== round.attacker) : round.attacker,
  };
  if (!seats.includes(event.seat) || round.locked[event.seat] || isRevealed(round)) return round;
  if (event.type === 'choose' && (event.zone === null || normalizeParryZones(event.zone).length)) return {
    ...round, choices: { ...round.choices, [event.seat]: event.zone },
  };
  if (event.type === 'lock' && normalizeParryZones(round.choices[event.seat]).length) return { ...round, locked: { ...round.locked, [event.seat]: true } };
  return round;
}

// The presentation receives only the current participant's private choice.
// Even the master's view cannot render the opponent's zone before both lock.
export function projectRound(round, seat) {
  const revealed = isRevealed(round);
  const defender = seats.find(value => value !== round.attacker);
  return {
    participants: people, number: round.number, attacker: round.attacker, defender, locked: round.locked,
    ownChoice: round.choices[seat], ownLocked: round.locked[seat], revealed,
    result: revealed ? compareParryZones(round.choices[round.attacker], round.choices[defender]) : null,
  };
}


export default function ParryFreePreview({ images = {} }) {
  const [round, dispatch] = useReducer(roundReducer, undefined, initialRound);
  const [seat, setSeat] = useState(() => previewPreferences(globalThis.openai?.widgetState).seat);
  const [device, setDevice] = useState(() => previewPreferences(globalThis.openai?.widgetState).device);
  const [open, setOpen] = useState(true);
  const launcher = useRef(null);
  const view = projectRound(round, seat);
  view.participants = Object.fromEntries(Object.entries(people).map(([key, person]) => [key, { ...person, image: images[key] || person.image }]));
  const rememberView = (nextSeat, nextDevice) => {
    setSeat(nextSeat); setDevice(nextDevice);
    // Restore only preview controls. Secret zones never leave this local demo.
    if (typeof globalThis.openai?.setWidgetState === 'function') {
      Promise.resolve(globalThis.openai.setWidgetState({
        modelContent: { tool:'Parry libre', view:nextSeat, format:nextDevice },
        privateContent: { seat:nextSeat, device:nextDevice },
      })).catch(() => {});
    }
  };
  useEffect(() => {
    const restore = event => {
      if (!event.detail?.globals?.widgetState) return;
      const next = previewPreferences(event.detail.globals.widgetState);
      setSeat(next.seat); setDevice(next.device);
    };
    window.addEventListener('openai:set_globals', restore);
    return () => window.removeEventListener('openai:set_globals', restore);
  }, []);
  const close = () => { setOpen(false); requestAnimationFrame(() => launcher.current?.focus()); };
  useEffect(() => {
    const escape = event => { if (event.key === 'Escape' && open) { event.preventDefault(); close(); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);
  return <div className="parry-preview free-parry" id="noma-parry-free-preview">
    <div className="parry-preview-bar">
      <div className="parry-preview-caption">Previa interactiva <span>Sin datos de partida</span></div>
      <div className="parry-demo-view" role="group" aria-label="Tamaño de la previa">
        <button className="cursor-interaction" type="button" aria-pressed={device === 'desktop'} onClick={() => rememberView(seat, 'desktop')}>PC</button>
        <button className="cursor-interaction" type="button" aria-pressed={device === 'mobile'} onClick={() => rememberView(seat, 'mobile')}>Móvil</button>
      </div>
    </div>
    <div className="parry-preview-body" data-device={device}>
      <nav className="parry-demo-roles" aria-label="Punto de vista de prueba">
        {seats.map(person => <button key={person} type="button" className="cursor-interaction" aria-pressed={seat === person}
          onClick={() => rememberView(person, device)}>{people[person].controller}<span>{people[person].name}</span></button>)}
      </nav>
      {open ? <ParryWindow view={view} seat={seat} images={images}
        onChoose={zone => dispatch({ type: 'choose', seat, zone })} onLock={() => dispatch({ type: 'lock', seat })}
        onNext={swap => dispatch({ type: 'next', swap })} onClose={close} />
        : <div className="parry-closed"><p>Parry libre</p>
          <button ref={launcher} type="button" className="parry-confirm cursor-interaction" onClick={() => setOpen(true)}>
            {view.revealed ? 'Ver resultado' : 'Volver a la ronda'} <span aria-hidden="true">→</span></button>
          <small>La elección se conserva mientras consultas tu ficha.</small>
        </div>}
      <div className="parry-demo-footer">
        <p>Fija tus zonas y cambia de vista para jugar el otro lado.</p>
        <button type="button" className="cursor-interaction" onClick={() => { dispatch({ type: 'reset' }); setOpen(true); }}>Reiniciar prueba</button>
      </div>
    </div>
  </div>;
}
