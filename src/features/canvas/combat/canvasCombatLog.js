import { getCanvasAttackThreatDice, getCanvasDefenseThreatDice, getCanvasWeaponIdentity } from './canvasAttackRules';

const traitsOf = (item) => {
  const traits = item?.rasgos ?? item?.traits ?? item?.properties ?? [];
  return (Array.isArray(traits) ? traits : String(traits).split(',')).filter(Boolean);
};

const logDie = (die, id, source) => ({
  id: die.id || id,
  faces: Number(die.sides || die.faces || String(die.die || '').replace('d', '')) || 6,
  value: Number(die.value) || 0,
  source,
  ...(die.weaponId ? { weaponId: die.weaponId } : {}),
  ...(die.sourceIndex !== undefined ? { sourceIndex: die.sourceIndex } : {}),
  critical: source === 'Crítico',
});

export const buildCanvasArcaneMistLog = ({ scenarioId, castId, token, spell, actionDie, manaCost, conserve, placement, now }) => ({
  sourceEventId: castId, scenarioId, eventType: 'spell-use', spellId: 'arcane-mist',
  actorId: token.id, actorName: token.name || 'Mago', itemName: spell.name || spell.nombre || 'Niebla arcana',
  cells: placement.cells, duration: 'combat-end',
  resourcesSpent: [
    { label: conserve ? 'Copia conservada' : '1 copia preparada', resource: 'spell' },
    { label: `1 dado de acción d${actionDie.sides} · Valor ignorado`, diceIds: [actionDie.id] },
    ...(manaCost ? [{ label: `${manaCost} de Maná`, amount: manaCost, resource: 'mana' }] : []),
  ],
  canvasRoguelite: true, logVersion: 2, clientTimestamp: now,
});

export const buildCanvasArcaneBarrierLog = ({ scenarioId, castId, token, target, actionDie, manaCost, conserve, protections, now }) => ({
  sourceEventId: castId, scenarioId, eventType: 'spell-use', spellId: 'runic-barrier',
  actorId: token.id, actorName: token.name || 'Mago', itemName: 'Barrera rúnica',
  targetId: target.id, targetName: target.name || 'Aliado', cdBonus: 1, duration: 'combat-end', protections,
  resourcesSpent: [
    { label: conserve ? 'Copia conservada' : '1 copia preparada', resource: 'spell' },
    { label: `1 dado de acción d${actionDie.sides} · Valor ignorado`, diceIds: [actionDie.id] },
    ...(manaCost ? [{ label: `${manaCost} de Maná`, amount: manaCost, resource: 'mana' }] : []),
  ], canvasRoguelite: true, logVersion: 2, clientTimestamp: now,
});

export const buildCanvasHealingPotionLog = ({ scenarioId, useId, token, item, result, resource, now }) => ({
  sourceEventId: useId, scenarioId, eventType: 'item-use', effect: 'heal',
  actorId: token.id, targetId: token.id, actorName: token.name || 'Personaje', itemName: item.name || item.nombre || 'Poción de curación',
  itemImage: item.image || item.imageUrl || item.img || null,
  dice: [{ id: `${useId}-healing`, faces: 4, value: result.roll, source: 'Curación' }],
  healed: result.healed,
  resourcesSpent: [{ label: '1 consumible' }, {
    label: ({ 'enemy-action': 'Acción principal', 'enemy-movement': 'Movimiento', 'threat-die': 'Reserva de Amenaza',
      'manual-threat': `Amenaza puntual d${resource.sides}` })[resource.kind] || '1 dado de acción',
  }],
  canvasRoguelite: true, logVersion: 2, clientTimestamp: now,
});

// Use the historical log schema so its original dice and reaction visuals remain usable.
// CD and token snapshots are deliberately absent from this public combat record.
export const buildCanvasCombatLog = ({ pending, attacker, target, defenseDice, resolution, counterResolution, counterWeapon, excessChoice, scenarioId, now, updatedAttacker, updatedTarget }) => {
  const attackThreatDice = getCanvasAttackThreatDice(pending);
  const defenseThreatDice = getCanvasDefenseThreatDice(pending);
  const defenseThreatIds = new Set(defenseThreatDice.map(die => die.id));
  const defenseItems = Array.isArray(pending.defenseItems) ? pending.defenseItems : pending.defenseItem ? [pending.defenseItem] : [];
  const spentDefenseAction = defenseItems.length > 0 && pending.status === 'defense-rolled';
  const attackerDice = [
    ...(pending.actionDice || []).map((die, i) => logDie(die, `action-${i}`, 'Acción')),
    ...(pending.weaponResults || []).map((value, i) => logDie({ ...pending.weaponDiceProfile?.[i], value }, `weapon-${i}`, pending.cunning?.choice === 'rerolled' && pending.cunning.dieIndex === i ? 'Astucia' : pending.weaponDiceProfile?.[i]?.source || 'Arma')),
    ...(pending.criticalResults || []).map((die, i) => logDie({ ...die, weaponId: pending.weaponDiceProfile?.[die.sourceIndex]?.weaponId }, `critical-${i}`, 'Crítico')),
    ...attackThreatDice.map((die, i) => logDie(die, `attack-threat-${i}`, 'Amenaza')),
  ];
  const defenderDice = defenseDice.map((die, i) => logDie(die, `defense-${i}`,
    defenseThreatIds.has(die.id) ? 'Amenaza' : defenseItems.length ? 'Equipo' : 'Acción'));
  const attackerSpentReserve = Array.isArray(pending.attackThreatDice)
    ? attackThreatDice.some(die => die.source === 'stored')
    : pending.usedThreat || attackThreatDice.some(die => die.source === 'stored');
  const recordAttackCost = !pending.spellCostPaid && (!pending.spellId || (pending.blastIndex || 0) === 0);
  const resourcesSpent = [
    ...(pending.spellId && recordAttackCost ? [{ side: 'attacker', label: pending.conserved ? 'Copia conservada' : '1 copia preparada', resource: 'spell' }] : []),
    ...(pending.cunningSpent ? [{ side: 'attacker', label: '1 de Astucia', amount: 1, resource: 'astucia' }] : []),
    ...(pending.manaSpent && recordAttackCost ? [{ side: 'attacker', label: `${pending.manaSpent} de Maná`, amount: pending.manaSpent, resource: 'mana' }] : []),
    ...(pending.furySpent ? [{ side: 'attacker', label: `${pending.furySpent} de Furia`, amount: pending.furySpent, resource: 'furia' }] : []),
    ...(pending.actionDice?.length && recordAttackCost ? [{ side: 'attacker', label: `${pending.actionDice.length} dado(s) de acción`, diceIds: pending.actionDieIds || [] }] : []),
    ...(attacker?.profileType === 'rogueliteEnemy' ? [{ side: 'attacker', label: 'Acción principal' }] : []),
    ...(attackerSpentReserve ? [{ side: 'attacker', label: 'Reserva de Amenaza' }] : []),
    ...(spentDefenseAction ? [{ side: 'target', label: 'Acción principal' }] : defenderDice.length ? [{ side: 'target', label: `${defenderDice.length} dado(s) de defensa`, diceIds: defenderDice.map(die => die.id) }] : []),
    ...(defenseThreatDice.some(die => die.source === 'stored') ? [{ side: 'target', label: 'Reserva de Amenaza' }] : []),
  ];
  const statusChanges = (before, after) => {
    const ids = token => (token?.status || []).map(status => typeof status === 'string' ? status : status?.id || status?.name || status?.label).filter(Boolean);
    if (!after) return { applied: [], removed: [] };
    const previous = ids(before), next = ids(after);
    return { applied: next.filter(id => !previous.includes(id)), removed: previous.filter(id => !next.includes(id)) };
  };
  const attackerStatus = statusChanges(attacker, updatedAttacker);
  const targetStatus = statusChanges(target, updatedTarget);
  return {
    statusEffectsApplied: { attacker: attackerStatus.applied, target: targetStatus.applied },
    statusEffectsRemoved: { attacker: attackerStatus.removed, target: targetStatus.removed },
    sourceEventId: pending.id, scenarioId,
    attackMode: pending.attackMode || null,
    attackWeapons: (pending.attackParts || []).map(part => ({ id: part.weaponId, name: part.weapon.name || part.weapon.nombre || 'Arma', hand: part.weapon.canvasSlot || null, traits: part.traits, diceIds: attackerDice.filter(die => die.weaponId === part.weaponId).map(die => die.id) })),
    adjustment: pending.adjustment || null,
    cunning: pending.cunning || null,
    attackerId: pending.attackerId, targetId: pending.targetId,
    attackerName: pending.attackerName || attacker?.name || 'Atacante',
    targetName: pending.targetName || target.name || 'Objetivo',
    weaponName: pending.weaponName || 'Arma',
    attackTotal: pending.pressure?.total || 0,
    effectiveAttackTotal: pending.pressure?.total || 0,
    attackPressure: pending.pressure?.total || 0,
    negatedTraits: [...new Set((pending.attackParts || []).flatMap(part => part.negatedTraits || []))],
    attackTraits: pending.range?.suppressTraits ? [] : traitsOf(pending.weapon),
    attackerDice, defenderDice,
    defenderWeapon: defenseItems.map(item => item.name || item.nombre || 'Arma').join(' + ') || null,
    defenderWeapons: defenseItems.map((item, index) => ({
      id: getCanvasWeaponIdentity(item) || `defense-weapon-${index}`,
      name: item.name || item.nombre || 'Arma',
      traits: traitsOf(item),
      diceIds: defenderDice.filter(die => die.weaponId === getCanvasWeaponIdentity(item)).map(die => die.id),
    })),
    defenderShield: pending.defenseShield ? { id: getCanvasWeaponIdentity(pending.defenseShield), name: pending.defenseShield.name || pending.defenseShield.nombre || 'Escudo' } : null,
    defenderTraits: [...new Set(defenseItems.flatMap(traitsOf))],
    defenderTotal: resolution.defense, defense: resolution.defense,
    fixedAttackPressure: !pending.actionDice?.length ? pending.pressure?.actionPressure || 0 : 0,
    thrownPenalty: pending.pressure?.thrownPenalty || 0,
    reactionType: defenseDice.length ? 'parar' : 'recibir',
    finalDamage: resolution.finalPressure, damage: resolution.finalPressure,
    surplus: resolution.surplus,
    excessChoice: resolution.surplus > 0 ? excessChoice : null,
    counterWeaponName: counterWeapon?.name || counterWeapon?.nombre || null,
    counterDamage: counterResolution?.finalPressure || 0,
    attackerBlocksLost: { postura: 0, armadura: 0, vida: counterResolution?.normalLifeLost ?? counterResolution?.lifeLost ?? 0, ...(counterResolution?.temporaryLifeLost ? { vidaTemporal: counterResolution.temporaryLifeLost } : {}) },
    blocksLost: { postura: 0, armadura: 0, vida: resolution.normalLifeLost ?? resolution.lifeLost, ...(resolution.temporaryLifeLost ? { vidaTemporal: resolution.temporaryLifeLost } : {}) },
    baseBlocksLost: { postura: 0, armadura: 0, vida: resolution.normalLifeLost ?? resolution.lifeLost, ...(resolution.temporaryLifeLost ? { vidaTemporal: resolution.temporaryLifeLost } : {}) },
    resourcesSpent,
    canvasRoguelite: true, logVersion: 2, clientTimestamp: now,
    ...(pending.spellId ? { spellId: pending.spellId, spellCastId: pending.blastId || pending.id } : {}),
    ...(resolution.fireWeaknessBonus ? { fireWeaknessBonus: resolution.fireWeaknessBonus } : {}),
  };
};
