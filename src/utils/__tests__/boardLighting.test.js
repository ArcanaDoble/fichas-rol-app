import {
  MAX_ANIMATED_BOARD_LIGHTS,
  getBoardLightFlickerStyle,
  getBoardLightVisualProfile,
  isBoardLightItem,
  selectAnimatedBoardLightIds,
} from '../boardLighting';

describe('board lighting', () => {
  test('normalizes standalone and token light profiles', () => {
    const standalone = getBoardLightVisualProfile({ type: 'light', radius: 320, color: '#ffaa66', intensity: 0.5 });
    const tokenLight = getBoardLightVisualProfile({ emitsLight: true, lightRadius: 150, lightColor: '#88aaff' });

    expect(standalone).toMatchObject({ radius: 320, color: '#ffaa66', intensity: 0.5 });
    expect(standalone.glowRadius).toBeCloseTo(358.4);
    expect(tokenLight).toMatchObject({ radius: 150, color: '#88aaff', intensity: 0.8 });
    expect(tokenLight.glowRadius).toBeCloseTo(168);
  });

  test('uses a smooth profile with a stronger core than its edge', () => {
    const profile = getBoardLightVisualProfile({ type: 'light', intensity: 0.8 });

    expect(profile.maskCoreOpacity).toBeGreaterThan(profile.maskMidOpacity);
    expect(profile.maskMidOpacity).toBeGreaterThan(profile.maskOuterOpacity);
    expect(profile.glowCoreOpacity).toBeGreaterThan(profile.glowMidOpacity);
    expect(profile.glowMidOpacity).toBeGreaterThan(profile.glowOuterOpacity);
  });

  test('caps animated lights while retaining static illumination for the rest', () => {
    const lights = Array.from({ length: MAX_ANIMATED_BOARD_LIGHTS + 4 }, (_, index) => ({
      id: `light-${index}`,
      type: 'light',
      flicker: true,
    }));

    const animatedIds = selectAnimatedBoardLightIds(lights);

    expect(animatedIds.size).toBe(MAX_ANIMATED_BOARD_LIGHTS);
    expect(animatedIds.has('light-0')).toBe(true);
    expect(animatedIds.has(`light-${MAX_ANIMATED_BOARD_LIGHTS}`)).toBe(false);
  });

  test('assigns deterministic but different flicker phases', () => {
    expect(getBoardLightFlickerStyle('torch-a')).toEqual(getBoardLightFlickerStyle('torch-a'));
    expect(getBoardLightFlickerStyle('torch-a')).not.toEqual(getBoardLightFlickerStyle('torch-b'));
    expect(isBoardLightItem({ emitsLight: true })).toBe(true);
    expect(isBoardLightItem({ type: 'wall' })).toBe(false);
  });
});
