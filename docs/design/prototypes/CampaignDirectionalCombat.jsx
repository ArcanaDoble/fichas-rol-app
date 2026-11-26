import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Crosshair, LockKeyhole, Shield, ShieldCheck, Swords } from 'lucide-react';
import CanvasAttackPreparation from '../../../src/features/canvas/components/CanvasAttackPreparation';
import { ActionDieButton } from '../../../src/features/canvas/components/CanvasCombatDetails';
import { parseWeaponDiceProfile } from '../../../src/features/canvas/combat/canvasAttackRules';
import './CampaignDirectionalCombat.css';

export const zoneNames = { arriba: 'Arriba', izquierda: 'Izquierda', centro: 'Centro', derecha: 'Derecha', abajo: 'Abajo' };
const zones = ['arriba', 'izquierda', 'centro', 'derecha', 'abajo'];

function FocusScope({ children, className, label, onEscape, style, focusKey }) {
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

function CombatRose({ value, onChange, phase, attackZone, defenseZone, defense, matched }) {
  const result = phase === 'result';
  const group = useRef(null);
  const paintId = useId().replace(/:/g, '');
  const goldId = `${paintId}-gold`, redId = `${paintId}-red`;
  const active = zone => result ? attackZone === zone : value === zone;
  const guarded = zone => result && defense === 'parry' && defenseZone === zone;
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
      Ataque: {zoneNames[attackZone]}.{defense === 'parry' ? ` Parry: ${zoneNames[defenseZone]}.` : ''}
    </div>}
    {result && matched && <div className="campaign-rose-clash" aria-hidden="true" />}
  </div>;
}

// Reads the rendered token so the choice follows the same pan, zoom and token transform.
function useTokenAnchor(tokenId) {
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

export default function CampaignDirectionalUI({ session, attacker, target, attackResources, defenseResources,
  defenseValue, destinations, canDefend, friendly, update, close, commitAttack, resolve, counter }) {
  const point = useTokenAnchor(target.id);
  const attackResource = attackResources.find(die => die.id === session.attackId);
  const phase = session.phase, preparing = phase === 'prepare', aiming = phase === 'aim', result = phase === 'result';
  const npc = attacker.profileType === 'rogueliteEnemy';
  const profile = parseWeaponDiceProfile(session.weapon);
  if (preparing) return <div className="combat-modal-backdrop campaign-direction-preparation">
    <FocusScope className="combat-modal-frame attack-preparation-frame" label="Preparar ataque de Campaña" onEscape={close}>
      <div className="combat-details"><CanvasAttackPreparation attacker={attacker} target={target}
        draft={{ attackerId: attacker.id, targetId: target.id, weapon: session.weapon, actionCost: 1,
          weaponDiceProfile: profile, range: { rangeName: 'Cercano', distance: 1 } }}
        isEnemy={npc} customImages={{}} combatRuntime={{ cancelAttackDraft: close, confirmAttack: () => update({ phase: 'aim' }) }}
        availableActionDice={attackResources.map(die => ({ ...die, die: die.label }))}
        selectedActionDice={session.attackId ? [session.attackId] : []}
        setSelectedActionDice={action => {
          const current = session.attackId ? [session.attackId] : [];
          const next = typeof action === 'function' ? action(current) : action;
          update({ attackId: next[0] || null });
        }} canSubmit={Boolean(attackResource && !attackResource.spent)}
        resourceSelector={npc || session.response ? <section aria-label="Acción del personaje">
          <div className="attack-preparation-dice-heading"><h3>{session.response ? 'Defensa reutilizada' : 'Acción principal'}</h3></div>
          <CampaignDiceChoice options={attackResources} ids={[session.attackId]} onChange={id => update({ attackId: id })} />
        </section> : undefined}
        enemyWeaponOptions={[]} confirmLabel="Elegir zona sobre el token"
        rollNote="El recurso se gasta cuando fijes la zona en el tablero." />
      </div>
    </FocusScope>
  </div>;

  const showRose = aiming || result || session.defense === 'parry';
  return <FocusScope className="campaign-direction-stage" focusKey={`${phase}:${session.defense}`} label={aiming ? 'Elegir zona de ataque' : result ? 'Resultado del intercambio' : 'Defender ataque'}
    onEscape={aiming ? () => update({ phase: 'prepare' }) : result ? close : undefined}>
    <header className="campaign-direction-title">
      <h2>{aiming ? 'Elige dónde golpear' : result ? session.result.title : `Defiende ${target.name}`}</h2>
      <p>{attacker.name}<span>VS</span>{target.name}</p>
      {!aiming && !result && <small><LockKeyhole size={13} aria-hidden="true" /> Zona del ataque oculta</small>}
    </header>
    {point && showRose && <div className="campaign-direction-anchor" style={{ left: point.x, top: point.y }}>
      <CombatRose phase={phase} value={aiming ? session.attackZone : session.defenseZone}
        onChange={zone => update(aiming ? { attackZone: zone } : { defenseZone: zone })}
        attackZone={result ? session.attackZone : undefined} defenseZone={result ? session.defenseZone : undefined}
        defense={session.defense} matched={result && session.result.parried} />
    </div>}
    <div className="campaign-direction-dock combat-details attack-defense-frame" data-phase={phase}>
      {aiming ? <>
        <div className="campaign-direction-summary"><img src={session.weapon.image} alt="" />
          <div><h3>{session.weapon.name}</h3><p>{attackResource?.value} de acción + {session.weapon.dano}</p></div>
          <LockKeyhole size={18} aria-label="Elección secreta" /></div>
        <p className="campaign-direction-choice" aria-live="polite">{session.attackZone ? <>{zoneNames[session.attackZone]} <small>· zona elegida</small></> : 'Elige una de las cinco zonas'}</p>
        <p className="campaign-direction-note">Zonas del defensor · flechas o toque · 5 para Centro</p>
        {friendly && <p className="campaign-direction-friendly">Vas a atacar a un aliado: {target.name}.</p>}
        <div className="campaign-direction-actions"><button className="campaign-direction-back" onClick={() => update({ phase: 'prepare' })}><ArrowLeft size={17} /> Dado</button>
          <button className="attack-preparation-confirm" disabled={!session.attackZone} onClick={commitAttack}>
            {friendly ? 'Confirmar ataque al aliado' : 'Fijar zona y atacar'}<ArrowRight size={18} /></button></div>
      </> : !result ? <>
        <div className="campaign-direction-defense-types" role="group" aria-label="Tipo de defensa">
          {[['parry', 'Parry', Shield], ['evade', 'Evasión', Crosshair], ['receive', 'Recibir', Swords]].map(([id, label, Icon]) =>
            <button type="button" key={id} aria-pressed={session.defense === id}
              onClick={() => update({ defense: id, defenseIds: [], defenseZone: null, destination: null })}><Icon size={18} />{label}</button>)}
        </div>
        {session.defense !== 'receive' ? <>
          <CampaignDiceChoice options={defenseResources} ids={session.defenseIds} onChange={id => update({ defenseIds: session.defense === 'parry' ? [id]
            : session.defenseIds.includes(id) ? session.defenseIds.filter(die => die !== id) : [...session.defenseIds, id] })} />
          {session.defense === 'parry' ? <p className="campaign-direction-choice" aria-live="polite">{session.defenseZone ? `Proteges ${zoneNames[session.defenseZone].toLowerCase()}` : 'Elige dónde parar sobre el token'}</p>
            : <div className="campaign-direction-destinations" role="group" aria-label="Destino de la evasión">{destinations.map(d => <button key={d.label} disabled={d.blocked}
                aria-pressed={session.destination?.label === d.label} onClick={() => update({ destination: d })}>{d.label}</button>)}</div>}
          <p className="campaign-direction-note">{session.defense === 'parry' ? 'La zona acertada para el golpe, incluso con un valor menor.' : `Defensa ${defenseValue} / acción ${session.attackValue} · necesita una casilla libre.`}</p>
        </> : <p className="campaign-direction-choice">Recibes el golpe sin gastar defensa.</p>}
        <button className="attack-preparation-confirm" disabled={!canDefend} onClick={resolve}>Revelar y resolver<ArrowRight size={18} /></button>
      </> : <>
        <div className="campaign-direction-result" aria-live="polite">
          {session.result.parried ? <ShieldCheck size={33} strokeWidth={1.2} aria-hidden="true" /> : <Swords size={30} strokeWidth={1.3} aria-hidden="true" />}
          <h3>{session.result.damage ? <><strong>{session.result.damage}</strong> de daño</> : session.result.parried ? 'Golpe detenido' : 'Sin daño'}</h3>
          <p>Ataque: {zoneNames[session.attackZone]}{session.defense === 'parry' ? ` · Parry: ${zoneNames[session.defenseZone]}` : ''}</p>
          <p>{target.name} <strong>{session.result.before} → {session.result.after}</strong> Vida</p>
          <small>{session.result.roll === null ? 'No se tira el arma.' : `Acción ${session.attackValue} + arma ${session.result.roll} − RD ${session.result.rd}`}</small>
        </div>
        <div className="campaign-direction-actions">
          {session.result.counter && <button className="campaign-direction-counter" onClick={counter}>Contraparry <small>Reutiliza tu defensa</small></button>}
          <button className="attack-preparation-confirm" onClick={close}>Volver al Canvas<ArrowRight size={18} /></button>
        </div>
      </>}
    </div>
  </FocusScope>;
}
