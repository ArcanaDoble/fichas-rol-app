import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'crypto';
import {
  HiddenFogEffect,
  renderGeometryVisual,
  resolveTokenMovementIndicator,
} from '../components/createSceneItemRenderer';
import { FOG_SHADER_DEFAULTS } from '../components/FogShaderEffect';
import { innerFog } from '../../../vendor/tokenmagic/fog';

describe('token movement remaining indicator', () => {
  const participant = {
    movementRuntime: {
      base: 3,
      modifier: 0,
      spent: 2,
      sprintBonus: 4,
    },
  };

  test('counts Correr and reduces the available number during pending movement', () => {
    expect(resolveTokenMovementIndicator({
      item: { x: 80, y: 0 },
      participant,
      pendingState: { moveCost: 1 },
      gridConfig: { cellWidth: 80, cellHeight: 80 },
      isPlayerView: true,
    })).toEqual(expect.objectContaining({
      value: 4,
      isExceeded: false,
      allowance: 7,
      spent: 3,
      sprintBonus: 4,
    }));
  });

  test('shows a negative red-state value only after exceeding the allowance', () => {
    expect(resolveTokenMovementIndicator({
      item: { x: 0, y: 0 },
      participant,
      pendingState: { moveCost: 6 },
      gridConfig: { cellWidth: 80, cellHeight: 80 },
      isPlayerView: true,
    })).toEqual(expect.objectContaining({
      value: -1,
      isExceeded: true,
      allowance: 7,
      spent: 8,
    }));
  });

  test('uses live drag distance for the master preview', () => {
    expect(resolveTokenMovementIndicator({
      item: { x: 160, y: 80 },
      participant: {
        movementRuntime: { base: 3, modifier: 0, spent: 0, sprintBonus: 0 },
      },
      originalPosition: { x: 0, y: 0 },
      gridConfig: { cellWidth: 80, cellHeight: 80 },
    })).toEqual(expect.objectContaining({
      value: 1,
      isExceeded: false,
      allowance: 3,
      spent: 2,
    }));
  });

  test('renders smoke areas with the exact same Fog layers as Oculto', () => {
    const hiddenFog = renderToStaticMarkup(<HiddenFogEffect className="absolute inset-0" />);
    const smokeArea = renderToStaticMarkup(renderGeometryVisual({
      id: 'smoke-1',
      type: 'geometry',
      geometryKind: 'smoke',
      name: 'Humo',
      areaEffect: { type: 'smoke' },
    }));

    expect(hiddenFog).toContain('canvas-fog-shader');
    expect(smokeArea).toContain('canvas-fog-shader');
    expect(smokeArea.match(/canvas-fog-shader/g)).toHaveLength(1);
    expect(smokeArea.match(/canvas-hidden-distortion/g)).toHaveLength(1);
    expect(smokeArea).not.toContain('canvas-smoke-zone__fog-grid');
    expect(smokeArea).not.toContain('canvas-smoke-zone__bank');
  });

  test('uses the requested Fog preset parameters', () => {
    expect(FOG_SHADER_DEFAULTS).toEqual({
      color: [0, 0, 0],
      density: 0.65,
      time: 0,
      dimX: 1,
      dimY: 1,
      speed: 0.75,
    });
  });

  test('keeps the vendored TokenMagic Fog shader byte-stable at runtime', () => {
    expect(createHash('sha256').update(innerFog).digest('hex')).toBe(
      '6979adfb0bc6ca25f7aa51afe167f5271a1355548b6ad1e68603eafe617565aa',
    );
  });
});
