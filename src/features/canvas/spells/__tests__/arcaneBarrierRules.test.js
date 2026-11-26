import { resolveArcaneBarrierTarget, validateCanvasArcaneBarrier } from '../arcaneBarrierRules';
import { applyArcaneBarrier, clearArcaneBarrier, getArcaneBarrierBonus } from '../arcaneBarrierState';
import { resolveCanvasAttackDamage } from '../../combat/canvasAttackRules';
import { getCanvasArmorProtection } from '../../combat/canvasArmorRules';
import { getCanvasSpellId } from '../canvasSpells';

const spell = { id: 'barrier', name: 'Barrera rúnica', type: 'ability' };
const catalyst = { id: 'staff', type: 'weapon', dano: 'd8', alcance: 'Lejano', rasgos: ['Catalizador', 'Crítico', 'Veneno'] };
const source = { id: 'mage', layer: 'TOKEN', profileType: 'rogueliteClass', classIdentity: 'Mago', level: 2,
  controlledBy: ['Ada'], teamId: 'party', equippedItems: [catalyst], equippedSkillSlots: [spell, null, null],
  x: 0, y: 0, width: 50, height: 50, stats: { vida: { current: 5, max: 5 }, recurso: { current: 2, max: 3 } } };
const target = { id: 'ally', layer: 'TOKEN', profileType: 'rogueliteClass', teamId: 'party', controlledBy: ['Bruno'],
  x: 100, y: 0, width: 50, height: 50, stats: { vida: { current: 8, max: 8 }, cd: { current: 4, max: 4 } } };
const gridConfig = { isInfinite: true, cellWidth: 50, cellHeight: 50 };
const combat = { status: 'active', roundPhase: 'turns', activeBlockIndex: 0, blocks: [{ memberIds: ['mage'] }],
  participants: { mage: { actionDice: [{ id: 'die', sides: 6, value: 6, status: 'available' }] } } };
const options = { source, token: source, target, targetId: target.id, catalyst, items: [source, target], gridConfig,
  combat, slotIndex: 0, catalystId: 'staff', actionDieId: 'die' };

test.each(['Barrera rúnica', 'Barrera arcana', 'ability:barrier'])('recognizes prepared %s', name => {
  expect(getCanvasSpellId({ name })).toBe('runic-barrier');
});
test('one copy and action, no Pressure; resonance and Adaptation/Conservation have separate costs', () => {
  expect(validateCanvasArcaneBarrier(options)).toMatchObject({ legal: true, manaCost: 0, protections: ['critico', 'venenosa'] });
  const result = validateCanvasArcaneBarrier({ ...options, manaSpend: 1, conserve: true });
  expect(result).toMatchObject({ legal: true, manaCost: 2, protections: ['critico', 'venenosa', 'conmocion'] });
  expect(result.weapon).toBeUndefined();
  expect(result.pressure).toBeUndefined();
});
test('self is allowed while Cegado, with no vision; enemies, dead, distant and already protected allies are rejected', () => {
  expect(resolveArcaneBarrierTarget({ ...options, source: { ...source, hasVision: false, status: [{ id: 'cegado' }] }, target: source }).valid).toBe(true);
  for (const invalid of [{ ...target, teamId: 'enemy' }, { ...target, x: 200 },
    { ...target, stats: { vida: { current: 0 } } }, applyArcaneBarrier(target, { castId: 'old', now: 1 }),
    { ...target, status: ['barrera'] }])
    expect(resolveArcaneBarrierTarget({ ...options, target: invalid }).valid).toBe(false);
});
test('actual caster vision checks walls, smoke, fog and Oculto even for a Master casting', () => {
  const wall = { id: 'wall', type: 'wall', x1: 75, y1: -100, x2: 75, y2: 200 };
  const smoke = { id: 'smoke', type: 'geometry', geometryKind: 'smoke', x: 100, y: 0, width: 50, height: 50 };
  expect(resolveArcaneBarrierTarget({ ...options, items: [source, target, wall] }).valid).toBe(false);
  expect(resolveArcaneBarrierTarget({ ...options, items: [source, target, smoke] }).valid).toBe(false);
  expect(resolveArcaneBarrierTarget({ ...options, source: { ...source, hasVision: true, visionRadius: 60 }, gridConfig: { ...gridConfig, fogOfWar: true } }).valid).toBe(false);
  // The shared party may see its own Oculto allies; a Master's caster has no such player access.
  expect(resolveArcaneBarrierTarget({ ...options, target: { ...target, status: [{ id: 'oculto' }] } }).valid).toBe(true);
  expect(resolveArcaneBarrierTarget({ ...options, source: { ...source, controlledBy: ['master'] },
    target: { ...target, status: [{ id: 'oculto' }] } }).valid).toBe(false);
});
test('Adaptation cannot spend Mana to add an already neutralized protection', () => {
  const armored = { ...target, equippedItems: [{ type: 'armor', name: 'Gambesón' }] };
  expect(resolveArcaneBarrierTarget({ ...options, target: armored, manaSpend: 1 }).valid).toBe(false);
  expect(resolveArcaneBarrierTarget({ ...options, target: armored }).valid).toBe(true);
});
test('temporary +1 CD changes damage thresholds and stacks with shield, with no base-stat mutation', () => {
  const protectedTarget = applyArcaneBarrier(target, { castId: 'cast', protections: ['critico', 'venenosa', 'conmocion'], now: 1 });
  expect(resolveCanvasAttackDamage({ attackPressure: 9, target: protectedTarget })).toMatchObject({ baseCd: 4, effectiveCd: 5, barrierBonus: 1, lifeLost: 1 });
  expect(resolveCanvasAttackDamage({ attackPressure: 9, target: { ...protectedTarget, profileType: 'rogueliteEnemy' }, defenseCdBonus: 1 })).toMatchObject({ effectiveCd: 6 });
  expect(resolveCanvasAttackDamage({ attackPressure: 9, target: protectedTarget, weapon: { rasgos: ['Perforante'] } })).toMatchObject({ effectiveCd: 4, lifeLost: 2 });
  expect(protectedTarget.stats).toBe(target.stats);
  expect(getCanvasArmorProtection(protectedTarget, catalyst).negatedTraits).toEqual(['critico', 'venenosa', 'conmocion']);
  const cleared = clearArcaneBarrier(protectedTarget);
  expect(cleared).toMatchObject(target);
  expect(cleared.arcaneBarrier).toBeUndefined();
  expect(cleared.status || []).not.toContain('barrera');
});

test('a manually selected Barrera grants the same temporary CD without inventing Catalyst protections', () => {
  const protectedTarget = { ...target, status: ['oculto', 'barrera'] };
  expect(resolveCanvasAttackDamage({ attackPressure: 9, target: protectedTarget }))
    .toMatchObject({ baseCd: 4, effectiveCd: 5, barrierBonus: 1, lifeLost: 1 });
  expect(resolveCanvasAttackDamage({ attackPressure: 9,
    target: { ...protectedTarget, profileType: 'rogueliteEnemy' }, defenseCdBonus: 1 }))
    .toMatchObject({ effectiveCd: 6 });
  expect(getCanvasArmorProtection(protectedTarget, catalyst).negatedTraits).toEqual([]);
  expect(protectedTarget.stats).toBe(target.stats);
  const cleared = clearArcaneBarrier(protectedTarget);
  expect(cleared.status).toEqual(['oculto']);
  expect(getArcaneBarrierBonus(cleared)).toBe(0);
  expect(resolveCanvasAttackDamage({ attackPressure: 9, target: cleared }))
    .toMatchObject({ baseCd: 4, effectiveCd: 4, lifeLost: 2 });
});
