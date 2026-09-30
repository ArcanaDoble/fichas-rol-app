import React, { useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import LoadingImage from '../../../components/LoadingImage';
import { resolveEquipmentImage } from '../../../utils/equipmentImages';
import { getCanvasCunningOption, finishCanvasCunning } from '../combat/canvasCunning';
import { ResultDie, IncomingAttackDice } from './CanvasCombatDetails';
import './CanvasAttackDefense.css';
import './CanvasCunningChoice.css';

export default function CanvasCunningChoice({ pending, attacker, customImages, onResolve, busy }) {
  const option = getCanvasCunningOption(attacker, pending);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const index = selectedIndex ?? option.dice[0]?.index;
  const choosing = pending.status === 'awaiting-cunning-choice';
  const selected = option.dice.find(die => die.index === (choosing ? pending.cunning.dieIndex : index));
  const artWeapon = pending.attackParts?.find(part => part.weaponId === selected?.weaponId)?.weapon || pending.weapon;
  const image = resolveEquipmentImage(artWeapon, customImages);
  const sides = pending.weaponDiceProfile?.[pending.cunning?.dieIndex]?.sides;
  return <>
    <div className="combat-modal-body attack-defense-body cunning-body custom-scrollbar" aria-busy={busy}>
      <div className="attack-defense-scene">
        <div className="attack-defense-art" aria-hidden="true">
          {image && <div><LoadingImage src={image} alt="" skeleton={false} showFailureFallback={false} draggable={false} /></div>}
        </div>
        <header className="attack-defense-heading cunning-heading">
          <h2>Golpe sucio</h2>
          <p><strong>{pending.attackerName}</strong><span>VS</span><strong>{pending.targetName}</strong></p>
        </header>
        <section className="attack-defense-incoming">
          <div className="attack-defense-weapon-names"><h3>{pending.weaponName}</h3></div>
          <p className="attack-defense-pressure"><strong>{pending.pressure?.total || 0}</strong><span>Presión actual</span></p>
          {!choosing && <div className="attack-defense-rolls"><IncomingAttackDice pending={pending} /></div>}
        </section>
      </div>
      <section className="cunning-controls" aria-label="Gasto de Astucia">
        <p className="cunning-reserve">{choosing ? '1 de Astucia gastada' : `${option.available} de Astucia disponible`}</p>
        <p className="cunning-instruction" aria-live="polite">{choosing ? 'Elige qué resultado conservar.' : 'Repite un dado del arma y conserva el resultado que prefieras.'}</p>
        {choosing ? <div className="cunning-comparison">
          {['original', 'rerolled'].map(choice => {
            const original = choice === 'original';
            const value = original ? pending.cunning.originalValue : pending.cunning.value;
            const critical = (original ? pending.cunning.originalCriticalResults : pending.cunning.criticalResults) || [];
            return <button key={choice} type="button" className="cunning-result" disabled={busy}
              onClick={() => onResolve({ choice })} aria-label={`Conservar ${original ? 'original' : 'nueva tirada'}: ${value}`}>
              <span>{original ? 'Original' : 'Golpe sucio'}</span>
              <ResultDie faces={sides} value={value} label={original ? 'Arma' : 'Astucia'} />
              <small>{critical.length ? `Crítico +${critical.reduce((sum, die) => sum + die.value, 0)}` : 'Sin crítico'}</small>
              <small>Presión {finishCanvasCunning(pending, attacker, choice)?.pressure.total}</small>
              <strong>Conservar <ArrowRight size={16} aria-hidden="true" /></strong>
            </button>;
          })}
        </div> : <div className="cunning-dice" role="group" aria-label="Dado de arma que repetir">
          {option.dice.map(die => <button key={die.id} type="button" className="combat-die-choice" aria-pressed={index === die.index}
            disabled={busy || !option.available} onClick={() => setSelectedIndex(die.index)} aria-label={`${die.weaponName}: ${die.value} en d${die.sides}`}>
            <ResultDie faces={die.sides} value={die.value} label="Arma" accent={index === die.index ? 'teal' : 'gold'} />
            <span>{die.weaponName}</span>
          </button>)}
        </div>}
        <p className="cunning-wait">La defensa espera a que termines.</p>
      </section>
    </div>
    {!choosing && <footer className="combat-modal-footer cunning-footer">
      <button type="button" className="combat-confirm" disabled={busy || !option.eligible || !option.available || index === undefined}
        onClick={() => onResolve({ dieIndex: index })}><RotateCcw size={18} aria-hidden="true" /><span>{busy ? 'Resolviendo…' : 'Repetir dado · 1 Astucia'}</span></button>
      <button type="button" className="defensive-excess-discard" disabled={busy} onClick={() => onResolve({ choice: 'skip' })}>Continuar sin gastar Astucia</button>
    </footer>}
  </>;
}
