import React from 'react';

const effectLabel = effect => typeof effect === 'string' ? effect : effect?.label || effect?.name || effect?.id;

// Render only explicit public results, never token stats, CD, or raw debug/log text.
export const CombatLogDetails = ({ entry }) => {
  const sideName = side => side === 'attacker' ? entry.attackerName : entry.targetName;
  const effects = ['target', 'attacker'].flatMap(side => (
    [
      ...(entry.statusEffectsApplied?.[side] || []).map(effect => ({ side, label: effectLabel(effect), removed: false })),
      ...(entry.statusEffectsRemoved?.[side] || []).map(effect => ({ side, label: effectLabel(effect), removed: true })),
    ]
  )).filter(effect => effect.label);
  return (
    <div className="space-y-2 px-1 text-[11px] leading-relaxed text-slate-400">
      {entry.canvasRoguelite && !entry.attackerDice?.length && <p className="text-[10px] italic text-slate-500">Detalle de dados no guardado en esta entrada.</p>}
      {entry.fixedAttackPressure > 0 && <p>Base ofensiva: <strong className="text-[#c8aa6e]">+{entry.fixedAttackPressure}</strong></p>}
      {entry.thrownPenalty > 0 && <p>Penalización arrojadiza: −{entry.thrownPenalty} Presión</p>}
      {(entry.defenderSteps || []).map((step, i) => (
        <p key={step.id || i}>{step.weaponName}: {step.total} de defensa{step.yellowCost > 0 ? ` · ${step.yellowCost} acción(es) consumida(s)` : ''}{step.fluidaDiscountApplied ? ' · Descuento de Fluida' : ''}</p>
      ))}
      {entry.attackWeapons?.length > 1 && <p>{entry.attackWeapons.map((weapon, index) => `${weapon.name} · ${weapon.hand === 'mainHand' ? 'principal' : weapon.hand === 'offHand' ? 'secundaria' : `arma ${index + 1}`}`).join(' / ')}</p>}
      {entry.defenderShield && <p>{entry.defenderShield.name || 'Escudo'} · protección pasiva.</p>}
      {entry.adjustment && <p>Ajuste: devuelve {entry.adjustment.previous.value} y compromete {entry.adjustment.replacement.value}; conserva la tirada de armas.</p>}
      {(entry.resourcesSpent || []).map((resource, i) => <p key={i}><span className="text-[#c8aa6e]">Consumido</span> · {sideName(resource.side)}: {resource.label}</p>)}
      {entry.excessChoice === 'reposition' && entry.surplus > 0 && <p className="text-[#c8aa6e]">Excedente: {entry.surplus} casilla(s) para reposicionarse, sin ataque de oportunidad.</p>}
      {entry.counterDamage > 0 && <p className="text-red-300">Contraataque{entry.counterWeaponName ? ` · ${entry.counterWeaponName}` : ''}: {entry.counterDamage} {entry.canvasRoguelite ? 'Presión' : 'daño'}{entry.attackerBlocksLost ? ` · −${entry.attackerBlocksLost.vida || 0} Vida (${entry.attackerName})` : ''}</p>}
      {effects.map((effect, i) => <p key={i}><span className="text-amber-300">{effect.removed ? 'Finaliza: ' : ''}{effect.label}</span> · {sideName(effect.side)}</p>)}
      {entry.negatedTraits?.length > 0 && <p>Rasgos anulados: {entry.negatedTraits.map(effectLabel).filter(Boolean).join(' · ')}</p>}
    </div>
  );
};
