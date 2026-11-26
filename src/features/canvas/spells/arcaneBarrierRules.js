import { areTokensAllied, getCombatRenderPlacement, getTokenDistanceInCells, isCombatTokenItem } from '../../tactical-shared/legacyCombatRules';
import { canTokenSeeCanvasTarget } from '../../tactical-shared/canvasVision';
import { getTerrainCells } from '../../tactical-shared/tarTerrain';
import { canViewerSeeCanvasToken, isMasterOwnedCanvasToken } from '../../tactical-shared/tokenVisibilityAccess';
import { getCanvasArmorProtection } from '../combat/canvasArmorRules';
import { getCanvasWeaponRange, getCanvasWeaponTraits, hasCanvasStatus } from '../combat/canvasAttackRules';
import { validateCanvasSpellResources } from './canvasSpells';
import { hasArcaneBarrier } from './arcaneBarrierState';

// Only the master's explicit first-test correspondences are automated (9.5.4/9.5.7).
export const getArcaneBarrierResonance = catalyst => getCanvasWeaponTraits(catalyst)
  .filter(trait => ['critico', 'venenosa'].includes(trait));
export const canAdaptArcaneBarrier = (target, catalyst) => !getArcaneBarrierResonance(catalyst).includes('conmocion')
  && !getCanvasWeaponTraits({ rasgos: [...(target?.negatedTraits || target?.neutralizedTraits || []),
    ...getCanvasArmorProtection(target, catalyst).negatedTraits] }).includes('conmocion');

export const resolveArcaneBarrierTarget = ({ source, target, catalyst, items = [], gridConfig = {}, manaSpend = 0 }) => {
  if (!source || !target || !isCombatTokenItem(target) || (target.id !== source.id && !areTokensAllied(source, target)))
    return { valid: false, reason: 'Elige al Mago o a un aliado.' };
  if (!(Number(target.stats?.vida?.current) > 0)) return { valid: false, reason: 'El objetivo debe estar vivo.' };
  const range = getCanvasWeaponRange(catalyst), distance = getTokenDistanceInCells(source, target, gridConfig);
  if (distance > range) return { valid: false, distance, range, reason: 'El objetivo está fuera del alcance del Catalizador.' };
  if (hasArcaneBarrier(target)) return { valid: false, distance, range, reason: 'Este objetivo ya tiene una Barrera rúnica.' };
  const viewer = { isPlayerView: !isMasterOwnedCanvasToken(source),
    playerName: (Array.isArray(source.controlledBy) ? source.controlledBy[0] : source.controlledBy) || source.linkedClassOwner || '',
    selectedTokenIds: [source.id] };
  if (target.id !== source.id && (hasCanvasStatus(source, 'cegado') || !canViewerSeeCanvasToken(target, items, viewer)
    || !canTokenSeeCanvasTarget({ observer: source, target, items, gridConfig })))
    return { valid: false, distance, range, reason: 'El Mago debe poder ver al aliado.' };
  if (manaSpend && !canAdaptArcaneBarrier(target, catalyst))
    return { valid: false, distance, range, reason: 'El objetivo ya neutraliza Conmoción. Desactiva Adaptación.' };
  return { width: target.width || 50, height: target.height || 50,
    ...getCombatRenderPlacement(target, items, gridConfig), cells: getTerrainCells(target, gridConfig),
    columns: 1, rows: 1, valid: true, targetId: target.id, targetName: target.name || 'Aliado', distance, range };
};

export const validateCanvasArcaneBarrier = options => {
  const selected = validateCanvasSpellResources({ ...options, spellId: 'runic-barrier' });
  if (!selected.legal) return selected;
  const target = options.items.find(item => item.id === options.targetId);
  const placement = resolveArcaneBarrierTarget({ source: options.token, target, catalyst: selected.catalyst, ...options });
  return placement.valid ? { ...selected, target, placement,
    protections: [...getArcaneBarrierResonance(selected.catalyst), ...(options.manaSpend ? ['conmocion'] : [])] }
    : { legal: false, reason: placement.reason };
};
