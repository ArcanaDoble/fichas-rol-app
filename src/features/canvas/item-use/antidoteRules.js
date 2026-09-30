import { isCanvasPoisoned } from '../../tactical-shared/poisonRules';
import { isCanvasBleeding } from '../../tactical-shared/bleedingRules';
import { getTokenDistanceInCells } from '../../tactical-shared/legacyCombatRules';
import { isCanvasTokenHiddenFromViewer, canTokenSeeThroughSmoke } from '../../tactical-shared/tokenVisibilityAccess';

export const getAntidoteBlockReason = (source, target, items = [], gridConfig = {}, viewer = {}, bandage = false) => {
    const name = bandage ? 'Vendaje' : 'Antídoto';
    if (!source || Number(source.stats?.vida?.current) <= 0) return `Necesitas estar en pie para usar el ${name}.`;
    if (!target || !['rogueliteClass', 'rogueliteEnemy'].includes(target.profileType)) return 'Elige una criatura.';
    if (target.id !== source.id && (isCanvasTokenHiddenFromViewer(target, items, viewer)
        || !canTokenSeeThroughSmoke(source, target, items))) return 'No puedes ver a esa criatura.';
    if (target.id !== source.id && getTokenDistanceInCells(source, target, gridConfig) !== 0)
        return `El ${name} requiere Toque: compartir casilla con la criatura.`;
    if (bandage ? !isCanvasBleeding(target) : !isCanvasPoisoned(target)) return bandage ? 'Esta criatura no tiene Sangrado.' : 'Esta criatura no está Envenenada.';
    return null;
};
