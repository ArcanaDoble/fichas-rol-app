import {
  normalizeRogueliteAccess,
  setRogueliteEnabled,
  toggleRogueliteClass,
  withRogueliteAccess,
} from '../access';

describe('roguelite player access', () => {
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
