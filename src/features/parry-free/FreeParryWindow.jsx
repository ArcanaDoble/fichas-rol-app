import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { CombatRose, zoneNames } from '../canvas/components/CampaignCombatControls';
import '../canvas/components/CampaignCombatOverlay.css';
import './FreeParry.css';
import { PARRY_ZONES, normalizeParryZones, parryResultLabel } from './freeParryZones';

const zoneLabel = choice => {
  const zones = normalizeParryZones(choice);
  return zones.length === PARRY_ZONES.length ? 'Todas las zonas' : zones.map(zone => zoneNames[zone]).join(' + ');
};

export function ParryPortrait({ person, alt = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [person.image]);
  return person.image && !failed ? <img src={person.image} alt={alt} draggable="false" onError={() => setFailed(true)} />
    : <span className="parry-portrait-fallback" role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
      {person.name?.trim().slice(0, 1).toUpperCase() || '·'}
    </span>;
}

export default function FreeParryWindow({ view, seat, onChoose, onLock, onNext, onClose, onLobby, onEnd, busy = false, syncing = false, error = '', onRetry, roomMode = false }) {
  const heading = useRef(null);
  const { participants:people } = view;
  const resultKey = `${view.number}:${view.revealed}`;
  useEffect(() => { if (view.revealed) heading.current?.focus({ preventScroll:true }); }, [resultKey, view.revealed]);
  const attacking = seat === view.attacker;
  const observing = !seat;
  const opponent = Object.keys(people).find(value => value !== seat);
  const target = people[view.defender];
  const selectedZones = normalizeParryZones(view.ownChoice);
  const selectionKey = `${seat}:${view.number}`;
  const [multiChoice, setMultiChoice] = useState(null);
  const multiple = selectedZones.length > 1 || multiChoice === selectionKey;
  const chooseZone = zone => {
    if (busy || view.ownLocked || observing) return;
    if (!multiple) { onChoose(zone); return; }
    const next = selectedZones.includes(zone) ? selectedZones.filter(value => value !== zone)
      : PARRY_ZONES.filter(value => selectedZones.includes(value) || value === zone);
    onChoose(next.length ? next : null);
  };
  const changeRival = roomMode && view.revealed && onLobby;
  const label = view.revealed ? parryResultLabel(view.result)
    : observing ? 'Parada en curso' : view.ownLocked ? 'Elección fijada' : attacking ? '¿Dónde atacas?' : '¿Dónde haces parry?';
  return <section className="parry-window" aria-label="Parry libre" data-room={roomMode} data-action={observing ? 'observe' : attacking ? 'attack' : 'parry'} data-revealed={view.revealed} data-matched={view.result?.matched} aria-busy={busy || syncing}>
    {roomMode && target.image && <div className="parry-stage-art" aria-hidden="true"><ParryPortrait person={target} /></div>}
    {!roomMode && <header className="parry-window-header">
      <div><p className="parry-eyebrow">Campaña · Ronda {view.number}</p><h1>Parry libre</h1></div>
      <button className="parry-close cursor-interaction" type="button" aria-label="Cerrar Parry libre" onClick={onClose}><X size={20} aria-hidden="true" /></button>
    </header>}
    <div className="parry-participants" aria-label="Participantes">
      {[view.attacker, view.defender].map(person => <div className="parry-participant" key={person} data-own={person === seat} data-role={person === view.attacker ? 'attack' : 'defense'} data-ready={view.locked[person]}>
        <ParryPortrait person={people[person]} />
        <div><p>{people[person].name}<span>{person === seat ? 'Tú' : people[person].controller}</span></p>
          <small><span className="parry-participant-role">{person === view.attacker ? 'Ataca' : 'Hace parry'}</span><span className="parry-participant-state">{view.locked[person] ? 'Elección fijada' : 'Eligiendo'}</span></small></div>
      </div>)}
    </div>
    <div className="parry-play-area">
      <h2 ref={heading} tabIndex={-1} className={view.revealed ? 'parry-result-title' : ''}>{label}</h2>
      {(view.revealed || view.ownLocked || observing) && <p className="parry-instruction">{view.revealed ? 'Ataque y parry revelados a la vez.'
        : observing ? 'Verás las zonas cuando ambos confirmen.'
        : view.awaitingReveal ? 'Ambos habéis fijado. Revelando las zonas…' : `Esperando la elección de ${people[opponent].name}.`}</p>}
      {!view.revealed && !view.ownLocked && !observing && <div className="parry-zone-tools" aria-label="Selección de zonas">
        <div role="group" aria-label="Modo de selección">
          <button type="button" aria-pressed={!multiple} disabled={busy} onClick={() => {
            setMultiChoice(null); if (selectedZones.length > 1) onChoose(selectedZones[0]);
          }}>Una zona</button>
          <button type="button" aria-pressed={multiple} disabled={busy} onClick={() => setMultiChoice(selectionKey)}>Varias zonas</button>
        </div>
        {multiple && <button type="button" className="parry-all-zones" aria-pressed={selectedZones.length === PARRY_ZONES.length} disabled={busy}
          onClick={() => onChoose(selectedZones.length === PARRY_ZONES.length ? null : [...PARRY_ZONES])}>Todas</button>}
      </div>}
      <div className="parry-token-scene">
        <svg className="parry-commitment-arcs" viewBox="0 0 300 300" aria-hidden="true">
          <path className="parry-orbit-track" d="M 137 13 A 138 138 0 0 0 137 287 M 163 287 A 138 138 0 0 0 163 13" />
          <path className="parry-commitment-arc" data-role="attack" data-ready={view.locked[view.attacker]} pathLength="1" d="M 137 13 A 138 138 0 0 0 137 287" />
          <path className="parry-commitment-arc" data-role="defense" data-ready={view.locked[view.defender]} pathLength="1" d="M 163 287 A 138 138 0 0 0 163 13" />
        </svg>
        <div className="parry-token"><ParryPortrait person={target} alt={target.name} /></div>
        <div className="parry-rose-anchor">
          {view.revealed ? <CombatRose key={`result-${view.number}`} phase="result" attackZone={view.result.attack} defenseZone={view.result.parry}
            defense="parry" matched={view.result.matched} />
            : observing ? <div aria-hidden="true"><CombatRose phase="result" /></div>
            : view.ownLocked ? selectedZones.length > 0 && <div role="img" aria-label={`Tu elección fijada: ${zoneLabel(view.ownChoice)}`}>
              <div aria-hidden="true"><CombatRose phase="result" attackZone={attacking ? view.ownChoice : []}
                defenseZone={attacking ? [] : view.ownChoice} defense="parry" /></div>
            </div>
              : <div inert={busy || undefined}><CombatRose key={`${seat}-${view.number}`} phase={attacking ? 'aim' : 'defense'} value={view.ownChoice}
                multiple={multiple} selectionTone={attacking ? 'attack' : 'defense'} onChange={chooseZone} /></div>}
        </div>
      </div>
      <div className="parry-choice-summary" data-chosen={selectedZones.length > 0} aria-live="polite" aria-atomic="true">
        {view.revealed ? <div className="parry-reveal-legend">
          <span className="parry-attack-mark">Ataque · {zoneLabel(view.result.attack)}</span>
          <span className="parry-defense-mark">Parry · {zoneLabel(view.result.parry)}</span>
          {view.result.coincident && <small className="parry-zone-comparison">{view.result.coincident.length ? `Coinciden: ${zoneLabel(view.result.coincident)}.` : 'Ninguna coincidencia.'}
            {view.result.uncovered.length > 0 && ` Ataque sin coincidencia: ${zoneLabel(view.result.uncovered)}.`}</small>}
        </div> : observing ? <><strong>Espectador</strong><small>Las dos elecciones permanecen secretas.</small></> : <><strong>{selectedZones.length ? zoneLabel(view.ownChoice) : view.ownLocked ? 'Elección guardada' : 'Sin elegir'}</strong>
          <small>{view.missingSecret ? 'La elección está guardada en el dispositivo donde la fijaste.'
            : view.ownLocked ? 'Tu elección ya no se puede cambiar.' : multiple ? 'Toca para añadir o quitar zonas. Tu rival no las ve.' : 'La zona rival permanece oculta.'}</small></>}
      </div>
    </div>
    <footer className="parry-window-footer">
      {error && <div className="parry-error" role="alert">{error}{onRetry && <button type="button" onClick={onRetry}>Reintentar conexión</button>}</div>}
      {view.revealed && !observing ? <div className="parry-result-actions" data-change-rival={Boolean(changeRival)}>
        <button type="button" className="parry-confirm parry-repeat-button cursor-interaction" disabled={busy || syncing} onClick={() => onNext(false)}><span>Otra <span className="parry-repeat-ending">ronda<span className="parry-action-arrow parry-repeat-arrow" aria-hidden="true">→</span></span></span></button>
        <button type="button" className="parry-secondary cursor-interaction" disabled={busy || syncing} onClick={() => onNext(true)}>Intercambiar roles</button>
        {changeRival && <button type="button" className="parry-secondary parry-change-rival cursor-interaction" disabled={busy} onClick={onLobby}><span><span className="parry-action-arrow" aria-hidden="true">←</span>Cambiar rival</span></button>}
      </div> : observing ? <div className="parry-waiting" role="status">{view.revealed ? 'Resultado visible para toda la sala.' : 'Esperando a los dos participantes…'}</div>
        : view.ownLocked ? <div className="parry-waiting" role="status"><span className="parry-ready-dot" />
        {view.missingSecret ? 'Vuelve a ese dispositivo para revelar.' : view.awaitingReveal ? 'Revelando ambas elecciones…' : 'Se revelará cuando ambos hayáis fijado.'}</div>
        : <button type="button" className="parry-confirm cursor-interaction" disabled={busy || syncing || !selectedZones.length} onClick={onLock}>
          {busy ? 'Fijando elección…' : 'Fijar elección'} <span className="parry-action-arrow" aria-hidden="true">→</span></button>}
      {changeRival && observing && <button type="button" className="parry-secondary parry-change-rival cursor-interaction" disabled={busy} onClick={onLobby}><span><span className="parry-action-arrow" aria-hidden="true">←</span>Elegir rival</span></button>}
      <p className="parry-table-note">Los dados y el daño se resuelven en mesa.</p>
      {onLobby && !changeRival && <nav className="parry-session-links" aria-label="Partida de Parry libre">
        <button type="button" onClick={onLobby}>{roomMode ? 'Ver participantes' : 'Ver partidas'}</button>
        {onEnd && <button type="button" className="parry-cancel" disabled={busy || syncing} onClick={onEnd}>{roomMode ? 'Cancelar parada' : 'Terminar partida'}</button>}
      </nav>}
    </footer>
  </section>;
}
