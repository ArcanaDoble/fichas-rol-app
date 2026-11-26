import {
  createEmptyCampaignSheet,
  normalizeCampaignSheet,
  switchCampaignPersonality,
  validateCampaignSheet,
} from '../characterSheet';
import { isCampaignCharacter } from '../roster';

const identity = { characterId: 'char-yuuzu', owner: 'Yuuzu' };

test('preserves identity without converting legacy blocks or attributes into campaign values', () => {
  const legacy = {
    stats: { vida: { current: 4, max: 4 }, cordura: { current: 3, max: 3 } },
    attributes: { destreza: 'd8', vigor: 'd6', intelecto: 'd4', voluntad: 'd4' },
  };

  expect(normalizeCampaignSheet(legacy, identity)).toEqual(createEmptyCampaignSheet(identity));
});

test('reads only the separate campaign values and never trusts stored ownership', () => {
  const sheet = normalizeCampaignSheet({
    owner: 'Otro usuario',
    sourceCharacterId: 'otro-personaje',
    vida: { current: 21, max: 36 },
    mente: { current: 4, max: 7 },
    actionDice: ['d8', 'd6', 'd4'],
  }, identity);

  expect(sheet.owner).toBe('Yuuzu');
  expect(sheet.sourceCharacterId).toBe('char-yuuzu');
  expect(sheet.vida).toEqual({ current: 21, max: 36 });
  expect(sheet.mente).toEqual({ current: 4, max: 7 });
  expect(sheet.actionDice).toEqual(['d8', 'd6', 'd4']);
});

test('rejects a current resource above its maximum', () => {
  expect(validateCampaignSheet({
    vida: { current: 9, max: 8 },
    mente: { current: null, max: null },
  })).toEqual(['El valor actual de vida no puede superar su máximo.']);
});

test('existing campaign stats stay with the current personality and the others start empty', () => {
  const sheet = normalizeCampaignSheet({
    vida: { current: 12, max: 28 }, mente: { current: 5, max: 5 },
    movilidad: 4, actionDice: ['d8', 'd6', 'd4'], armaduraRd: 1,
  }, { characterId: 'yerma', owner: 'Jugadora', personalityId: 'yerma' });
  expect(sheet.personalities.yerma.vida).toEqual({ current: 12, max: 28 });
  const taiga = switchCampaignPersonality(sheet, 'taiga', identity);
  expect(taiga.vida).toEqual({ current: null, max: null });
  expect(taiga.actionDice).toEqual([null, null, null]);
  expect(taiga.armaduraRd).toBe(1);
  expect(taiga.personalities.tundra).toEqual(taiga.personalities.taiga);
  expect(switchCampaignPersonality(taiga, 'yerma', identity).vida).toEqual({ current: 12, max: 28 });
  expect(sheet.activePersonality).toBe('yerma');
});

test('all personality drafts are validated even after switching away from invalid values', () => {
  const sheet = normalizeCampaignSheet({ vida: { current: 29, max: 28 } }, {
    ...identity, personalityId: 'yerma',
  });
  const taiga = switchCampaignPersonality(sheet, 'taiga', identity);
  expect(validateCampaignSheet(taiga)).toEqual(['Yerma: El valor actual de vida no puede superar su máximo.']);
});

test('uses Campaign for every personal character regardless of its ID or name', () => {
  const ids = [
    'char-1768079340468-356',
    'char-1768489332570-963',
    'char-1768501826633-560',
    'char-1780256391516-28',
    'another-lind-id',
    'another-gara-id',
    'new-character',
  ];
  ids.forEach((id) => expect(isCampaignCharacter({ id }, { collectionPath: 'characters' })).toBe(true));
  expect(isCampaignCharacter(null, { collectionPath: 'characters' })).toBe(false);
  expect(isCampaignCharacter({ id: 'barbarian' }, { collectionPath: 'characters', persistenceMode: 'roguelite' })).toBe(false);
  expect(isCampaignCharacter({ id: 'barbarian' }, { collectionPath: 'classes' })).toBe(false);
});
