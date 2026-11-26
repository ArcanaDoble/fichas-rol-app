import { buildInitiativeBlocks, createCanvasCombatState, getAvailableMovement, markParticipantActed,
  pruneCombatState, recordParticipantMovement, spendActionDieForSprint, submitActionDice, undoParticipantActivation } from '../canvasCombatState';
import { canCombatTokenActNow } from '../../../tactical-shared/legacyCombatRules';

const npc = (id, initiative, teamId = 'aliados') => ({ id, name: id, profileType: 'rogueliteEnemy',
  fixedInitiative: initiative, teamId, stats: { movimiento: { current: 2, max: 2 } } });
const hero = (id, teamId = 'aliados') => ({ id, name: id, profileType: 'campaignCharacter',
  actionDice: ['d6', 'd6', 'd6'], teamId, stats: { movimiento: { current: 2, max: 2 } } });
const tokens = [npc('Henry', 9), npc('Dan', 8), npc('Tirador', 8, 'enemies'), npc('Sonrisa', 6),
  hero('Yuuzu'), npc('Vito', 4, 'enemies'), hero('Yerma')];
const prepared = () => {
  let state = createCanvasCombatState(tokens, { rulesSystem: 'campaign' });
  state = submitActionDice(state, 'Yuuzu', [6, 2, 1]);
  return submitActionDice(state, 'Yerma', [3, 2, 1]);
};

test('manual allied NPCs share consecutive blocks with their team, keeping NPC actions and initiative', () => {
  const state = prepared();
  expect(state.blocks.map(b => b.memberIds)).toEqual([['Henry', 'Dan'], ['Tirador'], ['Sonrisa', 'Yuuzu'], ['Vito'], ['Yerma']]);
  expect(state.participants.Henry).toMatchObject({ side: 'enemies', initiative: 9, actionDiceProfile: [] });
  expect(state.participants.Henry.enemyActions.map(a => a.id)).toEqual(['movement', 'attack', 'defense']);
  expect(state.blocks[0].side).toBe('players');
});

test('existing encounters regroup without resetting acted turns, resources or the active character', () => {
  const state = prepared();
  state.participants.Yuuzu.movementRuntime.spent = 1;
  Object.values(state.participants).forEach(p => { delete p.initiativeTeamId; });
  state.blocks = buildInitiativeBlocks(state.participants);
  state.blocks.forEach(b => { b.actedIds = b.memberIds.filter(id => id !== 'Yerma'); });
  state.activeBlockIndex = state.blocks.findIndex(b => b.memberIds.includes('Yerma'));
  const fixed = pruneCombatState(state, tokens);
  expect(fixed.blocks.map(b => b.memberIds)).toEqual(prepared().blocks.map(b => b.memberIds));
  expect(fixed.blocks[fixed.activeBlockIndex].memberIds).toEqual(['Yerma']);
  expect(fixed.blocks.flatMap(b => b.actedIds)).toEqual(['Henry', 'Dan', 'Tirador', 'Sonrisa', 'Yuuzu', 'Vito']);
  expect(fixed.participants.Yuuzu.movementRuntime.spent).toBe(1);
  expect(pruneCombatState(fixed, tokens)).toBe(fixed);
});

test('explicit separate teams and independent initiative remain separate', () => {
  const state = createCanvasCombatState([npc('a', 9, ' ALIÁDOS '), npc('b', 8, 'aliados'),
    { ...npc('c', 7), independentInitiative: true }, npc('d', 6), npc('e', 5, 'otra')], { rulesSystem: 'campaign' });
  expect(state.blocks.map(b => b.memberIds)).toEqual([['a', 'b'], ['c'], ['d'], ['e']]);
});

test('roguelite preserves grouping by enemy type and equal initiative regardless of team text', () => {
  const state = createCanvasCombatState([npc('a', 9), npc('b', 8), { ...npc('c', 7), linkedEnemyId: 'goblin' },
    { ...npc('d', 7), linkedEnemyId: 'goblin' }]);
  expect(state.blocks.map(b => b.memberIds)).toEqual([['a'], ['b'], ['c', 'd']]);
});

test('reopened character can sprint and move, then resumes the pending block past completed turns', () => {
  let state = prepared();
  ['Henry', 'Dan', 'Tirador', 'Sonrisa', 'Yuuzu', 'Vito'].forEach(id => { state = markParticipantActed(state, id); });
  state = undoParticipantActivation(state, 'Yuuzu');
  expect(canCombatTokenActNow(tokens.find(t => t.id === 'Yuuzu'), tokens, state)).toBe(true);
  expect(state.blocks[state.activeBlockIndex].actedIds).toEqual(['Sonrisa']);
  state = spendActionDieForSprint(state, 'Yuuzu', state.participants.Yuuzu.actionDice[0].id);
  expect(getAvailableMovement(state.participants.Yuuzu)).toBe(8);
  state = recordParticipantMovement(state, 'Yuuzu', { from: { x: 0, y: 0 }, to: { x: 250, y: 0 }, cost: 5 });
  expect(getAvailableMovement(state.participants.Yuuzu)).toBe(3);
  state = markParticipantActed(state, 'Yuuzu');
  expect(state.blocks[state.activeBlockIndex].memberIds).toEqual(['Yerma']);
  expect(state.participants.Yuuzu.actionDice[0].status).toBe('spent');
  state = markParticipantActed(state, 'Yerma');
  state = undoParticipantActivation(state, 'Yuuzu');
  expect(getAvailableMovement(state.participants.Yuuzu)).toBe(3);
  state = markParticipantActed(state, 'Yuuzu');
  expect(state.activeBlockIndex).toBe(state.blocks.length);
});
