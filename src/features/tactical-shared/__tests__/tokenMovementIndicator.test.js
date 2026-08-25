import { resolveTokenMovementIndicator } from '../components/createSceneItemRenderer';

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
});
