import React, { useEffect, useId, useRef, useState } from 'react';
import { Shield } from 'lucide-react';

import { ActionDieButton } from './CanvasCombatDetails';

import './CampaignDirectionalCombat.css';

export const zoneNames = { arriba: 'Arriba', izquierda: 'Izquierda', centro: 'Centro', derecha: 'Derecha', abajo: 'Abajo' };
const zones = ['arriba', 'izquierda', 'centro', 'derecha', 'abajo'];

export function FocusScope({ children, className, label, onEscape, style, focusKey }) {
  const frame = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    frame.current?.focus({ preventScroll: true });
    return () => { if (previous?.isConnected) previous.focus?.({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    const firstZone = frame.current?.querySelector('[role="radio"][tabindex="0"]');
    (firstZone || frame.current)?.focus({ preventScroll: true });
  }, [focusKey]);
  return <section ref={frame} className={className} role="dialog" aria-modal="true" aria-label={label}
    tabIndex={-1} style={style} onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape' && onEscape) { event.preventDefault(); onEscape(); }
      if (event.key !== 'Tab') return;
      const controls = [...frame.current.querySelectorAll('button:not(:disabled):not([tabindex="-1"]), [tabindex="0"]')];
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === frame.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === frame.current)) {
        event.preventDefault(); first.focus();
      }
    }}>{children}</section>;
}

export function CampaignDiceChoice({ options, ids, onChange }) {
  return <div className="combat-dice-tray combat-action-dice-tray campaign-direction-dice">
    {options.map(die => /^d\d+$/i.test(die.label)
      ? <ActionDieButton key={die.id} die={{ ...die, die: die.label }} selected={ids.includes(die.id)} disabled={die.spent}
          selectedLabel="Preparado" availableLabel="Elegir" onClick={() => onChange(die.id)} />
      : <button type="button" key={die.id} className="campaign-fixed-action" disabled={die.spent}
          aria-pressed={ids.includes(die.id)} onClick={() => onChange(die.id)}>
          <Shield size={26} strokeWidth={1.3} aria-hidden="true" /><strong>{die.value}</strong>
          <span>{die.label}</span><small>{die.spent ? 'Gastada' : ids.includes(die.id) ? 'Preparada' : 'Elegir'}</small>
        </button>)}
  </div>;
}

// The five visible lances follow the confirmed KCD1 reference. Campaign still has
// five logical zones: the lower pair shares Abajo and the central dot is Centro.
const roseRays = [
  { id: 'top', zone: 'arriba', angle: 0 },
  { id: 'left', zone: 'izquierda', angle: -90 },
  { id: 'right', zone: 'derecha', angle: 90 },
  { id: 'lower-left', zone: 'abajo', angle: -142 },
  { id: 'lower-right', zone: 'abajo', angle: 142 },
];
const lance = 'M0 -80 L4.6 -25 Q4.6 -19 0 -18 Q-4.6 -19 -4.6 -25 Z';

export function CombatRose({ value, onChange, phase, attackZone, defenseZone, defense, matched }) {
  const result = phase === 'result';
  const group = useRef(null);
  const paintId = useId().replace(/:/g, '');
  const goldId = `${paintId}-gold`, redId = `${paintId}-red`;
  const contains = (choice, zone) => Array.isArray(choice) ? choice.includes(zone) : choice === zone;
  const active = zone => result ? contains(attackZone, zone) : value === zone;
  const guarded = zone => result && defense === 'parry' && contains(defenseZone, zone);
  return <div className="campaign-combat-rose" data-phase={phase} data-matched={matched || undefined}>
    <svg className="campaign-rose-art" viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={goldId} x1="-6" y1="-80" x2="6" y2="-18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff1b4" /><stop offset=".22" stopColor="#d9c778" />
          <stop offset=".47" stopColor="#9c893e" /><stop offset=".53" stopColor="#e3d38b" />
          <stop offset=".78" stopColor="#b5a052" /><stop offset="1" stopColor="#75602b" />
        </linearGradient>
        <linearGradient id={redId} x1="-6" y1="-80" x2="6" y2="-18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#eb5b49" /><stop offset=".35" stopColor="#c52c28" />
          <stop offset=".5" stopColor="#a9151c" /><stop offset=".58" stopColor="#d13930" />
          <stop offset="1" stopColor="#790d15" />
        </linearGradient>
      </defs>
      {roseRays.map(ray => <g key={ray.id} className="campaign-rose-ray" data-zone={ray.zone}
        data-active={active(ray.zone)} data-guard={guarded(ray.zone)} transform={`translate(100 100) rotate(${ray.angle})`}>
        <path className="campaign-rose-lance-shadow" d={lance} />
        <path className="campaign-rose-lance" d={lance} fill={`url(#${active(ray.zone) ? redId : goldId})`} />
        <path className="campaign-rose-bevel" d="M0 -79 L0 -18 Q-4.6 -19 -4.6 -25 Z" />
        <path className="campaign-rose-ridge" d="M0 -73 L0 -23" />
        <path className="campaign-rose-focus" d={lance} />
      </g>)}
      <g className="campaign-rose-center" data-active={active('centro')} data-guard={guarded('centro')}>
        <circle className="campaign-rose-center-edge" cx="100" cy="100" r="6" />
        <circle className="campaign-rose-center-dot" cx="100" cy="100" r="2.7" />
      </g>
    </svg>
    {!result ? <div ref={group} role="radiogroup" aria-label={phase === 'aim' ? 'Zona de ataque' : 'Zona de parry'}
      onKeyDown={event => {
        const keyZone = { ArrowUp: 'arriba', ArrowDown: 'abajo', ArrowLeft: 'izquierda', ArrowRight: 'derecha', '5': 'centro', Clear: 'centro' }[event.key];
        if (!keyZone) return;
        event.preventDefault(); event.stopPropagation(); onChange(keyZone);
        group.current.querySelector(`[data-zone="${keyZone}"]`)?.focus();
      }}>
      {zones.map(zone => <button type="button" key={zone} className="campaign-rose-zone" data-zone={zone}
        role="radio" aria-label={zoneNames[zone]} aria-checked={value === zone}
        tabIndex={value === zone || (!value && zone === 'centro') ? 0 : -1} onClick={() => onChange(zone)} />)}
    </div> : <div className="campaign-rose-sr" role="group" aria-label="Zonas reveladas">
      Ataque: {[attackZone].flat().map(zone => zoneNames[zone]).join(' + ')}.{defense === 'parry' ? ` Parry: ${[defenseZone].flat().map(zone => zoneNames[zone]).join(' + ')}.` : ''}
    </div>}
    {result && matched && <div className="campaign-rose-clash" aria-hidden="true" />}
  </div>;
}

// Reads the rendered token so the choice follows the same pan, zoom and token transform.
export function useTokenAnchor(tokenId) {
  const [point, setPoint] = useState(null);
  useEffect(() => {
    let frame;
    const track = () => {
      const token = document.querySelector(`[data-board-item-id="${tokenId}"] img`);
      if (token) {
        const rect = token.getBoundingClientRect();
        const next = { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
        setPoint(old => old?.x === next.x && old?.y === next.y ? old : next);
      }
      frame = requestAnimationFrame(track);
    };
    track(); return () => cancelAnimationFrame(frame);
  }, [tokenId]);
  return point;
}

