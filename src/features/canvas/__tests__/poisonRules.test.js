import { applyAttackPoison, isCanvasPoisoned, setCanvasPoison } from '../../tactical-shared/poisonRules';
import { getAntidoteBlockReason } from '../item-use/antidoteRules';
import { getHealingPotionBlockReason } from '../item-use/healingPotionRules';
import { applyModifiersToWeapon, CANVAS_ATTACK_MODIFIER_TRAITS } from '../../../components/CombatModifiersPanel';
import { resolveCanvasAttackSelection } from '../combat/canvasAttackSelection';

const token = { id: 'hero', profileType: 'rogueliteClass', x: 0, y: 0, width: 25, height: 25,
    stats: { vida: { current: 3, max: 8 } }, status: ['derribado'] };
test('poison deduplicates legacy formats, preserves unrelated states and blocks healing until removed', () => {
    const poisoned = setCanvasPoison({ ...token, statusEffects: [{ label: 'Envenenado' }, 'cegado'] }, true);
    expect(setCanvasPoison(poisoned, true).status).toEqual(['derribado', 'envenenado']);
    expect(poisoned.statusEffects).toEqual(['cegado']);
    expect(getHealingPotionBlockReason(poisoned)).toMatch(/Envenenado/);
    const cured = setCanvasPoison(poisoned, false);
    expect(isCanvasPoisoned(cured)).toBe(false);
    expect(getHealingPotionBlockReason(cured)).toBeNull();
    expect(cured.stats).toEqual(token.stats);
});

test('a temporary poisonous modifier survives attack preparation without changing the original weapon', () => {
    const weapon = { id: 'blade', type: 'weapon', name: 'Espada', alcance: 'Toque', dano: '1d8', rasgos: [] };
    const modified = applyModifiersToWeapon(weapon, { extraDice: { d6: 1 }, activeTraits: ['venenosa'] }, { allowedTraitIds: CANVAS_ATTACK_MODIFIER_TRAITS });
    const attacker = { ...token, controlledBy: ['Ada'], status: [], equippedItems: [weapon] };
    const target = { ...token, id: 'target', controlledBy: ['master'], profileType: 'rogueliteEnemy', status: [] };
    const selection = resolveCanvasAttackSelection({ attacker, target, selection: modified, items: [attacker, target], gridConfig: {} });
    expect(selection.legal).toBe(true);
    expect(selection.weapon.rasgos).toContain('venenosa');
    expect(isCanvasPoisoned(applyAttackPoison(target, selection.weapon, { lifeLost: 1 }))).toBe(true);
    expect(isCanvasPoisoned(applyAttackPoison(target, selection.weapon, { lifeLost: 0 }))).toBe(false);
    expect(isCanvasPoisoned(applyAttackPoison(target, selection.weapon, { lifeLost: 1 }, true))).toBe(false);
    expect(weapon.rasgos).toEqual([]);
});

test('Antidote requires actual Toque, not adjacent attack range, and accounts for large footprints', () => {
    const target = { ...setCanvasPoison(token, true), id: 'target', x: 50 };
    const grid = { isInfinite: true, cellWidth: 50, cellHeight: 50 };
    expect(getAntidoteBlockReason(token, target, [token, target], grid)).toMatch(/Toque/);
    expect(getAntidoteBlockReason({ ...token, width: 100, height: 100 }, target, [token, target], grid)).toBeNull();
});
