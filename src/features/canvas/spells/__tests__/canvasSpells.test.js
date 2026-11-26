import { getCanvasPreparedSpells, getCanvasSpellAvailability, resolveCanvasFireballPlacement, updateCanvasMageMana, validateCanvasFireball } from '../canvasSpells';
import { createRogueliteActiveRunFromToken } from '../../../roguelite/activeRun';
import { getExplosiveBombTargets } from '../../item-use/explosiveBombRules';
import { resolveCanvasAttackDamage } from '../../combat/canvasAttackRules';

const gridConfig = { isInfinite: true, cellWidth: 50, cellHeight: 50 };
const staff = { id: 'staff', name: 'Bastón arcano', type: 'weapon', dano: 'd8', alcance: 'Lejano', rasgos: ['Catalizador'] };
const fireball = { id: 'fireball', name: 'Bola de fuego', type: 'ability', isPrepared: true };
const mage = { id: 'mage', layer: 'TOKEN', profileType: 'rogueliteClass', classIdentity: 'Mago', level: 2,
  x: 0, y: 0, width: 50, height: 50, controlledBy: ['Ada'], equippedItems: [staff],
  equippedSkillSlots: [fireball, fireball, null], equippedSkillIds: ['fireball', 'fireball', null],
  stats: { recurso: { label: 'Maná', current: 2, max: 3 }, vida: { current: 5 }, cd: { current: 5 } } };
const combat = { status: 'active', roundPhase: 'turns', round: 1, activeBlockIndex: 0,
  blocks: [{ memberIds: ['mage'], actedIds: [] }], participants: { mage: {
    actionDice: [{ id: 'die', sides: 6, value: 4, status: 'available' }] } } };
const validate = (patch = {}) => validateCanvasFireball({ token: mage, combat, slotIndex: 0,
  catalystId: 'staff', actionDieId: 'die', point: { x: 50, y: 0 }, gridConfig, items: [mage], ...patch });

test('repeated prepared spells have independent copies and ignore stale usage identities', () => {
  const token = { ...mage, usedSkillSlots: [true, false, false], usedSkillSlotIds: ['fireball', 'fireball', null] };
  expect(getCanvasPreparedSpells(token).map(spell => spell?.used)).toEqual([true, false, undefined]);
  expect(getCanvasSpellAvailability(token, combat, 0).available).toBe(false);
  expect(getCanvasSpellAvailability(token, combat, 1).available).toBe(true);
  expect(getCanvasPreparedSpells({ ...token, usedSkillSlotIds: ['old-spell'] })[0].used).toBe(false);
  expect(getCanvasPreparedSpells({ ...mage, equippedSkillSlots: [{ id: 'custom-entry', payload: fireball }] })[0])
    .toMatchObject({ spellId: 'fireball', item: { name: 'Bola de fuego' } });
});

test('base fireball needs no mana and intensification adds just one base catalyst die', () => {
  expect(validate({ token: { ...mage, stats: { ...mage.stats, recurso: { current: 0 } } } }).legal).toBe(true);
  const attack = validate({ manaSpend: 1 });
  expect(attack.legal).toBe(true);
  expect(attack.profile.map(die => die.sides)).toEqual([8, 8]);
  expect(attack.placement.cells).toHaveLength(4);
  expect(attack.weapon.rasgos).toContain('fuego');
  expect(validate({ manaSpend: 2 }).legal).toBe(false);
  expect(validate({ manaSpend: 1, token: { ...mage, stats: { ...mage.stats, recurso: { current: 0 } } } }).legal).toBe(false);
});

test('practice allows opening a prepared spell before rolling, without bypassing live turns or pending defenses', () => {
  const options = { practice: true };
  expect(getCanvasSpellAvailability(mage, null, 0, options).available).toBe(true);
  expect(getCanvasSpellAvailability(mage, { status: 'finished' }, 0, options).available).toBe(true);
  expect(getCanvasSpellAvailability(mage, { status: 'setup' }, 0, options).available).toBe(false);
  expect(getCanvasSpellAvailability(mage, { ...combat, blocks: [{ memberIds: ['other'] }] }, 0, options).available).toBe(false);
  expect(getCanvasSpellAvailability(mage, null, 0, { ...options, practiceCombat: { pendingAttack: {} } }).reason).toMatch(/defensa pendiente/);
  expect(getCanvasSpellAvailability({ ...mage, usedSkillSlots: [true] }, null, 0, options).reason).toMatch(/gastada/);
  expect(getCanvasSpellAvailability({ ...mage, equippedItems: [] }, null, 0, options).reason).toMatch(/Catalizador/);
});

test('the far side of the area must remain in range even when the nearest cell is legal', () => {
  const source = { ...mage, x: 100, y: 100 };
  const catalyst = { ...staff, alcance: 'Intermedio' };
  const resolve = x => resolveCanvasFireballPlacement({ point: { x, y: 100 }, source, catalyst, gridConfig, items: [source] });
  expect(resolve(150).valid).toBe(true);
  expect(resolve(200)).toMatchObject({ valid: false, reason: 'out-of-range', distance: 3, range: 2 });
});

test('range uses the entire caster footprint and rectangular grid cell sizes', () => {
  const largeMage = { ...mage, width: 100, height: 100 };
  const placement = resolveCanvasFireballPlacement({ point: { x: 100, y: 0 }, source: largeMage,
    catalyst: { ...staff, alcance: 'Intermedio' }, gridConfig, items: [largeMage] });
  expect(placement).toMatchObject({ valid: true, distance: 2 });
  const rectangular = resolveCanvasFireballPlacement({ point: { x: 80, y: 30 }, source: mage,
    catalyst: staff, gridConfig: { ...gridConfig, cellWidth: 80, cellHeight: 30 }, items: [mage] });
  expect(rectangular).toMatchObject({ width: 160, height: 60 });
});

test('fireball includes allies, the caster and partially overlapping large enemies only once', () => {
  const enemy = { ...mage, id: 'enemy', profileType: 'rogueliteEnemy', x: 50, y: 50, width: 100, height: 100 };
  const ally = { ...mage, id: 'ally', x: 50 };
  const outside = { ...enemy, id: 'outside', x: 200 };
  const placement = validate({ point: { x: 0, y: 0 } }).placement;
  expect(getExplosiveBombTargets({ items: [mage, enemy, ally, outside], placement, gridConfig }).map(item => item.id))
    .toEqual(['mage', 'enemy', 'ally']);
});

test('out of turn, spent dice, duel and unprepared spells cannot launch', () => {
  expect(validate({ combat: { ...combat, blocks: [{ memberIds: ['other'] }] } }).legal).toBe(false);
  expect(validate({ actionDieId: 'missing' }).legal).toBe(false);
  expect(validate({ slotIndex: 2 }).legal).toBe(false);
  const duelingMage = { ...mage, width: 25, height: 25 };
  expect(validate({ token: duelingMage, items: [duelingMage, { ...duelingMage, id: 'enemy', controlledBy: ['enemy'] }] }).reason).toMatch(/Duelo/);
});

test('conservation is a separate mana cost, requires level two and is once per combat', () => {
  expect(validate({ conserve: true, manaSpend: 1 })).toMatchObject({ legal: true, manaCost: 2 });
  expect(validate({ conserve: true, token: { ...mage, level: 1 } }).legal).toBe(false);
  expect(validate({ conserve: true, combat: { ...combat, participants: { mage: { ...combat.participants.mage, arcaneConservationUsed: true } } } }).legal).toBe(false);
});

test('the mage encounter cycle retains spent copies on start, caps mana and restores copies only on end', () => {
  const spent = { ...mage, usedSkillSlots: [true, false, false] };
  const started = updateCanvasMageMana(spent, 'start');
  expect(started.stats.recurso.current).toBe(1);
  expect(started.usedSkillSlots).toEqual([true, false, false]);
  expect(updateCanvasMageMana({ ...spent, level: 5 }, 'start').stats.recurso.current).toBe(2);
  expect(updateCanvasMageMana(updateCanvasMageMana(spent, 'round'), 'round').stats.recurso.current).toBe(3);
  expect(updateCanvasMageMana(spent, 'end')).toMatchObject({ usedSkillSlots: [false, false, false], stats: { recurso: { current: 0 } } });
  const run = createRogueliteActiveRunFromToken({ ...spent, runId: 'run', linkedClassId: 'mage', linkedClassOwner: 'Ada' });
  expect(run.usedSkillSlots).toEqual(spent.usedSkillSlots);
});

test('fire weakness adds one life block after defense without changing pressure or adding a status', () => {
  const target = { stats: { vida: { current: 5 }, cd: { current: 4 } }, weaknesses: ['Fuego'] };
  const weapon = { rasgos: ['Fuego'] };
  expect(resolveCanvasAttackDamage({ target, weapon, attackPressure: 4 }))
    .toMatchObject({ finalPressure: 4, lifeLost: 2, fireWeaknessBonus: 1, nextLife: 3 });
  expect(resolveCanvasAttackDamage({ target, weapon, attackPressure: 4, defenseDice: [{ value: 1 }] }).lifeLost).toBe(0);
  expect(resolveCanvasAttackDamage({ target: { ...target, weaknesses: [] }, weapon, attackPressure: 4 }).lifeLost).toBe(1);
  expect(resolveCanvasAttackDamage({ target: { ...target, stats: { ...target.stats, vidaTemporal: { current: 2 } } }, weapon, attackPressure: 4 }))
    .toMatchObject({ finalPressure: 4, fireWeaknessBonus: 1, temporaryLifeLost: 2, normalLifeLost: 0, nextLife: 5 });
});
