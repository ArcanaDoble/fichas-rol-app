import { createCanvasImageToken } from '../canvasImageToken';
import { switchEnemySystem } from '../campaignSystem';
import { createCanvasTokenController } from '../../tactical-shared/createTacticalTokenController';

const imageToken = { id: 'image-token', name: 'Token', img: '/token.webp', x: 20, y: 50, width: 80, height: 80, layer: 'TOKEN' };

test('image tokens use the saved encounter mode instead of unsaved configuration', () => {
  const token = createCanvasImageToken(imageToken, { rulesSystem: 'roguelite', config: { gameSystem: 'campaign' } });
  expect(token.rulesSystem).toBe('roguelite');
  expect(token.stats.cd).toBeDefined();
  expect(token).toMatchObject(imageToken);
  expect(token.linkedEnemyId).toBeNull();
  expect(token.isCircular).toBe(false);
});

test('image tokens keep independent editable resources when changing encounter systems', () => {
  const original = createCanvasImageToken(imageToken, { rulesSystem: 'campaign' });
  expect(original.participatesInCombat).toBe(true);
  const edited = { ...original, stats: { ...original.stats, vida: { current: 53, max: 60 }, armadura: { current: 4, max: 4 } } };
  const rogue = switchEnemySystem(edited, 'roguelite');
  expect(rogue.stats.cd.current).toBe(1);
  expect(rogue.stats.vida.max).toBe(6);
  expect(switchEnemySystem(rogue, 'campaign').stats).toEqual(edited.stats);
  expect(switchEnemySystem({ ...rogue, participatesInCombat: false }, 'campaign').participatesInCombat).toBe(false);
});

test('image tokens on the card Board retain their existing unprofiled creation', () => {
  const scenario = { id: 'board', items: [] };
  const safePersistItems = jest.fn();
  const controller = createCanvasTokenController({
    activeScenario: scenario, activeScenarioRef: { current: scenario },
    offset: { x: 0, y: 0 }, zoom: 1, gridConfig: { cellWidth: 80, cellHeight: 80 },
    isBoardMode: true, setActiveScenario: jest.fn(), safePersistItems,
  });
  controller.addTokenToCanvas('/board-token.webp');
  const created = safePersistItems.mock.calls[0][1][0];
  expect(created.img).toBe('/board-token.webp');
  expect(created.profileType).toBeUndefined();
  expect(created.rulesSystem).toBeUndefined();
});
