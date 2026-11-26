import React, { useId, useRef, useState } from 'react';
import { ActionDieButton } from './CanvasCombatDetails';

export const zoneNames = { arriba: 'Arriba', izquierda: 'Izquierda', centro: 'Centro', derecha: 'Derecha', abajo: 'Abajo' };
const center = 120;
const radians = angle => angle * Math.PI / 180;
const point = (angle, radius) => [center + Math.sin(radians(angle)) * radius, center - Math.cos(radians(angle)) * radius];
export const ringSector = (from, to, inner, outer = 118) => {
  const count = Math.ceil((to - from) / 4) + 1;
  const angles = Array.from({ length: count }, (_, i) => from + (to - from) * i / (count - 1));
  return `polygon(${[...angles.map(a => point(a, outer)), ...angles.reverse().map(a => point(a, inner))]
    .map(([x, y]) => `${(x / 2.4).toFixed(3)}% ${(y / 2.4).toFixed(3)}%`).join(',')})`;
};
const regions = { arriba: [-45, 45], derecha: [45, 125], abajo: [125, 235], izquierda: [235, 315] };
const rays = [{ zone: 'arriba', angle: 0 }, { zone: 'izquierda', angle: -90 }, { zone: 'derecha', angle: 90 },
  { zone: 'abajo', angle: -142 }, { zone: 'abajo', angle: 142 }];
const lance = 'M0 -80 L4.6 -25 Q4.6 -19 0 -18 Q-4.6 -19 -4.6 -25 Z';

function RosePaint({ id }) {
  return <defs>
    <linearGradient id={`${id}-gold`} x1="-6" y1="-80" x2="6" y2="-18" gradientUnits="userSpaceOnUse">
      <stop stopColor="#fff1b4" /><stop offset=".22" stopColor="#d9c778" /><stop offset=".47" stopColor="#9c893e" />
      <stop offset=".53" stopColor="#e3d38b" /><stop offset=".78" stopColor="#b5a052" /><stop offset="1" stopColor="#75602b" />
    </linearGradient>
    <linearGradient id={`${id}-red`} x1="0" y1="-80" x2="0" y2="-18" gradientUnits="userSpaceOnUse">
      <stop stopColor="#eb5b49" /><stop offset=".35" stopColor="#c52c28" /><stop offset=".5" stopColor="#a9151c" /><stop offset="1" stopColor="#790d15" />
    </linearGradient>
    <linearGradient id={`${id}-blue`} x1="0" y1="-80" x2="0" y2="-18" gradientUnits="userSpaceOnUse">
      <stop stopColor="#c9e6f4" /><stop offset=".35" stopColor="#73adcb" /><stop offset=".5" stopColor="#3e799b" /><stop offset="1" stopColor="#244d69" />
    </linearGradient>
    <linearGradient id={`${id}-clash`} x1="-4.6" y1="0" x2="4.6" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#d8483e" /><stop offset=".49" stopColor="#ac2128" />
      <stop offset=".51" stopColor="#75badc" /><stop offset="1" stopColor="#386f94" />
    </linearGradient>
  </defs>;
}
function Lance({ zone, angle, selected, guarded, muted, focused, id, tone }) {
  const paint = guarded ? selected ? 'clash' : 'blue' : selected ? tone === 'defense' ? 'blue' : 'red' : 'gold';
  return <g className="polish-ray" data-zone={zone} data-active={selected} data-guard={guarded} data-blocked={muted} data-focused={focused} style={{ '--ray-angle': `${angle}deg` }}>
    <path className="polish-lance-underlay" d={lance} />
    <path className="polish-lance" d={lance} fill={`url(#${id}-${paint})`} />
    <path className="polish-lance-bevel" d="M0 -79 L0 -18 Q-4.6 -19 -4.6 -25 Z" />
    <path className="polish-lance-ridge" d="M0 -73 L0 -23" />
    {muted && <path className="polish-blocked-mark" d="M-7 -63 L7 -63" />}
  </g>;
}

// The center owns only its visible hub. Every lance, including its rounded
// heel, belongs to the surrounding sector. Touch uses a larger drawn rose so
// its 44px center target cannot cover a lance's base.
export function CombatRose(props) {
  const { value, onChange, phase, attackZone, defenseZone, defense, matched, multiple = false, selectionTone } = props;
  const id = useId().replace(/:/g, ''), group = useRef(null);
  const result = phase === 'result';
  const contains = (choice, zone) => [choice].flat().includes(zone);
  const active = zone => result ? contains(attackZone, zone) : contains(value, zone);
  const guarded = zone => result && defense === 'parry' && contains(defenseZone, zone);
  if (result) return <div className="polish-rose polish-revealed" data-phase="result" data-matched={matched || undefined}
    role="img" aria-label={`Ataque: ${[attackZone].flat().map(zone => zoneNames[zone]).join(' + ')}.${defense === 'parry' ? ` Parry: ${[defenseZone].flat().map(zone => zoneNames[zone]).join(' + ')}.` : ''}`}>
    <svg viewBox="0 0 240 240" aria-hidden="true" className="polish-rose-art"><RosePaint id={id} />
      {rays.map((ray, i) => <Lance key={i} {...ray} id={id} selected={active(ray.zone)} guarded={guarded(ray.zone)} />)}
      <circle className="polish-rose-center" data-active={active('centro')} data-guard={guarded('centro')}
        cx={center} cy={center} r="4.8" fill={`url(#${id}-${guarded('centro') ? active('centro') ? 'clash' : 'blue' : active('centro') ? 'red' : 'gold'})`} />
    </svg>
    {matched && <div className="campaign-rose-clash" aria-hidden="true" />}
  </div>;
  return <div className="polish-rose" ref={group} role={multiple ? 'group' : 'radiogroup'} data-selection-tone={selectionTone}
    aria-label={multiple ? phase === 'aim' ? 'Zonas de ataque' : 'Zonas de parry' : phase === 'aim' ? 'Zona de ataque' : 'Zona de parry'}
    onKeyDown={event => {
      const next = { ArrowUp: 'arriba', ArrowDown: 'abajo', ArrowLeft: 'izquierda', ArrowRight: 'derecha', '5': 'centro', Clear: 'centro' }[event.key];
      if (!next) return;
      event.preventDefault(); event.stopPropagation(); if (!multiple) onChange(next);
      group.current.querySelector(`button[data-zone="${next}"]`)?.focus();
    }}>
    <svg viewBox="0 0 240 240" aria-hidden="true" className="polish-rose-art"><RosePaint id={id} />
      {rays.map((ray, i) => <Lance key={i} {...ray} id={id} selected={active(ray.zone)} tone={selectionTone} />)}
      <circle className="polish-rose-center" data-active={active('centro')} cx={center} cy={center} r="4.8"
        style={selectionTone === 'defense' && active('centro') ? { fill:`url(#${id}-blue)` } : undefined} />
    </svg>
    {Object.keys(zoneNames).map(zone => <button type="button" key={zone} className="polish-rose-hit" data-zone={zone}
      role={multiple ? 'checkbox' : 'radio'} aria-label={zoneNames[zone]} aria-checked={active(zone)}
      tabIndex={multiple || active(zone) || (!value && zone === 'centro') ? 0 : -1}
      style={zone === 'centro' ? undefined : { '--hit-pc': ringSector(...regions[zone], 12), '--hit-touch': ringSector(...regions[zone], 22) }}
      onClick={() => onChange(zone)} />)}
  </div>;
}

const directions = [
  ['Norte', 0, '8'], ['Noreste', 45, '9'], ['Este', 90, '6'], ['Sureste', 135, '3'],
  ['Sur', 180, '2'], ['Suroeste', 225, '1'], ['Oeste', 270, '4'], ['Noroeste', 315, '7'],
];
export function EvasionRose({ destinations, value, onChange, disabled }) {
  const id = useId().replace(/:/g, ''), group = useRef(null);
  const [focusedDirection, setFocusedDirection] = useState(null);
  const choose = label => { const destination = destinations.find(d => d.label === label && !d.blocked); if (destination && !disabled) onChange(destination); };
  const current = value?.label || destinations.find(d => !d.blocked)?.label;
  return <div ref={group} className="polish-rose polish-evasion-rose" role="radiogroup" aria-label="Dirección de la evasión"
    onKeyDown={event => {
      let direction = directions.find(([label, angle, key]) => key === event.key)?.[0];
      direction ||= { ArrowUp: 'Norte', ArrowRight: 'Este', ArrowDown: 'Sur', ArrowLeft: 'Oeste', Home: 'Noroeste', PageUp: 'Noreste', End: 'Suroeste', PageDown: 'Sureste' }[event.key];
      if (!direction) return;
      event.preventDefault(); event.stopPropagation(); choose(direction);
      group.current.querySelector(`[data-direction="${direction}"]`)?.focus();
    }}>
    <svg viewBox="0 0 240 240" aria-hidden="true" className="polish-rose-art"><RosePaint id={id} />
      {directions.map(([label, angle]) => <Lance key={label} angle={angle} id={id}
        selected={label === value?.label} focused={label === focusedDirection}
        muted={destinations.find(d => d.label === label)?.blocked ?? true} />)}
    </svg>
    {directions.map(([label, angle]) => {
      const destination = destinations.find(d => d.label === label), blocked = !destination || destination.blocked;
      return <button type="button" key={label} className="polish-rose-hit" data-direction={label}
        role="radio" aria-label={label} aria-checked={value?.label === label} aria-disabled={blocked || disabled}
        tabIndex={current === label && !blocked ? 0 : -1} title={blocked ? `${label}: destino bloqueado` : `${label}: una casilla`}
        style={{ '--hit-pc': ringSector(angle - 22.5, angle + 22.5, 20), '--hit-touch': ringSector(angle - 22.5, angle + 22.5, 22) }}
        onFocus={() => setFocusedDirection(label)} onBlur={() => setFocusedDirection(null)}
        onClick={() => choose(label)} />;
    })}
  </div>;
}

export function CampaignDiceChoice({ options, ids, onChange, purpose = 'defense' }) {
  return <div className="combat-dice-tray combat-action-dice-tray polish-dice">
    {options.map(resource => {
      const fixed = resource.kind === 'basic';
      const label = fixed ? resource.id === 'defense' ? 'Defensa básica' : 'Acción básica' : resource.label;
      return <div className="polish-resource" key={resource.id}>
        <ActionDieButton die={{ ...resource, ...(fixed ? { sides: 6 } : { die: resource.label }) }}
          showType={!fixed} selected={ids.includes(resource.id)} disabled={resource.spent}
          ariaLabel={fixed ? `${label} · ${resource.value}, valor fijo` : undefined}
          selectedLabel={fixed ? label : purpose === 'attack' ? 'En ataque' : 'En defensa'} availableLabel={fixed ? label : 'Disponible'} onClick={() => onChange(resource.id)} />
        {fixed && <small className="polish-fixed-note">Valor fijo</small>}
      </div>;
    })}
  </div>;
}
