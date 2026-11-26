import { areTokensAllied, getCombatRenderPlacement, getTokenCombatCellContext, getTokenDistanceInCells, isCombatTokenItem } from '../../tactical-shared/legacyCombatRules';
import { getGridWorldRect, linesIntersect } from '../../tactical-shared/spatial';
import { getTerrainCells } from '../../tactical-shared/tarTerrain';
import { tokenHasHiddenStatus } from '../../tactical-shared/tokenVisibilityAccess';
import { canTokenSeeCanvasTarget } from '../../tactical-shared/canvasVision';
import { getSceneBlockingSegments } from '../../tactical-shared/scenery';
import { getCanvasWeaponRange, getCanvasWeaponTraits, hasCanvasStatus } from '../combat/canvasAttackRules';
import { validateCanvasSpellResources } from './canvasSpells';

const center = token => ({ x: (Number(token.x) || 0) + (Number(token.width) || 50) / 2,
  y: (Number(token.y) || 0) + (Number(token.height) || 50) / 2 });
const blockingWalls = items => getSceneBlockingSegments(items, { kind: 'movement' });
const clearSegment = (a, b, walls) => !walls.some(wall => linesIntersect(a.x, a.y, b.x, b.y, wall.x1, wall.y1, wall.x2, wall.y2));

// Visibility graph around wall ends: the missile can turn corners, but cannot
// leave a sealed room or pass through a closed door. Creatures are not barriers.
const findRoute = (source, target, items, gridConfig) => {
  const start = center(source), end = center(target), walls = blockingWalls(items);
  if (clearSegment(start, end, walls)) return [start, end];
  const bounds = getGridWorldRect(gridConfig);
  const clearance = Math.max(1, Math.min(gridConfig.cellWidth || 50, gridConfig.cellHeight || 50) * .04);
  const vertices = new Map();
  walls.forEach(wall => [[wall.x1, wall.y1], [wall.x2, wall.y2]].forEach(([x, y]) => {
    [-1, 1].forEach(dx => [-1, 1].forEach(dy => {
      const point = { x: x + dx * clearance, y: y + dy * clearance };
      if (point.x >= bounds.x && point.y >= bounds.y && point.x <= bounds.x + bounds.width && point.y <= bounds.y + bounds.height)
        vertices.set(`${point.x}:${point.y}`, point);
    }));
  }));
  const nodes = [start, end, ...vertices.values()];
  const distance = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set();
  distance[0] = 0;
  while (visited.size < nodes.length) {
    let index = -1;
    distance.forEach((value, candidate) => { if (!visited.has(candidate) && (index < 0 || value < distance[index])) index = candidate; });
    if (index < 0 || !Number.isFinite(distance[index])) return null;
    if (index === 1) {
      const route = [];
      for (let at = 1; at >= 0; at = previous[at]) route.unshift(nodes[at]);
      return route;
    }
    visited.add(index);
    nodes.forEach((point, candidate) => {
      if (visited.has(candidate) || !clearSegment(nodes[index], point, walls)) return;
      const next = distance[index] + Math.hypot(point.x - nodes[index].x, point.y - nodes[index].y);
      if (next < distance[candidate]) { distance[candidate] = next; previous[candidate] = index; }
    });
  }
  return null;
};

const routeCache = new WeakMap();
export const findArcaneProjectileRoute = (source, target, items = [], gridConfig = {}) => {
  let cached = routeCache.get(items);
  if (!cached) { cached = new Map(); routeCache.set(items, cached); }
  const key = JSON.stringify([center(source), center(target), getGridWorldRect(gridConfig), gridConfig.cellWidth, gridConfig.cellHeight]);
  if (cached.has(key)) return cached.get(key);
  const route = findRoute(source, target, items, gridConfig);
  if (cached.size >= 64) cached.delete(cached.keys().next().value);
  cached.set(key, route);
  return route;
};

export const resolveArcaneProjectileTarget = ({ source, origin = source, target, catalyst, items = [], gridConfig = {}, excludeId }) => {
  if (!source || !target || !isCombatTokenItem(target) || target.id === source.id || target.id === excludeId
    || areTokensAllied(source, target) || !(Number(target.stats?.vida?.current) > 0))
    return { valid: false, reason: 'Elige otra criatura enemiga viva.' };
  const range = getCanvasWeaponRange(catalyst), distance = getTokenDistanceInCells(origin, target, gridConfig);
  if (source.preventAttack || source.cannotAttack || Number(source.stats?.vida?.current) <= 0)
    return { valid: false, reason: 'El Mago no puede atacar.' };
  if (distance > range) return { valid: false, distance, range, reason: 'El objetivo está fuera del alcance del Catalizador.' };
  if (hasCanvasStatus(source, 'cegado') && getTokenDistanceInCells(source, target, gridConfig) > 0)
    return { valid: false, distance, range, reason: 'Cegado: solo puedes elegir objetivos en tu misma casilla.' };
  const context = getTokenCombatCellContext(source, items, gridConfig);
  if (!excludeId && context.mode === 'duel' && (range >= 2 || getCanvasWeaponTraits(catalyst).includes('a distancia')))
    return { valid: false, distance, range, reason: 'No puedes utilizar ese Catalizador en Duelo.' };
  const observers = [source, ...items.filter(item => item.id !== source.id && isCombatTokenItem(item)
    && areTokensAllied(source, item) && item.hasVision !== false && !hasCanvasStatus(item, 'cegado'))];
  const localized = !tokenHasHiddenStatus(target) && observers.some(observer =>
    canTokenSeeCanvasTarget({ observer, target, items, gridConfig }));
  if (!localized) return { valid: false, distance, range, reason: 'El Mago o un aliado debe localizar al enemigo.' };
  const route = findArcaneProjectileRoute(origin, target, items, gridConfig);
  if (!route) return { valid: false, distance, range, reason: 'No existe un recorrido abierto: el proyectil no atraviesa barreras cerradas.' };
  const placement = { width: target.width || 50, height: target.height || 50,
    ...getCombatRenderPlacement(target, items, gridConfig), cells: getTerrainCells(target, gridConfig),
    columns: 1, rows: 1, valid: true, targetId: target.id, targetName: target.name || 'Objetivo', distance, range, route };
  return placement;
};

export const validateCanvasArcaneProjectile = options => {
  const selected = validateCanvasSpellResources({ ...options, spellId: 'arcane-projectile' });
  if (!selected.legal) return selected;
  const { token, targetId, items, gridConfig } = options;
  const target = items.find(item => item.id === targetId);
  const placement = resolveArcaneProjectileTarget({ source: token, target, catalyst: selected.catalyst, items, gridConfig });
  if (!placement.valid) return { legal: false, reason: placement.reason };
  const traits = getCanvasWeaponTraits(selected.catalyst).filter(trait => !['catalizador', 'dos manos', 'pesada', 'arrojadiza', 'barrido'].includes(trait));
  const suppressTraits = getTokenCombatCellContext(token, items, gridConfig).mode === 'duel'
    && getCanvasWeaponRange(selected.catalyst) === 1 && !traits.includes('duelista');
  const weapon = { ...selected.spell.item, name: selected.spell.item.name || selected.spell.item.nombre || 'Proyectil arcano',
    type: 'ability', spellId: 'arcane-projectile', catalyst: selected.catalyst,
    dano: selected.profile.map(die => die.die).join(' + '), alcance: selected.catalyst.alcance || selected.catalyst.alc || selected.catalyst.range,
    actionCost: 1, preventsActiveDefense: true, ignoresCover: true, rasgos: suppressTraits ? [] : traits };
  return { ...selected, placement, target, weapon };
};
