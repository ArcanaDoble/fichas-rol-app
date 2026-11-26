import { doc, runTransaction } from 'firebase/firestore';
import { addCampaignNpcToActiveCanvas } from '../canvasSpawn';
import { areTokensAllied, normalizeCombatSideKey } from '../../tactical-shared/legacyCombatRules';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  runTransaction: jest.fn(),
}));
jest.mock('../../../firebase', () => ({ db: {} }));

const henry = { id: 'henry', name: 'Henry', stats: {
  vida: { current: 52, max: 60 }, armadura: { current: 2, max: 2 },
  iniciativa: { current: 9, max: 9 }, ofensiva: { current: 4, max: 4 },
} };

beforeEach(() => {
  jest.clearAllMocks();
  doc.mockImplementation((database, ...parts) => parts.join('/'));
});

const sceneTransaction = (scene, activeScenarioId = 'campaign-scene') => ({
  get: jest.fn(async ref => ({
    exists: () => true,
    data: () => ref === 'gameSettings/canvasVisibility' ? { activeScenarioId } : scene,
  })),
  set: jest.fn(),
});

const mockScene = scene => {
  const transaction = sceneTransaction(scene);
  runTransaction.mockImplementation((database, callback) => callback(transaction));
  return transaction;
};

test('despliega un PNJ aliado sin modificar la ficha ni los recursos del encuentro original', async () => {
  const originalHero = { id: 'yuuzu', profileType: 'campaignCharacter', name: 'Yuuzu' };
  const { set } = mockScene({ rulesSystem: 'campaign', items: [originalHero] });

  const result = await addCampaignNpcToActiveCanvas(henry);
  const written = set.mock.calls[0][1].items;

  expect(written[0]).toEqual({ ...originalHero, teamId: 'aliados' });
  expect(written[1]).toMatchObject({
    id: result.token.id, profileType: 'rogueliteEnemy', rulesSystem: 'campaign',
    campaignNpcId: 'henry', teamId: 'aliados', controlledBy: ['master'],
    stats: { vida: { current: 52, max: 60 }, armadura: { current: 2, max: 2 } },
  });
  expect(originalHero.teamId).toBeUndefined();
  expect(henry.stats.vida.current).toBe(52);
});

test.each([
  {},
  { rulesSystem: 'roguelite' },
])('identifica el mapa y el ajuste al intentar desplegar un PNJ fuera de Campaña (%p)', async data => {
  const { set } = mockScene({ name: 'Arena', ...data });

  await expect(addCampaignNpcToActiveCanvas(henry)).rejects.toThrow(/«Arena».*Campaña.*Sistema del encuentro.*Confirmar cambios/);
  expect(set).not.toHaveBeenCalled();
});

test('consulta y confirma el mapa en transmisión en la misma operación', async () => {
  const { get, set } = mockScene({ name: 'Gran canal', rulesSystem: 'campaign', items: [] });
  const result = await addCampaignNpcToActiveCanvas({ ...henry, allegiance: 'enemy' });

  expect(get.mock.calls).toEqual([['gameSettings/canvasVisibility'], ['canvas_scenarios/campaign-scene']]);
  expect(result).toMatchObject({ scenarioId: 'campaign-scene', scenarioName: 'Gran canal', token: { teamId: 'enemies' } });
  expect(set).toHaveBeenCalledWith('canvas_scenarios/campaign-scene', expect.objectContaining({
    items: [result.token],
  }), { merge: true });
});

test('consulta la transmisión de nuevo si Firestore reintenta la operación', async () => {
  const first = sceneTransaction({ name: 'Antiguo', rulesSystem: 'campaign' }, 'old');
  const retry = sceneTransaction({ name: 'Nuevo', rulesSystem: 'campaign' }, 'new');
  runTransaction.mockImplementation(async (database, callback) => {
    await callback(first);
    return callback(retry);
  });
  const result = await addCampaignNpcToActiveCanvas(henry);
  expect(result).toMatchObject({ scenarioId: 'new', scenarioName: 'Nuevo' });
  expect(retry.set).toHaveBeenCalledWith('canvas_scenarios/new', expect.anything(), { merge: true });
});

test('avisa cuando no hay un mapa en transmisión', async () => {
  const transaction = sceneTransaction({}, null);
  runTransaction.mockImplementation((database, callback) => callback(transaction));
  await expect(addCampaignNpcToActiveCanvas(henry)).rejects.toThrow('No hay ningún encuentro del Canvas en transmisión.');
  expect(transaction.get).toHaveBeenCalledTimes(1);
  expect(transaction.set).not.toHaveBeenCalled();
});

test.each(['ally', 'enemy'])('despliega %s respetando el bando personalizado de los jugadores', async (allegiance) => {
  const hero = { id: 'hero', type: 'token', profileType: 'campaignCharacter', teamId: 'Compañía del Alba' };
  const secondHero = { id: 'hero-2', type: 'token', profileType: 'campaignCharacter' };
  const existingEnemy = { id: 'bandit', type: 'token', profileType: 'rogueliteEnemy', teamId: 'enemies' };
  const { set } = mockScene({ rulesSystem: 'campaign', items: [hero, secondHero, existingEnemy] });

  const template = { ...henry, allegiance };
  const result = await addCampaignNpcToActiveCanvas(template);
  const items = set.mock.calls[0][1].items;
  expect(result.token.teamId).toBe(allegiance === 'ally' ? hero.teamId : 'enemies');
  expect(areTokensAllied({ ...result.token, type: 'token' }, hero)).toBe(allegiance === 'ally');
  expect(areTokensAllied({ ...result.token, type: 'token' }, existingEnemy)).toBe(allegiance === 'enemy');
  expect(items[1].teamId).toBe(hero.teamId);
  expect(items[2]).toEqual(existingEnemy);
  expect(secondHero.teamId).toBeUndefined();
  expect(template.stats.vida).toEqual({ current: 52, max: 60 });
  expect(result.token.controlledBy).toEqual(['master']);
});

test('no asigna un enemigo a un bando de los jugadores aunque sus nombres coincidan', async () => {
  const heroes = [' Enémies ', 'enemies-2'].map((teamId, index) => ({
    id: `hero-${index}`, type: 'token', profileType: 'campaignCharacter', teamId,
  }));
  mockScene({ rulesSystem: 'campaign', items: heroes });

  const { token } = await addCampaignNpcToActiveCanvas({ ...henry, allegiance: 'enemy' });
  expect(heroes.map(hero => normalizeCombatSideKey(hero.teamId))).not.toContain(normalizeCombatSideKey(token.teamId));
  expect(token.teamId).toBe('enemies-3');
  heroes.forEach(hero => expect(areTokensAllied({ ...token, type: 'token' }, hero)).toBe(false));
});

test('permite preparar enemigos antes de incorporar personajes al encuentro', async () => {
  mockScene({ rulesSystem: 'campaign', items: [] });
  await expect(addCampaignNpcToActiveCanvas({ ...henry, allegiance: 'enemy' })).resolves.toMatchObject({ token: { teamId: 'enemies' } });
});
