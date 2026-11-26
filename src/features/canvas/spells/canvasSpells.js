import { resolveFeatureSlots, resolveFeatureUsage, resolveItemIdentityKeys } from '../../roguelite/featureSlots';
import { ROGUELITE_SKILL_SLOT_COUNT } from '../../roguelite/talents';
import { resolveAreaPlacement } from '../../tactical-shared/areaPlacementSystem';
import { getTokenCombatCellContext } from '../../tactical-shared/legacyCombatRules';
import { getTerrainCells } from '../../tactical-shared/tarTerrain';
import { canTokenSeeThroughSmoke } from '../../tactical-shared/tokenVisibilityAccess';
import { getCanvasArmorProtection, hasCanvasMutableArmor } from '../combat/canvasArmorRules';
import { isCanvasCatalyst } from '../combat/canvasAttackSelection';
import { getCanvasCombatItems, getCanvasWeaponIdentity, getCanvasWeaponRange, getCanvasWeaponTraits, hasCanvasStatus, parseWeaponDiceProfile } from '../combat/canvasAttackRules';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export const isCanvasMage = token => token?.profileType === 'rogueliteClass'
  && (normalize(token.classIdentity) === 'mago' || normalize(token.stats?.recurso?.label) === 'mana');

export const getCanvasSpellId = item => {
  const id = normalize(item?.spellId || item?.payload?.spellId);
  if (id === 'arcane-barrier') return 'runic-barrier';
  if (['fireball', 'arcane-projectile', 'arcane-mist', 'runic-barrier'].includes(id)) return id;
  const keys = resolveItemIdentityKeys(item).map(normalize);
  if (keys.some(value => ['barrera runica', 'barrera arcana', 'barrera-runica', 'barrera-arcana', 'runic-barrier',
    'arcane-barrier', 'ability:barrier', 'ability:runic-barrier', 'barrier'].includes(value))) return 'runic-barrier';
  if (keys.some(value => ['bola de fuego', 'bola-de-fuego', 'ability:fireball', 'fireball'].includes(value))) return 'fireball';
  if (keys.some(value => ['niebla arcana', 'niebla-arcana', 'niebla_arcana', 'arcane-mist', 'ability:arcane-mist'].includes(value))) return 'arcane-mist';
  return keys.some(value => ['proyectil arcano', 'proyectil mágico', 'proyectil magico', 'proyectil-arcano',
    'arcane-projectile', 'ability:arcane-projectile', 'projectile', 'magic-missile'].includes(value)) ? 'arcane-projectile' : null;
};

export const getCanvasPreparedSpells = token => {
  const entries = [
    ...(token?.equippedSkills || []),
    ...(Array.isArray(token?.inventory) ? token.inventory.filter(item => item?.isPrepared) : []),
  ];
  const slots = resolveFeatureSlots({ slots: token?.equippedSkillSlots, ids: token?.equippedSkillIds,
    entries, count: ROGUELITE_SKILL_SLOT_COUNT });
  const used = resolveFeatureUsage({ entries: slots, slotIds: token?.usedSkillSlotIds, usedSlots: token?.usedSkillSlots });
  return slots.map((item, slotIndex) => {
    if (!item) return null;
    const preparedItem = item.payload ? { ...item.payload, ...item } : item;
    return { item: preparedItem, slotIndex, used: used[slotIndex], spellId: getCanvasSpellId(preparedItem) };
  });
};

export const getCanvasCatalysts = token => getCanvasCombatItems(token).filter(item => isCanvasCatalyst(item)
  && !['ability', 'abilities'].includes(item.type || item._category) && parseWeaponDiceProfile(item).length > 0);

export const isCanvasSpellPractice = combat => !['setup', 'active'].includes(combat?.status);

export const getCanvasSpellTurnReason = (token, combat, { practice = false, practiceCombat } = {}) => {
  if (!isCanvasMage(token)) return 'Esta ficha no es un Mago.';
  const testing = practice && isCanvasSpellPractice(combat);
  if (combat?.pendingAttack || combat?.explosiveBlast || combat?.arcaneChain
    || practiceCombat?.pendingAttack || practiceCombat?.explosiveBlast || practiceCombat?.arcaneChain)
    return 'Resuelve la defensa pendiente antes de lanzar otro conjuro.';
  if (!testing) {
    if (combat?.status !== 'active' || combat.roundPhase !== 'turns') return 'Lanza el conjuro durante tu turno de combate.';
    const block = combat.blocks?.[combat.activeBlockIndex];
    if (!(block?.memberIds || block?.tokenIds || []).includes(token.id)
      || (block?.actedIds || block?.completedTokenIds || []).includes(token.id)) return 'Espera al turno del Mago.';
  }
  if (token.preventAttack || token.cannotAttack) return 'Esta ficha no puede atacar.';
  if (hasCanvasMutableArmor(token) && !token.armorProtectionChoice) return 'Elige la protección de la Túnica antes de lanzar.';
  return '';
};

export const getCanvasSpellAvailability = (token, combat, slotIndex, options = {}) => {
  const spell = getCanvasPreparedSpells(token)[slotIndex];
  const reason = getCanvasSpellTurnReason(token, combat, options)
    || (!spell ? 'No hay un conjuro preparado en esta ranura.' : spell.used ? 'Esta copia ya está gastada.'
      : !spell.spellId ? 'Este conjuro todavía no tiene una resolución automática.' : '')
    || (!getCanvasCatalysts(token).length ? 'Equipa un Catalizador con perfil de dados.' : '')
    || (!(options.practice && isCanvasSpellPractice(combat))
      && !(combat?.participants?.[token?.id]?.actionDice || []).some(die => die.status === 'available')
      ? 'Necesitas 1 dado de acción disponible.' : '');
  return { available: !reason, reason, spell };
};

// Unlike thrown bombs, every cell (not only the nearest one) must be in reach.
export const resolveCanvasFireballPlacement = ({ point, source, catalyst, gridConfig, items = [] }) => {
  const range = getCanvasWeaponRange(catalyst);
  const placement = resolveAreaPlacement({ point, source, gridConfig, size: { columns: 2, rows: 2 }, range });
  const occupied = getTerrainCells(source, gridConfig);
  const distances = placement.cells.map(cell => Math.min(...occupied.map(origin => Math.max(
    Math.abs(origin.column - cell.column), Math.abs(origin.row - cell.row),
  ))));
  const distance = Math.max(...distances);
  let reason = !placement.insideBounds ? 'outside-grid' : distance > range ? 'out-of-range' : null;
  if (!reason && hasCanvasStatus(source, 'cegado') && distance > 0) reason = 'cegado';
  const context = getTokenCombatCellContext(source, items, gridConfig);
  if (!reason && context.mode === 'duel' && range >= 2) reason = 'duel';
  if (!reason && context.mode === 'duel' && getCanvasWeaponTraits(catalyst).includes('a distancia')) reason = 'duel';
  if (!reason && placement.cells.some(cell => {
    const targetCell = resolveAreaPlacement({ point: { x: placement.x + (cell.column - placement.cells[0].column + .5) * placement.width / 2,
      y: placement.y + (cell.row - placement.cells[0].row + .5) * placement.height / 2 }, gridConfig });
    return !canTokenSeeThroughSmoke(source, { id: `fireball-cell-${cell.column}:${cell.row}`, ...targetCell }, items);
  })) reason = 'smoke';
  return { ...placement, range, distance, withinRange: distance <= range, valid: !reason, reason };
};

export const validateCanvasSpellResources = ({ token, combat, slotIndex, catalystId, actionDieId, manaSpend = 0, conserve = false, spellId }) => {
  const availability = getCanvasSpellAvailability(token, combat, slotIndex);
  if (!availability.available) return { legal: false, reason: availability.reason };
  if (availability.spell.spellId !== spellId) return { legal: false, reason: 'La copia preparada corresponde a otro conjuro.' };
  const catalyst = getCanvasCatalysts(token).find(item => getCanvasWeaponIdentity(item) === catalystId);
  if (!catalyst) return { legal: false, reason: 'El Catalizador ya no está en el conjunto activo.' };
  const participant = combat.participants?.[token.id];
  const die = participant?.actionDice?.find(candidate => candidate.id === actionDieId && candidate.status === 'available');
  if (!die) return { legal: false, reason: 'Selecciona 1 dado de acción disponible.' };
  if (![0, 1].includes(manaSpend) || typeof conserve !== 'boolean') return { legal: false, reason: 'La Potenciación cuesta 1 de Maná.' };
  if (conserve && (Number(token.level || 1) < 2 || participant.arcaneConservationUsed))
    return { legal: false, reason: 'Conservación arcana requiere nivel 2 y solo puede usarse una vez por combate.' };
  const manaCost = manaSpend + Number(conserve);
  if (manaCost > Number(token.stats?.recurso?.current || 0)) return { legal: false, reason: 'No queda Maná para esta combinación.' };
  const profile = parseWeaponDiceProfile(catalyst).map(die => ({ ...die, source: 'Catalizador' }));
  return { legal: true, spell: availability.spell, catalyst, die, profile, manaCost };
};

export const validateCanvasFireball = (options) => {
  const selected = validateCanvasSpellResources({ ...options, spellId: 'fireball' });
  if (!selected.legal) return selected;
  const { token, manaSpend, point, gridConfig, items } = options;
  const { catalyst, profile } = selected;
  if (manaSpend && new Set(profile.map(die => die.sides)).size !== 1)
    return { legal: false, reason: 'El Catalizador tiene dados distintos: falta definir su dado base.' };
  if (manaSpend) profile.push({ id: 'fireball-intensification', die: profile[0].die, sides: profile[0].sides, source: 'Maná' });
  const placement = resolveCanvasFireballPlacement({ point, source: token, catalyst, gridConfig, items });
  const messages = { 'out-of-range': 'Las cuatro casillas deben quedar dentro del alcance del Catalizador.',
    'outside-grid': 'El área debe quedar completamente dentro del tablero.', smoke: 'El Humo impide ver el área.',
    duel: 'No puedes utilizar ese Catalizador en Duelo.', cegado: 'Cegado: no puedes elegir esa área.' };
  if (!placement.valid) return { legal: false, reason: messages[placement.reason] || 'El área no es válida.' };
  const traits = getCanvasWeaponTraits(catalyst).filter(trait => !['catalizador', 'dos manos', 'pesada', 'arrojadiza', 'barrido'].includes(trait));
  const suppressTraits = getTokenCombatCellContext(token, items, gridConfig).mode === 'duel'
    && getCanvasWeaponRange(catalyst) === 1 && !traits.includes('duelista');
  const weapon = { ...selected.spell.item, name: 'Bola de fuego', type: 'ability', spellId: 'fireball',
    catalyst, dano: profile.map(die => die.die).join(' + '), alcance: catalyst.alcance || catalyst.alc || catalyst.range,
    actionCost: 1, rasgos: [...(suppressTraits ? [] : traits), 'fuego'] };
  return { ...selected, placement, weapon };
};

export const resolveCanvasFireballTargetAttack = (attack, target) => {
  const negated = getCanvasWeaponTraits({ rasgos: [...(target.negatedTraits || target.neutralizedTraits || []),
    ...getCanvasArmorProtection(target, attack.weapon.catalyst).negatedTraits] });
  const criticalBlocked = negated.includes('critico');
  const criticalPressure = criticalBlocked ? attack.criticalResults.reduce((sum, die) => sum + die.value, 0) : 0;
  return { ...attack, weapon: { ...attack.weapon, rasgos: getCanvasWeaponTraits(attack.weapon).filter(trait => !negated.includes(trait)) },
    criticalResults: criticalBlocked ? [] : attack.criticalResults,
    pressure: { ...attack.pressure, weaponPressure: attack.pressure.weaponPressure - criticalPressure,
      total: attack.pressure.total - criticalPressure } };
};

export const updateCanvasMageMana = (token, phase) => {
  if (!isCanvasMage(token)) return token;
  const resource = token.stats?.recurso || {};
  const current = phase === 'start' ? Number(token.level || 1) >= 5 ? 2 : 1
    : phase === 'end' ? 0 : Math.min(3, (Number(resource.current) || 0) + 1);
  return { ...token, stats: { ...token.stats, recurso: { ...resource, label: resource.label || 'Maná', max: 3, current } },
    runtimeDirty: true, ...(phase === 'end' ? { usedSkillSlots: [false, false, false],
      usedSkillSlotIds: getCanvasPreparedSpells(token).map(spell => spell ? resolveItemIdentityKeys(spell.item)[0] || null : null),
      equippedSkillSlots: token.equippedSkillSlots?.map(item => item ? { ...item, used: false } : null),
      equippedSkills: token.equippedSkills?.map(item => ({ ...item, used: false })) } : {}) };
};
