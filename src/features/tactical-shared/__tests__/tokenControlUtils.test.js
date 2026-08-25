import { canControlToken, isCanvasCombatRoundActive } from '../tokenControlUtils';

describe('Canvas token control', () => {
  test('only an active Canvas combat round enables turn restrictions', () => {
    expect(isCanvasCombatRoundActive({
      config: { isCombatActive: true },
      canvasCombat: { status: 'idle' },
    })).toBe(false);
    expect(isCanvasCombatRoundActive({
      canvasCombat: { status: 'active' },
    })).toBe(true);
  });

  test('a player controls the Roguelite token linked to their class', () => {
    const token = {
      id: 'hero-token',
      profileType: 'rogueliteClass',
      linkedClassOwner: 'Ada',
      controlledBy: [],
    };

    expect(canControlToken(token, true, 'Ada')).toBe(true);
    expect(canControlToken(token, true, 'Bruno')).toBe(false);
  });

  test('the master controls player and enemy tokens', () => {
    expect(canControlToken({ profileType: 'rogueliteClass' }, false, 'Master')).toBe(true);
    expect(canControlToken({ profileType: 'rogueliteEnemy' }, false, 'Master')).toBe(true);
  });
});
