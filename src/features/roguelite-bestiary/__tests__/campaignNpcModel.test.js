import { createCampaignNpcTokenPayload, createEmptyCampaignNpc, normalizeCampaignNpc } from '../campaignNpcModel';
import { createCanvasCombatState, submitActionDice } from '../../canvas/combat/canvasCombatState';
import { prepareRogueliteEnemyForFirestore } from '../enemyModel';

test('las fichas anteriores siguen siendo aliadas y la elección enemiga se conserva al guardar', () => {
  expect(normalizeCampaignNpc({ id: 'henry' }).allegiance).toBe('ally');
  expect(createEmptyCampaignNpc().allegiance).toBe('ally');
  expect(normalizeCampaignNpc({ allegiance: 'invalid' }).allegiance).toBe('ally');
  const saved = JSON.parse(JSON.stringify(prepareRogueliteEnemyForFirestore(normalizeCampaignNpc({ id: 'bandit', allegiance: 'enemy' }))));
  expect(normalizeCampaignNpc(saved).allegiance).toBe('enemy');
  expect(createCampaignNpcTokenPayload(saved)).toMatchObject({ teamId: 'enemies', rulesSystem: 'campaign', participatesInCombat: true });
});

test('la ficha y el despliegue conservan copias y grados de Amenaza sin truncar a un dado', () => {
  const profile = ['d4', 'd8', 'd8', ...Array(9).fill('d20')];
  const npc = normalizeCampaignNpc({ threatDice: profile });
  expect(npc.threatDice).toEqual(profile);
  expect(createCampaignNpcTokenPayload(npc).threatDice).toEqual(profile);
  expect(normalizeCampaignNpc({ threatDie: 'd10' }).threatDice).toEqual(['d10']);
  expect(normalizeCampaignNpc({ threatDice: [], threatDie: 'd10' }).threatDice).toEqual([]);
});

test('la ficha de Campaña admite Vida por puntos y RD sin introducir CD de Roguelite', () => {
  const npc = normalizeCampaignNpc({
    ...createEmptyCampaignNpc(),
    id: 'henry',
    name: 'Henry',
    stats: {
      vida: { current: 52, max: 60 },
      armadura: { current: 3, max: 3 },
      movimiento: { current: 2, max: 2 },
      iniciativa: { current: 7, max: 7 },
      ofensiva: { current: 4, max: 4 },
    },
    equipmentSlots: [{ id: 'sword', name: 'Espada', type: 'weapon' }, null, null],
  });
  const token = createCampaignNpcTokenPayload(npc);

  expect(npc.stats.vida).toEqual({ current: 52, max: 60 });
  expect(npc.stats.cd).toBeUndefined();
  expect(token).toMatchObject({
    profileType: 'rogueliteEnemy', rulesSystem: 'campaign', campaignNpcId: 'henry', linkedEnemyId: null,
    teamId: 'aliados', controlledBy: ['master'], fixedInitiative: 7, participatesInCombat: true,
    offenseBase: 4, stats: { vida: { current: 52, max: 60 }, armadura: { current: 3, max: 3 } },
  });
  expect(token.stats.cd).toBeUndefined();
  expect(token.inventory).toHaveLength(1);

  token.stats.vida.current = 10;
  token.inventory[0].name = 'Espada rota';
  token.equipmentSlots[0].name = 'Espada mellada';
  expect(npc.stats.vida.current).toBe(52);
  expect(npc.equipmentSlots[0].name).toBe('Espada');
});

test('un PNJ aliado conserva las acciones de enemigo y comparte bloque de Campaña', () => {
  const hero = { id: 'hero', profileType: 'campaignCharacter', teamId: 'aliados',
    actionDice: ['d6', 'd6', 'd6'], stats: { movimiento: { current: 2, max: 2 } } };
  const henry = { id: 'henry-token', ...createCampaignNpcTokenPayload({ id: 'henry', name: 'Henry' }),
    stats: { movimiento: { current: 2, max: 2 } } };
  const state = submitActionDice(
    createCanvasCombatState([henry, hero], { rulesSystem: 'campaign' }), 'hero', [1, 1, 1]
  );

  expect(state.participants['henry-token'].enemyActions.map((action) => action.id))
    .toEqual(['movement', 'attack', 'defense']);
  expect(state.blocks[0].memberIds).toEqual(['henry-token', 'hero']);
  expect(state.blocks[0].side).toBe('players');
});
