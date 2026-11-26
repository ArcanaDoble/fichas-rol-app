import { applyCampaignImpact, getCampaignArmorRd, syncCampaignToken, switchEnemySystem } from '../campaignSystem';
import { createCanvasCombatState, markParticipantActed, setEnemyActionStatus, startNextRound, submitActionDice } from '../combat/canvasCombatState';

const character = { id: 'yerma', owner: 'Ada', name: 'Yerma', profileType: 'campaignCharacter',
  campaignSheet: { vida: { current: 53, max: 60 }, mente: { current: 8, max: 12 }, movilidad: 3,
    actionDice: ['d10', 'd4', 'd4'], armaduraRd: 1, yermo: '9007199254740993' },
  equippedItems: { body: { id: 'coat', name: 'Gabardina', rd: 1 } },
};

test('campaign entry uses points and its own dice, shared reserve and equipped gear, never legacy stats', () => {
  const token = syncCampaignToken({ id: 'token', x: 99, layer: 'TOKEN' }, {
    ...character, stats: { vida: { current: 3, max: 3 }, karma: { actual: 12 } },
  });
  expect(token).toMatchObject({ profileType: 'campaignCharacter', x: 99, linkedCharacterId: 'yerma', participatesInCombat: true,
    actionDice: ['d10', 'd4', 'd4'], yermo: '9007199254740993', stats: { vida: { current: 53, max: 60 }, armadura: { current: 1 } } });
  expect(token.stats.cd).toBeUndefined();
  expect(token.stats.karma).toBeUndefined();
  expect(token.runId).toBeNull();
  expect(applyCampaignImpact(token, 12).vida.current).toBe(42);
  expect(applyCampaignImpact(token, 1).vida.current).toBe(53);
  expect(applyCampaignImpact(token, 1000).vida.current).toBe(0);
  expect(syncCampaignToken({ ...token, participatesInCombat: false }, character).participatesInCombat).toBe(false);
});

test('switching enemy systems restores each set of resources without converting CD to RD', () => {
  const enemy = { id: 'e', profileType: 'rogueliteEnemy', stats: {
    vida: { current: 5, max: 8 }, cd: { current: 7, max: 7 }, movimiento: { current: 2, max: 2 },
  }, equipmentLoadout: { body: { rd: 0 } } };
  const campaign = switchEnemySystem(enemy, 'campaign');
  expect(campaign.stats.armadura.current).toBe(0);
  expect(campaign.stats.cd).toBeUndefined();
  const edited = { ...campaign, stats: { ...campaign.stats, vida: { current: 38, max: 50 } } };
  const rogue = switchEnemySystem(edited, 'roguelite');
  expect(rogue.stats).toEqual(enemy.stats);
  expect(switchEnemySystem(rogue, 'campaign').stats.vida).toEqual({ current: 38, max: 50 });
});

test('campaign defense is independent and refreshes on the enemy turn, not at round reset', () => {
  const hero = syncCampaignToken({ id: 'hero' }, character);
  const enemy = switchEnemySystem({ id: 'enemy', profileType: 'rogueliteEnemy', fixedInitiative: 1 }, 'campaign');
  let state = createCanvasCombatState([hero, enemy, { id: 'rogue', profileType: 'rogueliteClass' }], { rulesSystem: 'campaign' });
  expect(state.participants.rogue).toBeUndefined();
  state = submitActionDice(state, 'hero', [10, 4, 4]);
  state = setEnemyActionStatus(state, 'enemy', 'defense', 'spent');
  expect(state.participants.enemy.enemyActions.find(a => a.id === 'attack').status).toBe('available');
  state = markParticipantActed(state, 'hero');
  expect(state.participants.enemy.enemyActions.find(a => a.id === 'defense').status).toBe('available');
  state = setEnemyActionStatus(state, 'enemy', 'defense', 'spent');
  state = markParticipantActed(state, 'enemy');
  state = startNextRound(state);
  expect(state.participants.enemy.enemyActions.find(a => a.id === 'defense').status).toBe('spent');
  state = submitActionDice(state, 'hero', [10, 4, 4]);
  state = markParticipantActed(state, 'hero');
  expect(state.participants.enemy.enemyActions.find(a => a.id === 'defense').status).toBe('available');
  expect(createCanvasCombatState([{ id: 'rogue-enemy', profileType: 'rogueliteEnemy' }]).participants['rogue-enemy'].enemyActions).toHaveLength(2);
});

test('campaign reinforcement is equipped armor on the canvas and contributes RD without importing CD', () => {
  const outfit = { name: 'Atuendo', itemType: 'armor', instanceId: 'outfit', rd: 0 };
  const guards = { name: 'Guardabrazos', itemType: 'armor', instanceId: 'guards', rd: 1, traits: 'Armadura, Brazos, Refuerzo' };
  const token = syncCampaignToken({ id: 'hero' }, {
    ...character,
    campaignSheet: { ...character.campaignSheet, armaduraRd: null },
    equipment: { armor: [outfit, guards] },
    equippedItems: { body: outfit, reinforcement: guards },
  });
  expect(token.stats.armadura.current).toBe(1);
  expect(token.equipmentLoadout.reinforcement.instanceId).toBe('guards');
  expect(token.equippedItems.find((item) => item.canvasSlot === 'reinforcement')).toMatchObject({ type: 'armor', instanceId: 'guards' });
  expect(token.inventory.find((item) => item.instanceId === 'guards').isEquipped).toBe(true);
  expect(getCampaignArmorRd({ equipmentLoadout: token.equipmentLoadout })).toBe(1);
  expect(applyCampaignImpact(token, 5).vida.current).toBe(49);
});
