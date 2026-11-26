import {
  canAdvanceCanvasRound, createCanvasCombatState, getCanvasCombatReinforcements, markParticipantActed,
  pruneCombatState, setEnemyActionStatus, startNextRound, startPreparedCanvasCombat, submitActionDice,
  updateCanvasCombatMembership,
} from '../canvasCombatState';

const npc = (id, initiative, extra = {}) => ({
  id, profileType: 'rogueliteEnemy', fixedInitiative: initiative, threatDice: ['d4', 'd8'], ...extra,
});
const hero = (id, extra = {}) => ({ id, profileType: 'campaignCharacter', actionDice: ['d10', 'd6', 'd4'], ...extra });
const options = { rulesSystem: 'campaign', now: 10, random: () => 0.25 };
const join = (state, token) => updateCanvasCombatMembership(state, token, { joinNow: true, now: 20 });

test('requires a deliberate start for Campaign preparation, including new arrivals and excluding opted-out tokens', () => {
  const opponent = npc('opponent', 4);
  const excluded = npc('bystander', 20, { participatesInCombat: false });
  const newcomer = hero('newcomer');
  let state = createCanvasCombatState([opponent, excluded], { ...options, requiresStart: true });
  expect(Object.keys(state.participants)).toEqual(['opponent']);
  expect(state.roundPhase).toBe('rolling');
  state = startPreparedCanvasCombat(state, [opponent, newcomer, excluded], options);
  expect(state.participants.newcomer.awaitingRoll).toBe(true);
  state = submitActionDice(state, newcomer.id, [9, 5, 2], options);
  expect(state.status).toBe('setup');
  expect(state.participants.newcomer.actionDice.map(die => die.value)).toEqual([9, 5, 2]);
  state = startPreparedCanvasCombat(state, [opponent, newcomer, excluded], options);
  expect(state.blocks.map(block => block.memberIds)).toEqual([['newcomer'], ['opponent']]);
  expect(state.status).toBe('active');
});

test('inserting a high-initiative ally preserves the current block, completed turns and spent NPC resources', () => {
  const first = npc('first', 12), current = npc('current', 6), future = npc('future', 2);
  const reinforcement = npc('reinforcement', 18, { teamId: 'aliados' });
  let state = markParticipantActed(createCanvasCombatState([first, current, future], options), first.id);
  state = setEnemyActionStatus(state, current.id, 'attack', 'spent', options);
  const previous = state;
  state = join(state, reinforcement);
  expect(state.activeBlockIndex).toBe(previous.activeBlockIndex);
  expect(state.blocks.slice(0, 2)).toEqual(previous.blocks.slice(0, 2));
  expect(state.blocks.map(block => block.memberIds)).toEqual([['first'], ['current'], ['reinforcement'], ['future']]);
  expect(state.participants.current).toBe(previous.participants.current);
  expect(state.participants.reinforcement.campaignThreatDice.map(die => die.die)).toEqual(['d4', 'd8']);
  expect(state.participants.reinforcement.enemyActions.map(action => action.id)).toEqual(['movement', 'attack', 'defense']);
  expect(join(state, reinforcement)).toBe(state);
  state = pruneCombatState(state, [first, current, reinforcement]);
  state = markParticipantActed(state, current.id);
  expect(state.blocks[state.activeBlockIndex].memberIds).toEqual(['reinforcement']);
});

test('a late player can roll and act even after the previous last activation', () => {
  const opponent = npc('opponent', 7);
  const player = hero('player');
  let state = markParticipantActed(createCanvasCombatState([opponent], options), opponent.id);
  const previous = state;
  state = join(state, player);
  expect(canAdvanceCanvasRound(state)).toBe(false);
  expect(state.blocks).toBe(previous.blocks);
  state = submitActionDice(state, player.id, [9, 3, 2], options);
  expect(state.round).toBe(1);
  expect(state.participants.opponent).toBe(previous.participants.opponent);
  expect(state.blocks[0].actedIds).toEqual(['opponent']);
  expect(state.blocks[state.activeBlockIndex].memberIds).toEqual(['player']);
  state = markParticipantActed(state, player.id);
  expect(canAdvanceCanvasRound(state)).toBe(true);
});

test('the next round reads eligible arrivals and exclusions from the scene', () => {
  const old = npc('old', 3), excluded = { ...old, participatesInCombat: false };
  const arrived = npc('arrived', 8), bystander = npc('bystander', 19, { participatesInCombat: false });
  const current = createCanvasCombatState([old], options);
  expect(updateCanvasCombatMembership(current, excluded)).toBe(current);
  expect(getCanvasCombatReinforcements(current, [excluded, arrived, bystander])).toEqual([arrived]);
  const next = startNextRound(markParticipantActed(current, old.id), { ...options, tokens: [excluded, arrived, bystander] });
  expect(Object.keys(next.participants)).toEqual(['arrived']);
  expect(next.round).toBe(2);
  expect(next.participants.arrived.campaignThreatDice[0].id).toMatch(/-r2-/);
});
