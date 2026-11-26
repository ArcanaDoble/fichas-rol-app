import { continueCanvasExplosiveBlast } from './canvasExplosiveBlast';
import { normalizeCombatSideKey } from '../../tactical-shared/legacyCombatRules';
import { normalizeCampaignThreatProfile, rollCampaignThreatPool } from './campaignThreatDice';

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
  ['rogueliteClass', 'rogueliteEnemy', 'campaignCharacter'].includes(token?.profileType)
);

export const supportsCanvasInitiative = (token, system) => (
  token?.profileType === 'rogueliteEnemy'
  || token?.profileType === (system === 'campaign' ? 'campaignCharacter' : 'rogueliteClass')
);

const isEligibleForInitiative = (token, system) => (
  supportsCanvasInitiative(token, system) && token.participatesInCombat !== false
);

export const getCanvasCombatReinforcements = (state, tokens = []) => (
  ['setup', 'active'].includes(state?.status)
    ? tokens.filter(token => isEligibleForInitiative(token, state.rulesSystem) && !state.participants?.[token.id])
    : []
);

const getParticipantSide = (token) => (
  token.profileType === 'rogueliteEnemy' ? 'enemies' : 'players'
);

export const defaultEnemyActions = (campaign = false) => [
  { id: 'movement', label: 'Movimiento', type: 'movement', status: 'available' },
  { id: 'attack', label: 'Ataque', type: 'attack', status: 'available' },
  ...(campaign ? [{ id: 'defense', label: 'Defensa', type: 'defense', status: 'available' }] : []),
];

export const getMovementBase = (token) => Math.max(0, asInteger(
  (token?.stats?.movimiento?.potionBase != null ? Number(token.stats.movimiento.potionBase) + Number(token.stats.movimiento.potionBonus || 0) : undefined)
    ?? token?.stats?.movimiento?.max
    ?? token?.stats?.movimiento?.current
    ?? token?.stats?.movement
    ?? token?.movimiento
    ?? token?.movement
    ?? 2,
  2,
));

export const getMovementStatMax = (token) => Math.max(0, asInteger(
  token?.stats?.movimiento?.potionBase ?? token?.stats?.movimiento?.max
    ?? token?.stats?.movimiento?.current
    ?? token?.stats?.movement
    ?? token?.movimiento
    ?? token?.movement
    ?? 2,
  2,
));

export const getMovementAllowance = (participant) => {
  const runtime = participant?.movementRuntime;
  if (!runtime) return 0;
  const base = Number(runtime.base) || 0;
  const modifier = Number(runtime.modifier) || 0;
  const sprintBonus = Number(runtime.sprintBonus) || 0;
  return Math.max(0, (runtime.bleedingForfeit ? 0 : base + modifier) + sprintBonus);
};

export const getAvailableMovement = (participant) => {
  const defensiveRemaining = Number(participant?.defensiveReposition?.remaining);
  if (Number.isFinite(defensiveRemaining) && defensiveRemaining > 0) return defensiveRemaining;
  const runtime = participant?.movementRuntime;
  if (!runtime) return 0;
  const spent = Number(runtime.spent) || 0;
  return Math.max(0, getMovementAllowance(participant) - spent);
};

const createParticipant = (token, index) => {
  const side = getParticipantSide(token);
  const threatProfile = normalizeCampaignThreatProfile(token.threatDice, token.threatDie);
  const profile = side === 'players' ? normalizeActionDiceProfile(token.profileType === 'campaignCharacter'
    ? (token.actionDice || []).filter(Boolean) : token.actionDice) : [];
  const initiativeBase = side === 'players' ? getInitiativeBase(token) : getEnemyInitiative(token);
  const movementBase = getMovementBase(token);
  return {
    tokenId: token.id,
    ...(token.rulesSystem === 'campaign' ? {
      rulesSystem: 'campaign', defenseRefreshed: false,
      initiativeTeamId: normalizeCombatSideKey(token.teamId || ''),
    } : {}),
    ...(token.stats?.movimiento?.potionBonus ? { hasteBonus: token.stats.movimiento.potionBonus } : {}),
    name: token.name || (side === 'players' ? 'Aventurero' : 'Enemigo'),
    portrait: token.portrait || token.img || '',
    side,
    orderIndex: index,
    profileId: side === 'enemies' ? (token.linkedEnemyId || token.id) : (token.linkedClassId || token.id),
    initiativeBase,
    initiative: side === 'enemies' || !profile.length ? initiativeBase : null,
    actionDiceProfile: profile,
    actionDice: [],
    enemyActions: side === 'enemies' ? defaultEnemyActions(token.rulesSystem === 'campaign') : [],
    movementRuntime: {
      base: movementBase,
      statMax: getMovementStatMax(token),
      modifier: 0,
      spent: 0,
      sprintBonus: 0,
      sprintDieId: null,
      sprintDieIds: [],
      history: [],
    },
    awaitingRoll: side === 'players' && profile.length > 0,
    threatDie: side === 'enemies' ? token.rulesSystem === 'campaign' ? threatProfile[0] || null
      : token.threatDie ? `d${normalizeDieSides(token.threatDie)}` : null : null,
    threatValue: null,
    ...(token.rulesSystem === 'campaign' && side === 'enemies' ? {
      threatDiceProfile: threatProfile,
    } : {}),
    independentInitiative: Boolean(token.independentInitiative),
  };
};

export const sortCombatParticipants = (participants) => [...participants].sort((left, right) => {
  const initiativeDelta = (right.initiative || 0) - (left.initiative || 0);
  if (initiativeDelta !== 0) return initiativeDelta;
  if (left.rulesSystem === 'campaign' && right.rulesSystem === 'campaign' && left.side === 'players' && right.side === 'players') {
    for (let index = 0; index < 3; index += 1) {
      const delta = (right.initiativeDice?.[index] || 0) - (left.initiativeDice?.[index] || 0);
      if (delta) return delta;
    }
  }
  if (left.side !== right.side) return left.side === 'enemies' ? -1 : 1;
  return left.orderIndex - right.orderIndex;
});

export const buildInitiativeBlocks = (participantsById = {}) => {
  const sorted = sortCombatParticipants(Object.values(participantsById).filter(
    (participant) => participant.initiative !== null
      && participant.initiative !== undefined
      && Number.isFinite(Number(participant.initiative)),
  ));
  const blocks = [];
  const playerTeams = new Set(sorted.filter(p => p.side === 'players').map(p => p.initiativeTeamId).filter(Boolean));

  sorted.forEach((participant) => {
    const previous = blocks[blocks.length - 1];
    const teamId = participant.rulesSystem === 'campaign' ? participant.initiativeTeamId || '' : '';
    const sameTeam = !teamId && !previous?.teamId;
    const joinsTeamBlock = teamId && previous?.teamId === teamId
      && !participant.independentInitiative && !previous.independentInitiative;
    const joinsPlayerBlock = sameTeam && previous?.side === 'players' && participant.side === 'players';
    const joinsEnemyBlock = previous?.side === 'enemies'
      && participant.side === 'enemies'
      && sameTeam
      && !participant.independentInitiative
      && previous.profileId === participant.profileId
      && previous.initiative === participant.initiative;

    if (joinsTeamBlock || joinsPlayerBlock || joinsEnemyBlock) {
      previous.memberIds.push(participant.tokenId);
      previous.initiative = Math.max(previous.initiative, participant.initiative);
      return;
    }

    blocks.push({
      id: `block-${blocks.length + 1}-${participant.side}`,
      side: teamId && playerTeams.has(teamId) ? 'players' : participant.side,
      ...(teamId ? { teamId, independentInitiative: Boolean(participant.independentInitiative) } : {}),
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

const prepareParticipantForTurns = (participant, round, random = Math.random) => {
  if (participant.side !== 'enemies') return participant;
  if (participant.rulesSystem !== 'campaign') return { ...participant, threatValue: rollEnemyThreat(participant, random) };
  const pool = rollCampaignThreatPool(participant, random, round);
  return { ...participant, campaignThreatDice: pool, threatValue: pool[0]?.value ?? null };
};

const activateCampaignDefense = state => {
  const ids = state.blocks?.[state.activeBlockIndex]?.memberIds || [];
  const participants = { ...state.participants };
  ids.forEach(id => {
    const p = participants[id];
    if (p?.side !== 'enemies' || p.rulesSystem !== 'campaign' || p.defenseRefreshed) return;
    participants[id] = { ...p, defenseRefreshed: true, enemyActions: p.enemyActions.map(action => (
      action.id === 'defense' ? { ...action, status: 'available' } : action
    )) };
  });
  return { ...state, participants };
};

const openTurnPhase = (state, random = Math.random) => activateCampaignDefense({
  ...state,
  ...(state.requiresStart ? { requiresStart: false } : {}),
  status: 'active',
  roundPhase: 'turns',
  blocks: buildInitiativeBlocks(state.participants),
  activeBlockIndex: 0,
  participants: Object.fromEntries(Object.entries(state.participants).map(([id, participant]) => [
    id,
    prepareParticipantForTurns(participant, state.round, random),
  ])),
});

const syncInitiativeRoster = (current, tokens, system) => {
  let index = Math.max(-1, ...Object.values(current).map(participant => participant.orderIndex ?? -1)) + 1;
  return Object.fromEntries(tokens.filter(token => isEligibleForInitiative(token, system)).map(token => [
    token.id,
    current[token.id] || createParticipant(system === 'campaign' ? { ...token, rulesSystem: 'campaign' } : token, index++),
  ]));
};

export const createCanvasCombatState = (tokens = [], options = {}) => {
  const participants = syncInitiativeRoster({}, options.includeNonParticipants
    ? tokens.map(token => token?.participatesInCombat === false ? { ...token, participatesInCombat: true } : token)
    : tokens, options.rulesSystem);
  const now = options.now || Date.now();
  const initial = {
    version: CANVAS_COMBAT_VERSION,
    ...(options.rulesSystem === 'campaign' ? { rulesSystem: 'campaign' } : {}),
    ...(options.requiresStart ? { requiresStart: true } : {}),
    status: 'setup',
    roundPhase: 'rolling',
    round: 1,
    startedAt: now,
    updatedAt: now,
    participants,
    blocks: [],
    activeBlockIndex: 0,
    pendingAttack: null,
    history: [],
  };

  return !initial.requiresStart && allPlayersReady(participants) ? openTurnPhase(initial, options.random) : initial;
};

export const startPreparedCanvasCombat = (state, tokens, options = {}) => {
  if (state?.status !== 'setup' || !state.requiresStart) return state;
  const participants = syncInitiativeRoster(state.participants, tokens, state.rulesSystem);
  const changed = Object.keys(participants).length !== Object.keys(state.participants).length
    || Object.keys(participants).some(id => !state.participants[id]);
  const next = changed ? { ...state, participants, updatedAt: options.now || Date.now() } : state;
  if (!Object.keys(participants).length || !allPlayersReady(participants)) return next;
  return openTurnPhase({ ...next, updatedAt: options.now || Date.now() }, options.random);
};

const insertLateInitiative = (state, participant) => {
  const blocks = state.blocks || [];
  const block = buildInitiativeBlocks({ [participant.tokenId]: participant })[0];
  if (!block) return state;
  const nextIndex = Math.min(state.activeBlockIndex + 1, blocks.length);
  const lowerInitiativeIndex = blocks.findIndex((candidate, index) => index >= nextIndex && (
    candidate.memberIds.some(id => !candidate.actedIds.includes(id))
    && sortCombatParticipants([state.participants[candidate.memberIds[0]], participant])[0] === participant
  ));
  const insertAt = lowerInitiativeIndex === -1 ? blocks.length : lowerInitiativeIndex;
  const allied = block.teamId && Object.values(state.participants).some(other => (
    other.side === 'players' && other.initiativeTeamId === block.teamId
  ));
  const next = {
    ...state,
    blocks: [
      ...blocks.slice(0, insertAt),
      { ...block, side: allied ? 'players' : block.side, id: `reinforcement-${participant.tokenId}` },
      ...blocks.slice(insertAt),
    ],
  };
  return activateCampaignDefense(next);
};

export const updateCanvasCombatMembership = (state, token, options = {}) => {
  if (!['setup', 'active'].includes(state?.status) || !supportsCanvasInitiative(token, state.rulesSystem)) return state;
  const current = state.participants[token.id];
  const rolling = state.roundPhase === 'rolling';
  const now = options.now || Date.now();
  if (token.participatesInCombat === false) {
    // Keep actions already granted for this round, including ongoing exchanges.
    if (!current || (!rolling && !current.awaitingRoll)) return state;
    const participants = { ...state.participants };
    delete participants[token.id];
    const next = { ...state, participants, updatedAt: now };
    return rolling && !state.requiresStart && allPlayersReady(participants) ? openTurnPhase(next, options.random) : next;
  }
  if (current || (!rolling && !options.joinNow)) return state;
  const orderIndex = Math.max(-1, ...Object.values(state.participants).map(participant => participant.orderIndex ?? -1)) + 1;
  let participant = createParticipant(state.rulesSystem === 'campaign' ? { ...token, rulesSystem: 'campaign' } : token, orderIndex);
  if (!rolling) {
    participant = { ...prepareParticipantForTurns(participant, state.round, options.random), joinedRound: state.round };
  }
  const next = { ...state, participants: { ...state.participants, [token.id]: participant }, updatedAt: now };
  return !rolling && !participant.awaitingRoll ? insertLateInitiative(next, participant) : next;
};

export const canAdvanceCanvasRound = state => (
  state?.status === 'active' && state.roundPhase === 'turns'
  && state.activeBlockIndex >= (state.blocks?.length || 0)
  && allPlayersReady(state.participants)
  && !state.pendingAttack && !state.explosiveBlast && !state.arcaneChain
);

export const queueCanvasAttack = (state, attack, options = {}) => {
  if (!state || !attack?.id || state.pendingAttack || state.arcaneChain) return state;
  const attacker = state.participants?.[attack.attackerId];
  const target = state.participants?.[attack.targetId];
  if (!attacker || !target) return state;

  const selectedIds = new Set(attack.actionDieIds || []);
  if (attacker.side === 'players') {
    const selectedDice = (attacker.actionDice || []).filter((die) => selectedIds.has(die.id));
    if (selectedDice.length !== selectedIds.size || selectedDice.some((die) => die.status !== 'available')) {
      return state;
    }
  }

  const lastAttackWeaponIds = (attack.attackParts || []).map(part => part.weaponId).filter(Boolean).map(String);
  const updatedAttacker = {
    ...attacker,
    ...(lastAttackWeaponIds.length ? { lastAttackWeaponIds } : {}),
  };
  const participants = {
    ...state.participants,
    [attack.attackerId]: attacker.side === 'players'
      ? {
        ...updatedAttacker,
        actionDice: attacker.actionDice.map((die) => (
          selectedIds.has(die.id) ? { ...die, status: 'spent' } : die
        )),
      }
      : {
        ...updatedAttacker,
        threatValue: attack.usedThreat ? null : attacker.threatValue,
        enemyActions: (attacker.enemyActions || defaultEnemyActions()).map((action) => (
          action.id === 'attack' ? { ...action, status: 'spent' } : action
        )),
      },
  };
  const now = options.now || Date.now();
  const serializableAttack = Object.fromEntries(
    Object.entries(attack).filter(([, value]) => value !== undefined),
  );

  return {
    ...state,
    participants,
    pendingAttack: {
      ...serializableAttack,
      status: attack.needsCunning ? 'awaiting-cunning' : attack.needsAdjustment ? 'awaiting-adjustment' : 'awaiting-defense',
      createdAt: attack.createdAt || now,
    },
    updatedAt: now,
    history: [
      ...(state.history || []).slice(-39),
      {
        id: `${attack.id}-queued`,
        type: 'attack-queued',
        attackerId: attack.attackerId,
        targetId: attack.targetId,
        attackId: attack.id,
        round: state.round,
      },
    ],
  };
};

export const cancelQueuedCanvasAttack = (state, options = {}) => {
  if (!state?.pendingAttack) return state;
  const pendingAttack = state.pendingAttack;
  const attacker = state.participants?.[pendingAttack.attackerId];
  const now = options.now || Date.now();

  let nextParticipants = state.participants;
  if (attacker && attacker.side === 'players' && Array.isArray(pendingAttack.actionDice)) {
    const committedIds = new Set(pendingAttack.actionDice.map((d) => d.id));
    nextParticipants = {
      ...state.participants,
      [pendingAttack.attackerId]: {
        ...attacker,
        actionDice: attacker.actionDice.map((die) => (
          committedIds.has(die.id) && die.status === 'committed' ? { ...die, status: 'available' } : die
        )),
      },
    };
  }

  return {
    ...state,
    participants: nextParticipants,
    pendingAttack: null,
    updatedAt: now,
  };
};

export const resolveQueuedCanvasAttack = (state, resolution, options = {}) => {
  const pendingAttack = state?.pendingAttack;
  if (!pendingAttack || pendingAttack.id !== resolution?.attackId) return state;
  const target = state.participants?.[pendingAttack.targetId];
  const now = options.now || Date.now();

  if (!target) {
    return {
      ...state,
      pendingAttack: null,
      updatedAt: now,
    };
  }

  const selectedIds = new Set(resolution.defenseDieIds || []);
  const selectedDice = (target.actionDice || []).filter((die) => selectedIds.has(die.id));
  if (target.side === 'players' && (
    selectedDice.length !== selectedIds.size
    || selectedDice.some((die) => die.status !== 'committed')
  )) return state;

  return {
    ...state,
    participants: {
      ...state.participants,
      [pendingAttack.targetId]: target.side === 'players'
        ? {
          ...target,
          actionDice: target.actionDice.map((die) => (
            selectedIds.has(die.id) ? { ...die, status: 'spent' } : die
          )),
        }
        : target,
    },
    pendingAttack: null,
    updatedAt: now,
    history: [
      ...(state.history || []).slice(-39),
      {
        id: `${pendingAttack.id}-resolved`,
        type: 'attack-resolved',
        attackId: pendingAttack.id,
        attackerId: pendingAttack.attackerId,
        targetId: pendingAttack.targetId,
        defenseDieIds: [...selectedIds],
        finalPressure: resolution.finalPressure,
        lifeLost: resolution.lifeLost,
        surplus: resolution.surplus,
        round: state.round,
      },
    ],
  };
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
        ...(participant.rulesSystem === 'campaign' && isInitiativeRoll ? { initiativeDice: [...values].sort((a, b) => b - a) } : {}),
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

  if (state.roundPhase === 'turns') return insertLateInitiative(next, next.participants[tokenId]);
  return !state.requiresStart && allPlayersReady(next.participants) ? openTurnPhase(next, options.random) : next;
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

export const consumeItemUseResource = (state, tokenId, resource = {}, options = {}) => {
  const participant = state?.participants?.[tokenId];
  if (!participant || resource.status !== 'available') return state;

  if (resource.kind === 'enemy-action') {
    if (participant.side !== 'enemies' || resource.actionId !== 'attack'
      || !participant.enemyActions?.some(action => action.id === 'attack' && action.status === 'available')) return state;
    return setEnemyActionStatus(state, tokenId, 'attack', 'spent', options);
  }

  if (resource.kind === 'enemy-movement') {
    const runtime = participant.movementRuntime;
    if (participant.side !== 'enemies' || resource.actionId !== 'movement'
      || !participant.enemyActions?.some(action => action.id === 'movement' && action.status === 'available')
      || getMovementAllowance(participant) <= Number(runtime?.spent || 0)) return state;
    const next = setEnemyActionStatus(state, tokenId, 'movement', 'spent', options);
    return { ...next, participants: { ...next.participants, [tokenId]: { ...next.participants[tokenId],
      movementRuntime: { ...runtime, spent: getMovementAllowance(participant), history: [] },
    } } };
  }

  if (resource.kind === 'manual-threat') {
    if (participant.side !== 'enemies' || !DIE_SIDES.includes(resource.sides)) return state;
    return { ...state, updatedAt: options.now || Date.now(), history: [
      ...(state.history || []).slice(-39), { id: `item-threat-${tokenId}-${options.now || Date.now()}`,
        type: 'item-use-resource', tokenId, kind: 'manual-threat', sides: resource.sides, timestamp: options.now || Date.now() },
    ] };
  }

  if (resource.kind === 'threat-die') {
    if (participant.side !== 'enemies' || participant.threatValue === null || participant.threatValue === undefined) {
      return state;
    }
    return {
      ...state,
      updatedAt: options.now || Date.now(),
      participants: {
        ...state.participants,
        [tokenId]: { ...participant, threatValue: null },
      },
    };
  }

  if (resource.kind !== 'action-die') return state;
  const die = participant.actionDice?.find((candidate) => candidate.id === resource.id);
  if (!die || die.status !== 'available') return state;
  return setActionDieStatus(state, tokenId, resource.id, 'spent', options);
};

export const setEnemyActionStatus = (state, tokenId, actionId, status, options = {}) => {
  const participant = state?.participants?.[tokenId];
  if (!participant) return state;
  const currentActions = participant.enemyActions || defaultEnemyActions();
  return {
    ...state,
    updatedAt: options.now || Date.now(),
    participants: {
      ...state.participants,
      [tokenId]: {
        ...participant,
        enemyActions: currentActions.map((action) => (
          action.id === actionId ? { ...action, status } : action
        )),
      },
    },
  };
};

export const markParticipantActed = (state, tokenId, options = {}) => {
  if (state?.arcaneChain) return state;
  const block = state?.blocks?.[state.activeBlockIndex];
  if (!block || !block.memberIds.includes(tokenId) || block.actedIds.includes(tokenId)) return state;
  const blocks = state.blocks.map((candidate, index) => (
    index === state.activeBlockIndex
      ? { ...candidate, actedIds: [...candidate.actedIds, tokenId] }
      : candidate
  ));
  const participant = state.participants?.[tokenId];
  const hasteTurnBonus = Number(participant?.hasteTurnBonus) || 0;
  const participants = hasteTurnBonus ? { ...state.participants, [tokenId]: { ...participant, hasteTurnBonus: 0,
    movementRuntime: { ...participant.movementRuntime,
      sprintBonus: Math.max(0, participant.movementRuntime.sprintBonus - hasteTurnBonus),
      spent: Math.min(participant.movementRuntime.spent, getMovementAllowance(participant) - hasteTurnBonus),
    },
  } } : state.participants;
  const completed = blocks[state.activeBlockIndex].actedIds.length >= block.memberIds.length;
  let nextBlockIndex = state.activeBlockIndex;
  if (completed) {
    nextBlockIndex += 1;
    // A reopened activation may sit before blocks already completed this round.
    while (nextBlockIndex < blocks.length
      && blocks[nextBlockIndex].memberIds.every(id => blocks[nextBlockIndex].actedIds.includes(id))) nextBlockIndex += 1;
  }
  return activateCampaignDefense({
    ...state,
    updatedAt: options.now || Date.now(),
    blocks,
    participants,
    activeBlockIndex: nextBlockIndex,
  });
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

export const undoParticipantActivation = (state, tokenId, options = {}) => {
  if (state?.status !== 'active' || state?.roundPhase !== 'turns' || state.pendingAttack || state.explosiveBlast || state.arcaneChain) return state;
  const blocks = (state?.blocks || []).map((block) => ({
    ...block,
    actedIds: [...(block.actedIds || [])],
  }));
  const blockIndex = blocks.findIndex((block) => block.actedIds.includes(tokenId));
  if (blockIndex < 0) return state;

  blocks[blockIndex].actedIds = blocks[blockIndex].actedIds.filter((id) => id !== tokenId);
  return {
    ...state,
    blocks,
    activeBlockIndex: blockIndex,
    updatedAt: options.now || Date.now(),
    history: [...(state.history || []).slice(-39), {
      id: `reopen-${tokenId}-${options.now || Date.now()}`, type: 'activation-reopened',
      tokenId, round: state.round, timestamp: options.now || Date.now(),
    }],
  };
};

export const spendActionDieForSprint = (state, tokenId, dieId, options = {}) => {
  const participant = state?.participants?.[tokenId];
  const activeBlock = state?.blocks?.[state.activeBlockIndex];
  const runtime = participant?.movementRuntime;
  const die = participant?.actionDice?.find((candidate) => candidate.id === dieId);
  const spentSprintDieIds = Array.isArray(runtime?.sprintDieIds)
    ? runtime.sprintDieIds
    : [runtime?.sprintDieId].filter(Boolean);
  const canActNow = state?.status === 'active'
    && state?.roundPhase === 'turns'
    && activeBlock?.memberIds?.includes(tokenId)
    && !activeBlock?.actedIds?.includes(tokenId);

  if (
    !participant
    || participant.side !== 'players'
    || !runtime
    || !canActNow
    || spentSprintDieIds.includes(dieId)
    || !die
    || die.status !== 'available'
  ) return state;

  const sprintBonus = Math.max(0, asInteger(die.value, 0));
  if (sprintBonus <= 0) return state;
  const now = options.now || Date.now();

  return {
    ...state,
    participants: {
      ...state.participants,
      [tokenId]: {
        ...participant,
        actionDice: participant.actionDice.map((candidate) => (
          candidate.id === dieId ? { ...candidate, status: 'spent' } : candidate
        )),
        movementRuntime: {
          ...runtime,
          sprintBonus: Math.max(0, Number(runtime.sprintBonus) || 0) + sprintBonus,
          sprintDieId: dieId,
          sprintDieIds: [...spentSprintDieIds, dieId],
        },
      },
    },
    history: [
      ...(state.history || []).slice(-39),
      {
        id: `sprint-${tokenId}-${now}`,
        type: 'sprint-activated',
        tokenId,
        dieId,
        die: die.die,
        value: sprintBonus,
        round: state.round,
        timestamp: now,
      },
    ],
    updatedAt: now,
  };
};

export const rechargeEnemyMovementWithAttack = (state, tokenId, options = {}) => {
  const participant = state?.participants?.[tokenId];
  const activeBlock = state?.blocks?.[state.activeBlockIndex];
  const runtime = participant?.movementRuntime;
  const actions = participant?.enemyActions || defaultEnemyActions();
  const attackAction = actions.find((action) => action.id === 'attack');
  const canActNow = state?.status === 'active'
    && state?.roundPhase === 'turns'
    && activeBlock?.memberIds?.includes(tokenId)
    && !activeBlock?.actedIds?.includes(tokenId);
  const baseAllowance = runtime
    ? Math.max(0, (Number(runtime.base) || 0) + (Number(runtime.modifier) || 0))
    : 0;

  if (
    !participant
    || participant.side !== 'enemies'
    || !runtime
    || !canActNow
    || !attackAction
    || attackAction.status === 'spent'
    || getAvailableMovement(participant) >= baseAllowance
  ) return state;

  const now = options.now || Date.now();
  return {
    ...state,
    participants: {
      ...state.participants,
      [tokenId]: {
        ...participant,
        enemyActions: actions.map((action) => (
          action.id === 'attack' ? { ...action, status: 'spent' } : action
        )),
        movementRuntime: {
          ...runtime,
          spent: 0,
          sprintBonus: runtime.bleedingForfeit ? baseAllowance : 0,
          sprintDieId: null,
          sprintDieIds: [],
        },
      },
    },
    history: [
      ...(state.history || []).slice(-39),
      {
        id: `enemy-sprint-${tokenId}-${now}`,
        type: 'enemy-sprint-activated',
        tokenId,
        movementRestored: baseAllowance,
        spentActionId: 'attack',
        actor: options.actor || 'Master',
        timestamp: now,
      },
    ],
    updatedAt: now,
  };
};

export const setParticipantMovementModifier = (state, tokenId, modifier, options = {}) => {
  const participant = state?.participants?.[tokenId];
  if (!participant) return state;
  const runtime = participant.movementRuntime || {
    base: getMovementBase(participant),
    statMax: getMovementStatMax(participant),
    modifier: 0,
    spent: 0,
    sprintBonus: 0,
    sprintDieId: null,
    sprintDieIds: [],
    history: [],
  };
  const nextModifier = asInteger(modifier, 0);
  return {
    ...state,
    participants: {
      ...state.participants,
      [tokenId]: {
        ...participant,
        movementRuntime: {
          ...runtime,
          modifier: nextModifier,
        },
      },
    },
    updatedAt: options.now || Date.now(),
  };
};

export const setParticipantMovementResource = (state, tokenId, resource = {}, options = {}) => {
  const participant = state?.participants?.[tokenId];
  if (!participant) return state;
  const runtime = participant.movementRuntime || {
    base: getMovementBase(participant),
    statMax: getMovementStatMax(participant),
    modifier: 0,
    spent: 0,
    sprintBonus: 0,
    sprintDieId: null,
    sprintDieIds: [],
    history: [],
  };
  const field = resource.field === 'max' ? 'max' : 'current';
  const modifier = Number(runtime.modifier) || 0;
  const sprintBonus = Math.max(0, Number(runtime.sprintBonus) || 0);
  const transientBonus = modifier + sprintBonus;
  const previousBaseAllowance = Math.max(0, (Number(runtime.base) || 0) + modifier);
  const previousSpent = Math.max(0, Number(runtime.spent) || 0);
  const sprintSpent = Math.min(sprintBonus, Math.max(0, previousSpent - previousBaseAllowance));
  const sprintRemaining = Math.max(0, sprintBonus - sprintSpent);
  const requestedMax = Math.max(0, asInteger(resource.max, runtime.statMax ?? runtime.base));
  const nextBase = field === 'max'
    ? Math.max(0, requestedMax - transientBonus)
    : Math.max(0, Number(runtime.base) || 0);
  const nextStatMax = field === 'max' ? nextBase : (runtime.statMax ?? nextBase);
  const nextAllowance = Math.max(0, nextBase + transientBonus);
  const nextBaseAllowance = Math.max(0, nextBase + modifier);
  const maximumRechargeable = Math.min(nextAllowance, nextBaseAllowance + sprintRemaining);
  const requestedCurrent = Math.max(0, asInteger(resource.current, getAvailableMovement(participant)));
  const nextCurrent = Math.min(requestedCurrent, maximumRechargeable);
  const nextSpent = Math.max(0, nextAllowance - nextCurrent);

  if (
    nextBase === (Number(runtime.base) || 0)
    && nextStatMax === (Number(runtime.statMax) || 0)
    && nextSpent === (Number(runtime.spent) || 0)
  ) return state;

  const now = options.now || Date.now();
  return {
    ...state,
    participants: {
      ...state.participants,
      [tokenId]: {
        ...participant,
        movementRuntime: {
          ...runtime,
          base: nextBase,
          statMax: nextStatMax,
          spent: nextSpent,
        },
      },
    },
    history: [
      ...(state.history || []).slice(-39),
      {
        id: `movement-adjusted-${tokenId}-${now}`,
        type: 'movement-resource-adjusted',
        tokenId,
        field,
        previousRemaining: getAvailableMovement(participant),
        remaining: nextCurrent,
        allowance: nextAllowance,
        actor: options.actor || null,
        timestamp: now,
      },
    ],
    updatedAt: now,
  };
};

export const recordParticipantMovement = (state, tokenId, { from, to, cost = 0, isExceptional = false, actor = null }, options = {}) => {
  const participant = state?.participants?.[tokenId];
  if (!participant) return state;
  const runtime = participant.movementRuntime || {
    base: getMovementBase(participant),
    statMax: getMovementStatMax(participant),
    modifier: 0,
    spent: 0,
    sprintBonus: 0,
    sprintDieId: null,
    sprintDieIds: [],
    history: [],
  };
  const numericCost = Math.max(0, asInteger(cost, 0));
  const effectiveCost = isExceptional ? 0 : numericCost;
  const defensiveRemaining = Math.max(0, Number(participant.defensiveReposition?.remaining) || 0);
  const usesDefensiveReposition = defensiveRemaining > 0 && !isExceptional;
  const entry = {
    id: `move-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    from: { x: Number(from?.x) || 0, y: Number(from?.y) || 0 },
    to: { x: Number(to?.x) || 0, y: Number(to?.y) || 0 },
    cost: effectiveCost,
    isExceptional: Boolean(isExceptional),
    defensiveReposition: usesDefensiveReposition,
    actor: actor || participant.name || 'Desconocido',
    timestamp: options.now || Date.now(),
  };

  const nextHistory = [...(runtime.history || []), entry];
  const nextSpent = usesDefensiveReposition
    ? Math.max(0, Number(runtime.spent) || 0)
    : Math.max(0, (Number(runtime.spent) || 0) + effectiveCost);

  return {
    ...state,
    participants: {
      ...state.participants,
      [tokenId]: {
        ...participant,
        defensiveReposition: usesDefensiveReposition
          ? { ...participant.defensiveReposition, remaining: Math.max(0, defensiveRemaining - effectiveCost) }
          : (participant.defensiveReposition ?? null),
        enemyActions: participant.side === 'enemies' && effectiveCost > 0 && !usesDefensiveReposition
          ? (participant.enemyActions || defaultEnemyActions()).map((action) => (
            action.id === 'movement' ? { ...action, status: 'spent' } : action
          ))
          : participant.enemyActions,
        movementRuntime: {
          ...runtime,
          spent: nextSpent,
          history: nextHistory,
        },
      },
    },
    history: [
      ...(state.history || []).slice(-39),
      {
        id: entry.id,
        type: 'movement-confirmed',
        tokenId,
        participantName: participant.name,
        cost: effectiveCost,
        isExceptional: entry.isExceptional,
        actor: entry.actor,
        timestamp: entry.timestamp,
      },
    ],
    updatedAt: options.now || Date.now(),
  };
};

export const undoParticipantMovement = (state, tokenId, options = {}) => {
  const participant = state?.participants?.[tokenId];
  if (!participant) return { state, undoneEntry: null };
  const runtime = participant.movementRuntime;
  if (!runtime || !Array.isArray(runtime.history) || runtime.history.length === 0) {
    return { state, undoneEntry: null };
  }

  const lastEntry = runtime.history[runtime.history.length - 1];
  const nextHistory = runtime.history.slice(0, -1);
  const nextSpent = lastEntry.defensiveReposition
    ? Math.max(0, Number(runtime.spent) || 0)
    : Math.max(0, (Number(runtime.spent) || 0) - (Number(lastEntry.cost) || 0));

  const nextState = {
    ...state,
    participants: {
      ...state.participants,
      [tokenId]: {
        ...participant,
        defensiveReposition: lastEntry.defensiveReposition
          ? {
            ...(participant.defensiveReposition || {}),
            remaining: Math.max(0, Number(participant.defensiveReposition?.remaining) || 0) + (Number(lastEntry.cost) || 0),
            ignoresDuelExit: true,
          }
          : (participant.defensiveReposition ?? null),
        enemyActions: participant.side === 'enemies' && nextHistory.length === 0
          ? (participant.enemyActions || defaultEnemyActions()).map((action) => (
            action.id === 'movement' ? { ...action, status: 'available' } : action
          ))
          : participant.enemyActions,
        movementRuntime: {
          ...runtime,
          spent: nextSpent,
          history: nextHistory,
        },
      },
    },
    history: [
      ...(state.history || []).slice(-39),
      {
        id: `undo-${Date.now()}`,
        type: 'movement-undone',
        tokenId,
        participantName: participant.name,
        restoredPosition: lastEntry.from,
        refundedCost: lastEntry.cost,
        timestamp: options.now || Date.now(),
      },
    ],
    updatedAt: options.now || Date.now(),
  };

  return { state: nextState, undoneEntry: lastEntry };
};

export const startNextRound = (state, options = {}) => {
  if (state?.pendingAttack || state?.explosiveBlast || state?.arcaneChain) return state;
  const round = Math.max(1, asInteger(state?.round, 1)) + 1;
  const roster = options.tokens ? syncInitiativeRoster(state?.participants || {}, options.tokens, state?.rulesSystem)
    : state?.participants || {};
  const participants = Object.fromEntries(Object.entries(roster).map(([id, participant]) => [
    id,
    participant.side === 'players'
      ? {
        ...participant,
        ...(participant.hasteTurnBonus ? { hasteTurnBonus: 0 } : {}),
        actionDice: [],
        awaitingRoll: participant.actionDiceProfile.length > 0,
        movementRuntime: {
          base: participant.movementRuntime?.base || getMovementBase(participant),
          statMax: participant.movementRuntime?.statMax || participant.movementRuntime?.base || getMovementStatMax(participant),
          modifier: 0,
          spent: 0,
          sprintBonus: 0,
          sprintDieId: null,
          sprintDieIds: [],
          history: [],
        },
      }
      : {
        ...participant,
        ...(participant.hasteTurnBonus ? { hasteTurnBonus: 0 } : {}),
        threatValue: null,
        enemyActions: participant.rulesSystem === 'campaign'
          ? defaultEnemyActions(true).map(action => action.id === 'defense'
            ? (participant.enemyActions?.find(old => old.id === 'defense') || action) : action)
          : defaultEnemyActions(),
        ...(participant.rulesSystem === 'campaign' ? { defenseRefreshed: false } : {}),
        movementRuntime: {
          base: participant.movementRuntime?.base || getMovementBase(participant),
          statMax: participant.movementRuntime?.statMax || participant.movementRuntime?.base || getMovementStatMax(participant),
          modifier: 0,
          spent: 0,
          sprintBonus: 0,
          sprintDieId: null,
          sprintDieIds: [],
          history: [],
        },
      },
  ]));
  const next = {
    ...state,
    status: 'active',
    round,
    roundPhase: 'rolling',
    participants,
    blocks: [],
    activeBlockIndex: 0,
    pendingAttack: null,
    updatedAt: options.now || Date.now(),
  };
  return allPlayersReady(participants) ? openTurnPhase(next, options.random) : next;
};

export const finishCanvasCombat = (state, options = {}) => ({
  ...state,
  status: 'finished',
  roundPhase: 'finished',
  finishedAt: options.now || Date.now(),
  pendingAttack: null,
  explosiveBlast: null,
  arcaneChain: null,
  queuedFireBursts: [],
  updatedAt: options.now || Date.now(),
});

export const pruneCombatState = (state, tokens = []) => {
  if (!state || !state.participants) return state;
  const tokenIds = new Set((tokens || []).filter(isCombatParticipant).map((t) => t.id));
  const currentParticipants = state.participants;
  const currentIds = Object.keys(currentParticipants);
  const validIds = currentIds.filter((id) => tokenIds.has(id));
  const tokenMap = new Map(tokens.map(token => [token.id, token]));
  let teamsChanged = false;
  const nextParticipants = Object.fromEntries(validIds.map(id => {
    const participant = currentParticipants[id];
    if (state.rulesSystem !== 'campaign' && participant.rulesSystem !== 'campaign') return [id, participant];
    const initiativeTeamId = normalizeCombatSideKey(tokenMap.get(id)?.teamId || '');
    if (participant.initiativeTeamId === initiativeTeamId) return [id, participant];
    teamsChanged = true;
    return [id, { ...participant, initiativeTeamId }];
  }));

  const hasOrphanedPendingAttack = Boolean(
    state.pendingAttack
    && (!tokenIds.has(state.pendingAttack.attackerId) || !tokenIds.has(state.pendingAttack.targetId)),
  );

  if (validIds.length === currentIds.length && !hasOrphanedPendingAttack && !teamsChanged) {
    return state;
  }

  const actedIds = new Set((state.blocks || []).flatMap(block => block.actedIds || []));
  const hasLateEntries = Object.values(nextParticipants).some(participant => participant.joinedRound === state.round);
  const nextBlocks = teamsChanged && !hasLateEntries ? buildInitiativeBlocks(nextParticipants)
    : (state.blocks || []).map(block => ({ ...block, memberIds: block.memberIds.filter(id => nextParticipants[id]) }))
      .filter(block => block.memberIds.length);
  nextBlocks.forEach(block => { block.actedIds = block.memberIds.filter(id => actedIds.has(id)); });
  const activeIds = state.blocks?.[state.activeBlockIndex]?.memberIds.filter(id => !actedIds.has(id)) || [];
  let activeBlockIndex = nextBlocks.findIndex(block => block.memberIds.some(id => activeIds.includes(id)));
  if (activeBlockIndex < 0) activeBlockIndex = nextBlocks.findIndex(block => block.memberIds.some(id => !actedIds.has(id)));
  if (activeBlockIndex < 0) activeBlockIndex = nextBlocks.length;

  const pruned = {
    ...state,
    participants: nextParticipants,
    blocks: nextBlocks,
    activeBlockIndex,
    pendingAttack: hasOrphanedPendingAttack ? null : state.pendingAttack,
    explosiveBlast: state.explosiveBlast && tokenIds.has(state.explosiveBlast.sourceTokenId)
      ? state.explosiveBlast : null,
    arcaneChain: state.arcaneChain && tokenIds.has(state.arcaneChain.sourceTokenId) ? state.arcaneChain : null,
    updatedAt: Date.now(),
  };
  return hasOrphanedPendingAttack && pruned.explosiveBlast
    ? continueCanvasExplosiveBlast(pruned, state.pendingAttack, tokens) : pruned;
};
