import React from 'react';
import { Shield } from 'lucide-react';
import ActionDieSvg from '../../../components/ActionDieSvg';
import { getCombatDieAppearance } from '../../../utils/combatDieAppearance';
import { resolveEquipmentImage } from '../../../utils/equipmentImages';
import { getCanvasAttackThreatDice, getCanvasDefenseThreatDice, getCanvasWeaponIdentity, getCanvasWeaponTraits, isCanvasShield, parseWeaponDiceProfile } from '../combat/canvasAttackRules';
import CombatWeaponTraits from './CombatWeaponTraits';
import './CanvasCombatDetails.css';

export const getDieFaces = (die = {}) => {
  const explicit = Number(die.sides ?? die.faces);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return Number.parseInt(String(die.die || die.type || '').match(/\d+/)?.[0], 10) || 6;
};

export const getItemTraits = (item = {}) => {
  const traits = item.rasgos ?? item.traits ?? item.properties ?? [];
  return (Array.isArray(traits) ? traits : String(traits).split(','))
    .map((trait) => String(trait || '').trim())
    .filter((trait) => trait && trait !== '-');
};

export const ActionDieButton = ({ die, selected, disabled, onClick, selectedLabel = 'Seleccionado', availableLabel = 'Disponible', ariaLabel, showType = true, connectedFaces = false }) => (
  <button type="button" aria-pressed={selected} disabled={disabled} onClick={onClick}
    aria-label={ariaLabel || `d${getDieFaces(die)} · ${die.value}`}
    className="combat-die-choice">
    <ActionDieSvg faces={getDieFaces(die)} value={die.value} title={ariaLabel} className="h-12 w-12"
      accent={disabled ? 'slate' : 'gold'} status={disabled ? 'spent' : 'available'} selected={selected} connectedFaces={connectedFaces} />
    {showType && <span className="combat-die-type">d{getDieFaces(die)}</span>}
    <span className="combat-die-status" aria-hidden="true">{selected ? selectedLabel : availableLabel}</span>
  </button>
);

export const ResultDie = ({ faces, value, label, accent = getCombatDieAppearance(label).accent }) => (
  <div className="combat-roll-die" aria-label={`${label}: ${value} en d${faces}`}>
    <ActionDieSvg faces={faces} value={value} className="h-11 w-11" accent={accent} />
    <span>d{faces}</span>
  </div>
);

const RollGroup = ({ label, children, operator = '+' }) => (
  <div className="combat-roll-group" data-operator={operator}>
    <div className="combat-roll-values">{children}</div>
    <span className="combat-roll-label">{label}</span>
  </div>
);

export const splitAttackDiceProfile = (profile = []) => {
  const hasWeaponSources = profile.some(die => die.weaponId);
  const isFury = die => die.source === 'Furia';
  const isMana = die => die.source === 'Maná';
  const isModifier = die => !isFury(die) && !isMana(die) && (die.source === 'Modificador' || String(die.id || '').startsWith('modifier-')
    || (hasWeaponSources && !die.weaponId));
  return { weaponProfile: profile.filter(die => !isModifier(die) && !isFury(die) && !isMana(die)), modifierProfile: profile.filter(isModifier), furyProfile: profile.filter(isFury), manaProfile: profile.filter(isMana) };
};

const manualTraitNames = { critico: 'Crítico', perforante: 'Perforante', venenosa: 'Venenosa', sangrado: 'Sangrado' };

export const AttackModifiers = ({ weapon = {}, profile = [], glossary = [], showDice = true }) => {
  const dice = showDice ? splitAttackDiceProfile(profile).modifierProfile : [];
  const requested = getCanvasWeaponTraits({ rasgos: weapon.manualCombatTraits || [] }).filter(trait => manualTraitNames[trait]);
  const effective = new Set(getCanvasWeaponTraits(weapon));
  const active = requested.filter(trait => effective.has(trait)).map(trait => manualTraitNames[trait]);
  const inactive = requested.filter(trait => !effective.has(trait)).map(trait => manualTraitNames[trait]);
  if (!dice.length && !requested.length) return null;
  return <section className="combat-attack-modifiers" aria-label="Modificadores del ataque">
    <div className="combat-attack-modifiers-heading"><h3>{showDice ? 'Modificadores' : 'Rasgos añadidos'}</h3>
      {dice.length > 0 && <span>Se tiran al confirmar</span>}
    </div>
    {dice.length > 0 && <div className="combat-attack-modifier-dice">{dice.map((die, index) => <div key={die.id || index}
      aria-label={`Modificador d${getDieFaces(die)}, por tirar`}>
      <ActionDieSvg faces={getDieFaces(die)} value={getDieFaces(die)} connectedFaces accent={getCombatDieAppearance('Modificador').accent} />
    </div>)}</div>}
    <CombatWeaponTraits traits={active} glossary={glossary} />
    {inactive.length > 0 && <p className="combat-attack-modifiers-inactive">Sin efecto · {inactive.join(' · ')}</p>}
  </section>;
};

export const AttackWeaponLineup = ({ parts = [], customImages, showTraits = true }) => (
  <div className="combat-weapon-lineup">
    {parts.map((part, index) => {
      const item = part.weapon;
      const image = resolveEquipmentImage(item, customImages);
      return <div key={part.weaponId || index} className="combat-weapon-part">
        {image && <img src={image} alt="" />}
        <span className="combat-eyebrow">{item.canvasSlot === 'mainHand' ? 'Mano principal' : item.canvasSlot === 'offHand' ? 'Mano secundaria' : `Arma ${index + 1}`}</span>
        <strong>{item.name || item.nombre}</strong>
        <span>{part.profile.map(die => die.die).join(' + ')}</span>
        {showTraits && <small>{part.traits.length ? part.traits.join(' · ') : 'Sin rasgos activos'}</small>}
      </div>;
    })}
  </div>
);

export const IncomingAttackDice = ({ pending, threatDie }) => {
  const criticals = pending.criticalResults || (Number(pending.criticalResult) > 0
    ? [{ sides: pending.criticalDieSides, value: pending.criticalResult }] : []);
  const threatDice = getCanvasAttackThreatDice(pending);
  const historicalThreatTotal = !Array.isArray(pending.attackThreatDice) && !threatDice.length
    ? Number(pending.pressure?.threatPressure) || 0 : 0;
  const { modifierProfile, furyProfile, manaProfile } = splitAttackDiceProfile(pending.weaponDiceProfile);
  const modifierDice = new Set(modifierProfile);
  const classResourceDice = new Set([...furyProfile, ...manaProfile]);
  const cunningIndex = pending.cunning?.choice === 'rerolled' ? pending.cunning.dieIndex : -1;
  const weaponLabel = pending.spellId ? 'Catalizador' : pending.blastId ? 'Explosión' : 'Arma';
  return (
    <div className="combat-roll-groups">
      {!!pending.actionDice?.length && (
        <RollGroup label="Acción">{pending.actionDice.map((die) => (
          <ResultDie key={die.id} faces={getDieFaces(die)} value={die.value} label="Acción" />
        ))}</RollGroup>
      )}
      {!pending.actionDice?.length && pending.pressure?.actionPressure > 0 && (
        <RollGroup label="Base ofensiva"><div className="combat-roll-die"><strong className="combat-flat-roll">{pending.pressure.actionPressure}</strong><span>Fija</span></div></RollGroup>
      )}
      {!!pending.weaponResults?.length && !(pending.attackParts?.length > 1) && (
        <RollGroup label={weaponLabel}>{pending.weaponResults.map((value, index) => !modifierDice.has(pending.weaponDiceProfile?.[index]) && !classResourceDice.has(pending.weaponDiceProfile?.[index])
          ? <ResultDie key={index} faces={pending.weaponDiceProfile?.[index]?.sides || 6} value={value} label={index === cunningIndex ? 'Astucia' : weaponLabel} /> : null
        )}</RollGroup>
      )}
      {pending.attackParts?.length > 1 && pending.attackParts.map((part, partIndex) => (
        <RollGroup key={part.weaponId} label={`${part.weapon.name || part.weapon.nombre} · ${partIndex + 1}`}>
          {(pending.weaponDiceProfile || []).map((die, index) => die.weaponId === part.weaponId && !modifierDice.has(die)
            ? <ResultDie key={index} faces={die.sides} value={pending.weaponResults[index]} label={index === cunningIndex ? 'Astucia' : part.weapon.name || part.weapon.nombre} /> : null)}
        </RollGroup>
      ))}
      {modifierProfile.length > 0 && (
        <RollGroup label="Modificador">{pending.weaponDiceProfile.map((die, index) => modifierDice.has(die)
          ? <ResultDie key={die.id || index} faces={die.sides} value={pending.weaponResults[index]} label="Modificador" /> : null)}
        </RollGroup>
      )}
      {furyProfile.length > 0 && <RollGroup label={`Furia · ${pending.furySpent} gastada`}>
        {pending.weaponDiceProfile.map((die, index) => die.source === 'Furia'
          ? <ResultDie key={die.id} faces={die.sides} value={pending.weaponResults[index]} label="Furia" /> : null)}
      </RollGroup>}
      {manaProfile.length > 0 && <RollGroup label={`Maná · ${pending.manaSpent} gastado`}>
        {pending.weaponDiceProfile.map((die, index) => die.source === 'Maná'
          ? <ResultDie key={die.id} faces={die.sides} value={pending.weaponResults[index]} label="Maná" /> : null)}
      </RollGroup>}
      {criticals.length > 0 && (
        <RollGroup label="Crítico">{criticals.map((die, index) => (
          <ResultDie key={index} faces={die.sides || pending.weaponDiceProfile?.[0]?.sides || 6} value={die.value} label="Crítico" />
        ))}</RollGroup>
      )}
      {threatDice.length > 0 && (
        <RollGroup label="Amenaza">
          {threatDice.map((die, index) => (
            <ResultDie key={die.id || index} faces={getDieFaces({ die: threatDie, sides: pending.threatDieSides, ...die })} value={die.value} label="Amenaza" accent="red" />
          ))}
        </RollGroup>
      )}
      {historicalThreatTotal > 0 && (
        <RollGroup label="Amenaza"><div className="combat-roll-die" aria-label={`Amenaza: ${historicalThreatTotal} en total`}><strong className="combat-flat-roll">{historicalThreatTotal}</strong><span>Total</span></div></RollGroup>
      )}
      {pending.pressure?.thrownPenalty > 0 && (
        <RollGroup label="Arrojadiza" operator="−"><div className="combat-roll-die"><strong className="combat-flat-roll">{pending.pressure.thrownPenalty}</strong><span>Penalización</span></div></RollGroup>
      )}
    </div>
  );
};

export const IncomingAttackSummary = ({ pending, threatDie, customImages }) => {
  const image = resolveEquipmentImage({ ...pending.weapon, name: pending.weapon?.name || pending.weapon?.nombre || pending.weaponName }, customImages);
  return (
    <section className="combat-incoming" aria-label="Dados del atacante">
      {image && <img className="combat-incoming-art" src={image} alt="" />}
      <div className="combat-incoming-shade" />
      <div className="combat-defense-card-content">
        <div className="combat-defense-copy">
          <div className="combat-defense-identity">
            <span className="combat-eyebrow">Presión entrante</span>
            <h3>{pending.attackParts?.length > 1 ? 'Ataque combinado' : pending.weaponName}</h3>
            <span className="sr-only">Dados del atacante</span>
          </div>
          <div className="combat-pressure-line">
            <IncomingAttackDice pending={pending} threatDie={threatDie} />
          </div>
        </div>
        <div className="combat-cd-seal combat-attack-seal"><span>Ataque</span><strong>{pending.pressure?.total || 0}</strong><small>Total</small></div>
      </div>
    </section>
  );
};

export const DefenseRollSummary = ({ pending }) => {
  const threatDice = getCanvasDefenseThreatDice(pending);
  const equipment = pending.defenseItems || [pending.defenseItem].filter(Boolean);
  const splitWeapons = equipment.length > 1 && (pending.defenseDice || []).every(die => equipment.some(item => getCanvasWeaponIdentity(item) === die.weaponId));
  const groups = splitWeapons ? equipment.map((item, index) => ({
    id: getCanvasWeaponIdentity(item), name: `${item.name || item.nombre} · ${index + 1}`,
    dice: (pending.defenseDice || []).filter(die => die.weaponId === getCanvasWeaponIdentity(item)),
  })) : [{ id: 'equipment', name: 'Equipo', dice: pending.defenseDice || [] }];
  return (
    <section>
      <div className="combat-section-heading"><h3>Tirada defensiva</h3><span>{equipment.map(item => item.name || item.nombre).join(' + ')}</span></div>
      <div className="combat-roll-groups combat-defense-roll">
        {groups.map(group => <RollGroup key={group.id} label={group.name}>{group.dice.map((die) => (
          <ResultDie key={die.id} faces={getDieFaces(die)} value={die.value} label="Defensa" />
        ))}</RollGroup>)}
        {threatDice.length > 0 && <RollGroup label="Amenaza">{threatDice.map((die, index) => (
          <ResultDie key={die.id || index} faces={getDieFaces(die)} value={die.value} label="Amenaza" accent="red" />
        ))}</RollGroup>}
      </div>
      {pending.defenseShield && <p className="attack-defense-note">{pending.defenseShield.name || pending.defenseShield.nombre} · Protección pasiva</p>}
    </section>
  );
};

export const ResolutionMetrics = ({ attack = 0, defense = 0, remaining = 0, excess = 0, cd, lifeLost = 0, forecast = false }) => (
  <section className="combat-resolution" aria-label="Resultado de la defensa" aria-live="polite" aria-atomic="true">
    <div className="combat-outcome" data-hurt={lifeLost > 0}>
      <div><span>{forecast ? 'Si recibes el ataque' : 'Resultado previsto'}</span>
        <strong>{lifeLost > 0 ? `Pierdes ${lifeLost} ${lifeLost === 1 ? 'bloque' : 'bloques'} de Vida` : remaining === 0 ? 'Ataque anulado' : 'Sin pérdida de Vida'}</strong>
      </div>
      {excess > 0 && <span className="combat-surplus">Excedente <strong>{excess}</strong></span>}
    </div>
    <dl className="combat-equation">
      <div><dt>Ataque</dt><dd>{attack}</dd></div>
      <div data-operator="−"><dt>Defensa total</dt><dd>{defense}</dd></div>
      <div data-operator="→"><dt>Presión restante</dt><dd>{remaining}</dd></div>
      <div data-operator="/"><dt>CD</dt><dd>{cd}</dd></div>
    </dl>
  </section>
);

export const DefenseEquipmentChoice = ({ item, selected, disabled, onClick, customImages, glossary, purpose = 'defense', copyLabel }) => {
  const image = resolveEquipmentImage(item, customImages);
  const traits = getItemTraits(item);
  const shield = purpose === 'defense' && isCanvasShield(item);
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={selected} className="combat-equipment-choice" data-purpose={shield ? 'shield' : purpose}>
      <span className="combat-equipment-portrait">{image ? <img className="combat-equipment-art" src={image} alt="" draggable={false} /> : shield ? <Shield className="combat-equipment-shield" size={104} strokeWidth={.8} aria-hidden="true" /> : <span aria-hidden="true">{(item.name || item.nombre || 'A').slice(0, 1)}</span>}</span>
      <span className="combat-equipment-copy">
        <span className="combat-equipment-status sr-only">{selected ? 'Seleccionada' : 'Disponible'}</span>
        <span className="combat-equipment-name">{item.name || item.nombre || 'Equipo defensivo'}</span>
        {copyLabel && <span className="combat-equipment-instance">{copyLabel}</span>}
        <span className="combat-equipment-profile">{shield ? 'Protección' : purpose === 'defense' ? 'Defensa' : purpose === 'attack' ? 'Perfil' : 'Alcance'}<strong>{shield ? '+1 CD' : purpose !== 'counterattack' ? parseWeaponDiceProfile(item).map((die) => die.die).join(' + ') : (item.range || item.alcance || 'Arma equipada')}</strong></span>
        {shield ? <span className="combat-equipment-passive">Pasivo · Sin dados</span> : glossary ? <CombatWeaponTraits as="span" traits={traits} glossary={glossary} />
          : traits.length > 0 && <span className="combat-equipment-traits">{traits.map(trait => <span key={trait}>{trait}</span>)}</span>}
      </span>
      <span className="combat-equipment-mark" aria-hidden="true">{selected ? '✓' : ''}</span>
    </button>
  );
};

export const ThreatChoice = ({ mode, onModeChange, hasStoredThreat, storedThreatValue, sides, onSidesChange, purpose = 'defensa', allowCustom = true }) => (
  <section className="combat-threat">
    <div className="combat-section-heading"><h3>Amenaza</h3><span>Opcional · máximo 1 dado</span></div>
    <div className="combat-threat-options" aria-label="Origen de la Amenaza">
      <button type="button" aria-pressed={mode === 'none'} onClick={() => onModeChange('none')}>Sin amenaza</button>
      {hasStoredThreat && <button type="button" aria-pressed={mode === 'stored'} onClick={() => onModeChange('stored')}>Reserva <strong>+{storedThreatValue}</strong></button>}
      {allowCustom && <button type="button" aria-label="Añadir dado puntual" aria-pressed={mode === 'custom'} onClick={() => onModeChange('custom')}>Dado puntual</button>}
    </div>
    {mode === 'custom' ? (
      <>
        <div className="combat-threat-dice" aria-label="Tamaño del dado de Amenaza">
          {[4, 6, 8, 10, 12, 20].map((faces) => (
            <button key={faces} type="button" aria-label={`Amenaza personalizada d${faces}`} aria-pressed={sides === faces} onClick={() => onSidesChange(faces)}>
              <ActionDieSvg faces={faces} value="" className="combat-threat-shape" accent={sides === faces ? 'gold' : 'slate'} />
              <span>d{faces}</span>
            </button>
          ))}
        </div>
        <p className="combat-help">Se tirará 1d{sides} y se sumará a esta {purpose}.</p>
      </>
    ) : <p className="combat-help">{mode === 'stored'
      ? `Añade ${storedThreatValue} ${purpose === 'ataque' ? 'al ataque' : 'a la defensa'} y consume la reserva.`
      : purpose === 'ataque'
        ? hasStoredThreat ? 'Conserva la reserva para otra acción.' : 'Ataca sin añadir Amenaza.'
        : 'Defiende solo con el perfil del equipo.'}</p>}
  </section>
);
