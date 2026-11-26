import React, { useId, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Dices, Plus, X } from 'lucide-react';
import { resolveEquipmentImage } from '../../../utils/equipmentImages';
import CombatWeaponTraits from './CombatWeaponTraits';
import EnemyThreatDice from './EnemyThreatDice';
import { getCanvasWeaponIdentity, getCanvasWeaponTraits, parseWeaponDiceProfile } from '../combat/canvasAttackRules';
import {
  ActionDieButton, AttackModifiers, getItemTraits, splitAttackDiceProfile,
} from './CanvasCombatDetails';
import './CanvasAttackPreparation.css';
import './CanvasCombatWeaponArt.css';
import { getCanvasFuryOption } from '../combat/canvasFury';
import { getCanvasManaOption } from '../combat/canvasMana';

const compactDiceProfile = (profile = []) => {
  const groups = profile.reduce((counts, die) => {
    counts.set(die.die, (counts.get(die.die) || 0) + 1);
    return counts;
  }, new Map());
  return [...groups].map(([die, count]) => `${count}${die}`).join(' + ');
};


const rangeNotes = {
  'Ataque en Duelo: se ignoran los rasgos de resolución del arma.': { label: 'Duelo', text: 'Sin rasgos de resolución' },
  'Ataque de Toque a una casilla: los rasgos del arma no se resuelven.': { label: 'Toque a 1 casilla', text: 'Sin rasgos de resolución' },
};

const PreparationRangeNote = ({ range, weaponName }) => {
  if (!range?.note) return null;
  const note = rangeNotes[range.note];
  return <p className="attack-preparation-note attack-preparation-range-note">
    {weaponName && <span>{weaponName}: </span>}
    {note && <><span className="attack-preparation-note-label">{note.label}</span><span> · </span></>}
    {note?.text || range.note}
  </p>;
};

const EnemyWeaponPicker = ({ options, chosen, onChange, busy }) => {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return <section className="attack-preparation-arsenal" data-open={open}>
    <button type="button" className="attack-preparation-arsenal-toggle" aria-expanded={open} aria-controls={panelId}
      aria-label="Elegir armas" disabled={busy} onClick={() => setOpen(value => !value)}>
      <span>Elegir armas</span><span className="attack-preparation-arsenal-count">{chosen.length} en ataque</span>
      <ChevronDown size={17} strokeWidth={1.5} aria-hidden="true" />
    </button>
    <div className="attack-preparation-arsenal-fold" id={panelId} aria-hidden={!open} inert={!open}>
      <div><div className="attack-preparation-arsenal-options custom-scrollbar" role="group" aria-label="Armas disponibles">
        {options.map(item => {
          const identity = getCanvasWeaponIdentity(item);
          const selected = chosen.some(weapon => getCanvasWeaponIdentity(weapon) === identity);
          const name = item.name || item.nombre;
          const copies = options.filter(option => (option.name || option.nombre) === name);
          const copy = copies.length > 1 ? copies.findIndex(option => getCanvasWeaponIdentity(option) === identity) + 1 : null;
          return <button key={identity} type="button" className="attack-preparation-arsenal-option" aria-pressed={selected}
            aria-label={`${name}${copy ? `, ejemplar ${copy}` : ''}`} disabled={busy || (selected && chosen.length === 1)}
            onClick={() => onChange(selected ? chosen.filter(weapon => getCanvasWeaponIdentity(weapon) !== identity) : [...chosen, item])}>
            <span className="attack-preparation-arsenal-mark" aria-hidden="true">{selected ? <Check size={17} /> : <Plus size={17} />}</span>
            <span className="attack-preparation-arsenal-name">{name}{copy && <small>Ejemplar {copy}</small>}</span>
            <span className="attack-preparation-arsenal-profile">{compactDiceProfile(parseWeaponDiceProfile(item))}</span>
          </button>;
        })}
        <p className="attack-preparation-note">Al menos un arma</p>
      </div></div>
    </div>
  </section>;
};

// Presentation only: the draft, eligibility and resource consumption remain in the combat runtime.
const CanvasAttackPreparation = ({
  attacker, target, draft, isEnemy, customImages, combatRuntime, glossary = [],
  availableActionDice, selectedActionDice, setSelectedActionDice, canSubmit, thrownRange,
  enemyWeaponOptions, canChooseEnemyWeapons,
  attackThreatSelection = { useStored: false, customDice: [] }, setAttackThreatSelection,
  attackStoredThreatValue, attackStoredThreatDie,
  resourceSelector, confirmLabel, rollNote, actionValueOverride,
}) => {
  const [furyChoice, setFuryChoice] = useState({ key: null, amount: 0 });
  const fury = getCanvasFuryOption(attacker, draft.attackParts?.map(part => part.weapon) || [draft.weapon]);
  const furyKey = `${draft.attackerId}:${draft.targetId}:${draft.weapon.id}`;
  const furySpend = fury.eligible && furyChoice.key === furyKey ? Math.min(fury.available, furyChoice.amount) : 0;
  const [manaChoice, setManaChoice] = useState(null);
  const mana = getCanvasManaOption(attacker, draft.attackParts?.map(part => part.weapon) || [draft.weapon]);
  const manaSpend = mana.eligible && manaChoice === furyKey ? 1 : 0;
  const weaponName = draft.weapon.name || draft.weapon.nombre;
  const weaponImage = resolveEquipmentImage(draft.weapon, customImages);
  const singlePart = draft.attackParts?.[0];
  const effectiveTraits = new Set(getCanvasWeaponTraits({ rasgos: singlePart?.traits || getItemTraits(draft.weapon) }));
  const weaponTraits = getItemTraits(singlePart?.weapon || draft.weapon)
    .filter(trait => getCanvasWeaponTraits({ rasgos: [trait] }).some(id => effectiveTraits.has(id)));
  const { weaponProfile, modifierProfile: extraProfile } = splitAttackDiceProfile(draft.weaponDiceProfile);
  const damageProfile = weaponProfile.map(die => die.die).join(' + ');
  const compactProfile = compactDiceProfile(weaponProfile);
  const actionCost = isEnemy ? 1 : draft.actionCost;
  const hasThreatSelection = attackThreatSelection.useStored || attackThreatSelection.customDice.length > 0;
  const costLabel = isEnemy ? '1 acción principal' : `${actionCost} ${actionCost === 1 ? 'dado de acción' : 'dados de acción'}`;
  const combined = draft.attackParts?.length > 1;
  const paired = draft.attackParts?.length === 2;
  const chosenWeapons = draft.attackParts?.map(part => part.weapon) || [draft.weapon];
  const preparedParts = combined ? draft.attackParts.map((part, index) => {
    const activeTraits = new Set(getCanvasWeaponTraits({ rasgos: part.traits || getItemTraits(part.weapon) }));
    const name = part.weapon.name || part.weapon.nombre;
    const copies = chosenWeapons.filter(weapon => (weapon.name || weapon.nombre) === name);
    const copy = copies.length > 1 ? copies.findIndex(weapon => getCanvasWeaponIdentity(weapon) === getCanvasWeaponIdentity(part.weapon)) + 1 : null;
    return {
      ...part,
      name,
      hand: isEnemy ? (copy ? `Ejemplar ${copy}` : '') : part.weapon.canvasSlot === 'offHand' ? 'Mano secundaria' : part.weapon.canvasSlot === 'mainHand' ? 'Mano principal' : index === 0 ? 'Mano principal' : 'Mano secundaria',
      image: resolveEquipmentImage(part.weapon, customImages),
      displayTraits: getItemTraits(part.weapon).filter(trait => getCanvasWeaponTraits({ rasgos: [trait] }).some(id => activeTraits.has(id))),
    };
  }) : [];
  const actionPressure = actionValueOverride ?? (isEnemy ? Number(attacker.offenseBase ?? attacker.stats?.ofensiva?.current ?? 0)
    : selectedActionDice.reduce((sum, id) => sum + Number(availableActionDice.find(die => die.id === id)?.value || 0), 0));

  return <>
    <button type="button" className="combat-close attack-preparation-close" disabled={combatRuntime.isConfirmingAttack}
      onClick={combatRuntime.cancelAttackDraft} aria-label="Cancelar ataque"><X size={21} /></button>
    <div className="combat-modal-body attack-preparation-body custom-scrollbar">
      <div className={`attack-preparation-scene${paired ? ' attack-preparation-scene--dual' : ''}`}>
        <div className="attack-preparation-art">
          {!combined && weaponImage && <img className="attack-preparation-weapon-art" src={weaponImage} alt={weaponName || 'Arma'} draggable={false} />}
          {paired && <div className="attack-preparation-dual-art combat-dual-weapon-art">{preparedParts.map(part => (
            <div key={part.weaponId}>{part.image && <img src={part.image} alt={`${part.name}${part.hand ? `, ${part.hand.toLowerCase()}` : ''}`} draggable={false} />}</div>
          ))}</div>}
        </div>
        <header className="attack-preparation-heading">
          <div className="attack-preparation-heading-copy">
            <h2>Preparar ataque</h2>
            <p className="attack-preparation-matchup" aria-label={`${attacker?.name || 'Atacante'} contra ${target?.name || 'Objetivo'}`}>
              <strong>{attacker?.name}</strong><span>VS</span><strong>{target?.name}</strong>
            </p>
          </div>
        </header>

        {combined ? <section className={`attack-preparation-dual${!paired ? ' attack-preparation-dual--multiple' : ''}`} aria-label={isEnemy ? 'Armas del ataque combinado' : 'Armas del ataque dual'}>
          <div className="attack-preparation-pair">{preparedParts.map(part => (
            <article className="attack-preparation-hand" key={part.weaponId} aria-label={`${part.name}${part.hand ? `, ${part.hand.toLowerCase()}` : ''}`}>
              {!paired && part.image && <img className="attack-preparation-multiple-art" src={part.image} alt="" draggable={false} />}
              <div className="attack-preparation-hand-name"><h3>{part.name}</h3>{part.hand && <p>{part.hand}</p>}</div>
              <dl className="noma-loadout-weapon-stats attack-preparation-profile">
                <div><dt>Daño</dt><dd className="noma-loadout-weapon-stats__damage">{compactDiceProfile(part.profile)}</dd></div>
                <div><dt>Alcance</dt><dd>{part.range?.rangeName || part.weapon.alcance || part.weapon.range || draft.range.rangeName}</dd></div>
              </dl>
              <CombatWeaponTraits traits={part.displayTraits} glossary={glossary} />
              <PreparationRangeNote range={part.range} />
              {!part.displayTraits.length && !part.range?.note && <p className="attack-preparation-no-traits">Sin rasgos activos</p>}
            </article>
          ))}</div>
          <div className="attack-preparation-dual-cost">
            {isEnemy ? <span className="attack-preparation-enemy-cost">Una acción principal · Una defensa</span> : <>
              <span>Ataque dual</span>
              <span className="attack-preparation-cost-value" aria-label={costLabel}><Dices size={20} strokeWidth={1.4} aria-hidden="true" /><strong>{actionCost}</strong> dados de acción</span>
            </>}
            {draft.range.distance != null && <small>Objetivo a {draft.range.distance} {draft.range.distance === 1 ? 'casilla' : 'casillas'}</small>}
          </div>
        </section> : <section className="attack-preparation-weapon" aria-label="Arma seleccionada" data-has-art={Boolean(weaponImage)}>
          <div className="attack-preparation-weapon-copy">
            <h3>{weaponName}</h3>
            <dl className="noma-loadout-weapon-stats attack-preparation-profile">
              <div><dt>Daño</dt><dd className="noma-loadout-weapon-stats__damage">{compactProfile}</dd></div>
              <div><dt>Alcance</dt><dd>{draft.range.rangeName}</dd>{draft.range.distance != null && <small>{draft.range.distance} {draft.range.distance === 1 ? 'casilla' : 'casillas'}</small>}</div>
              <div><dt>Coste</dt><dd className="noma-loadout-weapon-stats__cost" aria-label={costLabel} title={costLabel}><span className="attack-preparation-cost-value" aria-hidden="true">{!isEnemy && <Dices size={21} strokeWidth={1.4} />}<span>{actionCost}</span></span></dd>{isEnemy && <small>acción principal</small>}</div>
            </dl>
            <CombatWeaponTraits traits={weaponTraits} glossary={glossary} />
            <PreparationRangeNote range={singlePart?.range || draft.range} />
          </div>
        </section>}
      </div>

      <div className="attack-preparation-decisions">
        <AttackModifiers weapon={draft.weapon} profile={draft.weaponDiceProfile} glossary={glossary} />
        {mana.visible && <section className="attack-preparation-fury attack-preparation-mana" aria-label="Potenciar Descarga arcana" data-active={manaSpend > 0}>
          <div className="attack-preparation-dice-heading"><h3>Descarga arcana</h3><span>{mana.available} de Maná</span></div>
          {mana.eligible ? <>
            <button type="button" className="attack-preparation-mana-toggle" aria-pressed={manaSpend > 0}
              disabled={combatRuntime.isConfirmingAttack || (!manaSpend && mana.available < 1)}
              onClick={() => setManaChoice(manaSpend ? null : furyKey)}>
              <span>{manaSpend ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />} Potenciar · 1 Maná</span>
              <strong>+1d{mana.sides}</strong>
            </button>
            <p className="attack-preparation-fury-benefit" aria-live="polite">{manaSpend
              ? mana.available < 1 ? 'La reserva ha cambiado. Desactiva la potenciación para continuar.' : <>Añades un dado del Catalizador.<small>Te quedarán {mana.available - 1} de Maná al confirmar.</small></>
              : 'Puedes lanzar la Descarga sin gastar Maná.'}</p>
          </> : <p className="attack-preparation-note">{mana.reason}</p>}
        </section>}
        {fury.visible && <section className="attack-preparation-fury" aria-label="Potenciar con Furia" data-active={furySpend > 0}>
          <div className="attack-preparation-dice-heading"><h3>Potenciar con Furia</h3><span>{fury.available} disponible{fury.available === 1 ? '' : 's'}</span></div>
          {fury.eligible ? <>
            <div className="attack-preparation-fury-choice">
              <button type="button" aria-label="Gastar menos Furia" disabled={!furySpend || combatRuntime.isConfirmingAttack}
                onClick={() => setFuryChoice({ key: furyKey, amount: furySpend - 1 })}>−</button>
              <span><strong>{furySpend}</strong> de Furia</span>
              <button type="button" aria-label="Gastar más Furia" disabled={furySpend >= fury.available || combatRuntime.isConfirmingAttack}
                onClick={() => setFuryChoice({ key: furyKey, amount: furySpend + 1 })}>+</button>
            </div>
            <p className="attack-preparation-fury-benefit" aria-live="polite">{furySpend
              ? <>+{furySpend}d{fury.sides} · Crítico{draft.attackParts?.every(part => part.range.suppressTraits || part.negatedTraits?.includes('critico')) ? ' sin efecto en este ataque' : ''}<small>Te quedará{fury.available - furySpend === 1 ? '' : 'n'} {fury.available - furySpend} de Furia al confirmar.</small></>
              : fury.available ? 'Cada punto añade un dado de arma y activa Crítico.' : 'Sin Furia disponible.'}</p>
          </> : <p className="attack-preparation-note">{fury.reason}</p>}
        </section>}
        {isEnemy && canChooseEnemyWeapons && enemyWeaponOptions.length > 1 && <EnemyWeaponPicker options={enemyWeaponOptions}
          chosen={chosenWeapons} onChange={combatRuntime.setAttackWeapons} busy={combatRuntime.isConfirmingAttack} />}

        {resourceSelector ?? (!isEnemy ? <section aria-label="Dados de acción">
          <div className="attack-preparation-dice-heading">
            <h3>{selectedActionDice.length === draft.actionCost ? 'Dados preparados' : `Elige ${draft.actionCost === 1 ? 'un dado' : `${draft.actionCost} dados`}`}</h3>
            <span aria-live="polite" aria-label={`${selectedActionDice.length} de ${draft.actionCost} dados seleccionados`}>{selectedActionDice.length}<span aria-hidden="true"> / </span>{draft.actionCost}</span>
          </div>
          <div className="combat-dice-tray combat-action-dice-tray">
            {availableActionDice.map(die => <ActionDieButton key={die.id} die={die}
              selected={selectedActionDice.includes(die.id)} selectedLabel="En ataque"
              disabled={!selectedActionDice.includes(die.id) && selectedActionDice.length >= draft.actionCost}
              onClick={() => setSelectedActionDice(current => current.includes(die.id) ? current.filter(id => id !== die.id) : [...current, die.id])} />)}
          </div>
          {availableActionDice.length < draft.actionCost && <p className="attack-preparation-note attack-preparation-note--warning" role="status">
            {draft.actionCost - availableActionDice.length === 1 ? 'Falta 1 dado de acción' : `Faltan ${draft.actionCost - availableActionDice.length} dados de acción`}
          </p>}
        </section> : <section>
          {!combined && <p className="combat-enemy-cost">Una acción principal <span>Arma + Base ofensiva</span></p>}
          <EnemyThreatDice selection={attackThreatSelection} onChange={setAttackThreatSelection}
            storedThreatValue={attackStoredThreatValue} storedThreatDie={attackStoredThreatDie}
            purpose="attack" disabled={combatRuntime.isConfirmingAttack} busy={combatRuntime.isConfirmingAttack} />
        </section>)}
      </div>
    </div>

    <footer className="combat-modal-footer attack-preparation-footer">
      {thrownRange?.thrown && <p className={`attack-preparation-note${thrownRange.legal ? '' : ' attack-preparation-note--warning'}`} role="status">
        {!isEnemy && selectedActionDice.length === 0 ? 'Arrojadiza · Elige un dado para fijar el alcance.' : <>
          Arrojadiza · {isEnemy && 'Base ofensiva · '}{thrownRange.distance} / {thrownRange.maxRange} casillas · −{thrownRange.distance} Presión
          {!thrownRange.legal && <span> · Fuera de alcance</span>}
        </>}
      </p>}
      {combined ? <p className="attack-preparation-preview attack-preparation-preview--dual" aria-live="polite">
        <span><strong>{actionPressure}</strong> {isEnemy && actionValueOverride == null ? 'de base' : 'de acción'}</span>
        {preparedParts.map(part => <React.Fragment key={part.weaponId}><span className="attack-preparation-sum">+</span><span className="attack-preparation-contribution"><strong>{compactDiceProfile(part.profile)}</strong> de <span className="attack-preparation-source" title={part.name}>{part.name}</span></span></React.Fragment>)}
        {extraProfile.length > 0 && <><span className="attack-preparation-sum">+</span><span><strong>{compactDiceProfile(extraProfile)}</strong> de modificadores</span></>}
      </p> : <p className="attack-preparation-preview attack-preparation-preview--dual" aria-live="polite">
        <span><strong>{actionPressure}</strong> {isEnemy && actionValueOverride == null ? 'de base' : 'de acción'}</span> <span className="attack-preparation-sum">+</span> <span><strong>{damageProfile}</strong> del arma</span>
        {extraProfile.length > 0 && <><span className="attack-preparation-sum">+</span><span><strong>{compactDiceProfile(extraProfile)}</strong> de modificadores</span></>}
      </p>}
      {furySpend > 0 && <p className="attack-preparation-fury-benefit">+{furySpend}d{fury.sides} de Furia · Gasta {furySpend} de Furia</p>}
      {manaSpend > 0 && <p className="attack-preparation-mana-summary">+1d{mana.sides} por Maná · Gasta 1 de Maná</p>}
      <button type="button" disabled={!canSubmit || manaSpend > mana.available} className="attack-preparation-confirm"
        onClick={() => combatRuntime.confirmAttack(isEnemy
          ? { actionDieIds: selectedActionDice, threatSelection: attackThreatSelection }
          : { actionDieIds: selectedActionDice, threatMode: 'none', customThreatSides: 6, ...(furySpend ? { furySpend } : {}), ...(manaSpend ? { manaSpend } : {}) })}>
        <span>{combatRuntime.isConfirmingAttack ? 'Confirmando…' : (confirmLabel || 'Confirmar ataque')}</span><ArrowRight size={20} aria-hidden="true" />
      </button>
      <p className="attack-preparation-roll-note">{rollNote ?? (combined ? isEnemy && hasThreatSelection ? 'Las armas y la Amenaza se resuelven al confirmar.' : `${paired ? 'Ambas armas' : 'Las armas'} se tiran al confirmar. Una sola Presión.` : isEnemy && hasThreatSelection ? 'El arma y la Amenaza se resuelven al confirmar.' : 'El arma se tira al confirmar.')}</p>
    </footer>
  </>;
};

export default CanvasAttackPreparation;
