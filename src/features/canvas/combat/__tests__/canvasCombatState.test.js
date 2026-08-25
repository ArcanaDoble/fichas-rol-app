import {
  buildInitiativeBlocks,
  createCanvasCombatState,
  getAvailableMovement,
  getMovementBase,
  markParticipantActed,
  pruneCombatState,
  queueCanvasAttack,
  rechargeEnemyMovementWithAttack,
  recordParticipantMovement,
  resolveQueuedCanvasAttack,
  rollParticipantActionDice,
  setActionDieStatus,
  setEnemyActionStatus,
  setParticipantMovementModifier,
  setParticipantMovementResource,
  spendActionDieForSprint,
  startNextRound,
  submitActionDice,
  undoParticipantActivation,
  undoParticipantMovement,
  validateDiceResults,
} from '../canvasCombatState';
import { canCombatTokenActNow } from '../../../tactical-shared/legacyCombatRules';

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
  stats: { movimiento: { current: 3, max: 3 } },
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

  it('resolves enemy ties before players and groups consecutive allies', () => {
    let state = createCanvasCombatState([barbarian, goblin('goblin-a'), rogue, goblin('goblin-b')]);
    state = submitActionDice(state, barbarian.id, [6, 1, 1], { random: () => 0 }); // 8
    state = submitActionDice(state, rogue.id, [5, 2, 1], { random: () => 0 }); // 8

    expect(state.blocks).toEqual([
      expect.objectContaining({ side: 'enemies', initiative: 8, memberIds: ['goblin-a', 'goblin-b'] }),
      expect.objectContaining({ side: 'players', initiative: 8, memberIds: ['barbarian-token', 'rogue-token'] }),
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
    expect(state.participants['goblin-a'].enemyActions).toEqual([
      { id: 'movement', label: 'Movimiento', type: 'movement', status: 'available' },
      { id: 'attack', label: 'Ataque', type: 'attack', status: 'available' },
    ]);
  });

  it('allows master to toggle enemy actions between available, committed, and spent', () => {
    let state = createCanvasCombatState([goblin('goblin-a')], { random: () => 0 });
    state = setEnemyActionStatus(state, 'goblin-a', 'attack', 'committed');
    expect(state.participants['goblin-a'].enemyActions.find((a) => a.id === 'attack').status).toBe('committed');

    state = setEnemyActionStatus(state, 'goblin-a', 'attack', 'spent');
    expect(state.participants['goblin-a'].enemyActions.find((a) => a.id === 'attack').status).toBe('spent');

    state = startNextRound(state, { now: 200, random: () => 0 });
    expect(state.participants['goblin-a'].enemyActions.find((a) => a.id === 'attack').status).toBe('available');
  });

  it('spends Movimiento automatically and can spend Ataque to recharge the enemy base movement', () => {
    const enemy = goblin('goblin-runner');
    let state = createCanvasCombatState([enemy], { now: 10, random: () => 0 });

    state = recordParticipantMovement(state, enemy.id, {
      from: { x: 0, y: 0 },
      to: { x: 100, y: 0 },
      cost: 2,
      actor: 'Master',
    }, { now: 20 });

    expect(getAvailableMovement(state.participants[enemy.id])).toBe(1);
    expect(state.participants[enemy.id].enemyActions.find((action) => action.id === 'movement').status).toBe('spent');
    expect(state.participants[enemy.id].enemyActions.find((action) => action.id === 'attack').status).toBe('available');

    state = rechargeEnemyMovementWithAttack(state, enemy.id, { now: 30 });

    expect(getAvailableMovement(state.participants[enemy.id])).toBe(3);
    expect(state.participants[enemy.id].movementRuntime.spent).toBe(0);
    expect(state.participants[enemy.id].movementRuntime.sprintBonus).toBe(0);
    expect(state.participants[enemy.id].enemyActions.find((action) => action.id === 'attack').status).toBe('spent');
    expect(state.history.at(-1)).toEqual(expect.objectContaining({
      type: 'enemy-sprint-activated',
      movementRestored: 3,
      spentActionId: 'attack',
    }));

    const movedAfterRunning = recordParticipantMovement(state, enemy.id, {
      from: { x: 100, y: 0 },
      to: { x: 150, y: 0 },
      cost: 1,
    }, { now: 40 });
    const { state: undoneAfterRunning } = undoParticipantMovement(movedAfterRunning, enemy.id, { now: 50 });
    expect(undoneAfterRunning.participants[enemy.id].enemyActions.find((action) => action.id === 'movement').status).toBe('spent');
  });

  it('does not let an enemy run twice or waste Ataque while movement is full', () => {
    const enemy = goblin('goblin-runner');
    const initial = createCanvasCombatState([enemy], { now: 10, random: () => 0 });

    expect(rechargeEnemyMovementWithAttack(initial, enemy.id, { now: 20 })).toBe(initial);

    const moved = recordParticipantMovement(initial, enemy.id, {
      from: { x: 0, y: 0 },
      to: { x: 150, y: 0 },
      cost: 3,
    }, { now: 30 });
    const recharged = rechargeEnemyMovementWithAttack(moved, enemy.id, { now: 40 });

    expect(rechargeEnemyMovementWithAttack(recharged, enemy.id, { now: 50 })).toBe(recharged);
  });

  it('restores the enemy Movimiento action when its only confirmed move is undone', () => {
    const enemy = goblin('goblin-undo');
    const initial = createCanvasCombatState([enemy], { now: 10, random: () => 0 });
    const moved = recordParticipantMovement(initial, enemy.id, {
      from: { x: 0, y: 0 },
      to: { x: 50, y: 0 },
      cost: 1,
    }, { now: 20 });

    const { state: undone } = undoParticipantMovement(moved, enemy.id, { now: 30 });

    expect(getAvailableMovement(undone.participants[enemy.id])).toBe(3);
    expect(undone.participants[enemy.id].enemyActions.find((action) => action.id === 'movement').status).toBe('available');
  });

  it('prunes participants whose tokens were deleted from canvas', () => {
    const goblin1 = goblin('goblin-1');
    const goblin2 = goblin('goblin-2');
    const goblin3 = goblin('goblin-3');
    const state = createCanvasCombatState([barbarian, goblin1, goblin2, goblin3]);
    expect(Object.keys(state.participants)).toEqual(['barbarian-token', 'goblin-1', 'goblin-2', 'goblin-3']);

    // Simulate deleting goblin2 and goblin3 from canvas items
    const remainingTokens = [barbarian, goblin1];
    const pruned = pruneCombatState(state, remainingTokens);
    expect(Object.keys(pruned.participants)).toEqual(['barbarian-token', 'goblin-1']);
    expect(pruned.participants['goblin-2']).toBeUndefined();
    expect(pruned.participants['goblin-3']).toBeUndefined();
  });

  it('spends the enemy attack, waits for defense, and then spends defensive dice', () => {
    const enemy = goblin('goblin-attacker');
    let state = createCanvasCombatState([enemy, rogue]);
    state = submitActionDice(state, rogue.id, [6, 5, 3], { random: () => 0 });
    const defenseDie = state.participants[rogue.id].actionDice[1];

    state = queueCanvasAttack(state, {
      id: 'attack-1',
      attackerId: enemy.id,
      targetId: rogue.id,
      actionDieIds: [],
      pressure: { total: 12 },
    }, { now: 50 });

    expect(state.pendingAttack).toEqual(expect.objectContaining({ id: 'attack-1', status: 'awaiting-defense' }));
    expect(state.participants[enemy.id].enemyActions.find((action) => action.id === 'attack').status).toBe('spent');

    state = resolveQueuedCanvasAttack(state, {
      attackId: 'attack-1',
      defenseDieIds: [defenseDie.id],
      finalPressure: 7,
      lifeLost: 1,
      surplus: 0,
    }, { now: 60 });

    expect(state.pendingAttack).toBeNull();
    expect(state.participants[rogue.id].actionDice[1].status).toBe('spent');
    expect(state.history.at(-1)).toEqual(expect.objectContaining({ type: 'attack-resolved', lifeLost: 1 }));
  });

  it('reserves or spends the enemy threat die according to the confirmed attack', () => {
    const enemy = goblin('goblin-threat');
    let state = createCanvasCombatState([enemy, rogue], { now: 10 });
    state = submitActionDice(state, rogue.id, [6, 5, 3], { now: 20, random: () => 0.5 });
    expect(state.participants[enemy.id].threatValue).toBe(4);

    const reserved = queueCanvasAttack(state, {
      id: 'attack-without-threat',
      attackerId: enemy.id,
      targetId: rogue.id,
      actionDieIds: [],
      usedThreat: false,
      pressure: { total: 8 },
    }, { now: 30 });
    expect(reserved.participants[enemy.id].threatValue).toBe(4);

    const readyAgain = { ...reserved, pendingAttack: null };
    const spent = queueCanvasAttack(readyAgain, {
      id: 'attack-with-threat',
      attackerId: enemy.id,
      targetId: rogue.id,
      actionDieIds: [],
      usedThreat: true,
      pressure: { total: 12 },
    }, { now: 40 });
    expect(spent.participants[enemy.id].threatValue).toBeNull();
  });

  it('correctly evaluates canCombatTokenActNow during canvasCombat turns based on active block memberIds', () => {
    const enemyA = goblin('goblin-a');
    const enemyB = goblin('goblin-b');
    let state = createCanvasCombatState([barbarian, enemyA, enemyB], { random: () => 0 });
    // Barbarian rolls dice and gets initiative 7
    state = submitActionDice(state, barbarian.id, [8, 5, 2], { random: () => 0 });

    // Status is active, roundPhase is 'turns'
    expect(state.roundPhase).toBe('turns');
    expect(state.activeBlockIndex).toBe(0);
    expect(state.blocks[0].memberIds).toEqual([barbarian.id]);
    expect(state.blocks[1].memberIds).toEqual([enemyA.id, enemyB.id]);

    const scenario = { canvasCombat: state, items: [barbarian, enemyA, enemyB] };

    // Barbarian is in active block (0) and has not acted -> can act!
    expect(canCombatTokenActNow(barbarian, scenario.items, scenario)).toBe(true);

    // Goblins are in block 1 -> cannot act yet
    expect(canCombatTokenActNow(enemyA, scenario.items, scenario)).toBe(false);
    expect(canCombatTokenActNow(enemyB, scenario.items, scenario)).toBe(false);

    // After barbarian acts
    const advancedState = markParticipantActed(state, barbarian.id);
    const advancedScenario = { canvasCombat: advancedState, items: [barbarian, enemyA, enemyB] };

    // Now it's the goblins' block
    expect(advancedState.activeBlockIndex).toBe(1);
    expect(canCombatTokenActNow(barbarian, advancedScenario.items, advancedScenario)).toBe(false);
    expect(canCombatTokenActNow(enemyA, advancedScenario.items, advancedScenario)).toBe(true);
    expect(canCombatTokenActNow(enemyB, advancedScenario.items, advancedScenario)).toBe(true);
  });

  it('manages hybrid movement runtime with base, modifiers, normal and exceptional movement, and undo', () => {
    const hero = {
      ...barbarian,
      stats: { movimiento: { current: 3 } },
    };
    let state = createCanvasCombatState([hero], { random: () => 0 });
    const participant = state.participants[hero.id];

    // Base movement initialized to 3
    expect(participant.movementRuntime).toEqual({
      base: 3,
      statMax: 3,
      modifier: 0,
      spent: 0,
      sprintBonus: 0,
      sprintDieId: null,
      sprintDieIds: [],
      history: [],
    });
    expect(getAvailableMovement(participant)).toBe(3);

    // 1. Record a normal movement of 2 tiles
    state = recordParticipantMovement(state, hero.id, {
      from: { x: 0, y: 0 },
      to: { x: 2, y: 0 },
      cost: 2,
      isExceptional: false,
      actor: 'Bárbaro',
    });
    expect(state.participants[hero.id].movementRuntime.spent).toBe(2);
    expect(getAvailableMovement(state.participants[hero.id])).toBe(1);

    // 2. Adjust modifier dynamically by +2 (e.g. skill/buff used)
    state = setParticipantMovementModifier(state, hero.id, 2);
    expect(state.participants[hero.id].movementRuntime.modifier).toBe(2);
    // Available = 3 (base) + 2 (modifier) - 2 (spent) = 3
    expect(getAvailableMovement(state.participants[hero.id])).toBe(3);

    // 3. Record an exceptional movement (e.g. push / narrative relocation) of 4 tiles
    state = recordParticipantMovement(state, hero.id, {
      from: { x: 2, y: 0 },
      to: { x: 6, y: 0 },
      cost: 4,
      isExceptional: true,
      actor: 'Master',
    });
    // Exceptional movement does NOT increase spent
    expect(state.participants[hero.id].movementRuntime.spent).toBe(2);
    expect(getAvailableMovement(state.participants[hero.id])).toBe(3);
    expect(state.participants[hero.id].movementRuntime.history).toHaveLength(2);

    // 4. Undo the exceptional movement
    const undoResult1 = undoParticipantMovement(state, hero.id);
    state = undoResult1.state;
    expect(undoResult1.undoneEntry.isExceptional).toBe(true);
    expect(undoResult1.undoneEntry.cost).toBe(0);
    expect(undoResult1.undoneEntry.from).toEqual({ x: 2, y: 0 });
    expect(state.participants[hero.id].movementRuntime.spent).toBe(2);
    expect(state.participants[hero.id].movementRuntime.history).toHaveLength(1);

    // 5. Undo the normal movement
    const undoResult2 = undoParticipantMovement(state, hero.id);
    state = undoResult2.state;
    expect(undoResult2.undoneEntry.cost).toBe(2);
    expect(undoResult2.undoneEntry.from).toEqual({ x: 0, y: 0 });
    expect(state.participants[hero.id].movementRuntime.spent).toBe(0);
    expect(getAvailableMovement(state.participants[hero.id])).toBe(5); // 3 + 2 - 0

    // 6. startNextRound resets spent and modifier while preserving base
    state = startNextRound(state, { random: () => 0 });
    expect(state.participants[hero.id].movementRuntime).toEqual({
      base: 3,
      statMax: 3,
      modifier: 0,
      spent: 0,
      sprintBonus: 0,
      sprintDieId: null,
      sprintDieIds: [],
      history: [],
    });
    expect(getAvailableMovement(state.participants[hero.id])).toBe(3);
  });

  it('accumulates every available action die used to sprint and does not recharge spent sprint movement', () => {
    const hero = {
      ...barbarian,
      stats: { movimiento: { current: 3, max: 3 } },
    };
    let state = createCanvasCombatState([hero]);
    state = submitActionDice(state, hero.id, [7, 4, 2], { random: () => 0 });
    const sprintDie = state.participants[hero.id].actionDice[0];

    state = spendActionDieForSprint(state, hero.id, sprintDie.id, { now: 50 });
    expect(state.participants[hero.id].actionDice[0].status).toBe('spent');
    expect(state.participants[hero.id].movementRuntime.sprintBonus).toBe(7);
    expect(state.participants[hero.id].movementRuntime.sprintDieId).toBe(sprintDie.id);
    expect(state.participants[hero.id].movementRuntime.sprintDieIds).toEqual([sprintDie.id]);
    expect(getAvailableMovement(state.participants[hero.id])).toBe(10);

    const secondSprintDie = state.participants[hero.id].actionDice[1];
    state = spendActionDieForSprint(
      state,
      hero.id,
      secondSprintDie.id,
    );
    expect(state.participants[hero.id].actionDice[1].status).toBe('spent');
    expect(state.participants[hero.id].movementRuntime.sprintBonus).toBe(11);
    expect(state.participants[hero.id].movementRuntime.sprintDieIds).toEqual([sprintDie.id, secondSprintDie.id]);
    expect(getAvailableMovement(state.participants[hero.id])).toBe(14);

    state = recordParticipantMovement(state, hero.id, {
      from: { x: 0, y: 0 },
      to: { x: 14, y: 0 },
      cost: 14,
    });
    expect(getAvailableMovement(state.participants[hero.id])).toBe(0);

    state = setParticipantMovementResource(state, hero.id, {
      current: 14,
      max: 14,
      field: 'current',
    });
    expect(getAvailableMovement(state.participants[hero.id])).toBe(3);

    state = startNextRound(state, { random: () => 0 });
    expect(state.participants[hero.id].movementRuntime.sprintBonus).toBe(0);
    expect(state.participants[hero.id].movementRuntime.sprintDieId).toBeNull();
    expect(state.participants[hero.id].movementRuntime.sprintDieIds).toEqual([]);
    expect(getAvailableMovement(state.participants[hero.id])).toBe(3);
  });

  it('lets the master reopen the activation of a specific completed token', () => {
    let state = createCanvasCombatState([barbarian, rogue]);
    state = submitActionDice(state, barbarian.id, [6, 3, 2], { random: () => 0 });
    state = submitActionDice(state, rogue.id, [5, 3, 2], { random: () => 0 });
    const playerBlockIndex = state.blocks.findIndex((block) => block.side === 'players');
    state = { ...state, activeBlockIndex: playerBlockIndex };
    state = markParticipantActed(state, barbarian.id);
    state = markParticipantActed(state, rogue.id);

    const reopened = undoParticipantActivation(state, barbarian.id, { now: 80 });
    expect(reopened.activeBlockIndex).toBe(playerBlockIndex);
    expect(reopened.blocks[playerBlockIndex].actedIds).not.toContain(barbarian.id);
    expect(reopened.blocks[playerBlockIndex].actedIds).toContain(rogue.id);
  });

  it('treats an inspector edit of Movimiento as a visible refund of spent movement', () => {
    const hero = {
      ...barbarian,
      stats: { movimiento: { current: 3, max: 3 } },
    };
    let state = createCanvasCombatState([hero]);
    state = recordParticipantMovement(state, hero.id, {
      from: { x: 0, y: 0 },
      to: { x: 3, y: 0 },
      cost: 3,
    });
    expect(getAvailableMovement(state.participants[hero.id])).toBe(0);

    state = setParticipantMovementResource(state, hero.id, {
      current: 2,
      max: 3,
      field: 'current',
    }, { now: 90, actor: 'Master' });

    expect(state.participants[hero.id].movementRuntime.spent).toBe(1);
    expect(getAvailableMovement(state.participants[hero.id])).toBe(2);
    expect(state.history.at(-1)).toEqual(expect.objectContaining({
      type: 'movement-resource-adjusted',
      previousRemaining: 0,
      remaining: 2,
      actor: 'Master',
    }));
  });

  it('keeps an edited movement base when the next round reloads movement', () => {
    const hero = {
      ...barbarian,
      stats: { movimiento: { current: 3, max: 3 } },
    };
    let state = createCanvasCombatState([hero]);
    state = setParticipantMovementResource(state, hero.id, {
      current: 3,
      max: 5,
      field: 'max',
    });

    expect(state.participants[hero.id].movementRuntime.base).toBe(5);
    expect(state.participants[hero.id].movementRuntime.statMax).toBe(5);

    state = startNextRound(state, { random: () => 0 });
    expect(state.participants[hero.id].movementRuntime.base).toBe(5);
    expect(getAvailableMovement(state.participants[hero.id])).toBe(5);
  });
});
