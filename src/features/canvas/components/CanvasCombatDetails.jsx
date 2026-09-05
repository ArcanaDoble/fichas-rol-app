import React from 'react';
import ActionDieSvg from '../../../components/ActionDieSvg';
import { resolveEquipmentImage } from '../../../utils/equipmentImages';
import { parseWeaponDiceProfile } from '../combat/canvasAttackRules';
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

export const ActionDieButton = ({ die, selected, disabled, onClick, selectedLabel = 'Seleccionado' }) => (
  <button type="button" aria-pressed={selected} disabled={disabled} onClick={onClick}
    aria-label={`d${getDieFaces(die)} · ${die.value}`}
    className="combat-die-choice">
    <ActionDieSvg faces={getDieFaces(die)} value={die.value} className="h-12 w-12"
      accent={disabled ? 'slate' : 'gold'} status={disabled ? 'spent' : 'available'} selected={selected} />
    <span className="combat-die-type">d{getDieFaces(die)}</span>
    <span className="combat-die-status" aria-hidden="true">{selected ? selectedLabel : 'Disponible'}</span>
  </button>
);

export const ResultDie = ({ faces, value, label, accent = 'gold' }) => (
  <div className="combat-roll-die" aria-label={`${label}: ${value} en d${faces}`}>
    <ActionDieSvg faces={faces} value={value} className="h-11 w-11" accent={accent} />
    <span>d{faces}</span>
  </div>
);

const RollGroup = ({ label, children }) => (
  <div className="combat-roll-group">
    <div className="combat-roll-values">{children}</div>
    <span className="combat-roll-label">{label}</span>
  </div>
);

export const IncomingAttackSummary = ({ pending, threatDie, customImages }) => {
  const criticals = pending.criticalResults || (Number(pending.criticalResult) > 0
    ? [{ sides: pending.criticalDieSides, value: pending.criticalResult }] : []);
  const image = resolveEquipmentImage({ ...pending.weapon, name: pending.weapon?.name || pending.weapon?.nombre || pending.weaponName }, customImages);
  return (
    <section className="combat-incoming" aria-label="Dados del atacante">
      {image && <img className="combat-incoming-art" src={image} alt="" />}
      <div className="combat-incoming-shade" />
      <div className="combat-section-heading">
        <h3>Presión entrante</h3><span className="combat-source-name">{pending.weaponName}</span>
        <span className="sr-only">Dados del atacante</span>
      </div>
      <div className="combat-pressure-line">
        <div className="combat-roll-groups">
          {!!pending.actionDice?.length && (
            <RollGroup label="Acción">{pending.actionDice.map((die) => (
              <ResultDie key={die.id} faces={getDieFaces(die)} value={die.value} label="Acción" />
            ))}</RollGroup>
          )}
          {!pending.actionDice?.length && pending.pressure?.actionPressure > 0 && (
            <RollGroup label="Base ofensiva"><strong className="combat-flat-roll">{pending.pressure.actionPressure}</strong></RollGroup>
          )}
          {!!pending.weaponResults?.length && (
            <RollGroup label="Arma">{pending.weaponResults.map((value, index) => (
              <ResultDie key={index} faces={pending.weaponDiceProfile?.[index]?.sides || 6} value={value} label="Arma" />
            ))}</RollGroup>
          )}
          {criticals.length > 0 && (
            <RollGroup label="Crítico">{criticals.map((die, index) => (
              <ResultDie key={index} faces={die.sides || pending.weaponDiceProfile?.[0]?.sides || 6} value={die.value} label="Crítico" />
            ))}</RollGroup>
          )}
          {pending.pressure?.threatPressure > 0 && (
            <RollGroup label="Amenaza">
              <ResultDie faces={pending.threatDieSides || getDieFaces({ die: threatDie })} value={pending.pressure.threatPressure} label="Amenaza" accent="red" />
            </RollGroup>
          )}
          {pending.pressure?.thrownPenalty > 0 && (
            <RollGroup label="Arrojadiza"><strong className="combat-flat-roll">−{pending.pressure.thrownPenalty}</strong></RollGroup>
          )}
        </div>
        <div className="combat-pressure-total"><strong>{pending.pressure?.total || 0}</strong><span>Total</span></div>
      </div>
    </section>
  );
};

export const DefenseRollSummary = ({ pending }) => (
  <section>
    <div className="combat-section-heading"><h3>Tirada defensiva</h3><span>{pending.defenseItem?.name || pending.defenseItem?.nombre}</span></div>
    <div className="combat-roll-groups combat-defense-roll">
      <RollGroup label="Equipo">{(pending.defenseDice || []).map((die) => (
        <ResultDie key={die.id} faces={getDieFaces(die)} value={die.value} label="Defensa" />
      ))}</RollGroup>
      {pending.threatUsed && <RollGroup label="Amenaza"><ResultDie faces={getDieFaces(pending.threatUsed)} value={pending.threatUsed.value} label="Amenaza" accent="red" /></RollGroup>}
    </div>
  </section>
);

export const ResolutionMetrics = ({ defense = 0, remaining = 0, excess = 0, cd }) => (
  <section className="combat-resolution" aria-label="Resultado de la defensa" aria-live="polite">
    <div className="combat-resolution-main" data-blocked={remaining === 0}>
      <div><span className="combat-eyebrow">Presión restante</span>
        <p>{remaining > 0 ? (
          <>Continúa contra <span className="combat-resolution-cd">{cd ? `CD ${cd}` : 'la CD'}</span></>
        ) : 'Ataque anulado'}</p>
      </div>
      <strong>{remaining}</strong>
    </div>
    <dl className="combat-resolution-ledger">
      <div><dt>Defensa total</dt><dd>{defense}</dd></div>
      <div data-active={excess > 0}><dt>Excedente</dt><dd>{excess}</dd></div>
    </dl>
    {excess > 0 && <p className="combat-help">Destina el excedente a reposicionarte o contraatacar.</p>}
  </section>
);

export const DefenseEquipmentChoice = ({ item, selected, onClick, customImages }) => {
  const image = resolveEquipmentImage(item, customImages);
  const traits = getItemTraits(item);
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className="combat-equipment-choice">
      {image && <img src={image} alt="" className="combat-equipment-art" />}
      <span className="combat-equipment-shade" />
      <span className="combat-equipment-content">
        <span className="combat-equipment-topline"><span>{selected ? '◆ Seleccionada' : '◇ Elegir equipo'}</span><span>Defensa</span></span>
        <span className="combat-equipment-title"><strong>{item.name || item.nombre || 'Equipo defensivo'}</strong>
          <span>{parseWeaponDiceProfile(item).map((die) => die.die).join(' + ')}</span>
        </span>
        {traits.length > 0 && <span className="combat-equipment-traits">{traits.map((trait) => <span key={trait}>◆ {trait}</span>)}</span>}
      </span>
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
