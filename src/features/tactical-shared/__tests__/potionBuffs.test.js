import { applyHastePotion, applyVitalityPotion, clearPotionBuffs, getBuffPotionBlockReason } from '../potionBuffs';
import { createCanvasCombatState, getAvailableMovement, markParticipantActed, startNextRound } from '../../canvas/combat/canvasCombatState';
import { resolveCanvasAttackDamage } from '../../canvas/combat/canvasAttackRules';
import { getItemUseDefinition } from '../../canvas/item-use/itemUseDefinitions';

const hero = { id: 'hero', profileType: 'rogueliteClass', actionDice: ['d6'],
    stats: { vida: { current: 5, max: 8 }, cd: { current: 4 }, movimiento: { current: 4, max: 4 } } };

test('catalog names and nested item payloads resolve the new potions', () => {
    expect(getItemUseDefinition({ nombre: 'Poción de Presteza' }).id).toBe('haste-potion');
    expect(getItemUseDefinition({ payload: { nombre: 'Poción de Vitalidad' } }).id).toBe('vitality-potion');
    expect(getItemUseDefinition({ name: 'Bálsamo de vitalidad menor' }).id).toBe('vitality-potion');
});

test('haste grants four turn cells plus one base cell, preserves spent movement and expires in two stages', () => {
    const combat = createCanvasCombatState([hero]);
    combat.blocks = [{ memberIds: ['hero'], actedIds: [] }];
    combat.activeBlockIndex = 0;
    combat.participants.hero.movementRuntime.spent = 3;
    const applied = applyHastePotion(hero, combat);
    expect(getAvailableMovement(applied.combat.participants.hero)).toBe(6);
    const ended = markParticipantActed(applied.combat, 'hero');
    expect(ended.participants.hero.movementRuntime).toMatchObject({ base: 5, sprintBonus: 0, spent: 3 });
    const next = startNextRound(ended);
    expect(getAvailableMovement(next.participants.hero)).toBe(5);
    expect(clearPotionBuffs(applied.token).stats.movimiento).toEqual(hero.stats.movimiento);
});

test('another haste dose refreshes +4 but keeps the basic bonus at +1', () => {
    const first = applyHastePotion(hero, createCanvasCombatState([hero]));
    const second = applyHastePotion(first.token, first.combat);
    expect(second.combat.participants.hero.movementRuntime).toMatchObject({ base: 5, sprintBonus: 8 });
    expect(clearPotionBuffs(second.token).stats.movimiento.max).toBe(4);
});

test('temporary Life replaces its own pool, leaves real Life unchanged and works while poisoned', () => {
    const first = applyVitalityPotion({ ...hero, status: ['envenenado'] });
    const damaged = { ...first, stats: { ...first.stats, vidaTemporal: { ...first.stats.vidaTemporal, current: 1 } } };
    const second = applyVitalityPotion(damaged);
    expect(second.stats.vidaTemporal).toMatchObject({ current: 2, max: 2 });
    expect(second.stats.vida).toEqual(hero.stats.vida);
    expect(getBuffPotionBlockReason(second)).toBeNull();
    expect(clearPotionBuffs(second).stats).toEqual(hero.stats);
});

test.each([[4, 1, 0, 5], [8, 2, 0, 5], [12, 2, 1, 4], [40, 2, 5, 0]])(
    'pressure %s consumes temporary Life before normal Life', (pressure, temporaryLifeLost, normalLifeLost, nextLife) => {
        const result = resolveCanvasAttackDamage({ attackPressure: pressure, target: applyVitalityPotion(hero) });
        expect(result).toMatchObject({ temporaryLifeLost, normalLifeLost, nextLife,
            lifeLost: temporaryLifeLost + normalLifeLost, nextTemporaryLife: 2 - temporaryLifeLost });
    },
);

test('defense and CD resolve before temporary Life, including perforating attacks', () => {
    const result = resolveCanvasAttackDamage({ attackPressure: 11, defenseDice: [{ value: 5 }],
        target: applyVitalityPotion(hero), weapon: { traits: ['perforante'] } });
    expect(result.finalPressure).toBe(6);
    expect(result.nextLife).toBe(5);
});
