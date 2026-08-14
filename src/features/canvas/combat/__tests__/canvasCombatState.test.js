import {
  buildInitiativeBlocks,
  createCanvasCombatState,
  markParticipantActed,
  rollParticipantActionDice,
  setActionDieStatus,
  startNextRound,
  submitActionDice,
  validateDiceResults,
} from '../canvasCombatState';

const barbarian = {
  id: 'barbarian-token',
  name: 'Bárbaro',
  profileType: 'rogueliteClass',
  linkedClassId: 'barbarian',
  actionDice: ['d8', 'd6', 'd4'],
  stats: { iniciativa: { current: 2, max: 2 } },
};

const rogue = {
  id: 'rogue-token',
  name: 'Pícaro',
  profileType: 'rogueliteClass',
  linkedClassId: 'rogue',
  actionDice: ['d6', 'd6', 'd6'],
  stats: { iniciativa: { current: 3, max: 3 } },
};

const goblin = (id) => ({
  id,
  name: 'Duende',
  profileType: 'rogueliteEnemy',
  linkedEnemyId: 'goblin',
  fixedInitiative: 8,
  threatDie: 'd6',
});

describe('Canvas roguelite combat state', () => {
  it('uses the class action dice as both initiative roll and round-one pool', () => {
    const setup = createCanvasCombatState([barbarian], { now: 10 });
    const active = submitActionDice(setup, barbarian.id, [7, 3, 2], {
      source: 'manual',
      now: 20,
      random: () => 0,
    });

    expect(active.status).toBe('active');
    expect(active.roundPhase).toBe('turns');
    expect(active.participants[barbarian.id].initiative).toBe(9);
    expect(active.participants[barbarian.id].actionDice).toEqual([
      expect.objectContaining({ die: 'd8', value: 7, status: 'available', source: 'manual' }),
      expect.objectContaining({ die: 'd6', value: 3, status: 'available', source: 'manual' }),
      expect.objectContaining({ die: 'd4', value: 2, status: 'available', source: 'manual' }),
    ]);
  });

  it('validates physical results against each die from the class', () => {
    expect(validateDiceResults(['d8', 'd6', 'd4'], [8, 6, 4])).toBe(true);
    expect(validateDiceResults(['d8', 'd6', 'd4'], [9, 6, 4])).toBe(false);
    expect(validateDiceResults(['d8', 'd6', 'd4'], [8, 6])).toBe(false);
  });

  it('resolves player ties before enemies and groups consecutive allies', () => {
    let state = createCanvasCombatState([barbarian, goblin('goblin-a'), rogue, goblin('goblin-b')]);
    state = submitActionDice(state, barbarian.id, [6, 1, 1], { random: () => 0 }); // 8
    state = submitActionDice(state, rogue.id, [5, 2, 1], { random: () => 0 }); // 8

    expect(state.blocks).toEqual([
      expect.objectContaining({ side: 'players', initiative: 8, memberIds: ['barbarian-token', 'rogue-token'] }),
      expect.objectContaining({ side: 'enemies', initiative: 8, memberIds: ['goblin-a', 'goblin-b'] }),
    ]);
  });

  it('rolls digitally and keeps initiative stable on later rounds', () => {
    const randomValues = [0.99, 0.49, 0];
    let state = createCanvasCombatState([barbarian]);
    state = rollParticipantActionDice(state, barbarian.id, { random: () => randomValues.shift() });
    expect(state.participants[barbarian.id].initiative).toBe(10);

    state = startNextRound(state, { now: 100 });
    expect(state.round).toBe(2);
    expect(state.roundPhase).toBe('rolling');
    state = submitActionDice(state, barbarian.id, [1, 2, 3], { now: 110, random: () => 0 });
    expect(state.participants[barbarian.id].initiative).toBe(10);
    expect(state.participants[barbarian.id].actionDice.map((die) => die.value)).toEqual([1, 2, 3]);
  });

  it('tracks die usage and advances the active block when all members act', () => {
    let state = createCanvasCombatState([barbarian]);
    state = submitActionDice(state, barbarian.id, [4, 3, 2], { random: () => 0 });
    const dieId = state.participants[barbarian.id].actionDice[0].id;
    state = setActionDieStatus(state, barbarian.id, dieId, 'committed');
    expect(state.participants[barbarian.id].actionDice[0].status).toBe('committed');
    state = markParticipantActed(state, barbarian.id);
    expect(state.activeBlockIndex).toBe(state.blocks.length);
  });

  it('can build enemy-only blocks without asking for player dice', () => {
    const state = createCanvasCombatState([goblin('goblin-a'), goblin('goblin-b')], { random: () => 0 });
    expect(state.roundPhase).toBe('turns');
    expect(buildInitiativeBlocks(state.participants)[0].memberIds).toEqual(['goblin-a', 'goblin-b']);
    expect(state.participants['goblin-a'].threatValue).toBe(1);
  });
});

