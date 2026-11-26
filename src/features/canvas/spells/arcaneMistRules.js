import { resolveAreaPlacement, createAreaSceneItem, getTerrainAreaDefinition } from '../../tactical-shared/areaPlacementSystem';
import { getTokenCombatCellContext } from '../../tactical-shared/legacyCombatRules';
import { canTokenSeeCanvasTarget } from '../../tactical-shared/canvasVision';
import { getTerrainCells } from '../../tactical-shared/tarTerrain';
import { getCanvasWeaponRange, getCanvasWeaponTraits, hasCanvasStatus } from '../combat/canvasAttackRules';
import { validateCanvasSpellResources } from './canvasSpells';

export const resolveCanvasArcaneMistPlacement = ({ point, manaSpend = 0, source, catalyst, items = [], gridConfig = {} }) => {
  const range = getCanvasWeaponRange(catalyst);
  const size = manaSpend ? 3 : 2;
  const placement = resolveAreaPlacement({ point, source, range, gridConfig, size: { columns: size, rows: size } });
  const occupied = getTerrainCells(source, gridConfig);
  const distance = Math.max(...placement.cells.map(cell => Math.min(...occupied.map(origin => Math.max(
    Math.abs(origin.column - cell.column), Math.abs(origin.row - cell.row),
  )))));
  const base = { ...placement, distance, withinRange: distance <= range };
  if (!base.insideBounds) return { ...base, valid: false, reason: 'El área debe quedar completamente dentro del tablero.' };
  if (!base.withinRange) return { ...base, valid: false, reason: 'Toda el área debe quedar dentro del alcance del Catalizador.' };
  if (getTokenCombatCellContext(source, items, gridConfig).mode === 'duel'
    && (range >= 2 || getCanvasWeaponTraits(catalyst).includes('a distancia')))
    return { ...base, valid: false, reason: 'No puedes utilizar ese Catalizador en Duelo.' };
  if (hasCanvasStatus(source, 'cegado') && base.distance > 0)
    return { ...base, valid: false, reason: 'Cegado: no puedes elegir esa área.' };
  const cellWidth = base.width / size, cellHeight = base.height / size;
  if (base.cells.some(cell => !canTokenSeeCanvasTarget({ observer: source,
    target: { id: `mist-cell-${cell.column}:${cell.row}`,
      x: base.x + (cell.column - base.cells[0].column) * cellWidth,
      y: base.y + (cell.row - base.cells[0].row) * cellHeight, width: cellWidth, height: cellHeight }, items, gridConfig })))
    return { ...base, valid: false, reason: 'El Mago debe poder ver toda el área.' };
  return { ...base, cellPlacements: [base] };
};

export const validateCanvasArcaneMist = options => {
  const selected = validateCanvasSpellResources({ ...options, spellId: 'arcane-mist' });
  if (!selected.legal) return selected;
  if (![options.point?.x, options.point?.y].every(Number.isFinite))
    return { legal: false, reason: 'Elige un área válida.' };
  const placement = resolveCanvasArcaneMistPlacement({ ...options, source: options.token, catalyst: selected.catalyst });
  return placement.valid ? { ...selected, placement } : { legal: false, reason: placement.reason };
};

export const createArcaneMistAreas = ({ placement, castId, tokenId, now }) => placement.cellPlacements.map((cell, index) =>
  createAreaSceneItem({ ...getTerrainAreaDefinition('smoke'), id: `mist-${castId}-${index}`, placement: cell,
    name: 'Niebla arcana',
    areaEffect: { ...getTerrainAreaDefinition('smoke').areaEffect, spellId: 'arcane-mist', cloudId: castId,
      sourceTokenId: tokenId, expires: 'combat-end', createdAt: now },
  }));

export const isCombatEndArcaneMist = item => item?.type === 'geometry'
  && item.areaEffect?.spellId === 'arcane-mist' && item.areaEffect?.expires === 'combat-end';
