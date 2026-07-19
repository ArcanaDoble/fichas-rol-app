import {
  BOARD_DIE_MAX_ROLL_MS,
  BOARD_DIE_SETTLED_FRAMES,
  applyBoardDieRolls,
  getBoardDieAngularVelocity,
  getBoardDieCollisionMass,
  getBoardDieCollisionResponse,
  getBoardDieLaunchGesture,
  getBoardDiePhysicsMetrics,
  getBoardDieWorldBounds,
  isBoardDieMotionSettled,
  shouldFinishBoardDieRoll,
} from '../boardDicePhysics';

describe('board dice launch gesture', () => {
  test('treats a short press as selection instead of an accidental throw', () => {
    const gesture = getBoardDieLaunchGesture({ deltaX: 12, deltaY: 8, dieWidth: 80, dieHeight: 80 });

    expect(gesture.cancelled).toBe(true);
    expect(gesture.tension).toBe(0);
  });

  test('caps launch tension and preserves the aimed direction', () => {
    const gesture = getBoardDieLaunchGesture({ deltaX: 600, deltaY: 0, dieWidth: 60, dieHeight: 60 });

    expect(gesture.cancelled).toBe(false);
    expect(gesture.tension).toBe(1);
    expect(gesture.directionDegrees).toBeCloseTo(90);
    expect(gesture.velocity.x).toBeCloseTo(1.3);
    expect(gesture.velocity.y).toBeCloseTo(0);
  });
});

describe('board dice physics scaling', () => {
  test('keeps world displacement stable while zoom only changes screen scale', () => {
    const normal = getBoardDiePhysicsMetrics({ sides: 6, width: 78, height: 78, zoom: 1 });
    const zoomed = getBoardDiePhysicsMetrics({ sides: 6, width: 78, height: 78, zoom: 2 });

    expect(zoomed.localPixelsPerMeter).toBeCloseTo(normal.localPixelsPerMeter);
    expect(zoomed.screenPixelsPerMeter).toBeCloseTo(normal.screenPixelsPerMeter * 2);
  });

  test('converts viewport boundaries into physics distances using screen scale', () => {
    const bounds = { left: 200, right: 300, top: 100, bottom: 150 };
    const worldBounds = getBoardDieWorldBounds(bounds, 50);

    expect(worldBounds).toEqual({ left: 4, right: 6, top: 2, bottom: 3 });
  });
});

describe('board dice angular impulse', () => {
  test('rolls around the launch direction without frantic multi-axis spin', () => {
    const angularVelocity = getBoardDieAngularVelocity({
      launchX: 1,
      launchZ: 0,
      sides: 20,
      random: () => 0.5,
    });

    expect(angularVelocity.x).toBeCloseTo(0);
    expect(angularVelocity.y).toBeCloseTo(0);
    expect(angularVelocity.z).toBeCloseTo(-7.8);
    expect(Math.hypot(angularVelocity.x, angularVelocity.y, angularVelocity.z)).toBeLessThan(8.1);
  });

  test('keeps even maximum-power D4 throws below a controlled spin ceiling', () => {
    const angularVelocity = getBoardDieAngularVelocity({
      launchX: 1.3,
      launchZ: 0,
      sides: 4,
      random: () => 0.5,
    });

    expect(Math.hypot(angularVelocity.x, angularVelocity.y, angularVelocity.z)).toBeLessThan(9.6);
  });
});

describe('board dice collision mass', () => {
  test('keeps equal-sized dice at equal mass', () => {
    expect(getBoardDieCollisionMass({ diameter: 1.56, referenceDiameter: 1.56 })).toBeCloseTo(1.35);
  });

  test('makes larger dice harder to displace without allowing extreme masses', () => {
    expect(getBoardDieCollisionMass({ diameter: 2, referenceDiameter: 1 })).toBe(6);
    expect(getBoardDieCollisionMass({ diameter: 0.1, referenceDiameter: 2 })).toBe(0.35);
  });
});

describe('board dice collision response', () => {
  test('does not amplify contact below the impact threshold', () => {
    expect(getBoardDieCollisionResponse({ impactSpeed: 0.75 })).toEqual({
      active: false,
      impulse: 0,
      targetDeltaSpeed: 0,
    });
  });

  test('adds a bounded impulse when the impact is strong enough', () => {
    const response = getBoardDieCollisionResponse({ impactSpeed: 4.6, sourceMass: 1.35, targetMass: 1.35 });

    expect(response.active).toBe(true);
    expect(response.impulse).toBeGreaterThan(0.6);
    expect(response.impulse).toBeLessThan(0.8);
    expect(response.targetDeltaSpeed).toBeGreaterThan(0.45);
  });

  test('moves a heavier target less for the same collision', () => {
    const light = getBoardDieCollisionResponse({ impactSpeed: 4, sourceMass: 1.35, targetMass: 0.7 });
    const heavy = getBoardDieCollisionResponse({ impactSpeed: 4, sourceMass: 1.35, targetMass: 4 });

    expect(light.targetDeltaSpeed).toBeGreaterThan(heavy.targetDeltaSpeed);
  });
});

describe('board dice collision persistence', () => {
  test('applies every die displacement from a collision chain in one update', () => {
    const items = [
      { id: 'a', x: 10, y: 20, dieValue: 1 },
      { id: 'b', x: 40, y: 50, dieValue: 2 },
      { id: 'card', x: 5, y: 5, type: 'card' },
    ];
    const nextItems = applyBoardDieRolls(items, [
      { id: 'a', dx: 12, dy: -3, value: 4, rotation3d: { x: 1, y: 2, z: 3 } },
      { id: 'b', dx: -5, dy: 7, value: 6, rotation3d: { x: 4, y: 5, z: 6 } },
    ]);

    expect(nextItems[0]).toMatchObject({ x: 22, y: 17, dieValue: 4, dieRotation3d: { x: 1, y: 2, z: 3 } });
    expect(nextItems[1]).toMatchObject({ x: 35, y: 57, dieValue: 6, dieRotation3d: { x: 4, y: 5, z: 6 } });
    expect(nextItems[2]).toBe(items[2]);
  });
});

describe('board dice settlement', () => {
  test('requires a genuinely calm body after the minimum rolling time', () => {
    expect(isBoardDieMotionSettled({ elapsedMs: 700, speed: 0.01, spin: 0.01 })).toBe(false);
    expect(isBoardDieMotionSettled({ elapsedMs: 1200, speed: 0.12, spin: 0.2 })).toBe(true);
    expect(isBoardDieMotionSettled({ elapsedMs: 1200, speed: 0.4, spin: 0.2 })).toBe(false);
  });

  test('always terminates after enough stable frames or the hard timeout', () => {
    expect(shouldFinishBoardDieRoll({ elapsedMs: 2000, settledFrames: BOARD_DIE_SETTLED_FRAMES })).toBe(true);
    expect(shouldFinishBoardDieRoll({ elapsedMs: BOARD_DIE_MAX_ROLL_MS, settledFrames: 0 })).toBe(true);
    expect(shouldFinishBoardDieRoll({ elapsedMs: 2000, settledFrames: 2 })).toBe(false);
  });
});
