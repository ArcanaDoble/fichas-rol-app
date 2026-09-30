import { getTerrainMovementCost, getTokenTarCoverage, resolveTarIgnition } from '../tarTerrain';
import { attachTarIgnition } from '../../canvas/combat/canvasTarIgnition';
import { continueCanvasExplosiveBlast } from '../../canvas/combat/canvasExplosiveBlast';

const config = { isInfinite: true, cellWidth: 50, cellHeight: 50 };
const tar = (id, x, y) => ({ id, type: 'geometry', geometryKind: 'tar', x, y, width: 100, height: 100 });
const token = { id: 'hero', profileType: 'rogueliteClass', x: 0, y: 0, width: 50, height: 50 };
test('difficult terrain charges entered cells once, including overlapping puddles', () => {
    const args = { token, from: token, to: { x: 150, y: 0 }, items: [tar('a', 50, 0), tar('b', 50, 0)], config };
    expect(getTerrainMovementCost(args)).toBe(5);
    expect(getTerrainMovementCost({ ...args, exceptional: true })).toBe(3);
    expect(getTerrainMovementCost({ ...args, token: { ...token, width: 100, height: 100 } })).toBe(5);
});
test('orthogonal adjacency spreads across bombs; diagonal contact does not', () => {
    const items = [tar('a', 100, 0), tar('b', 200, 0), tar('c', 300, 100)];
    const ignition = resolveTarIgnition({ items, fireCells: [{ column: 1, row: 0 }], config });
    expect(ignition.zoneIds).toEqual(['a', 'b']);
    expect(ignition.cells).toHaveLength(8);
});
test('allies, source and large creatures each resolve the original fire pressure once', () => {
    const enemy = { ...token, id: 'ogre', profileType: 'rogueliteEnemy', x: 100, width: 100, height: 100 };
    const items = [token, enemy, tar('a', 0, 0), tar('b', 100, 0)];
    const attack = { id: 'fire', attackerId: 'hero', targetId: 'ogre', weapon: { rasgos: ['Fuego'] }, pressure: { total: 12 }, weaponResults: [7], actionDice: [], actionDieIds: ['paid'] };
    const combat = attachTarIgnition({ pendingAttack: attack }, items, config);
    expect(combat.explosiveBlast.targetIds).toEqual(['ogre', 'hero']);
    expect(combat.explosiveBlast.tarZoneIds).toEqual(['a', 'b']);
    const next = continueCanvasExplosiveBlast({ ...combat, pendingAttack: null }, { ...combat.pendingAttack, pressure: { total: 14 } }, items);
    expect(next.pendingAttack).toMatchObject({ targetId: 'hero', pressure: { total: 14 }, weaponResults: [7], actionDieIds: [], status: 'awaiting-defense' });
    expect(continueCanvasExplosiveBlast({ ...next, pendingAttack: null }, next.pendingAttack, items).explosiveBlast).toBeNull();
});
test('ordinary attacks do not ignite tar', () => {
    const combat = { pendingAttack: { targetId: 'hero', weapon: { rasgos: ['Crítico'] } } };
    expect(attachTarIgnition(combat, [token, tar('a', 0, 0)], config)).toBe(combat);
});

test('a fire counterattack waits for the current area and preserves its surplus without rerolling', () => {
    const burst = { id: 'counter', targetIds: ['hero'], tarZoneIds: ['fresh-tar'],
        attackTemplate: { weaponResults: [], actionDieIds: [], pressure: { total: 3 } } };
    const next = continueCanvasExplosiveBlast({ pendingAttack: null,
        explosiveBlast: { id: 'original', targetIds: ['ogre'], nextTargetIndex: 1 }, queuedFireBursts: [burst] },
    { blastId: 'original' }, [token]);
    expect(next.pendingAttack).toMatchObject({ targetId: 'hero', pressure: { total: 3 }, weaponResults: [], actionDieIds: [] });
    expect(next.explosiveBlast.id).toBe('counter');
    expect(next.queuedFireBursts).toEqual([]);
});

test('portrait staining tracks partial footprint coverage without stacking overlapping puddles', () => {
    const large = { ...token, width: 100, height: 100 };
    expect(getTokenTarCoverage(large, [tar('a', 50, 0), tar('b', 50, 0)], config)).toBe(0.5);
    expect(getTokenTarCoverage(token, [tar('a', 0, 0)], config)).toBe(1);
    expect(getTokenTarCoverage({ ...token, x: 150 }, [tar('a', 0, 0)], config)).toBe(0);
    expect(getTokenTarCoverage(token, [], config)).toBe(0);
});
