import { getTerrainCells, resolveTarIgnition } from '../../tactical-shared/tarTerrain';
import { getExplosiveBombTargets } from '../item-use/explosiveBombRules';
import { hasCanvasWeaponTrait } from './canvasAttackRules';

export const hasFireSource = weapon => hasCanvasWeaponTrait(weapon, 'fuego')
    || hasCanvasWeaponTrait(weapon?.payload, 'fuego')
    || weapon?.attackWeapons?.some(part => hasCanvasWeaponTrait(part, 'fuego'));

export const expandFireArea = ({ weapon, cells, items, gridConfig }) => {
    const ignition = hasFireSource(weapon) ? resolveTarIgnition({ items, fireCells: cells, config: gridConfig }) : { cells: [], zoneIds: [] };
    const unique = new Map([...cells, ...ignition.cells].map(cell => [`${cell.column}:${cell.row}`, cell]));
    return { cells: [...unique.values()], zoneIds: ignition.zoneIds };
};

export const attachTarIgnition = (combat, items, gridConfig) => {
    const attack = combat.pendingAttack;
    if (!attack || combat.explosiveBlast || !hasFireSource(attack.weapon)) return combat;
    const target = items.find(item => item.id === attack.targetId);
    if (!target) return combat;
    const ignition = expandFireArea({ weapon: attack.weapon, cells: getTerrainCells(target, gridConfig), items, gridConfig });
    if (!ignition.zoneIds.length) return combat;
    const targets = getExplosiveBombTargets({ items, gridConfig, placement: { valid: true, cells: ignition.cells } });
    const ids = [target.id, ...targets.filter(item => item.id !== target.id).map(item => item.id)];
    const id = `ignition-${attack.id}`;
    return { ...combat,
        pendingAttack: { ...attack, blastId: id, blastIndex: 0, blastCount: ids.length },
        explosiveBlast: { id, phase: 'resolving', sourceTokenId: attack.attackerId,
            targetIds: ids, targetNames: Object.fromEntries(targets.map(item => [item.id, item.name || 'Objetivo'])),
            nextTargetIndex: 1, attackTemplate: attack, tarZoneIds: ignition.zoneIds, createdAt: attack.createdAt },
    };
};
