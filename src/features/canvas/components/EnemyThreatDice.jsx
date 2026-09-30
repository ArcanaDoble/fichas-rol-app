import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { ActionDieButton, getDieFaces } from './CanvasCombatDetails';
import './EnemyThreatDice.css';

const THREAT_SIDES = [4, 6, 8, 10, 12, 20];

const EnemyThreatDice = ({
  selection = { useStored: false, customDice: [] }, onChange, storedThreatValue, storedThreatDie,
  disabled = false, busy = false, purpose = 'defense',
}) => {
  const isAttack = purpose === 'attack';
  const selectedLabel = isAttack ? 'En ataque' : 'En defensa';
  const hasStoredThreat = storedThreatValue !== null
    && storedThreatValue !== undefined
    && Number.isFinite(Number(storedThreatValue));
  const storedFaces = getDieFaces({ die: storedThreatDie });
  const customDice = selection.customDice || [];
  const storedSelected = hasStoredThreat && selection.useStored;
  const counts = THREAT_SIDES.map(sides => ({ sides, count: customDice.filter(die => die === sides).length })).filter(group => group.count);
  const total = customDice.length + Number(Boolean(storedSelected));
  const profile = counts.map(({ sides, count }) => `${count}d${sides}`).join(' + ');
  const changeCustom = dice => onChange({ useStored: Boolean(storedSelected), customDice: dice });
  const chooseCustom = (faces) => {
    changeCustom(customDice.includes(faces) ? customDice.filter(die => die !== faces) : [...customDice, faces]);
  };
  const removeCustom = faces => {
    const index = customDice.lastIndexOf(faces);
    changeCustom(customDice.filter((_, dieIndex) => dieIndex !== index));
  };

  return (
    <section className="enemy-threat" aria-label="Dados de Amenaza">
      <div className="enemy-threat-heading">
        <h3>Amenaza</h3><span aria-live="polite">{total ? `${total} ${total === 1 ? 'dado' : 'dados'}` : 'Opcional'}</span>
      </div>
      <div className="enemy-threat-options">
        {hasStoredThreat && (
          <div className="enemy-threat-reserve" role="group" aria-label="Reserva de Amenaza">
            <div className="combat-dice-tray">
              <ActionDieButton
                die={{ die: storedThreatDie, sides: storedFaces, value: Number(storedThreatValue) }}
                selected={storedSelected} disabled={disabled} connectedFaces={storedFaces === 20}
                availableLabel="Reserva" selectedLabel={selectedLabel}
                ariaLabel={`Reserva de Amenaza d${storedFaces} · ${Number(storedThreatValue)}`}
                onClick={() => onChange({ useStored: !storedSelected, customDice })}
              />
            </div>
          </div>
        )}
        <div className="enemy-threat-custom" role="group" aria-label="Dados puntuales de Amenaza">
          <div className="combat-dice-tray">
            {THREAT_SIDES.map(faces => (
              <ActionDieButton key={faces} die={{ sides: faces, value: faces }} showType={false} connectedFaces={faces === 20}
                selected={customDice.includes(faces)} disabled={disabled}
                availableLabel="Por tirar" selectedLabel={selectedLabel}
                ariaLabel={`Dado puntual d${faces}, por tirar`}
                onClick={() => chooseCustom(faces)}
              />
            ))}
          </div>
        </div>
      </div>
      {counts.length > 0 && <div className="enemy-threat-quantities" aria-label="Cantidad de dados de Amenaza">
        {counts.map(({ sides, count }) => <div className="enemy-threat-quantity" role="group" aria-label={`Cantidad de d${sides} de Amenaza`} key={sides}>
          <span className="enemy-threat-quantity-type">d{sides}</span>
          <button type="button" disabled={disabled} aria-label={`Quitar dado d${sides} de Amenaza`} onClick={() => removeCustom(sides)}><Minus size={16} aria-hidden="true" /></button>
          <output aria-live="polite">{count}</output>
          <button type="button" disabled={disabled} aria-label={`Añadir dado d${sides} de Amenaza`} onClick={() => changeCustom([...customDice, sides])}><Plus size={16} aria-hidden="true" /></button>
        </div>)}
      </div>}
      <p className="enemy-threat-note">
        {busy ? (isAttack ? 'Resolviendo ataque…' : 'Resolviendo defensa…')
          : disabled ? 'Elige equipo para añadir Amenaza.'
          : customDice.length ? `Se ${customDice.length === 1 ? 'tira' : 'tiran'} ${profile} al confirmar${storedSelected ? `; añade ${Number(storedThreatValue)} de la reserva y la consume.` : hasStoredThreat ? '; conserva la reserva.' : '.'}`
            : storedSelected ? `Añade ${Number(storedThreatValue)} ${isAttack ? 'al ataque' : 'a la defensa'} y consume la reserva.`
              : `Sin dados seleccionados, ${isAttack ? 'atacas' : 'defiendes'} sin Amenaza.`}
      </p>
    </section>
  );
};

export default EnemyThreatDice;
