export const MAX_ANIMATED_BOARD_LIGHTS = 10;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const isBoardLightItem = (item) => Boolean(
  item && (item.type === 'light' || item.emitsLight)
);

export const getBoardLightVisualProfile = (light = {}) => {
  const rawRadius = light.type === 'light' ? light.radius : light.lightRadius;
  const rawColor = light.type === 'light' ? light.color : light.lightColor;
  const rawIntensity = light.type === 'light' ? light.intensity : light.lightIntensity;
  const radius = clamp(Number(rawRadius) || 200, 20, 2000);
  const parsedIntensity = rawIntensity === null || rawIntensity === '' ? NaN : Number(rawIntensity);
  const intensity = clamp(Number.isFinite(parsedIntensity) ? parsedIntensity : 0.8, 0.15, 1);

  return {
    radius,
    glowRadius: radius * 1.12,
    color: rawColor || '#fff1ae',
    intensity,
    maskCoreOpacity: 0.9 + (intensity * 0.1),
    maskMidOpacity: 0.56 + (intensity * 0.22),
    maskOuterOpacity: 0.16 + (intensity * 0.16),
    glowCoreOpacity: 0.12 + (intensity * 0.24),
    glowMidOpacity: 0.045 + (intensity * 0.1),
    glowOuterOpacity: 0.012 + (intensity * 0.025),
  };
};

const hashLightId = (id = '') => Array.from(String(id)).reduce(
  (hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0,
  2166136261
);

export const getBoardLightFlickerStyle = (lightId) => {
  const hash = hashLightId(lightId);
  const durationSeconds = 2.6 + ((hash % 120) / 100);
  const delaySeconds = -(((hash >>> 8) % 300) / 100);

  return {
    animationDuration: `${durationSeconds.toFixed(2)}s`,
    animationDelay: `${delaySeconds.toFixed(2)}s`,
  };
};

export const selectAnimatedBoardLightIds = (
  lights = [],
  limit = MAX_ANIMATED_BOARD_LIGHTS
) => new globalThis.Set(
  lights
    .filter(light => isBoardLightItem(light) && (
      light.type === 'light' ? light.flicker : light.lightFlicker
    ))
    .slice(0, Math.max(0, limit))
    .map(light => light.id)
    .filter(Boolean)
);
