import { findArcaneProjectileRoute, resolveArcaneProjectileTarget, validateCanvasArcaneProjectile } from '../arcaneProjectileRules';
import { getCanvasSpellId, validateCanvasFireball } from '../canvasSpells';
import { resolveCanvasAttackDamage } from '../../combat/canvasAttackRules';

const gridConfig = { isInfinite: true, cellWidth: 50, cellHeight: 50 };
const spell = { id: 'projectile', name: 'Proyectil arcano', type: 'ability' };
const staff = { id: 'staff', type: 'weapon', dano: 'd8', alcance: 'Lejano', rasgos: ['Catalizador', 'Perforante'] };
const mage = { id: 'mage', layer: 'TOKEN', profileType: 'rogueliteClass', classIdentity: 'Mago', level: 2,
  x: 50, y: 50, width: 50, height: 50, controlledBy: ['Ada'], equippedItems: [staff], equippedSkillSlots: [spell],
  stats: { vida: { current: 5 }, recurso: { current: 2 } } };
const enemy = { id: 'enemy', layer: 'TOKEN', profileType: 'rogueliteEnemy', x: 150, y: 50, width: 50, height: 50,
  stats: { vida: { current: 5 }, cd: { current: 5 } } };
const combat = { status: 'active', roundPhase: 'turns', activeBlockIndex: 0, blocks: [{ memberIds: ['mage'] }],
  participants: { mage: { actionDice: [{ id: 'die', value: 4, sides: 6, status: 'available' }] } } };
const validate = patch => validateCanvasArcaneProjectile({ token: mage, combat, slotIndex: 0, catalystId: 'staff',
  actionDieId: 'die', targetId: 'enemy', items: [mage, enemy], gridConfig, ...patch });

test('catalog aliases resolve the same spell; chain adds no dice to the first impact and cannot cast another prepared spell', () => {
  expect(getCanvasSpellId(spell)).toBe('arcane-projectile');
  expect(getCanvasSpellId({ nombre: 'Proyectil mágico' })).toBe('arcane-projectile');
  const selected = validate({ manaSpend: 1, conserve: true });
  expect(selected).toMatchObject({ legal: true, manaCost: 2, weapon: { preventsActiveDefense: true, ignoresCover: true, rasgos: ['perforante'] } });
  expect(selected.profile).toHaveLength(1);
  expect(validateCanvasFireball({ token: mage, combat, slotIndex: 0 }).legal).toBe(false);
  expect(validate({ token: { ...mage, stats: { ...mage.stats, recurso: { current: 0 } } }, manaSpend: 1 }).legal).toBe(false);
});

test('active defense is ignored while passive shield CD and compatible catalyst traits still apply', () => {
  const selected = validate({});
  const result = resolveCanvasAttackDamage({ attackPressure: 10, defenseDice: [{ value: 20 }],
    target: enemy, weapon: selected.weapon, defenseCdBonus: 1 });
  expect(result).toMatchObject({ defense: 0, surplus: 0, shieldBonus: 1, effectiveCd: 5, lifeLost: 2 });
});

test('an ally can locate an enemy around a wall; a physical route must remain open', () => {
  const wall = { id: 'wall', type: 'wall', x1: 125, y1: 25, x2: 125, y2: 125 };
  const ally = { ...mage, id: 'ally', x: 150, y: 150 };
  const route = findArcaneProjectileRoute(mage, enemy, [wall], gridConfig);
  expect(route.length).toBeGreaterThan(2);
  expect(validate({ items: [mage, enemy, wall] }).legal).toBe(false);
  expect(validate({ items: [mage, enemy, wall, ally] }).legal).toBe(true);
  expect(validate({ items: [mage, { ...enemy, status: ['oculto'] }, wall, ally] }).legal).toBe(false);
});

test('sealed barriers and closed doors block the missile, while an open door restores the route', () => {
  const walls = [[125, 25, 225, 25], [225, 25, 225, 125], [225, 125, 125, 125], [125, 125, 125, 25]]
    .map(([x1, y1, x2, y2], index) => ({ id: `wall-${index}`, type: 'wall', x1, y1, x2, y2 }));
  expect(findArcaneProjectileRoute(mage, enemy, walls, gridConfig)).toBeNull();
  const door = walls.map((wall, index) => index === 3 ? { ...wall, wallType: 'door', isOpen: false } : wall);
  expect(findArcaneProjectileRoute(mage, enemy, door, gridConfig)).toBeNull();
  expect(findArcaneProjectileRoute(mage, enemy, door.map(wall => ({ ...wall, isOpen: true })), gridConfig)).not.toBeNull();
});

test('chain reach starts at the first target and cannot hit it again, allies or hidden creatures', () => {
  const far = { ...enemy, id: 'far', x: 300 };
  expect(resolveArcaneProjectileTarget({ source: mage, target: far, catalyst: staff, items: [mage, enemy, far], gridConfig }).valid).toBe(false);
  expect(resolveArcaneProjectileTarget({ source: mage, origin: enemy, target: far, catalyst: staff,
    items: [mage, enemy, far], gridConfig, excludeId: enemy.id })).toMatchObject({ valid: true, distance: 3 });
  expect(resolveArcaneProjectileTarget({ source: mage, origin: enemy, target: enemy, catalyst: staff,
    items: [mage, enemy], gridConfig, excludeId: enemy.id }).valid).toBe(false);
  expect(resolveArcaneProjectileTarget({ source: mage, target: { ...mage, id: 'ally' }, catalyst: staff, gridConfig }).valid).toBe(false);
});

test('fog uses actual vision instead of catalyst range or the master overview', () => {
  const sighted = { ...mage, hasVision: true, visionRadius: 60 };
  const fog = { ...gridConfig, fogOfWar: true };
  expect(validate({ token: sighted, items: [sighted, enemy], gridConfig: fog }).legal).toBe(false);
  expect(validate({ token: { ...sighted, visionRadius: 300 }, items: [sighted, enemy], gridConfig: fog }).legal).toBe(true);
  expect(validate({ token: { ...sighted, hasVision: false }, items: [sighted, enemy], gridConfig: fog }).legal).toBe(false);
  expect(validate({ gridConfig: fog }).legal).toBe(false);
  expect(validate({ token: sighted, items: [sighted, enemy] }).legal).toBe(true);
  const light = { type: 'light', x: 150, y: 50, width: 10, height: 10, radius: 500 };
  expect(validate({ token: { ...sighted, hasDarkvision: true, darkvisionRadius: 500 },
    items: [sighted, enemy, light], gridConfig: fog }).legal).toBe(false);
});

test('an allied locator must really see the enemy inside its own active sight', () => {
  const fog = { ...gridConfig, fogOfWar: true };
  const sighted = { ...mage, hasVision: true, visionRadius: 60 };
  const ally = { ...mage, id: 'ally', hasVision: true, visionRadius: 50, x: 150, y: 80 };
  const localized = patch => validate({ token: sighted, gridConfig: fog,
    items: [sighted, enemy, { ...ally, ...patch }] });
  expect(localized({}).legal).toBe(true);
  expect(localized({ visionRadius: 10 }).legal).toBe(false);
  expect(localized({ hasVision: false }).legal).toBe(false);
  expect(localized({ status: ['cegado'] }).legal).toBe(false);
  expect(localized({ controlledBy: ['master'] }).legal).toBe(false);
});

test('localization matches fog wall shadows and transparent windows', () => {
  const sighted = { ...mage, hasVision: true, visionRadius: 300 };
  const wall = { id: 'wall', type: 'wall', x1: 125, y1: 76, x2: 125, y2: 200 };
  const localized = patch => validate({ token: sighted, gridConfig: { ...gridConfig, fogOfWar: true },
    items: [sighted, enemy, { ...wall, ...patch }] });
  expect(localized({}).legal).toBe(false);
  expect(localized({ wallType: 'door', isOpen: false }).legal).toBe(false);
  expect(localized({ wallType: 'door', isOpen: true }).legal).toBe(true);
  expect(localized({ wallType: 'window' }).legal).toBe(true);
});

test('a first impact does not grant sight for the next chain target', () => {
  const source = { ...mage, hasVision: true, visionRadius: 150 };
  const first = { ...enemy, hasVision: true, visionRadius: 1000 };
  const next = { ...enemy, id: 'next', x: 300 };
  expect(resolveArcaneProjectileTarget({ source, origin: first, target: next, catalyst: staff,
    items: [source, first, next], gridConfig: { ...gridConfig, fogOfWar: true }, excludeId: first.id }).valid).toBe(false);
});
