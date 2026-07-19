const DIE_REFERENCE_DIAMETERS = {
  4: 1.56,
  6: 1.56,
  8: 1.84,
  10: 1.64,
  12: 1.75,
  20: 1.84,
};

export const BOARD_DIE_MAX_ROLL_MS = 6500;
export const BOARD_DIE_MIN_SETTLE_MS = 850;
export const BOARD_DIE_SETTLED_FRAMES = 12;

export const getBoardDieReferenceDiameter = (sides) => (
  DIE_REFERENCE_DIAMETERS[Number(sides)] || DIE_REFERENCE_DIAMETERS[20]
);

export const getBoardDieLaunchGesture = ({
  deltaX = 0,
  deltaY = 0,
  dieWidth = 48,
  dieHeight = 48,
  maxDragDistance = 220,
} = {}) => {
  const safeDeltaX = Number.isFinite(Number(deltaX)) ? Number(deltaX) : 0;
  const safeDeltaY = Number.isFinite(Number(deltaY)) ? Number(deltaY) : 0;
  const safeWidth = Math.max(1, Number(dieWidth) || 48);
  const safeHeight = Math.max(1, Number(dieHeight) || safeWidth);
  const cancelRadius = Math.max(20, Math.min(safeWidth, safeHeight) * 0.42);
  const distance = Math.hypot(safeDeltaX, safeDeltaY);
  const usableDistance = Math.max(1, Number(maxDragDistance) || 220);
  const tension = Math.min(Math.max((distance - cancelRadius) / usableDistance, 0), 1);
  const angle = Math.atan2(safeDeltaY, safeDeltaX);
  const force = 0.26 + (tension * 1.04);

  return {
    cancelled: distance <= cancelRadius,
    cancelRadius,
    distance,
    tension,
    angle,
    directionDegrees: (angle * 180 / Math.PI) + 90,
    velocity: {
      x: Math.cos(angle) * force,
      y: Math.sin(angle) * force,
    },
  };
};

export const getBoardDiePhysicsMetrics = ({
  sides = 20,
  width = 48,
  height = 48,
  zoom = 1,
} = {}) => {
  const localDiameter = Math.max(24, Math.min(Number(width) || 48, Number(height) || Number(width) || 48));
  const safeZoom = Math.max(0.05, Number(zoom) || 1);
  const referenceDiameter = getBoardDieReferenceDiameter(sides);
  const localPixelsPerMeter = localDiameter / referenceDiameter;

  return {
    localDiameter,
    referenceDiameter,
    localPixelsPerMeter,
    screenPixelsPerMeter: localPixelsPerMeter * safeZoom,
    zoom: safeZoom,
  };
};

export const getBoardDieAngularVelocity = ({
  launchX = 0,
  launchZ = 0,
  sides = 20,
  random = Math.random,
} = {}) => {
  const safeLaunchX = Number(launchX) || 0;
  const safeLaunchZ = Number(launchZ) || 0;
  const launchPower = Math.max(0.26, Math.min(1.3, Math.hypot(safeLaunchX, safeLaunchZ)));
  const directionLength = Math.hypot(safeLaunchX, safeLaunchZ);
  const fallbackAngle = (Number(random()) || 0) * Math.PI * 2;
  const directionX = directionLength > 0.001 ? safeLaunchX / directionLength : Math.cos(fallbackAngle);
  const directionZ = directionLength > 0.001 ? safeLaunchZ / directionLength : Math.sin(fallbackAngle);
  const axis = {
    x: directionZ + (((Number(random()) || 0) - 0.5) * 0.22),
    y: ((Number(random()) || 0) - 0.5) * 0.3,
    z: -directionX + (((Number(random()) || 0) - 0.5) * 0.22),
  };
  const axisLength = Math.max(0.001, Math.hypot(axis.x, axis.y, axis.z));
  const d4Multiplier = Number(sides) === 4 ? 1.08 : 1;
  const spinSpeed = (4.6 + (launchPower * 3.2)) * d4Multiplier;

  return {
    x: (axis.x / axisLength) * spinSpeed,
    y: (axis.y / axisLength) * spinSpeed,
    z: (axis.z / axisLength) * spinSpeed,
  };
};

export const getBoardDieCollisionMass = ({
  diameter = 1.56,
  referenceDiameter = 1.56,
  baseMass = 1.35,
} = {}) => {
  const safeDiameter = Math.max(0.1, Number(diameter) || 1.56);
  const safeReference = Math.max(0.1, Number(referenceDiameter) || 1.56);
  const safeBaseMass = Math.max(0.1, Number(baseMass) || 1.35);
  const scaledMass = safeBaseMass * ((safeDiameter / safeReference) ** 3);

  return Math.max(0.35, Math.min(6, scaledMass));
};

export const getBoardDieCollisionResponse = ({
  impactSpeed = 0,
  sourceMass = 1.35,
  targetMass = 1.35,
  threshold = 0.9,
} = {}) => {
  const safeImpactSpeed = Math.max(0, Number(impactSpeed) || 0);
  const safeSourceMass = Math.max(0.1, Number(sourceMass) || 1.35);
  const safeTargetMass = Math.max(0.1, Number(targetMass) || 1.35);
  const safeThreshold = Math.max(0, Number(threshold) || 0.9);
  if (safeImpactSpeed <= safeThreshold) {
    return { active: false, impulse: 0, targetDeltaSpeed: 0 };
  }

  const reducedMass = (safeSourceMass * safeTargetMass) / (safeSourceMass + safeTargetMass);
  const impulse = Math.min(2.2, (safeImpactSpeed - safeThreshold) * reducedMass * 0.28);

  return {
    active: impulse > 0,
    impulse,
    targetDeltaSpeed: impulse / safeTargetMass,
  };
};

export const applyBoardDieRolls = (items = [], rolls = []) => {
  const rollsById = new Map((rolls || []).filter(roll => roll?.id).map(roll => [roll.id, roll]));

  return (items || []).map((item) => {
    const roll = rollsById.get(item.id);
    if (!roll) return item;
    const safeDx = Number.isFinite(Number(roll.dx)) ? Number(roll.dx) : 0;
    const safeDy = Number.isFinite(Number(roll.dy)) ? Number(roll.dy) : 0;

    return {
      ...item,
      x: item.x + safeDx,
      y: item.y + safeDy,
      dieValue: roll.value,
      dieRotation3d: roll.rotation3d
        ? {
            x: Number(roll.rotation3d.x) || 0,
            y: Number(roll.rotation3d.y) || 0,
            z: Number(roll.rotation3d.z) || 0,
          }
        : item.dieRotation3d,
    };
  });
};

export const getBoardDieWorldBounds = (bounds, screenPixelsPerMeter) => {
  if (!bounds) return null;
  const scale = Math.max(1, Number(screenPixelsPerMeter) || 1);
  const toWorldDistance = (value, fallback) => Math.max(1.25, (Number(value) || fallback) / scale);

  return {
    left: toWorldDistance(bounds.left, 240),
    right: toWorldDistance(bounds.right, 240),
    top: toWorldDistance(bounds.top, 180),
    bottom: toWorldDistance(bounds.bottom, 180),
  };
};

export const isBoardDieMotionSettled = ({
  elapsedMs = 0,
  speed = Infinity,
  spin = Infinity,
  sleeping = false,
} = {}) => (
  Boolean(sleeping) || (
    Number(elapsedMs) >= BOARD_DIE_MIN_SETTLE_MS
    && Number(speed) < 0.2
    && Number(spin) < 0.28
  )
);

export const shouldFinishBoardDieRoll = ({
  elapsedMs = 0,
  settledFrames = 0,
} = {}) => (
  Number(settledFrames) >= BOARD_DIE_SETTLED_FRAMES
  || Number(elapsedMs) >= BOARD_DIE_MAX_ROLL_MS
);
