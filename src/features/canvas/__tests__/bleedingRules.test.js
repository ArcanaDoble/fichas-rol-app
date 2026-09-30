import { applyAttackBleeding, isCanvasBleeding, setCanvasBleeding, needsBleedingChoice, resolveBleedingChoice } from '../../tactical-shared/bleedingRules';
import { createCanvasCombatState, getAvailableMovement, spendActionDieForSprint, startNextRound, rechargeEnemyMovementWithAttack } from '../combat/canvasCombatState';
import { getItemUseDefinition } from '../item-use/itemUseDefinitions';
import { getAntidoteBlockReason } from '../item-use/antidoteRules';

const token = { id: 'hero', name: 'Héroe', profileType: 'rogueliteClass', status: ['sangrado'],
    stats: { vida: { current: 4, max: 5 }, movimiento: { current: 3, max: 3 } } };
const combatFor = (subject = token) => {
    const state = createCanvasCombatState([subject], { now: 123 });
    return { ...state, status: 'active', roundPhase: 'turns', blocks: [{ memberIds: ['hero'], actedIds: [] }], activeBlockIndex: 0,
        participants: { ...state.participants, hero: { ...state.participants.hero,
            actionDice: [{ id: 'die', value: 4, die: 'd6', status: 'available' }] } } };
};
test('recognizes the uploaded Vendaje and aliases', () => {
    for (const name of ['Vendaje', 'Venda', 'Vendas']) expect(getItemUseDefinition({ name })).toMatchObject({ id: 'bandage', effect: { type: 'remove-bleeding' } });
});
test('bleeding applies only on damage, honors suppression and never stacks or postpones existing bleeding', () => {
    const clean = { ...token, status: [] };
    expect(applyAttackBleeding(clean, { rasgos: ['Sangrado'] }, { lifeLost: 0 })).toBe(clean);
    expect(applyAttackBleeding(clean, { rasgos: ['Sangrado'] }, { lifeLost: 1 }, true)).toBe(clean);
    const applied = applyAttackBleeding(clean, { rasgos: ['Sangrado', 'Sangrado'] }, { lifeLost: 1 });
    expect(applied.status).toEqual(['sangrado']);
    expect(applyAttackBleeding(applied, { rasgos: ['Sangrado'] }, { lifeLost: 1 }, false, combatFor())).toBe(applied);
});
test('new application during own activation waits until the next round; existing bleeding prompts once', () => {
    const state = combatFor();
    const late = setCanvasBleeding({ ...token, status: [] }, true, state);
    expect(needsBleedingChoice(late, state)).toBe(false);
    expect(needsBleedingChoice(late, { ...state, round: 2 })).toBe(true);
    const resolved = resolveBleedingChoice(token, state, 'life');
    expect(resolved.token.stats.vida.current).toBe(3);
    expect(needsBleedingChoice(resolved.token, resolved.combat)).toBe(false);
    expect(resolveBleedingChoice(resolved.token, resolved.combat, 'life')).toBeNull();
});
test('forfeiting basic Movement still allows Sprint and resets next round without removing the condition', () => {
    const result = resolveBleedingChoice(token, combatFor(), 'movement');
    expect(result.token.stats.vida.current).toBe(4);
    expect(getAvailableMovement(result.combat.participants.hero)).toBe(0);
    const sprint = spendActionDieForSprint(result.combat, 'hero', 'die');
    expect(getAvailableMovement(sprint.participants.hero)).toBe(4);
    expect(sprint.participants.hero.actionDice[0].status).toBe('spent');
    const nextRound = startNextRound(sprint);
    expect(getAvailableMovement(nextRound.participants.hero)).toBe(3);
    expect(isCanvasBleeding(result.token)).toBe(true);
});
test('enemy Correr remains possible using its attack action after forfeiting movement', () => {
    const enemy = { ...token, profileType: 'rogueliteEnemy' };
    const result = resolveBleedingChoice(enemy, combatFor(enemy), 'movement');
    const sprint = rechargeEnemyMovementWithAttack(result.combat, 'hero');
    expect(getAvailableMovement(sprint.participants.hero)).toBe(3);
    expect(sprint.participants.hero.enemyActions.find(a => a.id === 'attack').status).toBe('spent');
});
test('temporary Life absorbs the lost block; invalid choices and inactive or fallen targets do nothing', () => {
    const boosted = { ...token, stats: { ...token.stats, vidaTemporal: { current: 2, max: 2 } } };
    const resolved = resolveBleedingChoice(boosted, combatFor(), 'life');
    expect(resolved.token.stats.vida.current).toBe(4);
    expect(resolved.token.stats.vidaTemporal.current).toBe(1);
    expect(resolveBleedingChoice(token, combatFor(), 'skip')).toBeNull();
    expect(needsBleedingChoice(token, { ...combatFor(), roundPhase: 'rolling' })).toBe(false);
    expect(needsBleedingChoice({ ...token, stats: { vida: { current: 0 } } }, combatFor())).toBe(false);
});
test('bandage requires bleeding and Touch, permits a separately controlled ally, removes only bleeding', () => {
    const source = { ...token, x: 0, y: 0, width: 25, height: 25 };
    const target = { ...source, id: 'ally', controlledBy: ['Bea'], status: ['envenenado'], statusEffects: [{ label: 'Sangrado' }] };
    expect(getAntidoteBlockReason(source, target, [source, target], {}, {}, true)).toBeNull();
    expect(getAntidoteBlockReason(source, { ...target, x: 200 }, [source, target], {}, {}, true)).toMatch(/Toque/);
    const cured = setCanvasBleeding(target, false);
    expect(cured.status).toEqual(['envenenado']);
    expect(cured.statusEffects).toEqual([]);
    expect(getAntidoteBlockReason(source, cured, [source, cured], {}, {}, true)).toMatch(/no tiene Sangrado/);
});
