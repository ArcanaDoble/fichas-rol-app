import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, RotateCw, X } from 'lucide-react';
import { getWeaponForms } from '../../roguelite/weaponForms';
import { getCanvasWeaponIdentity } from '../combat/canvasAttackRules';
import { getCampaignResources } from '../combat/campaignAttackRules';
import { getCanvasTrickWeapons } from '../combat/canvasWeaponTrick';
import { ActionDieButton } from './CanvasCombatDetails';
import './CanvasWeaponTrick.css';

export default function CanvasWeaponTrickPanel({ scene, runtime }) {
  const draft = runtime?.trickDraft;
  const panel = useRef(null);
  const [resourceId, setResourceId] = useState(null);
  const closeRef = useRef(runtime?.closeWeaponTrick); closeRef.current = runtime?.closeWeaponTrick;
  useEffect(() => {
    if (!draft) return undefined;
    setResourceId(null);
    const previous = document.activeElement;
    panel.current?.querySelector('button')?.focus();
    const keyboard = event => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current?.(); }
      if (event.key === 'Tab') {
        const controls = [...panel.current.querySelectorAll('button:not(:disabled), select:not(:disabled)')];
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('keydown', keyboard); previous?.focus?.(); };
  }, [draft?.operationId]);
  if (!draft) return null;
  const token = scene?.items?.find(item => item.id === draft.tokenId);
  const weapons = getCanvasTrickWeapons(token);
  const weapon = weapons.find(item => getCanvasWeaponIdentity(item) === draft.weaponId);
  const forms = getWeaponForms(weapon), current = forms.find(form => form.id === draft.fromFormId), destination = forms.find(form => form.id === draft.toFormId);
  if (!weapon || !destination) return <div className="canvas-trick-backdrop"><section className="canvas-trick-panel" role="dialog" aria-modal="true" aria-label="Truco" ref={panel}><p>El arma ya no está equipada.</p><button onClick={runtime.closeWeaponTrick}>Cerrar</button></section></div>;
  const resources = getCampaignResources(token, scene.canvasCombat).filter(resource => !resource.spent);
  const selected = resources.find(resource => resource.id === resourceId);
  return <div className="canvas-trick-backdrop">
    <section className="canvas-trick-panel" ref={panel} role="dialog" aria-modal="true" aria-labelledby="canvas-trick-title" aria-busy={runtime.trickBusy}>
      <header className="canvas-trick-header"><div><span>Truco · {token.name || 'Personaje'}</span><h2 id="canvas-trick-title">{weapon.name || weapon.nombre}</h2></div><button type="button" aria-label="Cerrar transformación" disabled={runtime.trickBusy} onClick={runtime.closeWeaponTrick}><X size={21} /></button></header>
      {weapons.length > 1 && <label className="canvas-trick-weapon">Arma equipada<select value={draft.weaponId} disabled={runtime.trickBusy} onChange={event => runtime.beginWeaponTrick(draft.tokenId, event.target.value)}>{weapons.map(item => <option key={getCanvasWeaponIdentity(item)} value={getCanvasWeaponIdentity(item)}>{item.name || item.nombre}</option>)}</select></label>}
      <div className="canvas-trick-path"><span>{current?.label}</span><ArrowRight size={16} /><strong>{destination.label}</strong></div>
      <div className="canvas-trick-art" style={destination.image ? { backgroundImage: `linear-gradient(90deg,rgba(7,11,18,.84),rgba(7,11,18,.18)),linear-gradient(0deg,#070b12,transparent 75%),url("${destination.image}")` } : undefined}>
        <span>Forma {forms.indexOf(destination) + 1}</span><h3>{destination.label}</h3>
        <div className="canvas-trick-stats"><div><small>Daño</small><b>{destination.dano || '—'}</b></div><div><small>Alcance</small><b>{destination.alcance}</b></div><div><small>Empuñadura</small><b>{destination.handsRequired} {destination.handsRequired === 1 ? 'mano' : 'manos'}</b></div></div>
        <p className="canvas-trick-traits">{destination.rasgos.join(' · ')}</p>
      </div>
      <div className="canvas-trick-payment">
        <p>{draft.inCombat ? 'Elige un dado para transformar' : 'Preparar forma fuera de combate'}</p>
        <small>{draft.inCombat ? 'Consume un dado de acción. Su valor no se suma al ataque.' : 'Puedes cambiar de forma sin gastar dados.'}</small>
        {draft.inCombat && <div className="combat-dice-tray">{resources.map(resource => <ActionDieButton key={resource.id}
          die={{ ...resource, ...(resource.kind === 'basic' ? { sides: 6 } : { die: resource.die || resource.label }) }}
          ariaLabel={`Gastar ${resource.label || resource.die} de valor ${resource.value}`} selected={resource.id === resourceId}
          selectedLabel="Transformar" availableLabel={resource.kind === 'basic' ? 'Acción principal' : 'Disponible'}
          disabled={runtime.trickBusy} onClick={() => setResourceId(resource.id)} />)}</div>}
        {draft.inCombat && !resources.length && <p role="status">No quedan dados disponibles.</p>}
      </div>
      {runtime.trickError && <p className="canvas-trick-error" role="alert">{runtime.trickError}</p>}
      <footer><button type="button" onClick={runtime.closeWeaponTrick} disabled={runtime.trickBusy}>Cancelar</button><button type="button" className="canvas-trick-confirm" onClick={() => runtime.confirmWeaponTrick(resourceId)} disabled={runtime.trickBusy || (draft.inCombat && !selected)}><RotateCw size={17} />{runtime.trickBusy ? 'Transformando…' : `Transformar${draft.inCombat ? ' · 1 DA' : ''}`}</button></footer>
    </section>
  </div>;
}
