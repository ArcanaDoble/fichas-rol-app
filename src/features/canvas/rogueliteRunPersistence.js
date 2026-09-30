import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  canRogueliteTokenClaimRun,
  createRogueliteActiveRunFromToken,
} from '../roguelite/activeRun';
import { sanitizeForFirestore } from '../tactical-shared/legacyCombatRules';
import { syncCanvasTokenWithSheet } from './rogueliteTokenSheetSync';

const isRunToken = (item) => Boolean(
  item?.layer === 'TOKEN'
  && item?.profileType === 'rogueliteClass'
  && item?.linkedClassId
  && item?.linkedClassOwner
  && item?.runId,
);

export const resolveChangedRogueliteRunTokens = (
  finalItems = [],
  originalItems = [],
  explicitModifiedIds = null,
) => {
  const explicitIds = Array.isArray(explicitModifiedIds)
    ? new Set(explicitModifiedIds)
    : null;
  const originalById = new Map((originalItems || []).map((item) => [item.id, item]));

  return (finalItems || []).filter((item) => {
    if (!isRunToken(item)) return false;
    if (explicitIds) return explicitIds.has(item.id);
    return JSON.stringify(item) !== JSON.stringify(originalById.get(item.id));
  });
};

export const mergeCanvasRogueliteRuntimeSheet = (
  sheetData,
  storedProfile = {},
  options = {},
) => {
  const owner = sheetData.owner || options.playerName;
  const classId = sheetData.id || sheetData.templateId;
  const personalTalentSlots = Array.isArray(storedProfile.equippedTalentIds)
    ? storedProfile.equippedTalentIds
    : storedProfile.talents?.slots;

  return {
    ...storedProfile,
    // `sheetData` ya contiene la definición maestra y la progresión resueltas.
    // El documento personal solo es autoritativo para el estado temporal de run.
    ...sheetData,
    activeRun: storedProfile.activeRun ?? sheetData.activeRun,
    id: classId,
    templateId: sheetData.templateId || classId,
    owner,
    profileType: 'rogueliteClass',
    ...(Array.isArray(personalTalentSlots)
      ? { equippedTalentIds: personalTalentSlots }
      : {}),
    ...(Array.isArray(storedProfile.equippedSkillIds)
      ? { equippedSkillIds: storedProfile.equippedSkillIds }
      : {}),
    talents: {
      ...(storedProfile.talents || {}),
      ...(sheetData.talents || {}),
      ...(Array.isArray(personalTalentSlots) ? { slots: personalTalentSlots } : {}),
    },
  };
};

export const loadCanvasRogueliteRuntimeSheet = async (sheetData, options = {}) => {
  if (sheetData?.profileType !== 'rogueliteClass') return sheetData;

  const owner = sheetData.owner || options.playerName;
  const classId = sheetData.id || sheetData.templateId;
  if (!owner || !classId) return sheetData;

  const snapshot = await getDoc(doc(db, 'players', owner, 'rogueliteClasses', classId));
  if (!snapshot.exists()) return { ...sheetData, owner, id: classId };

  return mergeCanvasRogueliteRuntimeSheet(sheetData, snapshot.data(), { owner, playerName: owner });
};

export const syncCanvasTokenWithRuntimeProfile = (
  token,
  storedProfile = {},
  scenarioId = null,
  options = {},
) => {
  const activeRun = storedProfile?.activeRun;
  const hasNewerRevision = (Number(activeRun?.revision) || 0) > (Number(token.runRevision) || 0);
  if (
    !isRunToken(token)
    || !activeRun?.id
    || activeRun.id !== token.runId
    || (activeRun.currentScenarioId && scenarioId && activeRun.currentScenarioId !== scenarioId)
    || (!hasNewerRevision && !options.forceMetadataSync)
  ) {
    return token;
  }

  // A scene transaction also updates the personal run. Its profile listener
  // may arrive first; wait for the scene's matching runtime/effect snapshot
  // before exposing that health or inventory change.
  const waitingForScene = Number(activeRun.sourceCanvasRuntimeRevision || 0) > Number(token.canvasRuntimeRevision || 0);
  const synced = syncCanvasTokenWithSheet(token, {
    ...storedProfile,
    id: token.linkedClassId,
    templateId: token.linkedClassId,
    owner: token.linkedClassOwner,
    profileType: 'rogueliteClass',
    activeRun,
  }, {}, {
    scenarioId,
    preserveTokenState: !hasNewerRevision || waitingForScene,
  });
  return waitingForScene ? { ...synced, runRevision: token.runRevision || 0 } : synced;
};

const persistTokenRun = async (token, scenarioId) => {
  const scenarioRef = doc(db, 'canvas_scenarios', scenarioId);
  const profileRef = doc(
    db,
    'players',
    token.linkedClassOwner,
    'rogueliteClasses',
    token.linkedClassId,
  );

  return runTransaction(db, async (transaction) => {
    const sceneSnapshot = await transaction.get(scenarioRef);
    const profileSnapshot = await transaction.get(profileRef);
    const scene = sceneSnapshot.exists() ? sceneSnapshot.data() : null;
    const committedToken = scene?.items?.find(item => item.id === token.id);
    if (!committedToken || !isRunToken(committedToken)) return { persisted: false, reason: 'stale-scenario' };
    const profileData = profileSnapshot.exists() ? profileSnapshot.data() : {};
    const currentRun = profileData.activeRun || null;

    if (currentRun && !canRogueliteTokenClaimRun(committedToken, currentRun, scenarioId)) {
      return { persisted: false, reason: 'stale-scenario' };
    }

    const nextRevision = Math.max(
      Number(currentRun?.revision) || 0,
      Number(committedToken.runRevision) || 0,
    ) + 1;
    const nextRun = createRogueliteActiveRunFromToken(committedToken, currentRun, {
      scenarioId,
      revision: nextRevision,
      now: Date.now(),
    });

    transaction.set(profileRef, sanitizeForFirestore({
      id: token.linkedClassId,
      templateId: token.linkedClassId,
      owner: token.linkedClassOwner,
      profileType: 'rogueliteClass',
      activeRun: { ...nextRun, sourceCanvasRuntimeRevision: Number(committedToken.canvasRuntimeRevision || 0) },
    }), { merge: true });

    // Link the profile revision to the same authoritative scene in this transaction.
    // A delayed pickup save must never publish its captured, pre-potion health.
    transaction.update(scenarioRef, sanitizeForFirestore({
      items: scene.items.map(item => item.id === committedToken.id ? { ...item, runRevision: nextRevision } : item),
      lastModified: Math.max(Date.now(), Number(scene.lastModified || 0) + 1),
    }));

    return { persisted: true, activeRun: nextRun };
  });
};

export const persistCanvasRogueliteRuns = async ({
  scenarioId,
  finalItems,
  originalItems,
  explicitModifiedIds,
}) => {
  if (!scenarioId) return [];

  const changedTokens = resolveChangedRogueliteRunTokens(
    finalItems,
    originalItems,
    explicitModifiedIds,
  );

  return Promise.all(changedTokens.map((token) => persistTokenRun(token, scenarioId)));
};
