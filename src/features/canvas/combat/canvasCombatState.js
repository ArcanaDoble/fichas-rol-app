export const CANVAS_COMBAT_VERSION = 1;

export const ACTION_DIE_STATUSES = Object.freeze(['available', 'committed', 'spent']);

const DIE_SIDES = Object.freeze([4, 6, 8, 10, 12, 20]);

const asInteger = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
};

export const normalizeDieSides = (value, fallback = 6) => {
  const match = String(value ?? '').toLowerCase().match(/d\s*(\d+)/);
  const parsed = match ? Number(match[1]) : Number(value);
  return DIE_SIDES.includes(parsed) ? parsed : fallback;
};

export const normalizeActionDiceProfile = (profile = []) => {
  const source = Array.isArray(profile) ? profile : [];
  return source.slice(0, 3).map((die) => `d${normalizeDieSides(die)}`);
};

export const rollDie = (sides, random = Math.random) => (
  Math.floor(Math.max(0, Math.min(0.999999999, Number(random()) || 0)) * normalizeDieSides(sides)) + 1
);

export const rollDiceProfile = (profile = [], random = Math.random) => (
  normalizeActionDiceProfile(profile).map((die) => rollDie(die, random))
);

export const validateDiceResults = (profile = [], values = []) => {
  const normalizedProfile = normalizeActionDiceProfile(profile);
  if (normalizedProfile.length === 0 || normalizedProfile.length !== values.length) return false;
  return normalizedProfile.every((die, index) => {
    const value = Number(values[index]);
    return Number.isInteger(value) && value >= 1 && value <= normalizeDieSides(die);
  });
};

const createPool = (tokenId, profile, values, round, source) => (
  normalizeActionDiceProfile(profile).map((die, index) => ({
    id: `${tokenId}-r${round}-a${index + 1}`,
    die,
    sides: normalizeDieSides(die),
    value: asInteger(values[index], 1),
    status: 'available',
    source,
  }))
);

const getInitiativeBase = (token) => Math.max(0, asInteger(
  token?.initiativeBase
    ?? token?.stats?.iniciativa?.current
    ?? token?.stats?.iniciativa?.max,
  0,
));

const getEnemyInitiative = (token) => Math.max(0, asInteger(
  token?.fixedInitiative
    ?? token?.stats?.iniciativa?.current
    ?? token?.velocidad,
  0,
));

const isCombatParticipant = (token) => (
  token?.profileType === 'rogueliteClass' || token?.profileType === 'rogueliteEnemy'
);

const getParticipantSide = (token) => (
  token.profileType === 'rogueliteEnemy' ? 'enemies' : 'players'
);

const createParticipant = (token, index) => {
  const side = getParticipantSide(token);
  const profile = side === 'players' ? normalizeActionDiceProfile(token.actionDice) : [];
  const initiativeBase = side === 'players' ? getInitiativeBase(token) : getEnemyInitiative(token);
  return {
    tokenId: token.id,
    name: token.name || (side === 'players' ? 'Aventurero' : 'Enemigo'),
    portrait: token.portrait || token.img || '',
    side,
    orderIndex: index,
    profileId: side === 'enemies' ? (token.linkedEnemyId || token.id) : (token.linkedClassId || token.id),
    initiativeBase,
    initiative: side === 'enemies' ? initiativeBase : null,
    actionDiceProfile: profile,
    actionDice: [],
    awaitingRoll: side === 'players' && profile.length > 0,
    threatDie: side === 'enemies' && token.threatDie ? `d${normalizeDieSides(token.threatDie)}` : null,
    threatValue: null,
    independentInitiative: Boolean(token.independentInitiative),
  };
};

const sortParticipants = (participants) => [...participants].sort((left, right) => {
  const initiativeDelta = (right.initiative || 0) - (left.initiative || 0);
  if (initiativeDelta !== 0) return initiativeDelta;
  if (left.side !== right.side) return left.side === 'players' ? -1 : 1;
  return left.orderIndex - right.orderIndex;
});

export const buildInitiativeBlocks = (participantsById = {}) => {
  const sorted = sortParticipants(Object.values(participantsById).filter(
    (participant) => participant.initiative !== null
      && participant.initiative !== undefined
      && Number.isFinite(Number(participant.initiative)),
  ));
  const blocks = [];

  sorted.forEach((participant) => {
    const previous = blocks[blocks.length - 1];
    const joinsPlayerBlock = previous?.side === 'players' && participant.side === 'players';
    const joinsEnemyBlock = previous?.side === 'enemies'
      && participant.side === 'enemies'
      && !participant.independentInitiative
      && previous.profileId === participant.profileId
      && previous.initiative === participant.initiative;

    if (joinsPlayerBlock || joinsEnemyBlock) {
      previous.memberIds.push(participant.tokenId);
      previous.initiative = Math.max(previous.initiative, participant.initiative);
      return;
    }

    blocks.push({
      id: `block-${blocks.length + 1}-${participant.side}`,
      side: participant.side,
      profileId: participant.profileId,
      initiative: participant.initiative,
      memberIds: [participant.tokenId],
      actedIds: [],
    });
  });

  return blocks;
};

const allPlayersReady = (participantsById) => Object.values(participantsById)
  .filter((participant) => participant.side === 'players')
  .every((participant) => !participant.awaitingRoll);

const rollEnemyThreat = (participant, random) => (
  participant.threatDie ? rollDie(participant.threatDie, random) : null
);

const openTurnPhase = (state, random = Math.random) => ({
  ...state,
  status: 'active',
  roundPhase: 'turns',
  blocks: buildInitiativeBlocks(state.participants),
  activeBlockIndex: 0,
  participants: Object.fromEntries(Object.entries(state.participants).map(([id, participant]) => [
    id,
    participant.side === 'enemies'
      ? { ...participant, threatValue: rollEnemyThreat(participant, random) }
      : participant,
  ])),
});

export const createCanvasCombatState = (tokens = [], options = {}) => {
  const participants = Object.fromEntries(tokens
    .filter(isCombatParticipant)
    .map(createParticipant)
    .map((participant) => [participant.tokenId, participant]));
  const now = options.now || Date.now();
  const initial = {
    version: CANVAS_COMBAT_VERSION,
    status: 'setup',
    roundPhase: 'rolling',
    round: 1,
    startedAt: now,
    updatedAt: now,
    participants,
    blocks: [],
    activeBlockIndex: 0,
    history: [],
  };

  return allPlayersReady(participants) ? openTurnPhase(initial, options.random) : initial;
};

export const submitActionDice = (state, tokenId, values, options = {}) => {
  const participant = state?.participants?.[tokenId];
  if (!participant || participant.side !== 'players') return state;
  if (!participant.awaitingRoll) return state;
  if (!validateDiceResults(participant.actionDiceProfile, values)) {
    throw new Error('Los resultados no coinciden con el perfil de dados de la clase.');
  }

  const round = Math.max(1, asInteger(state.round, 1));
  const source = options.source === 'manual' ? 'manual' : 'digital';
  const actionDice = createPool(tokenId, participant.actionDiceProfile, values, round, source);
  const isInitiativeRoll = participant.initiative === null
    || participant.initiative === undefined
    || !Number.isFinite(Number(participant.initiative));
  const initiative = isInitiativeRoll
    ? participant.initiativeBase + Math.max(...values.map(Number))
    : participant.initiative;
  const next = {
    ...state,
    updatedAt: options.now || Date.now(),
    participants: {
      ...state.participants,
      [tokenId]: {
        ...participant,
        initiative,
        actionDice,
        awaitingRoll: false,
      },
    },
    history: [
      ...(state.history || []).slice(-39),
      {
        id: `${tokenId}-${round}-${options.now || Date.now()}`,
        type: isInitiativeRoll ? 'initiative-and-actions' : 'round-actions',
        tokenId,
        round,
        values: values.map(Number),
        source,
      },
    ],
  };

  return allPlayersReady(next.participants) ? openTurnPhase(next, options.random) : next;
};

export const rollParticipantActionDice = (state, tokenId, options = {}) => {
  const participant = state?.participants?.[tokenId];
  if (!participant) return state;
  return submitActionDice(
    state,
    tokenId,
    rollDiceProfile(participant.actionDiceProfile, options.random),
    { ...options, source: 'digital' },
  );
};

export const setActionDieStatus = (state, tokenId, dieId, status, options = {}) => {
  if (!ACTION_DIE_STATUSES.includes(status)) return state;
  const participant = state?.participants?.[tokenId];
  if (!participant) return state;
  return {
    ...state,
    updatedAt: options.now || Date.now(),
    participants: {
      ...state.participants,
      [tokenId]: {
        ...participant,
        actionDice: participant.actionDice.map((die) => (
          die.id === dieId ? { ...die, status } : die
        )),
      },
    },
  };
};

export const markParticipantActed = (state, tokenId, options = {}) => {
  const block = state?.blocks?.[state.activeBlockIndex];
  if (!block || !block.memberIds.includes(tokenId) || block.actedIds.includes(tokenId)) return state;
  const blocks = state.blocks.map((candidate, index) => (
    index === state.activeBlockIndex
      ? { ...candidate, actedIds: [...candidate.actedIds, tokenId] }
      : candidate
  ));
  const completed = blocks[state.activeBlockIndex].actedIds.length >= block.memberIds.length;
  return {
    ...state,
    updatedAt: options.now || Date.now(),
    blocks,
    activeBlockIndex: completed
      ? Math.min(state.activeBlockIndex + 1, blocks.length)
      : state.activeBlockIndex,
  };
};

export const undoLastActivation = (state, options = {}) => {
  const blocks = (state?.blocks || []).map((block) => ({ ...block, actedIds: [...block.actedIds] }));
  let index = Math.min(state.activeBlockIndex, Math.max(0, blocks.length - 1));
  if (state.activeBlockIndex >= blocks.length && blocks.length > 0) index = blocks.length - 1;
  while (index >= 0 && blocks[index].actedIds.length === 0) index -= 1;
  if (index < 0) return state;
  blocks[index].actedIds.pop();
  return { ...state, blocks, activeBlockIndex: index, updatedAt: options.now || Date.now() };
};

export const startNextRound = (state, options = {}) => {
  const round = Math.max(1, asInteger(state?.round, 1)) + 1;
  const participants = Object.fromEntries(Object.entries(state?.participants || {}).map(([id, participant]) => [
    id,
    participant.side === 'players'
      ? { ...participant, actionDice: [], awaitingRoll: participant.actionDiceProfile.length > 0 }
      : { ...participant, threatValue: null },
  ]));
  const next = {
    ...state,
    status: 'active',
    round,
    roundPhase: 'rolling',
    participants,
    blocks: [],
    activeBlockIndex: 0,
    updatedAt: options.now || Date.now(),
  };
  return allPlayersReady(participants) ? openTurnPhase(next, options.random) : next;
};

export const finishCanvasCombat = (state, options = {}) => ({
  ...state,
  status: 'finished',
  roundPhase: 'finished',
  finishedAt: options.now || Date.now(),
  updatedAt: options.now || Date.now(),
});
