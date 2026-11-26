import { persistCanvasSystemItems } from '../campaignPersistence';
import { syncCampaignToken } from '../campaignSystem';

jest.mock('../../../firebase', () => ({ db: {} }));
jest.mock('../rogueliteRunPersistence', () => ({ persistCanvasRogueliteRuns: jest.fn(async () => []), loadCanvasRogueliteRuntimeSheet: jest.fn() }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn((_db, ...parts) => ({ path: parts.join('/') })), getDoc: jest.fn(), runTransaction: jest.fn() }));

test('saving a previous Yerma personality preserves the newly selected profile and shared Yermo', async () => {
  const character = { id: 'yerma', name: 'Yerma', owner: 'Ada', campaignSheet: {
    vida: { current: 25, max: 30 }, mente: { current: 4, max: 5 }, movilidad: 3,
    actionDice: ['d10', 'd4', 'd4'], yermo: '9007199254740993123',
  } };
  const original = syncCampaignToken({ id: 't' }, character);
  const token = { ...original, stats: { ...original.stats, vida: { current: 12, max: 30 }, movimiento: { current: 1, max: 6 } } };
  const currentSheet = { ...original.campaignSheet, activePersonality: 'taiga',
    vida: { current: 40, max: 40 }, actionDice: ['d6', 'd6', 'd6'] };
  const stored = {
    'canvas_scenarios/scene': { items: [token], canvasCombat: { participants: { t: { movementRuntime: { statMax: 3 } } } } },
    'campaignCharacterSheets/yerma': currentSheet,
    'characters/yerma': { name: 'Taiga', stats: { old: 'preserved' } },
  };
  const firestore = require('firebase/firestore');
  firestore.doc.mockImplementation((_db, ...parts) => ({ path: parts.join('/') }));
  firestore.runTransaction.mockImplementation(async (_db, fn) => fn({
    get: async ref => ({ exists: () => Boolean(stored[ref.path]), data: () => stored[ref.path] }),
    set: (ref, value) => { stored[ref.path] = value; },
    update: (ref, value) => { stored[ref.path] = { ...stored[ref.path], ...value }; },
  }));
  await persistCanvasSystemItems({ scenarioId: 'scene', originalItems: [original], finalItems: [token], explicitModifiedIds: ['t'] });
  const saved = stored['campaignCharacterSheets/yerma'];
  expect(saved.activePersonality).toBe('taiga');
  expect(saved.vida).toEqual({ current: 40, max: 40 });
  expect(saved.actionDice).toEqual(['d6', 'd6', 'd6']);
  expect(saved.personalities.yerma).toMatchObject({ vida: { current: 12, max: 30 }, movilidad: 3 });
  expect(saved.yermo).toBe('9007199254740993123');
  expect(stored['characters/yerma'].stats).toEqual({ old: 'preserved' });
});

test('sheet updates do not refill spent movement during the same combat and personality', () => {
  const character = { id: 'yerma', name: 'Yerma', campaignSheet: { movilidad: 3 } };
  const token = syncCampaignToken({ id: 't' }, character);
  token.stats.movimiento.current = 1;
  const synced = syncCampaignToken(token, character, {}, { preserveMovement: true });
  expect(synced.stats.movimiento.current).toBe(1);
});
