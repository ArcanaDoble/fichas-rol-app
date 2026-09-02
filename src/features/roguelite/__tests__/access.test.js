import {
  normalizeCharacterAccess,
  normalizeRogueliteAccess,
  setCharacterAccessEnabled,
  setRogueliteEnabled,
  toggleRogueliteClass,
  withCharacterAccess,
  withRogueliteAccess,
} from '../access';

describe('roguelite player access', () => {
  test('keeps personal characters enabled for existing players without the new setting', () => {
    expect(normalizeCharacterAccess({ name: 'Ada' })).toEqual({ enabled: true });
  });

  test('can persist a classes-only profile without changing other access modes', () => {
    const player = { gameAccess: { roguelite: { enabled: true, unlockedClassIds: ['mage'] } } };
    const disabled = setCharacterAccessEnabled(player, false);
    const updated = withCharacterAccess(player, disabled);

    expect(updated.gameAccess).toEqual({
      characters: { enabled: false },
      roguelite: { enabled: true, unlockedClassIds: ['mage'] },
    });
  });

  test('is disabled by default for existing players', () => {
    expect(normalizeRogueliteAccess({ name: 'Ada' })).toEqual({
      enabled: false,
      unlockedClassIds: [],
    });
  });

  test('normalizes duplicate and invalid unlocked class identifiers', () => {
    expect(normalizeRogueliteAccess({
      gameAccess: {
        roguelite: {
          enabled: true,
          unlockedClassIds: [' barbarian ', 'barbarian', '', null, 'mage'],
        },
      },
    })).toEqual({
      enabled: true,
      unlockedClassIds: ['barbarian', 'mage'],
    });
  });

  test('toggles classes without changing the enabled state', () => {
    const player = {
      gameAccess: {
        roguelite: { enabled: true, unlockedClassIds: ['barbarian'] },
      },
    };

    expect(toggleRogueliteClass(player, 'mage')).toEqual({
      enabled: true,
      unlockedClassIds: ['barbarian', 'mage'],
    });
    expect(toggleRogueliteClass(player, 'barbarian')).toEqual({
      enabled: true,
      unlockedClassIds: [],
    });
  });

  test('preserves other game access modes when updating roguelite access', () => {
    const player = { gameAccess: { board: { enabled: true } } };
    const enabled = setRogueliteEnabled(player, true);
    const updated = withRogueliteAccess(player, enabled);

    expect(updated.gameAccess).toEqual({
      board: { enabled: true },
      roguelite: { enabled: true, unlockedClassIds: [] },
    });
  });
});
