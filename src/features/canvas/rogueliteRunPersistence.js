import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  canRogueliteTokenClaimRun,
  createRogueliteActiveRunFromToken,
} from '../roguelite/activeRun';

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

const persistTokenRun = async (token, scenarioId) => {
  const profileRef = doc(
    db,
    'players',
    token.linkedClassOwner,
    'rogueliteClasses',
    token.linkedClassId,
  );

  return runTransaction(db, async (transaction) => {
    const profileSnapshot = await transaction.get(profileRef);
    const profileData = profileSnapshot.exists() ? profileSnapshot.data() : {};
    const currentRun = profileData.activeRun || null;

    if (currentRun && !canRogueliteTokenClaimRun(token, currentRun, scenarioId)) {
      return { persisted: false, reason: 'stale-scenario' };
    }

    const nextRevision = Math.max(
      Number(currentRun?.revision) || 0,
      Number(token.runRevision) || 0,
    ) + 1;
    const nextRun = createRogueliteActiveRunFromToken(token, currentRun, {
      scenarioId,
      revision: nextRevision,
      now: Date.now(),
    });

    transaction.set(profileRef, {
      id: token.linkedClassId,
      templateId: token.linkedClassId,
      owner: token.linkedClassOwner,
      profileType: 'rogueliteClass',
      activeRun: nextRun,
    }, { merge: true });

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
