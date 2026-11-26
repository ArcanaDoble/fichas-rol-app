import { getCanvasArmorProtection } from './canvasArmorRules';
import { getCanvasAttackOptions, resolveCanvasAttackSelection } from './canvasAttackSelection';
import { getCanvasCombatItems, getCanvasEquippedWeapons, getCanvasWeaponActionCost, getCanvasWeaponIdentity,
  getCanvasWeaponTraits, isCanvasShield } from './canvasAttackRules';
import { setActionDieStatus, setEnemyActionStatus } from './canvasCombatState';
import { getCampaignThreatPool, updateCampaignThreatResource } from './campaignThreatDice';
import { getCampaignArmorRd } from '../campaignSystem';
import { resolveEquipmentHandsRequired } from '../../roguelite/equipmentPool';
import { canTokenSeeCanvasTarget } from '../../tactical-shared/canvasVision';
import { tokenHasHiddenStatus } from '../../tactical-shared/tokenVisibilityAccess';
import { areTokensAllied, canCombatTokenActNow, getCombatCellOccupancyIssue, getCombatTokenPositionForPrimaryCell,
  getTokenPrimaryGridCell, getTokenGridBounds, isGridCellInsideBounds, isCombatMoveBlockedByWall } from '../../tactical-shared/legacyCombatRules';

export const CAMPAIGN_ZONES = ['arriba', 'izquierda', 'centro', 'derecha', 'abajo'];
export const CAMPAIGN_ZONE_NAMES = { arriba: 'Arriba', izquierda: 'Izquierda', centro: 'Centro', derecha: 'Derecha', abajo: 'Abajo' };
export const isCampaignAttack = pending => pending?.kind === 'campaign-attack';
const text = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const int = value => Math.max(0, Math.floor(Number(value) || 0));
const live = token => Number(token?.stats?.vida?.current) > 0;
const status = (token, name) => (token?.status || []).some(s => text(typeof s === 'string' ? s : s.id || s.name) === name);
const assert = (condition, reason) => { if (!condition) throw new Error(reason); };
export const canControlCampaignToken = (token, { isPlayerView, playerName, currentUserId } = {}) => Boolean(token && (!isPlayerView
  || (Array.isArray(token.controlledBy) ? token.controlledBy : []).some(owner => (playerName && owner === playerName) || (currentUserId && owner === currentUserId))
  || (playerName && (token.campaignOwner === playerName || token.linkedClassOwner === playerName))));

export const isCampaignMeleeWeapon = weapon => !weapon?.campaignProjectile && weapon?.attackType !== 'thrown'
  && !getCanvasWeaponTraits(weapon).some(t => /a distancia|balistico|proyectil/.test(t))
  && !/\b(arco|ballesta|pistola|fusil|mosquete)\b/.test(text(weapon?.name || weapon?.nombre));

export const resolveCampaignAttackSelection = params => {
  const { attacker, target, items = [], gridConfig = {} } = params;
  if (!live(attacker) || !live(target)) return { legal: false, reason: 'Atacante y objetivo deben tener Vida.' };
  if (!['campaignCharacter', 'rogueliteEnemy'].includes(target.profileType)) return { legal: false, reason: 'Elige un personaje, PNJ o enemigo de Campaña.' };
  if (attacker.preventAttack || attacker.cannotAttack) return { legal: false, reason: 'La ficha no puede atacar en su estado actual.' };
  if (tokenHasHiddenStatus(target) && !areTokensAllied(attacker, target)) return { legal: false, reason: 'El objetivo está Oculto.' };
  if (!canTokenSeeCanvasTarget({ observer: attacker, target, items, gridConfig })) return { legal: false, reason: 'No hay línea de visión hasta el objetivo.' };
  const selected = resolveCanvasAttackSelection({ ...params, rulesSystem: 'campaign' });
  if (!selected.legal) return selected;
  if (selected.mode === 'multiweapon') return { legal: false, reason: 'El PNJ debe usar el ataque concreto de su ficha, sin sumar automáticamente otras armas.' };
  const structuralCost = selected.mode === 'dual' ? 2 : getCanvasWeaponActionCost(selected.parts[0].weapon);
  const heavy = selected.mode === 'single' && structuralCost > 1;
  if (heavy && !selected.weapon.campaignSplit && !/mandoble/.test(text(selected.weapon.name || selected.weapon.nombre))) {
    return { legal: false, reason: 'Este perfil pesado necesita definir su trayectoria de Campaña antes de automatizar el reparto.' };
  }
  return { ...selected, campaignMode: heavy ? 'heavy' : selected.mode,
    actionCost: attacker.profileType === 'rogueliteEnemy' ? 1 : structuralCost, structuralCost };
};

export const getCampaignAttackOptions = params => getCanvasAttackOptions({ ...params, rulesSystem: 'campaign' })
  .filter(selection => resolveCampaignAttackSelection({ ...params, selection }).legal);

export const getCampaignResources = (token, combat, defense = false) => {
  const p = combat?.participants?.[token?.id];
  if (!p || p.awaitingRoll) return [];
  if (p.side !== 'enemies') return (p.actionDice || []).map(die => ({ ...die, label: die.die, kind: 'die',
    spent: defense ? !['available', 'committed'].includes(die.status) : die.status !== 'available' }));
  const id = defense ? 'defense' : 'attack';
  const basic = p.enemyActions?.find(a => a.id === id);
  return [
    ...(basic ? [{ ...basic, kind: 'basic', value: int(token.offenseBase ?? token.stats?.ofensiva?.current),
      label: defense ? 'Defensa básica' : 'Acción principal', spent: basic.status !== 'available' }] : []),
    ...getCampaignThreatPool(p).map(die => ({ ...die, kind: 'threat', value: int(die.value), label: die.die || 'Amenaza',
      source: 'stored', spent: die.status === 'spent' || die.value == null })),
  ];
};

export const selectCampaignResources = (token, combat, ids, defense = false) => {
  assert(Array.isArray(ids) && new Set(ids).size === ids.length, 'No puedes gastar dos veces el mismo recurso.');
  const available = getCampaignResources(token, combat, defense);
  const selected = ids.map(id => available.find(r => r.id === id && !r.spent));
  assert(selected.every(Boolean), 'Algún recurso ha cambiado o ya está gastado.');
  return selected;
};

export const spendCampaignResources = (combat, tokenId, resources) => resources.reduce((state, resource) => {
  if (resource.kind === 'die') return setActionDieStatus(state, tokenId, resource.id, 'spent');
  if (resource.kind === 'basic') return setEnemyActionStatus(state, tokenId, resource.id, 'spent');
  return { ...state, participants: { ...state.participants, [tokenId]: updateCampaignThreatResource(state.participants[tokenId], resource, true) } };
}, combat);

export const restoreCampaignResources = (combat, tokenId, resources = []) => resources.reduce((state, resource) => {
  if (!state.participants?.[tokenId]) return state;
  if (resource.kind === 'die') return setActionDieStatus(state, tokenId, resource.id, resource.status);
  if (resource.kind === 'basic') return setEnemyActionStatus(state, tokenId, resource.id, resource.status);
  return { ...state, participants: { ...state.participants, [tokenId]: updateCampaignThreatResource(state.participants[tokenId], resource, false) } };
}, combat);

export const validateCampaignAttackResources = (token, selected, selection, response = false) => {
  const cost = token.profileType === 'rogueliteEnemy' && selected.some(r => r.kind === 'basic') ? 1
    : selection.structuralCost;
  assert(selected.length >= cost, `Este ataque necesita ${cost} recurso${cost === 1 ? '' : 's'}.`);
  assert(selected.length === cost || (token.profileType === 'rogueliteEnemy'
    && selected.filter(r => r.kind !== 'threat').length <= cost), 'Selecciona el coste del arma; la Amenaza puede potenciar la acción básica.');
  if (response) assert(selected.length >= selection.structuralCost, 'La defensa gastada no paga el coste de esta respuesta.');
  return selected.reduce((sum, r) => sum + Number(r.value), 0);
};

export const assertCampaignAttackTurn = (token, scenario, combat, practice, response) => {
  assert(combat?.participants?.[token.id] && !combat.participants[token.id].awaitingRoll, 'Primero debes tirar los dados de acción.');
  if (!practice && !response) assert(combat.status === 'active' && combat.roundPhase === 'turns'
    && canCombatTokenActNow(token, scenario.items, combat), 'No es el turno de esta ficha.');
};

const steps = [[-1,-1,'Noroeste'],[0,-1,'Norte'],[1,-1,'Noreste'],[-1,0,'Oeste'],[1,0,'Este'],[-1,1,'Suroeste'],[0,1,'Sur'],[1,1,'Sureste']];
export const getCampaignEvasionDestinations = (token, items, gridConfig) => {
  if (!token || status(token, 'apresado') || status(token, 'derribado') || token.cannotMove || token.preventMovement) return [];
  const cell = getTokenPrimaryGridCell(token, gridConfig);
  return steps.map(([dx, dy, label]) => {
    const position = getCombatTokenPositionForPrimaryCell(token, { x: cell.x + dx, y: cell.y + dy }, gridConfig);
    const issue = getCombatCellOccupancyIssue({ movingToken: token, nextX: position.x, nextY: position.y,
      items, config: gridConfig, excludeIds: [token.id] });
    const bounds = getTokenGridBounds({ ...token, ...position }, gridConfig);
    const inside = isGridCellInsideBounds({ x: bounds.x, y: bounds.y }, gridConfig)
      && isGridCellInsideBounds({ x: bounds.x + bounds.w - 1, y: bounds.y + bounds.h - 1 }, gridConfig);
    return { label, position, blocked: !inside || Boolean(issue) || isCombatMoveBlockedByWall(token, position, items, gridConfig) };
  });
};

const adjacent = (a, b) => a !== b && a !== 'centro' && b !== 'centro'
  && (['arriba', 'abajo'].includes(a) !== ['arriba', 'abajo'].includes(b));
export const validateCampaignZones = (selection, zones, assignments, dice = []) => {
  const count = selection.campaignMode === 'single' ? 1 : 2;
  assert(Array.isArray(zones) && zones.length === count && Array.from(zones).every(zone => CAMPAIGN_ZONES.includes(zone)), 'Fija todas las zonas del ataque.');
  if (selection.campaignMode === 'heavy') {
    assert(adjacent(...zones), 'El golpe pesado necesita dos zonas exteriores adyacentes.');
    assert(Array.isArray(assignments) && assignments.length === dice.length && Array.from(assignments).every(i => i === 0 || i === 1)
      && assignments.includes(0) && assignments.includes(1), 'Reparte cada dado completo entre las dos zonas, con al menos uno en cada una.');
  }
  return true;
};

export const getCampaignParryOptions = (target, pending) => {
  const equipment = [...getCanvasEquippedWeapons(target), ...getCanvasCombatItems(target).filter(isCanvasShield)]
    .filter((item, i, all) => all.findIndex(other => getCanvasWeaponIdentity(other) === getCanvasWeaponIdentity(item)) === i);
  const ranged = !pending.melee;
  const allowed = equipment.filter(item => {
    if (getCanvasWeaponTraits(item).includes('sin guardia')) return false;
    const types = item.campaignBlocks || item.payload?.campaignBlocks || [];
    const blocks = (Array.isArray(types) ? types : [types]).map(text);
    if (pending.ballistic) return blocks.includes('balas') || blocks.includes('bullets');
    if (ranged) return blocks.includes('proyectiles') || blocks.includes('projectiles');
    return isCanvasShield(item) || isCampaignMeleeWeapon(item);
  });
  return allowed.map(item => ({ id: getCanvasWeaponIdentity(item), name: item.name || item.nombre || 'Equipo', item,
    pairs: Array.isArray(item.campaignParryPairs) ? item.campaignParryPairs.filter(pair => Array.isArray(pair)
      && pair.length === 2 && pair.every(zone => CAMPAIGN_ZONES.includes(zone))) : [],
    double: !ranged && (resolveEquipmentHandsRequired(item) === 2 && /mandoble|parada doble/.test(text(`${item.name} ${(item.rasgos || []).join?.(' ') || ''}`))) }));
};

export const validateCampaignDefense = ({ pending, target, combat, defense, ids = [], zones = [], equipmentIds = [], destination, items, gridConfig, extraResources = [] }) => {
  assert(['receive', 'parry', 'evade'].includes(defense), 'Elige una defensa válida.');
  if (defense === 'receive') return { mode: defense, resources: [], value: 0, zones: [], equipmentIds: [] };
  assert(live(target), 'El objetivo ya no puede defenderse.');
  const resources = [...selectCampaignResources(target, combat, ids, true), ...extraResources];
  assert(resources.length > 0, 'Compromete un recurso defensivo.');
  const value = resources.reduce((sum, r) => sum + Number(r.value), 0);
  if (defense === 'evade') {
    const legal = getCampaignEvasionDestinations(target, items, gridConfig).find(d => d.label === destination?.label && !d.blocked);
    assert(legal, 'La casilla de evasión ya no está libre o accesible.');
    return { mode: defense, resources, value, zones: [], equipmentIds: [], destination: legal };
  }
  assert(!target.cannotDefend && !status(target, 'derribado'), 'Esta postura impide hacer parry.');
  assert(zones.length >= 1 && zones.length <= 2 && new Set(zones).size === zones.length
    && Array.from(zones).every(zone => CAMPAIGN_ZONES.includes(zone)), 'Elige una o dos zonas legales.');
  const options = getCampaignParryOptions(target, pending);
  const gear = equipmentIds.map(id => options.find(option => option.id === id));
  assert(gear.length > 0 && gear.every(Boolean) && new Set(equipmentIds).size === equipmentIds.length, 'Necesitas equipo apto para parar este ataque.');
  assert(gear.reduce((hands, g) => hands + resolveEquipmentHandsRequired(g.item), 0) <= 2, 'El equipo defensivo excede las dos manos.');
  const paysCoverage = cost => resources.length >= cost && (resources.length === cost
    || target.profileType === 'rogueliteEnemy' && resources.filter(r => r.kind !== 'threat').length <= cost);
  if (zones.length === 1) assert(paysCoverage(1), 'Una zona requiere un recurso.');
  else {
    const shield = gear.find(g => isCanvasShield(g.item) && g.pairs.some(pair => zones.every(zone => pair.includes(zone))));
    const pair = gear.length === 2 && gear.every(g => !isCanvasShield(g.item) && resolveEquipmentHandsRequired(g.item) === 1);
    const heavy = gear.some(g => g.double) && adjacent(...zones);
    assert(shield || ((pair || heavy) && paysCoverage(2)), 'Dos zonas requieren una pareja explícita de escudo, dos armas o una parada doble adyacente.');
    assert(paysCoverage(shield ? 1 : 2), 'El coste defensivo no coincide con la cobertura elegida.');
  }
  return { mode: defense, resources, value, zones, equipmentIds };
};

export const rollCampaignWeapon = (profile, traits, random) => {
  const dice = [];
  profile.forEach((die, index) => {
    let value, chain = 0;
    do {
      value = Math.floor(random() * die.sides) + 1;
      dice.push({ ...die, id: `${die.id || index}-${chain}`, value, critical: chain > 0 });
      chain += 1;
      assert(chain < 100, 'La cadena de Crítico supera el límite de seguridad.');
    } while (value === die.sides && traits.includes('critico') && !die.noCritical);
  });
  return dice;
};

const campaignTraits = (part, zone, target) => {
  const configured = part.weapon.campaignZoneTraits?.[zone];
  const raw = configured ? getCanvasWeaponTraits({ rasgos: configured }) : part.traits;
  const neutralized = new Set([...(target.negatedTraits || []), ...(target.neutralizedTraits || []),
    ...getCanvasArmorProtection(target, part.weapon).negatedTraits].map(text));
  return raw.filter(trait => !neutralized.has(text(trait)));
};
const penetration = (part, zone, traits) => Math.max(0, int(part.weapon.campaignPenetration?.[zone]
  ?? part.weapon.penetration ?? part.weapon.perforante ?? Math.max(0, ...traits.filter(t => /^perforante/.test(t)).map(t => Number(t.match(/\d+/)?.[0]) || 1))));

export const resolveCampaignAttack = ({ pending, target, random, heavyDice = [] }) => {
  const defense = pending.defense;
  const zones = pending.reveal.zones;
  const evaded = defense.mode === 'evade' && defense.value >= pending.actionValue;
  const cancelled = zone => evaded || (defense.mode === 'parry' && defense.zones.includes(zone));
  const parried = defense.mode === 'parry' && zones.every(zone => cancelled(zone));
  const rd = getCampaignArmorRd(target);
  const hits = [];
  if (pending.campaignMode === 'heavy') {
    const entered = heavyDice.filter((die, i) => !cancelled(zones[pending.reveal.assignments[i]]));
    const impact = entered.reduce((sum, die) => sum + die.value, 0);
    hits.push({ impact, rd, damage: entered.length ? Math.max(0, impact - rd) : 0, dice: entered.filter(die => die.kind !== 'action'), zones });
  } else pending.attackParts.forEach((part, i) => {
    const zone = zones[i] || zones[0];
    if (cancelled(zone)) { hits.push({ zone, impact: 0, rd, damage: 0, dice: [], cancelled: true }); return; }
    const traits = campaignTraits(part, zone, target);
    const dice = rollCampaignWeapon([...part.profile, ...(i === 0 ? pending.modifierProfile || [] : [])], traits, random);
    const action = pending.campaignMode === 'dual' ? pending.resources[i]?.value || 0 : pending.actionValue;
    const impact = action + dice.reduce((sum, die) => sum + die.value, 0);
    const effectiveRd = pending.ballistic ? 0 : Math.max(0, rd - penetration(part, zone, traits));
    hits.push({ zone, impact, rd: effectiveRd, damage: Math.max(0, impact - effectiveRd), dice, traits });
  });
  const damage = hits.reduce((sum, hit) => sum + hit.damage, 0);
  const before = int(target.stats.vida.current), after = Math.max(0, before - damage);
  const nextTarget = { ...target, stats: { ...target.stats, vida: { ...target.stats.vida, current: after } },
    ...(evaded ? defense.destination.position : {}),
    runtimeDirty: target.profileType === 'campaignCharacter' || Boolean(target.runtimeDirty),
    canvasRuntimeRevision: int(target.canvasRuntimeRevision) + 1 };
  return { target: nextTarget, hits, before, after, damage: before - after, impact: hits.reduce((sum, hit) => sum + hit.impact, 0), rd,
    parried, evaded, counter: parried && pending.melee && defense.value >= pending.actionValue && !pending.response,
    defenseValue: defense.value, roll: hits.flatMap(hit => hit.dice).reduce((sum, die) => sum + die.value, 0),
    title: parried ? 'Parry acertado' : defense.mode === 'evade' ? evaded ? 'Evasión completa' : 'Evasión fallida' : defense.mode === 'parry' ? 'Parry fallido' : 'Golpe recibido' };
};

export const getCampaignCounterWeapons = ({ defender, attacker, items, gridConfig, resources = [] }) => getCampaignAttackOptions({ attacker: defender, target: attacker, items, gridConfig })
  .filter(weapon => isCampaignMeleeWeapon(weapon) && resolveCampaignAttackSelection({ attacker: defender, target: attacker,
    selection: weapon, items, gridConfig }).structuralCost <= resources.length);
