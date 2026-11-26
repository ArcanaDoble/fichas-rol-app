import { createArcaneMistAreas, isCombatEndArcaneMist, resolveCanvasArcaneMistPlacement, validateCanvasArcaneMist } from '../arcaneMistRules';
import { getGridWorldRect } from '../../../tactical-shared/spatial';
import { getCanvasSpellId } from '../canvasSpells';
import { canTokenSeeThroughSmoke, tokenHasHiddenStatus } from '../../../tactical-shared/tokenVisibilityAccess';

const spell = { id: 'mist', name: 'Niebla arcana', type: 'ability' };
const catalyst = { id: 'staff', type: 'weapon', dano: 'd8 + d6', alcance: 'Lejano', rasgos: ['Catalizador'] };
const source = { id: 'mage', profileType: 'rogueliteClass', classIdentity: 'Mago', equippedItems: [catalyst],
  equippedSkillSlots: [spell, spell, null], x: 50, y: 50, width: 50, height: 50, level: 2,
  stats: { recurso: { current: 2, max: 3 } } };
const gridConfig = { cellWidth: 50, cellHeight: 50, isInfinite: true };
const combat = { status: 'active', roundPhase: 'turns', activeBlockIndex: 0, blocks: [{ memberIds: ['mage'] }],
  participants: { mage: { actionDice: [{ id: 'die', sides: 6, value: 6, status: 'available' }] } } };
const options = { token: source, source, catalyst, gridConfig, items: [source], combat,
  slotIndex: 0, catalystId: 'staff', actionDieId: 'die', point: { x: 150, y: 150 } };

test('recognizes the master spell and covers a complete 2×2 square without Pressure', () => {
  expect(getCanvasSpellId(spell)).toBe('arcane-mist');
  const result = validateCanvasArcaneMist(options);
  expect(result).toMatchObject({ legal: true, manaCost: 0, placement: { width: 100, height: 100,
    cells: [{ column: 3, row: 3 }, { column: 4, row: 3 }, { column: 3, row: 4 }, { column: 4, row: 4 }] } });
  expect(result.weapon).toBeUndefined();
  expect(result.pressure).toBeUndefined();
});

test('one Mana extends to one continuous 3×3 cloud; Conservation adds its own cost', () => {
  const result = validateCanvasArcaneMist({ ...options, point: { x: 100, y: 100 }, manaSpend: 1, conserve: true });
  expect(result).toMatchObject({ legal: true, manaCost: 2, placement: { columns: 3, rows: 3, width: 150, height: 150 } });
  expect(result.placement.cells).toHaveLength(9);
  expect(new Set(result.placement.cells.map(cell => `${cell.column}:${cell.row}`)).size).toBe(9);
  const areas = createArcaneMistAreas({ placement: result.placement, castId: 'cast', tokenId: 'mage', now: 1 });
  expect(areas).toMatchObject([{ width: 150, height: 150, controlledBy: ['master'],
    areaEffect: { type: 'smoke', expires: 'combat-end', cloudId: 'cast' } }]);
  expect(areas).toHaveLength(1);
  expect(areas.every(isCombatEndArcaneMist)).toBe(true);
});

test('the entire square respects Catalyst range and board bounds, including rectangular grids', () => {
  expect(validateCanvasArcaneMist({ ...options, point: { x: 200, y: 50 } }).legal).toBe(false);
  expect(validateCanvasArcaneMist({ ...options, manaSpend: 1 }).legal).toBe(false);
  expect(validateCanvasArcaneMist({ ...options, point: { x: NaN, y: 150 } }).legal).toBe(false);
  const bounded = { ...gridConfig, isInfinite: false, columns: 4, rows: 4 };
  const rect = getGridWorldRect(bounded);
  const shiftedSource = { ...source, x: rect.x + 50, y: rect.y + 50 };
  const boundedOptions = { ...options, source: shiftedSource, gridConfig: bounded, items: [shiftedSource] };
  expect(resolveCanvasArcaneMistPlacement({ ...boundedOptions, point: { x: rect.x + 150, y: rect.y + 150 } }).valid).toBe(false);
  expect(resolveCanvasArcaneMistPlacement({ ...boundedOptions, point: { x: rect.x + 100, y: rect.y + 100 } }).valid).toBe(true);
  const rectangular = resolveCanvasArcaneMistPlacement({ ...options, point: { x: 100, y: 100 }, manaSpend: 1,
    gridConfig: { ...gridConfig, cellWidth: 40, cellHeight: 60 } });
  expect(rectangular).toMatchObject({ valid: true, width: 120, height: 180, columns: 3, rows: 3 });
});

test('a visible anchor does not permit hidden cells elsewhere in the square', () => {
  const observer = { ...source, hasVision: true, visionRadius: 135 };
  expect(resolveCanvasArcaneMistPlacement({ ...options, point: { x: 100, y: 100 }, source: observer,
    gridConfig: { ...gridConfig, fogOfWar: true } }).valid).toBe(false);
  const wall = { id: 'wall', type: 'wall', x1: 175, y1: -100, x2: 175, y2: 400 };
  expect(resolveCanvasArcaneMistPlacement({ ...options, point: { x: 100, y: 100 }, items: [source, wall] }).valid).toBe(false);
  const smoke = { id: 'smoke', type: 'geometry', geometryKind: 'smoke', x: 150, y: 150, width: 50, height: 50 };
  expect(resolveCanvasArcaneMistPlacement({ ...options, point: { x: 100, y: 100 }, items: [source, smoke] }).valid).toBe(false);
});

test('the square is neutral smoke: inside vision works, both boundaries block, Oculto remains independent', () => {
  const placement = resolveCanvasArcaneMistPlacement(options);
  const areas = createArcaneMistAreas({ placement, castId: 'cast', tokenId: 'mage', now: 1 });
  const inside = { id: 'inside', x: 150, y: 150, width: 50, height: 50, status: [{ id: 'oculto' }] };
  const other = { ...inside, id: 'other', x: 200, y: 200, status: [] };
  const outside = { ...other, id: 'outside', x: 100, y: 100 };
  expect(canTokenSeeThroughSmoke(inside, other, areas)).toBe(true);
  expect(canTokenSeeThroughSmoke(inside, outside, areas)).toBe(false);
  expect(canTokenSeeThroughSmoke(outside, inside, areas)).toBe(false);
  expect(tokenHasHiddenStatus(inside)).toBe(true);
  expect(tokenHasHiddenStatus(other)).toBe(false);
  expect(isCombatEndArcaneMist({ ...areas[0], areaEffect: { type: 'smoke' } })).toBe(false);
});
