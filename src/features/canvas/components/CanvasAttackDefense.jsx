import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Shield } from 'lucide-react';
import { resolveEquipmentImage } from '../../../utils/equipmentImages';
import LoadingImage, { preloadImage } from '../../../components/LoadingImage';
import { AttackModifiers, IncomingAttackDice } from './CanvasCombatDetails';
import { getCanvasWeaponIdentity } from '../combat/canvasAttackRules';
import CanvasDefensiveExcess from './CanvasDefensiveExcess';
import './CanvasAttackDefense.css';
import './CanvasCombatWeaponArt.css';
import { describeLifeLoss } from '../../tactical-shared/potionBuffs';

// The parent supplies the rules-derived preview and the existing defense actions.
const CanvasAttackDefense = ({
  pending, attacker, target, customImages, threatDie, preview, glossary = [],
  armorName, armorImage, isEnemy = false, showProtection = true, forecast = false, children, actions,
  counterWeapons = [], preferredCounterWeaponId, prone = false, onResolveExcess,
}) => {
  const [chosenAction, setChosenAction] = useState(null);
  const [weaponId, setWeaponId] = useState(null);
  const [busy, setBusy] = useState(false);
  const resolving = useRef(false);
  const weapon = counterWeapons.find(item => getCanvasWeaponIdentity(item) === weaponId)
    || counterWeapons.find(item => getCanvasWeaponIdentity(item) === preferredCounterWeaponId)
    || counterWeapons[0];
  const defaultAction = weapon ? 'counterattack' : !prone ? 'reposition' : null;
  const action = chosenAction === 'counterattack' && weapon ? chosenAction
    : chosenAction === 'reposition' && !prone ? chosenAction : defaultAction;
  const hasExcess = !forecast && preview.surplus > 0 && Boolean(onResolveExcess);
  useEffect(() => {
    counterWeapons.forEach(item => { void preloadImage(resolveEquipmentImage(item, customImages)); });
  }, [counterWeapons, customImages]);
  const resolveExcess = async (choice) => {
    if (resolving.current) return;
    resolving.current = true;
    setBusy(true);
    try {
      await onResolveExcess({ excessChoice: choice, ...(choice === 'counterattack' ? { counterWeapon: weapon } : {}) });
    } finally {
      resolving.current = false;
      setBusy(false);
    }
  };
  const weapons = pending.attackParts?.length > 1
    ? pending.attackParts.map(part => ({ ...part.weapon, key: part.weaponId }))
    : [{ ...pending.weapon, name: pending.weaponName || pending.weapon?.name, key: 'weapon' }];
  const outcome = preview.lifeLost > 0
    ? `Pierdes ${describeLifeLoss(preview)}`
    : preview.finalPressure === 0 ? 'Ataque anulado' : 'Sin pérdida de Vida';
  const weaponArt = weapons.map(weapon => {
    const image = resolveEquipmentImage(weapon, customImages);
    return <div key={weapon.key}>{image && <img src={image} alt="" draggable={false} />}</div>;
  });
  const result = <section className="attack-defense-result" aria-label="Resultado de la defensa" aria-live="polite" aria-atomic="true">
    <p className="attack-defense-outcome" data-hurt={!forecast && preview.lifeLost > 0}>
      {forecast ? 'Defensa pendiente de tirar' : outcome}
    </p>
    {forecast ? <p className="attack-defense-note">Sin defensa: {preview.lifeLost > 0 ? `perderías ${describeLifeLoss(preview)}` : 'sin pérdida de Vida'}</p>
      : <dl className="attack-defense-equation">
        <div><dt>Ataque</dt><dd>{pending.pressure?.total || 0}</dd></div>
        <span aria-hidden="true">−</span>
        <div><dt>Defensa</dt><dd>{preview.defense}</dd></div>
        <span aria-hidden="true">→</span>
        <div><dt>Presión</dt><dd>{preview.finalPressure}</dd></div>
      </dl>}
    {preview.surplus > 0 && <p className="attack-defense-surplus">Excedente <strong>{preview.surplus}</strong></p>}
  </section>;

  return <>
    <div className="combat-modal-body attack-defense-body custom-scrollbar">
      <div className="attack-defense-scene">
        <div className="attack-defense-art" aria-hidden="true">
          {weapons.length === 2 ? <div className="combat-dual-weapon-art">{weaponArt}</div> : weaponArt}
        </div>
        <header className="attack-defense-heading">
          <h2>{pending.blastId ? 'Explosión inminente' : 'Ataque inminente'}</h2>
          <p><strong>{attacker?.name || pending.attackerName}</strong><span>VS</span><strong>{target?.name || pending.targetName}</strong></p>
          {pending.blastId && <small>Defensa {Number(pending.blastIndex) + 1} de {pending.blastCount} · misma Presión para toda el área</small>}
        </header>
        <section className="attack-defense-incoming" aria-label="Ataque recibido">
          <div className="attack-defense-weapon-names">{weapons.map(weapon => <h3 key={weapon.key}>{weapon.name || weapon.nombre}</h3>)}</div>
          <p className="attack-defense-pressure"><strong>{pending.pressure?.total || 0}</strong><span>Presión entrante</span></p>
          <div className="attack-defense-rolls" role="region" aria-label="Dados del atacante"><IncomingAttackDice pending={pending} threatDie={threatDie} /></div>
          <AttackModifiers weapon={pending.weapon} glossary={glossary} showDice={false} />
        </section>
      </div>

      <section className="attack-defense-armor" aria-label={`${isEnemy ? 'Defensa del enemigo' : 'Defensa actual'}${showProtection ? `, CD ${preview.effectiveCd}` : ''}`}>
        {armorImage && <LoadingImage key={armorImage} imageClassName="combat-defense-art" src={armorImage} alt=""
          skeleton={false} showFailureFallback={false} draggable={false} />}
        <div className="attack-defense-armor-copy">
          <h3>{armorName || (isEnemy ? target?.name : 'Protección actual')}</h3>
          {showProtection && <p>1 bloque de Vida por cada {preview.effectiveCd} de Presión restante</p>}
          {showProtection && (preview.barrierBonus > 0 || preview.shieldBonus > 0 || preview.baseCd !== preview.effectiveCd) && <p className="attack-defense-armor-adjustment">
            CD base {preview.baseCd}{preview.barrierBonus > 0 && ' · Barrera +1'}{preview.shieldBonus > 0 && ' · Escudo +1'}{preview.effectiveCd < preview.baseCd + (preview.shieldBonus || 0) + (preview.barrierBonus || 0) && ' · Perforante −1'}
          </p>}
        </div>
        {showProtection && <div className="attack-defense-cd"><Shield size={20} strokeWidth={1.3} aria-hidden="true" /><span>CD</span><strong>{preview.effectiveCd}</strong></div>}
      </section>

      <fieldset className="attack-defense-controls" disabled={busy}>{children}</fieldset>
      {hasExcess && <div className="attack-defense-aftermath">
        {result}
        <CanvasDefensiveExcess surplus={preview.surplus} weapons={counterWeapons} weapon={weapon} onWeaponChange={setWeaponId}
          action={action} onActionChange={setChosenAction} prone={prone} busy={busy} customImages={customImages} />
      </div>}
    </div>

    <footer className="combat-modal-footer attack-defense-footer" data-excess={hasExcess}>
      {hasExcess ? <>
        {action && <button type="button" className="combat-confirm" disabled={busy} onClick={() => resolveExcess(action)}>
          <span>{busy ? 'Confirmando…' : action === 'counterattack' ? 'Confirmar contraataque' : 'Confirmar reposicionamiento'}</span><ArrowRight size={20} aria-hidden="true" />
        </button>}
        <button type="button" className="defensive-excess-discard" disabled={busy} onClick={() => resolveExcess('discard')}>Continuar sin gastar excedente</button>
      </> : <>{result}{actions}</>}
    </footer>
  </>;
};

export default CanvasAttackDefense;
